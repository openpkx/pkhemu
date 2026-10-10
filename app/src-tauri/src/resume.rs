use crate::games_folder::GamesFolder;
use crate::retro::{CoreInfo, Frame};
use crate::rom;
use serde::{Deserialize, Serialize};
use tauri::Runtime;

pub struct Resume {
    pub state: Vec<u8>,
    pub screenshot: Option<Vec<u8>>,
    pub info: Info,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct Info {
    pub play_since_save: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub slot: Option<u8>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub core: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub core_version: Option<String>,
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Preview {
    pub screenshot: Vec<u8>,
    #[serde(flatten)]
    pub info: Info,
}

pub fn screenshot(frame: &Frame) -> Result<Vec<u8>, png::EncodingError> {
    let mut rgb = Vec::with_capacity(frame.pixels.len() * 3);
    for pixel in &frame.pixels {
        let (r, g, b) = (pixel >> 11, (pixel >> 5) & 0x3F, pixel & 0x1F);
        rgb.extend_from_slice(&[(r << 3 | r >> 2) as u8, (g << 2 | g >> 4) as u8, (b << 3 | b >> 2) as u8]);
    }
    let mut file = Vec::new();
    let mut encoder = png::Encoder::new(&mut file, frame.width, frame.height);
    encoder.set_color(png::ColorType::Rgb);
    encoder.set_depth(png::BitDepth::Eight);
    encoder.write_header()?.write_image_data(&rgb)?;
    Ok(file)
}

pub async fn write<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str, resume: Resume) {
    let screenshot_path = rom::resume_screenshot_path(rom);
    let info = serde_json::to_vec(&resume.info).expect("the resume info is plain JSON");
    let mut files = Vec::new();
    match resume.screenshot {
        Some(screenshot) => files.push((screenshot_path, screenshot)),
        None => {
            let _ = folder.remove(rom, &screenshot_path).await;
        }
    }
    // A state newer than its info could hide unsaved play, so the state goes last.
    files.push((rom::resume_info_path(rom), info));
    files.push((rom::resume_path(rom), resume.state));
    for (path, file) in files {
        if let Err(e) = folder.write(&path, &file).await {
            eprintln!("{path}: {e}");
        }
    }
}

pub async fn preview<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str) -> Option<Preview> {
    let screenshot = screenshot_file(folder, rom).await?;
    Some(Preview { screenshot, info: info(folder, rom).await? })
}

pub async fn screenshot_file<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str) -> Option<Vec<u8>> {
    folder.read(&rom::resume_screenshot_path(rom)).await.ok()
}

pub async fn info<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str) -> Option<Info> {
    serde_json::from_slice(&folder.read(&rom::resume_info_path(rom)).await.ok()?).ok()
}

/// The resume state and the slot it was playing from, or `None` when another core version wrote it.
pub async fn read<R: Runtime>(
    folder: &GamesFolder<'_, R>,
    rom: &str,
    running: &CoreInfo,
) -> Result<Option<(Vec<u8>, Option<u8>)>, String> {
    let info = info(folder, rom).await;
    if info.as_ref().is_some_and(|info| !running.wrote(info.core.as_deref(), info.core_version.as_deref())) {
        return Ok(None);
    }
    let path = rom::resume_path(rom);
    let state = folder.read(&path).await.map_err(|e| format!("{path}: {e}"))?;
    Ok(Some((state, info.and_then(|info| info.slot))))
}

pub async fn forget_slot<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str, slot: u8) -> Result<(), String> {
    let Some(info) = info(folder, rom).await.filter(|info| info.slot == Some(slot)) else {
        return Ok(());
    };
    let path = rom::resume_info_path(rom);
    let info = serde_json::to_vec(&Info { slot: None, ..info }).expect("the resume info is plain JSON");
    folder.write(&path, &info).await.map_err(|e| format!("{path}: {e}"))
}

pub async fn remove<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str) -> Result<(), String> {
    for path in [rom::resume_path(rom), rom::resume_screenshot_path(rom), rom::resume_info_path(rom)] {
        match folder.remove(rom, &path).await {
            Ok(()) => {}
            Err(_) if !folder.has_file(&path).await => {}
            Err(e) => return Err(format!("{path}: {e}")),
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::async_runtime::block_on;

    fn temp_folder(name: &str) -> GamesFolder<'static, tauri::Wry> {
        let root = std::env::temp_dir().join(format!("pkh-emu-resume-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        GamesFolder::at(root)
    }

    fn decode(file: &[u8]) -> (png::OutputInfo, Vec<u8>) {
        let mut reader = png::Decoder::new(std::io::Cursor::new(file)).read_info().unwrap();
        let mut rgb = vec![0; reader.output_buffer_size().unwrap()];
        let info = reader.next_frame(&mut rgb).unwrap();
        rgb.truncate(info.buffer_size());
        (info, rgb)
    }

    #[test]
    fn encodes_the_frame_as_a_png_at_its_own_size() {
        let frame = Frame {
            width: 3,
            height: 1,
            pixels: vec![0xF800, 0x07E0, 0x001F],
            fresh: false,
        };

        let (info, rgb) = decode(&screenshot(&frame).unwrap());

        assert_eq!((info.width, info.height), (3, 1));
        assert_eq!(rgb, [255, 0, 0, 0, 255, 0, 0, 0, 255]);
    }

    #[test]
    fn previews_the_screenshot_and_play_since_save() {
        let folder = temp_folder("preview");
        let resume = Resume {
            state: b"state".to_vec(),
            screenshot: Some(b"png".to_vec()),
            info: Info { play_since_save: Some(12.5), ..Info::default() },
        };

        block_on(write(&folder, "gba/Emerald.gba", resume));

        assert_eq!(
            block_on(preview(&folder, "gba/Emerald.gba")),
            Some(Preview { screenshot: b"png".to_vec(), info: Info { play_since_save: Some(12.5), ..Info::default() } })
        );
    }

    #[test]
    fn writes_null_when_play_since_save_is_unknown() {
        let folder = temp_folder("unknown");
        let resume = Resume {
            state: b"state".to_vec(),
            screenshot: None,
            info: Info { play_since_save: None, ..Info::default() },
        };

        block_on(write(&folder, "gba/Emerald.gba", resume));

        assert_eq!(
            block_on(folder.read("gba/Emerald/states/resume.json")).unwrap(),
            br#"{"playSinceSave":null}"#
        );
    }

    #[test]
    fn writes_the_slot_the_game_was_playing_from() {
        let folder = temp_folder("slot");
        let resume = Resume {
            state: b"state".to_vec(),
            screenshot: None,
            info: Info { play_since_save: None, slot: Some(3), ..Info::default() },
        };

        block_on(write(&folder, "gba/Emerald.gba", resume));

        assert_eq!(
            block_on(folder.read("gba/Emerald/states/resume.json")).unwrap(),
            br#"{"playSinceSave":null,"slot":3}"#
        );
        assert_eq!(block_on(info(&folder, "gba/Emerald.gba")).unwrap().slot, Some(3));
    }

    #[test]
    fn drops_a_screenshot_older_than_the_state() {
        let folder = temp_folder("stale");
        let with = |screenshot| Resume {
            state: b"state".to_vec(),
            screenshot,
            info: Info { play_since_save: None, ..Info::default() },
        };
        block_on(write(&folder, "gba/Emerald.gba", with(Some(b"png".to_vec()))));

        block_on(write(&folder, "gba/Emerald.gba", with(None)));

        assert!(!block_on(folder.has_file("gba/Emerald/states/resume.png")));
    }

    #[test]
    fn reads_the_info_without_a_screenshot() {
        let folder = temp_folder("info");
        let resume = Resume {
            state: b"state".to_vec(),
            screenshot: None,
            info: Info { play_since_save: Some(90.0), ..Info::default() },
        };

        block_on(write(&folder, "gba/Emerald.gba", resume));

        assert_eq!(
            block_on(info(&folder, "gba/Emerald.gba")),
            Some(Info { play_since_save: Some(90.0), ..Info::default() })
        );
    }

    #[test]
    fn reads_no_info_without_the_json() {
        let folder = temp_folder("no-info");
        block_on(folder.write("gba/Emerald/states/resume.state", b"state")).unwrap();

        assert_eq!(block_on(info(&folder, "gba/Emerald.gba")), None);
    }

    #[test]
    fn removes_the_state_screenshot_and_info() {
        let folder = temp_folder("remove");
        let resume = Resume {
            state: b"state".to_vec(),
            screenshot: Some(b"png".to_vec()),
            info: Info { play_since_save: None, ..Info::default() },
        };
        block_on(write(&folder, "gba/Emerald.gba", resume));

        block_on(remove(&folder, "gba/Emerald.gba")).unwrap();

        for file in ["resume.state", "resume.png", "resume.json"] {
            assert!(!block_on(folder.has_file(&format!("gba/Emerald/states/{file}"))), "{file}");
        }
    }

    #[test]
    fn removes_a_resume_point_missing_some_files() {
        let folder = temp_folder("remove-partial");
        block_on(folder.write("gba/Emerald/states/resume.state", b"state")).unwrap();

        block_on(remove(&folder, "gba/Emerald.gba")).unwrap();

        assert!(!block_on(folder.has_file("gba/Emerald/states/resume.state")));
    }

    fn mgba() -> CoreInfo {
        CoreInfo { name: "mGBA".into(), version: "0.10.5".into() }
    }

    fn written_by(core: &CoreInfo) -> Resume {
        let info = Info {
            slot: Some(3),
            core: Some(core.name.clone()),
            core_version: Some(core.version.clone()),
            ..Info::default()
        };
        Resume { state: b"state".to_vec(), screenshot: None, info }
    }

    #[test]
    fn writes_the_core_that_made_the_state() {
        let folder = temp_folder("core");

        block_on(write(&folder, "gba/Emerald.gba", written_by(&mgba())));

        assert_eq!(
            block_on(folder.read("gba/Emerald/states/resume.json")).unwrap(),
            br#"{"playSinceSave":null,"slot":3,"core":"mGBA","coreVersion":"0.10.5"}"#
        );
    }

    #[test]
    fn reads_a_state_the_running_core_wrote() {
        let folder = temp_folder("read-same");
        block_on(write(&folder, "gba/Emerald.gba", written_by(&mgba())));

        assert_eq!(block_on(read(&folder, "gba/Emerald.gba", &mgba())), Ok(Some((b"state".to_vec(), Some(3)))));
    }

    #[test]
    fn skips_a_state_another_core_version_wrote() {
        let folder = temp_folder("read-other");
        block_on(write(&folder, "gba/Emerald.gba", written_by(&CoreInfo { version: "0.11.0".into(), ..mgba() })));

        assert_eq!(block_on(read(&folder, "gba/Emerald.gba", &mgba())), Ok(None));
    }

    #[test]
    fn reads_a_state_from_before_cores_were_recorded() {
        let folder = temp_folder("read-unrecorded");
        block_on(folder.write("gba/Emerald/states/resume.state", b"state")).unwrap();
        block_on(folder.write("gba/Emerald/states/resume.json", br#"{"playSinceSave":null,"slot":2}"#)).unwrap();

        assert_eq!(block_on(read(&folder, "gba/Emerald.gba", &mgba())), Ok(Some((b"state".to_vec(), Some(2)))));
    }

    #[test]
    fn reads_a_state_without_its_info() {
        let folder = temp_folder("read-no-info");
        block_on(folder.write("gba/Emerald/states/resume.state", b"state")).unwrap();

        assert_eq!(block_on(read(&folder, "gba/Emerald.gba", &mgba())), Ok(Some((b"state".to_vec(), None))));
    }

    #[test]
    fn previews_nothing_without_a_screenshot() {
        let folder = temp_folder("missing");

        assert_eq!(block_on(preview(&folder, "gba/Emerald.gba")), None);
    }

    #[test]
    fn reads_the_screenshot_file_without_the_json() {
        let folder = temp_folder("screenshot-file");
        block_on(folder.write("gba/Emerald/states/resume.png", b"png")).unwrap();

        assert_eq!(block_on(screenshot_file(&folder, "gba/Emerald.gba")), Some(b"png".to_vec()));
    }

    #[test]
    fn reads_no_screenshot_file_without_the_png() {
        let folder = temp_folder("no-screenshot-file");
        block_on(folder.write("gba/Emerald/states/resume.state", b"state")).unwrap();

        assert_eq!(block_on(screenshot_file(&folder, "gba/Emerald.gba")), None);
    }
}
