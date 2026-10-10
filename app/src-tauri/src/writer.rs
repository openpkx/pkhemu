use crate::games_folder::GamesFolder;
use crate::resume::{self, Resume};
use crate::rom::StateName;
use crate::save::Slot;
use crate::states::{self, Saved};
use tauri::Runtime;
use tokio::sync::mpsc::UnboundedReceiver;
use tokio::sync::oneshot;

pub enum Write {
    Save(Vec<u8>),
    Cart(Slot, Vec<u8>),
    Resume(Resume),
    State(StateChange),
    Flush(oneshot::Sender<()>),
}

pub enum StateChange {
    Put {
        name: StateName,
        saved: Saved,
        written: oneshot::Sender<Result<(), String>>,
    },
    Remove {
        name: StateName,
        removed: oneshot::Sender<Result<(), String>>,
    },
}

pub async fn write_all<R: Runtime>(
    folder: &GamesFolder<'_, R>,
    rom: &str,
    slot: &Slot,
    mut writes: UnboundedReceiver<Write>,
) {
    while let Some(first) = writes.recv().await {
        let (mut save, mut cart, mut latest, mut states, mut flushed) = (None, None, None, Vec::new(), Vec::new());
        let mut next = Some(first);
        while let Some(write) = next {
            match write {
                Write::Save(file) => save = Some(file),
                Write::Cart(slot, file) => cart = Some((slot, file)),
                Write::Resume(resume) => latest = Some(resume),
                Write::State(change) => states.push(change),
                Write::Flush(done) => flushed.push(done),
            }
            next = writes.try_recv().ok();
        }
        if let Some(file) = save {
            if let Err(e) = slot.write(folder, &file).await {
                eprintln!("{e}");
            }
        }
        if let Some((slot, file)) = cart {
            if let Err(e) = slot.write(folder, &file).await {
                eprintln!("{e}");
            }
        }
        for change in states {
            match change {
                StateChange::Put { name, saved, written } => {
                    let _ = written.send(states::write(folder, rom, slot, name, saved).await);
                }
                StateChange::Remove { name, removed } => {
                    let _ = removed.send(states::remove(folder, rom, name).await);
                }
            }
        }
        if let Some(latest) = latest {
            resume::write(folder, rom, latest).await;
        }
        for done in flushed {
            let _ = done.send(());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::async_runtime::block_on;
    use tokio::sync::mpsc;

    fn temp_folder(name: &str) -> GamesFolder<'static, tauri::Wry> {
        let root = std::env::temp_dir().join(format!("pkh-emu-writer-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        GamesFolder::at(root)
    }

    fn resume(state: &[u8]) -> Write {
        Write::Resume(Resume {
            state: state.to_vec(),
            screenshot: Some(b"png".to_vec()),
            info: resume::Info::default(),
        })
    }

    fn write(folder: &GamesFolder<'static, tauri::Wry>, writes: Vec<Write>) {
        let (tx, rx) = mpsc::unbounded_channel();
        for write in writes {
            tx.send(write).unwrap();
        }
        drop(tx);
        let (slot, _) = Slot::new("gba/Emerald.sav".into(), Vec::new());
        block_on(write_all(folder, "gba/Emerald.gba", &slot, rx));
    }

    #[test]
    fn writes_the_save_next_to_the_rom_and_the_resume_state_in_its_folder() {
        let folder = temp_folder("both");

        write(&folder, vec![Write::Save(b"save".to_vec()), resume(b"state")]);

        assert_eq!(block_on(folder.read("gba/Emerald.sav")).unwrap(), b"save");
        assert_eq!(block_on(folder.read("gba/Emerald/states/resume.state")).unwrap(), b"state");
    }

    #[test]
    fn replaces_the_resume_state() {
        let folder = temp_folder("replace");
        write(&folder, vec![resume(b"first")]);

        write(&folder, vec![resume(b"second")]);

        assert_eq!(block_on(folder.read("gba/Emerald/states/resume.state")).unwrap(), b"second");
        let mut names: Vec<_> = block_on(folder.read_dir("gba/Emerald/states")).unwrap().into_iter().map(|e| e.name).collect();
        names.sort();
        assert_eq!(names, ["resume.json", "resume.png", "resume.state"]);
    }

    #[test]
    fn ends_on_the_newest_of_queued_writes() {
        let folder = temp_folder("newest");

        write(
            &folder,
            vec![
                Write::Save(b"old save".to_vec()),
                resume(b"old state"),
                Write::Save(b"new save".to_vec()),
                resume(b"new state"),
            ],
        );

        assert_eq!(block_on(folder.read("gba/Emerald.sav")).unwrap(), b"new save");
        assert_eq!(block_on(folder.read("gba/Emerald/states/resume.state")).unwrap(), b"new state");
    }

    #[test]
    fn writes_the_transfer_pak_games_save_beside_its_rom() {
        let folder = temp_folder("cart");
        let (slot, _) = Slot::new("gbc/Crystal.sav".into(), Vec::new());

        write(&folder, vec![Write::Cart(slot.clone(), b"old cart".to_vec()), Write::Cart(slot, b"new cart".to_vec())]);

        assert_eq!(block_on(folder.read("gbc/Crystal.sav")).unwrap(), b"new cart");
        assert!(!block_on(folder.has_file("gba/Emerald.sav")));
    }

    #[test]
    fn writes_a_state_to_its_slot_and_says_when_it_is_written() {
        let folder = temp_folder("state");
        let (written, done) = oneshot::channel();
        let saved = Saved {
            state: b"state".to_vec(),
            screenshot: None,
            save: b"save".to_vec(),
            info: states::Info { saved_at: 1000.0, play_since_save: None, ..states::Info::default() },
        };

        write(&folder, vec![Write::State(StateChange::Put { name: StateName::Slot(3), saved, written })]);

        assert_eq!(block_on(done).unwrap(), Ok(()));
        assert_eq!(block_on(folder.read("gba/Emerald/states/slot-3.state")).unwrap(), b"state");
        assert_eq!(block_on(folder.read("gba/Emerald/states/slot-3.sav")).unwrap(), b"save");
    }

    #[test]
    fn removes_a_state_after_the_writes_queued_before_it() {
        let folder = temp_folder("remove-state");
        let (written, _) = oneshot::channel();
        let (removed, _) = oneshot::channel();
        let saved = Saved {
            state: b"state".to_vec(),
            screenshot: Some(b"png".to_vec()),
            save: b"save".to_vec(),
            info: states::Info { saved_at: 1000.0, play_since_save: None, ..states::Info::default() },
        };

        write(
            &folder,
            vec![
                Write::State(StateChange::Put { name: StateName::BeforeLoad, saved, written }),
                Write::State(StateChange::Remove { name: StateName::BeforeLoad, removed }),
            ],
        );

        assert_eq!(block_on(folder.read_dir("gba/Emerald/states")).unwrap().len(), 0);
    }

    #[test]
    fn says_when_the_writes_queued_before_a_flush_are_written() {
        let folder = temp_folder("flush");
        let (flushed, done) = oneshot::channel();

        write(&folder, vec![Write::Save(b"save".to_vec()), resume(b"state"), Write::Flush(flushed)]);

        assert_eq!(block_on(done), Ok(()));
        assert_eq!(block_on(folder.read("gba/Emerald.sav")).unwrap(), b"save");
        assert_eq!(block_on(folder.read("gba/Emerald/states/resume.state")).unwrap(), b"state");
    }

    #[test]
    fn leaves_the_resume_state_alone_when_only_the_save_changes() {
        let folder = temp_folder("save-only");
        write(&folder, vec![resume(b"state")]);

        write(&folder, vec![Write::Save(b"save".to_vec())]);

        assert_eq!(block_on(folder.read("gba/Emerald/states/resume.state")).unwrap(), b"state");
    }
}
