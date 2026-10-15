use super::*;

fn device(test: &str, name: &'static str) -> Device {
    super::device(&format!("{}-{test}", TestCloud::NAME), name)
}

fn devices(test: &str) -> (Device, Device, TestCloud) {
    let (a, b) = (device(test, "A"), device(test, "B"));
    for device in [&a, &b] {
        device.write(EMERALD, b"emerald rom");
    }
    (a, b, TestCloud::new())
}

#[test]
fn a_save_written_on_one_device_appears_on_the_other() {
    let (a, b, cloud) = devices("save");
    a.write("gba/Emerald.sav", b"save from A");

    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    assert_eq!(b.read("gba/Emerald.sav").unwrap(), b"save from A");
    let record = &cloud.records()[0];
    assert_eq!(record["rom"]["path"], EMERALD);
    assert_eq!(record["rom"]["sha1"], game_art::sha1_of(b"emerald rom"));
    assert_eq!(record["files"][0]["path"], "gba/Emerald.sav");
    assert_eq!(record["files"][0]["device"], "A");
    assert_eq!(record["files"][0]["sha1"], game_art::sha1_of(b"save from A"));
}

#[test]
fn a_3ds_games_main_and_its_backups_appear_on_the_other_device() {
    let (a, b, cloud) = devices("3ds");
    for device in [&a, &b] {
        device.write("3ds/X.3ds", b"x rom");
    }
    a.write("3ds/X.sav", b"main from A");
    a.write("3ds/X/backups/2026-10-05_1412_edit.sav", b"main before the edit");

    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    assert_eq!(b.read("3ds/X.sav").unwrap(), b"main from A");
    assert_eq!(b.read("3ds/X/backups/2026-10-05_1412_edit.sav").unwrap(), b"main before the edit");
}

#[test]
fn slots_the_resume_state_and_backups_sync_but_the_state_from_before_a_load_stays() {
    let (a, b, cloud) = devices("states");
    let synced = [
        "gba/Emerald/states/slot-1.state",
        "gba/Emerald/states/slot-1.sav",
        "gba/Emerald/states/slot-1.json",
        "gba/Emerald/states/slot-1.png",
        "gba/Emerald/states/resume.state",
        "gba/Emerald/states/resume.json",
        "gba/Emerald/backups/2026-10-05_1412_edit.sav",
    ];
    for path in synced {
        a.write(path, path.as_bytes());
    }
    a.write("gba/Emerald/states/before-load.state", b"undo");
    a.write("gba/Emerald/states/before-load.sav", b"undo");

    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    for path in synced {
        assert_eq!(b.read(path).as_deref(), Some(path.as_bytes()), "{path}");
    }
    assert!(!b.files("gba/Emerald/states").iter().any(|name| name.starts_with("before-load")));
}

#[test]
fn syncing_again_with_nothing_changed_uploads_nothing() {
    let (a, b, cloud) = devices("unchanged");
    a.write("gba/Emerald.sav", b"save");
    a.write("gba/Emerald/states/slot-1.state", b"slot");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    let (uploaded, writes) = (cloud.uploaded_bytes(), cloud.record_writes());

    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    assert_eq!((cloud.uploaded_bytes(), cloud.record_writes()), (uploaded, writes));
}

#[test]
fn a_renamed_rom_keeps_its_record_and_the_other_device_follows() {
    let (a, b, cloud) = devices("rename");
    a.write("gba/Emerald.sav", b"save");
    a.write("gba/Emerald/states/slot-1.state", b"slot");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    let uploaded = cloud.uploaded_bytes();

    a.rename(EMERALD, "gba/Hacks/Emerald (Hack).gba");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    assert_eq!(cloud.records().len(), 1);
    assert_eq!(cloud.records()[0]["rom"]["path"], "gba/Hacks/Emerald (Hack).gba");
    assert_eq!(cloud.uploaded_bytes(), uploaded);
    for device in [&a, &b] {
        assert_eq!(device.read("gba/Hacks/Emerald (Hack).gba").unwrap(), b"emerald rom", "{}", device.name);
        assert_eq!(device.read("gba/Hacks/Emerald (Hack).sav").unwrap(), b"save", "{}", device.name);
        assert_eq!(device.read("gba/Hacks/Emerald (Hack)/states/slot-1.state").unwrap(), b"slot", "{}", device.name);
        assert!(device.read("gba/Emerald.sav").is_none(), "{}", device.name);
        assert!(device.read(EMERALD).is_none(), "{}", device.name);
    }
}

#[test]
fn two_copies_of_a_rom_stay_two_games() {
    let (a, b) = (device("copies", "A"), device("copies", "B"));
    let cloud = TestCloud::new();
    for device in [&a, &b] {
        device.write("gba/FireRed.gba", b"firered rom");
        device.write("gba/FireRed 2.gba", b"firered rom");
    }
    a.write("gba/FireRed.sav", b"first playthrough");
    a.write("gba/FireRed 2.sav", b"second playthrough");

    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    assert_eq!(cloud.records().len(), 2);
    assert_eq!(b.read("gba/FireRed.sav").unwrap(), b"first playthrough");
    assert_eq!(b.read("gba/FireRed 2.sav").unwrap(), b"second playthrough");
}

fn conflicted(test: &str) -> (Device, Device, TestCloud) {
    let (a, b, cloud) = devices(test);
    a.write("gba/Emerald.sav", b"save 0");
    a.write("gba/Emerald/states/resume.state", b"resume 0");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    a.write("gba/Emerald.sav", b"save from A");
    a.write("gba/Emerald/states/resume.state", b"resume from A");
    b.write("gba/Emerald.sav", b"save from B");
    b.write("gba/Emerald/states/resume.state", b"resume from B");
    a.sync_ok(&cloud);
    let report = b.sync(&cloud);
    assert_eq!(report[EMERALD].conflicts, ["save"]);
    (a, b, cloud)
}

fn sync_backups(device: &Device) -> Vec<Vec<u8>> {
    device.backups(EMERALD).into_iter().filter(|(name, _)| name.contains("_sync")).map(|(_, bytes)| bytes).collect()
}

#[test]
fn a_save_changed_on_both_devices_is_a_conflict_that_keeps_the_devices_files() {
    let (_, b, cloud) = conflicted("conflict");

    assert_eq!(b.read("gba/Emerald.sav").unwrap(), b"save from B");
    assert_eq!(b.read("gba/Emerald/states/resume.state").unwrap(), b"resume from B");
    let conflicts = b.conflicts(&cloud, EMERALD);
    assert_eq!(conflicts.len(), 1);
    assert_eq!(conflicts[0].file, "save");
    assert_eq!(conflicts[0].device.saved_on, "B");
    assert_eq!(conflicts[0].cloud.saved_on, "A");
    assert!(conflicts[0].device.modified.is_some() && conflicts[0].cloud.modified.is_some());
    assert_eq!(b.sync(&cloud)[EMERALD].conflicts, ["save"]);
}

#[test]
fn the_clouds_side_of_a_conflict_can_be_read_before_picking() {
    let (_, b, cloud) = conflicted("conflict-read");

    let save = b.cloud_save(&cloud, EMERALD).unwrap();
    assert_eq!(save.bytes, b"save from A");
    assert_eq!(save.sha256, crate::save::sha256(b"save from A"));
    assert_eq!(Some(save.modified), b.conflicts(&cloud, EMERALD)[0].cloud.modified);
    assert!(b.cloud_screenshot(&cloud, EMERALD, "save").is_none());
}

#[test]
fn a_save_written_with_cheats_on_carries_the_mark_in_the_record() {
    let (a, _, cloud) = devices("cheats-record");
    a.write("gba/Emerald.sav", b"save with codes");
    a.write("gba/Emerald/states/slot-1.state", b"slot");
    a.index.mark_save_had_cheats(EMERALD, &game_art::sha1_of(b"save with codes")).unwrap();

    a.sync_ok(&cloud);

    let record = &cloud.records()[0];
    assert_eq!(record["files"][0]["path"], "gba/Emerald.sav");
    assert_eq!(record["files"][0]["cheats"], true);
    assert!(record["files"][1].get("cheats").is_none());
}

#[test]
fn a_conflict_tells_which_side_had_cheats_on() {
    let (a, b, cloud) = devices("cheats-conflict");
    a.write("gba/Emerald.sav", b"save 0");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    a.write("gba/Emerald.sav", b"save from A");
    a.index.mark_save_had_cheats(EMERALD, &game_art::sha1_of(b"save from A")).unwrap();
    b.write("gba/Emerald.sav", b"save from B");
    a.sync_ok(&cloud);
    assert_eq!(b.sync(&cloud)[EMERALD].conflicts, ["save"]);

    let conflict = &b.conflicts(&cloud, EMERALD)[0];
    assert!(conflict.cloud.cheats);
    assert!(!conflict.device.cheats);

    b.index.mark_save_had_cheats(EMERALD, &game_art::sha1_of(b"save from B")).unwrap();
    assert!(b.conflicts(&cloud, EMERALD)[0].device.cheats);
}

#[test]
fn picking_the_cloud_keeps_the_devices_save_as_a_backup_and_takes_the_clouds_resume_state() {
    let (a, b, cloud) = conflicted("conflict-cloud");

    b.resolve(&cloud, EMERALD, "save", Choice::Cloud);

    assert_eq!(b.read("gba/Emerald.sav").unwrap(), b"save from A");
    assert_eq!(b.read("gba/Emerald/states/resume.state").unwrap(), b"resume from A");
    assert_eq!(sync_backups(&b), [b"save from B".to_vec()]);
    assert!(b.conflicts(&cloud, EMERALD).is_empty());
    b.sync_ok(&cloud);
    a.sync_ok(&cloud);
    assert_eq!(a.read("gba/Emerald.sav").unwrap(), b"save from A");
    assert_eq!(sync_backups(&a), [b"save from B".to_vec()]);
}

#[test]
fn picking_this_device_keeps_the_clouds_save_as_a_backup_and_sends_the_devices_resume_state() {
    let (a, b, cloud) = conflicted("conflict-device");

    b.resolve(&cloud, EMERALD, "save", Choice::Device);

    assert_eq!(b.read("gba/Emerald.sav").unwrap(), b"save from B");
    assert_eq!(sync_backups(&b), [b"save from A".to_vec()]);
    b.sync_ok(&cloud);
    a.sync_ok(&cloud);
    assert_eq!(a.read("gba/Emerald.sav").unwrap(), b"save from B");
    assert_eq!(a.read("gba/Emerald/states/resume.state").unwrap(), b"resume from B");
    assert_eq!(sync_backups(&a), [b"save from A".to_vec()]);
}

const STADIUM: &str = "n64/Stadium.z64";

fn stadium_conflicted(test: &str) -> (Device, Device, TestCloud) {
    let (a, b, cloud) = devices(test);
    for device in [&a, &b] {
        device.write(STADIUM, b"stadium rom");
    }
    a.write("n64/Stadium.fla", b"fla 0");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    a.write("n64/Stadium.fla", b"fla from A");
    a.write("n64/Stadium.mpk", b"mpk from A");
    b.write("n64/Stadium.fla", b"fla from B");
    a.sync_ok(&cloud);
    assert_eq!(b.sync(&cloud)[STADIUM].conflicts, ["save"]);
    (a, b, cloud)
}

fn stadium_sync_backups(device: &Device) -> Vec<Vec<u8>> {
    let backups = device.backups(STADIUM).into_iter();
    backups.filter(|(name, _)| name.ends_with("_sync.srm")).map(|(_, bytes)| bytes).collect()
}

#[test]
fn an_n64_games_save_files_conflict_and_resolve_as_one_save() {
    let (a, b, cloud) = stadium_conflicted("n64-cloud");
    let from_a = crate::save::n64::join([("fla", b"fla from A".as_slice()), ("mpk", b"mpk from A")]);
    assert_eq!(b.conflicts(&cloud, STADIUM).len(), 1);
    assert_eq!(b.cloud_save(&cloud, STADIUM).unwrap().bytes, from_a);

    b.resolve(&cloud, STADIUM, "save", Choice::Cloud);

    assert_eq!(b.read("n64/Stadium.fla").unwrap(), b"fla from A");
    assert_eq!(b.read("n64/Stadium.mpk").unwrap(), b"mpk from A");
    assert_eq!(stadium_sync_backups(&b), [crate::save::n64::join([("fla", b"fla from B".as_slice())])]);
    b.sync_ok(&cloud);
    a.sync_ok(&cloud);
    assert_eq!(a.read("n64/Stadium.fla").unwrap(), b"fla from A");
}

#[test]
fn picking_this_devices_n64_save_drops_the_clouds_other_files() {
    let (a, b, cloud) = stadium_conflicted("n64-device");

    b.resolve(&cloud, STADIUM, "save", Choice::Device);

    let from_a = crate::save::n64::join([("fla", b"fla from A".as_slice()), ("mpk", b"mpk from A")]);
    assert_eq!(stadium_sync_backups(&b), [from_a]);
    b.sync_ok(&cloud);
    a.sync_ok(&cloud);
    assert_eq!(a.read("n64/Stadium.fla").unwrap(), b"fla from B");
    assert!(a.read("n64/Stadium.mpk").is_none());
}

#[test]
fn a_slot_changed_on_both_devices_is_a_conflict_of_its_own() {
    let (a, b, cloud) = devices("conflict-slot");
    a.write("gba/Emerald/states/slot-2.state", b"slot 0");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    a.write("gba/Emerald/states/slot-2.state", b"slot from A");
    a.write("gba/Emerald/states/slot-2.png", b"screenshot from A");
    b.write("gba/Emerald/states/slot-2.state", b"slot from B");
    a.sync_ok(&cloud);

    assert_eq!(b.sync(&cloud)[EMERALD].conflicts, ["slot-2"]);
    assert_eq!(b.cloud_screenshot(&cloud, EMERALD, "slot-2").unwrap(), b"screenshot from A");
    assert!(b.cloud_save(&cloud, EMERALD).is_none());
    b.resolve(&cloud, EMERALD, "slot-2", Choice::Cloud);

    assert_eq!(b.read("gba/Emerald/states/slot-2.state").unwrap(), b"slot from A");
    assert_eq!(b.read("gba/Emerald/states/slot-2.png").unwrap(), b"screenshot from A");
    assert!(sync_backups(&b).is_empty());
}

#[test]
fn a_deleted_slot_disappears_on_the_other_device() {
    let (a, b, cloud) = devices("delete");
    for file in ["state", "sav", "json"] {
        a.write(&format!("gba/Emerald/states/slot-1.{file}"), b"slot");
    }
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    for file in ["state", "sav", "json"] {
        a.remove(&format!("gba/Emerald/states/slot-1.{file}"));
    }
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    assert!(b.files("gba/Emerald/states").is_empty(), "{:?}", b.files("gba/Emerald/states"));
    assert!(cloud.records()[0]["files"].as_array().unwrap().is_empty());
}

#[test]
fn an_edit_beats_a_delete() {
    let (a, b, cloud) = devices("edit-beats-delete");
    a.write("gba/Emerald/states/slot-2.state", b"slot");
    a.write("gba/Emerald/states/slot-3.state", b"slot");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    a.remove("gba/Emerald/states/slot-2.state");
    b.write("gba/Emerald/states/slot-2.state", b"slot edited on B");
    b.remove("gba/Emerald/states/slot-3.state");
    a.write("gba/Emerald/states/slot-3.state", b"slot edited on A");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    a.sync_ok(&cloud);

    for device in [&a, &b] {
        assert_eq!(device.read("gba/Emerald/states/slot-2.state").unwrap(), b"slot edited on B", "{}", device.name);
        assert_eq!(device.read("gba/Emerald/states/slot-3.state").unwrap(), b"slot edited on A", "{}", device.name);
    }
}

#[test]
fn backups_with_the_same_name_on_both_devices_are_both_kept() {
    let (a, b, cloud) = devices("backups-merge");
    a.write("gba/Emerald/backups/2026-10-05_1412_start.sav", b"started on A");
    b.write("gba/Emerald/backups/2026-10-05_1412_start.sav", b"started on B");

    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    a.sync_ok(&cloud);

    for device in [&a, &b] {
        let mut kept: Vec<_> = device.backups(EMERALD).into_iter().map(|(_, bytes)| bytes).collect();
        kept.sort();
        assert_eq!(kept, [b"started on A".to_vec(), b"started on B".to_vec()], "{}", device.name);
    }
}

#[test]
fn an_upload_cut_off_partway_resumes_at_the_next_sync() {
    let (a, b, cloud) = devices("resume-upload");
    let save: Vec<u8> = (0..1000u32).map(|i| (i % 251) as u8).collect();
    a.write("gba/Emerald.sav", &save);
    cloud.drop_upload_after(400);

    let report = a.sync(&cloud);

    assert!(report[EMERALD].error.is_some());
    assert_eq!(cloud.uploaded_bytes(), 400);
    assert!(cloud.records().is_empty());
    a.sync_ok(&cloud);
    assert_eq!(cloud.uploaded_bytes(), 1000);
    b.sync_ok(&cloud);
    assert_eq!(b.read("gba/Emerald.sav").unwrap(), save);
}

#[test]
fn a_change_after_a_sync_stopped_before_it_forgot_the_upload_keeps_the_recorded_blob_until_a_new_record() {
    let (a, b, cloud) = devices("leftover-upload");
    a.write("gba/Emerald.sav", b"save 1");
    a.sync_ok(&cloud);
    let record = &cloud.records()[0];
    let (game, blob) = (record["id"].as_str().unwrap(), record["files"][0]["blob"].as_str().unwrap());
    let pending = PendingUpload { sha1: game_art::sha1_of(b"save 1"), blob: blob.into(), session: None };
    a.index.keep_sync_upload(game, "gba/Emerald.sav", &pending).unwrap();
    a.write("gba/Emerald.sav", b"save 2, longer than the first");
    cloud.drop_upload_after(4);

    assert!(a.sync(&cloud)[EMERALD].error.is_some());

    assert!(cloud.retired().is_empty());
    b.sync_ok(&cloud);
    assert_eq!(b.read("gba/Emerald.sav").unwrap(), b"save 1");
    a.sync_ok(&cloud);
    assert_eq!(cloud.retired(), [b"save 1".to_vec()]);
    b.sync_ok(&cloud);
    assert_eq!(b.read("gba/Emerald.sav").unwrap(), b"save 2, longer than the first");
}

#[test]
fn a_change_after_an_upload_no_record_names_retires_that_upload() {
    let (a, _, cloud) = devices("orphan-upload");
    a.write("gba/Emerald.sav", b"save 1");
    a.sync_ok(&cloud);
    let game = cloud.records()[0]["id"].as_str().unwrap().to_string();
    put_blob(&cloud, "orphan", b"save 2");
    let pending = PendingUpload { sha1: game_art::sha1_of(b"save 2"), blob: "orphan".into(), session: None };
    a.index.keep_sync_upload(&game, "gba/Emerald.sav", &pending).unwrap();
    a.write("gba/Emerald.sav", b"save 3, longer than the first");
    cloud.drop_upload_after(4);

    assert!(a.sync(&cloud)[EMERALD].error.is_some());

    assert_eq!(cloud.retired(), [b"save 2".to_vec()]);
}

#[test]
fn losing_the_sync_tables_uploads_nothing_when_the_files_match() {
    let (a, b, cloud) = devices("lost-tables");
    a.write("gba/Emerald.sav", b"save");
    a.write("gba/Emerald/states/resume.state", b"resume");
    a.write("gba/Emerald/states/slot-1.state", b"slot");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    let (uploaded, writes) = (cloud.uploaded_bytes(), cloud.record_writes());

    b.index.forget_sync().unwrap();
    b.sync_ok(&cloud);

    assert_eq!((cloud.uploaded_bytes(), cloud.record_writes()), (uploaded, writes));
    assert_eq!(b.read("gba/Emerald.sav").unwrap(), b"save");
}

#[test]
fn a_first_sync_with_a_different_save_is_a_conflict() {
    let (a, b, cloud) = devices("first-sync");
    a.write("gba/Emerald.sav", b"save from A");
    b.write("gba/Emerald.sav", b"save from B");

    a.sync_ok(&cloud);

    assert_eq!(b.sync(&cloud)[EMERALD].conflicts, ["save"]);
}

#[test]
fn reuses_the_rom_hash_game_art_worked_out() {
    let (a, _, cloud) = devices("rom-art");
    let (size, modified) = block_on(a.games.stat(EMERALD)).unwrap();
    let art = RomArtRow {
        path: EMERALD.into(),
        size: size as i64,
        mtime: millis(modified),
        sha1: "cached".into(),
        decoder_version: 0,
        status: "pending".into(),
    };
    a.index.keep_rom_art(&art, 0).unwrap();

    a.sync_ok(&cloud);

    assert_eq!(cloud.records()[0]["rom"]["sha1"], "cached");
}

#[test]
fn backs_off_when_the_cloud_asks_to_slow_down() {
    let (a, b, cloud) = devices("slow-down");
    a.write("gba/Emerald.sav", b"save");
    let waits = Arc::new(Mutex::new(Vec::new()));
    let sleep = {
        let waits = waits.clone();
        move |wait: Duration| -> BoxFuture<'static, ()> {
            waits.lock().unwrap().push(wait.as_secs());
            Box::pin(std::future::ready(()))
        }
    };
    cloud.slow_down(8);

    block_on(a.engine(&cloud, &sleep).sync_all()).unwrap();

    assert_eq!(*waits.lock().unwrap(), [1, 2, 4, 8, 16, 32, 60, 60]);
    b.sync_ok(&cloud);
    assert_eq!(b.read("gba/Emerald.sav").unwrap(), b"save");
}

#[test]
fn a_new_account_starts_over() {
    let (a, _, cloud) = devices("account");
    a.write("gba/Emerald.sav", b"save");
    a.sync_ok(&cloud);
    a.index.start_sync("someone-else@example.com").unwrap();

    assert!(a.index.synced_games().unwrap().is_empty());
    a.sync_ok(&cloud);
    assert_eq!(a.index.synced_games().unwrap().len(), 1);
}

#[test]
fn reads_a_record_again_when_another_device_wrote_it_first() {
    let (a, b, cloud) = devices("stale");
    a.write("gba/Emerald.sav", b"save 0");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    let id = b.index.synced_games().unwrap()[0].id.clone();
    let (version, json) = b.index.sync_record(&id).unwrap().unwrap();
    a.write("gba/Emerald.sav", b"save from A");
    a.sync_ok(&cloud);
    b.index.keep_sync_cursor(&block_on(cloud.provider().changes(None)).unwrap().cursor).unwrap();
    b.index.keep_sync_record(&id, &version, &json).unwrap();

    b.write("gba/Emerald/states/slot-1.state", b"slot from B");
    b.sync_ok(&cloud);
    a.sync_ok(&cloud);

    assert_eq!(b.read("gba/Emerald.sav").unwrap(), b"save from A");
    assert_eq!(a.read("gba/Emerald/states/slot-1.state").unwrap(), b"slot from B");
}

#[test]
fn devices_with_different_dumps_of_a_game_dont_rewrite_its_record_each_sync() {
    let (a, b, cloud) = devices("dumps");
    b.write(EMERALD, b"another emerald dump");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    let writes = cloud.record_writes();

    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    assert_eq!(cloud.record_writes(), writes);
}

#[test]
fn downloads_the_clouds_version_again_when_its_copy_is_gone() {
    let (_, b, cloud) = conflicted("conflict-copy-gone");
    std::fs::remove_dir_all(b.root.join(b.index.synced_games().unwrap()[0].id.clone())).unwrap();

    assert_eq!(b.sync(&cloud)[EMERALD].conflicts, ["save"]);
    b.resolve(&cloud, EMERALD, "save", Choice::Cloud);

    assert_eq!(b.read("gba/Emerald.sav").unwrap(), b"save from A");
}

#[test]
fn the_newer_copy_wins_for_files_beside_a_save_that_didnt_conflict() {
    let (a, b, cloud) = devices("newer");
    a.write("gba/Emerald.sav", b"save");
    a.write("gba/Emerald/states/resume.json", b"resume info 0");
    a.write("gba/Emerald/cheats.json", b"cheats 0");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    b.write("gba/Emerald/states/resume.json", b"older resume info from B");
    b.write("gba/Emerald/cheats.json", b"older cheats from B");
    std::thread::sleep(Duration::from_millis(5));
    a.write("gba/Emerald/states/resume.json", b"newer resume info from A");
    a.write("gba/Emerald/cheats.json", b"newer cheats from A");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    assert_eq!(b.read("gba/Emerald/states/resume.json").unwrap(), b"newer resume info from A");
    assert_eq!(b.read("gba/Emerald/cheats.json").unwrap(), b"newer cheats from A");
}

#[test]
fn codes_added_on_both_devices_end_up_on_both() {
    let (a, b, cloud) = devices("cheats-added");
    a.add_cheat("Rare candies", 1_000);
    b.add_cheat("Walk through walls", 2_000);

    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    a.sync_ok(&cloud);

    for device in [&a, &b] {
        assert_eq!(device.cheat_names(), ["Walk through walls", "Rare candies"], "{}", device.name);
    }
    assert_eq!(a.cheats(), b.cheats());
}

#[test]
fn the_newer_edit_of_a_code_changed_on_both_devices_wins() {
    for (renamed_at, turned_off_at) in [(2_000, 1_000), (1_000, 2_000)] {
        let (a, b, cloud) = devices(&format!("cheats-edited-{renamed_at}"));
        a.add_cheat("Rare candies", 0);
        a.sync_ok(&cloud);
        b.sync_ok(&cloud);
        let id = a.cheat_id("Rare candies");

        a.change_cheats(|codes, platform| {
            cheats::edit(codes, platform, &id, "Lots of candies", "82025840 0063", renamed_at)
        });
        b.change_cheats(|codes, platform| cheats::toggle(codes, platform, &id, false, turned_off_at));
        a.sync_ok(&cloud);
        b.sync_ok(&cloud);
        a.sync_ok(&cloud);

        let newer = if renamed_at > turned_off_at { ("Lots of candies", true) } else { ("Rare candies", false) };
        for device in [&a, &b] {
            let code = &device.cheats()[0];
            assert_eq!((code.name.as_str(), code.on), newer, "{}", device.name);
        }
    }
}

#[test]
fn a_code_deleted_on_one_device_and_edited_on_the_other_stays() {
    let (a, b, cloud) = devices("cheats-edit-beats-delete");
    a.add_cheat("Rare candies", 0);
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    let id = a.cheat_id("Rare candies");

    a.change_cheats(|codes, _| cheats::delete(codes, &id));
    b.change_cheats(|codes, platform| cheats::edit(codes, platform, &id, "Lots of candies", "82025840 0063", 1_000));
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    a.sync_ok(&cloud);

    for device in [&a, &b] {
        assert_eq!(device.cheat_names(), ["Lots of candies"], "{}", device.name);
    }
}

#[test]
fn a_code_deleted_on_one_device_and_unchanged_on_the_other_is_gone() {
    let (a, b, cloud) = devices("cheats-deleted");
    a.add_cheat("Rare candies", 0);
    a.add_cheat("Walk through walls", 0);
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    let (deleted, edited) = (a.cheat_id("Rare candies"), a.cheat_id("Walk through walls"));

    a.change_cheats(|codes, _| cheats::delete(codes, &deleted));
    b.change_cheats(|codes, platform| cheats::toggle(codes, platform, &edited, false, 1_000));
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    a.sync_ok(&cloud);

    for device in [&a, &b] {
        assert_eq!(device.cheat_names(), ["Walk through walls"], "{}", device.name);
        assert!(!device.cheats()[0].on, "{}", device.name);
    }
}

#[test]
fn without_the_last_synced_list_a_merge_keeps_every_code_from_both_devices() {
    let (a, b, cloud) = devices("cheats-base-lost");
    a.add_cheat("Rare candies", 0);
    a.add_cheat("Walk through walls", 0);
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    let (on_a, on_b) = (a.cheat_id("Rare candies"), b.cheat_id("Walk through walls"));

    a.change_cheats(|codes, _| cheats::delete(codes, &on_a));
    b.change_cheats(|codes, _| cheats::delete(codes, &on_b));
    a.add_cheat("Max money", 1_000);
    a.sync_ok(&cloud);
    std::fs::remove_dir_all(&b.cheat_bases).unwrap();
    b.sync_ok(&cloud);
    a.sync_ok(&cloud);

    for device in [&a, &b] {
        assert_eq!(device.cheat_names(), ["Rare candies", "Walk through walls", "Max money"], "{}", device.name);
    }
}

fn syncing_games(test: &str) -> (Device, Device, TestCloud) {
    let (a, b) = (device(test, "A"), device(test, "B"));
    a.sync_games(true);
    b.sync_games(true);
    a.write(EMERALD, b"emerald rom");
    (a, b, TestCloud::new())
}

#[test]
fn with_sync_games_on_a_rom_added_on_one_device_is_cloud_only_on_the_other_until_it_opens() {
    let (a, b, cloud) = syncing_games("rom");
    a.write("gba/Emerald.sav", b"save from A");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    assert_eq!(b.cloud_games(&cloud), [EMERALD]);
    assert!(b.read(EMERALD).is_none());

    b.download_rom(&cloud, EMERALD).unwrap();
    b.sync_ok(&cloud);

    assert_eq!(b.read(EMERALD).unwrap(), b"emerald rom");
    assert_eq!(b.read("gba/Emerald.sav").unwrap(), b"save from A");
    assert!(b.cloud_games(&cloud).is_empty());
    assert_eq!(cloud.records().len(), 1);
}

#[test]
fn turning_sync_games_off_keeps_cloud_only_games_listed_and_the_roms_in_the_cloud() {
    let (a, b, cloud) = syncing_games("rom-off");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    let blobs = cloud.blobs().len();

    b.sync_games(false);
    a.sync_games(false);
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    assert_eq!(b.cloud_games(&cloud), [EMERALD]);
    assert_eq!(cloud.blobs().len(), blobs);
}

#[test]
fn with_sync_games_off_a_device_still_lists_and_downloads_games_already_in_the_cloud() {
    let (a, b, cloud) = syncing_games("rom-off-download");
    b.sync_games(false);
    a.write("gba/Emerald.sav", b"save from A");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    assert_eq!(b.cloud_games(&cloud), [EMERALD]);

    b.download_rom(&cloud, EMERALD).unwrap();
    b.sync_ok(&cloud);

    assert_eq!(b.read(EMERALD).unwrap(), b"emerald rom");
    assert_eq!(b.read("gba/Emerald.sav").unwrap(), b"save from A");
    assert!(b.cloud_games(&cloud).is_empty());
}

#[test]
fn with_sync_games_off_roms_never_upload() {
    let (a, b, cloud) = syncing_games("roms-off");
    a.sync_games(false);
    a.write("gba/Emerald.sav", b"save");

    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    assert_eq!(cloud.uploaded_bytes(), 4);
    assert!(cloud.records()[0]["rom"].get("blob").is_none());
    assert!(b.cloud_games(&cloud).is_empty());
}

#[test]
fn removing_a_game_from_a_device_keeps_it_in_the_cloud() {
    let (a, _, cloud) = syncing_games("remove");
    a.write("gba/Emerald.sav", b"save");
    a.write("gba/Emerald/states/slot-1.state", b"slot");
    a.sync_ok(&cloud);
    let (records, blobs, writes) = (cloud.records(), cloud.blobs().len(), cloud.record_writes());

    a.remove_from_device(&cloud, EMERALD).unwrap();
    a.sync_ok(&cloud);

    assert!(a.files("gba").is_empty(), "{:?}", a.files("gba"));
    assert_eq!(a.cloud_games(&cloud), [EMERALD]);
    assert_eq!((cloud.records(), cloud.blobs().len(), cloud.record_writes()), (records.clone(), blobs, writes));
    a.download_rom(&cloud, EMERALD).unwrap();
    a.sync_ok(&cloud);
    assert_eq!(a.read("gba/Emerald.sav").unwrap(), b"save");
    assert_eq!(a.read("gba/Emerald/states/slot-1.state").unwrap(), b"slot");
    assert_eq!((cloud.records(), cloud.record_writes()), (records, writes));
}

#[test]
fn a_game_stays_on_the_device_until_the_cloud_has_its_rom_and_files() {
    let (a, _, cloud) = syncing_games("remove-unsynced");
    a.sync_games(false);
    a.sync_ok(&cloud);
    assert!(a.remove_from_device(&cloud, EMERALD).is_err());

    a.sync_games(true);
    a.sync_ok(&cloud);
    a.write("gba/Emerald.sav", b"save not synced");
    assert!(a.remove_from_device(&cloud, EMERALD).is_err());

    assert_eq!(a.read(EMERALD).unwrap(), b"emerald rom");
    assert_eq!(a.read("gba/Emerald.sav").unwrap(), b"save not synced");
}

#[test]
fn deleting_a_game_removes_it_from_every_device() {
    let (a, b, cloud) = syncing_games("delete-game");
    a.write("gba/Emerald.sav", b"save");
    a.write("gba/Emerald/backups/2026-10-05_1412_edit.sav", b"backup");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    b.download_rom(&cloud, EMERALD).unwrap();
    b.sync_ok(&cloud);

    a.delete(&cloud, EMERALD);
    b.sync_ok(&cloud);
    a.sync_ok(&cloud);

    for device in [&a, &b] {
        assert!(device.files("gba").is_empty(), "{}: {:?}", device.name, device.files("gba"));
        assert!(device.cloud_games(&cloud).is_empty(), "{}", device.name);
    }
    assert!(cloud.records().is_empty());
    assert!(cloud.blobs().is_empty());
}

#[test]
fn box_art_chosen_on_one_device_shows_on_the_other() {
    let (a, b, cloud) = devices("box-art");
    a.choose_box_art(EMERALD, "box-art.png", b"png from A");

    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    assert_eq!(b.read("gba/Emerald/box-art.png").unwrap(), b"png from A");
}

#[test]
fn with_sync_games_on_a_cloud_only_games_box_art_comes_down_before_its_rom() {
    let (a, b, cloud) = syncing_games("box-art-cloud-only");
    a.choose_box_art(EMERALD, "box-art.png", b"png from A");
    a.write("gba/Emerald.sav", b"save");
    a.write("gba/Emerald/states/slot-1.state", b"slot");

    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    assert_eq!(b.cloud_games(&cloud), [EMERALD]);
    assert!(b.read(EMERALD).is_none());
    assert_eq!(b.files("gba/Emerald"), ["box-art.png"]);
    assert_eq!(b.read("gba/Emerald/box-art.png").unwrap(), b"png from A");
    assert!(b.read("gba/Emerald.sav").is_none());

    let writes = cloud.record_writes();
    b.download_rom(&cloud, EMERALD).unwrap();
    b.sync_ok(&cloud);
    assert_eq!(b.read("gba/Emerald.sav").unwrap(), b"save");
    assert_eq!(b.read("gba/Emerald/box-art.png").unwrap(), b"png from A");
    assert_eq!(cloud.record_writes(), writes);
}

#[test]
fn a_cloud_only_games_box_art_follows_changes_on_another_device() {
    let (a, b, cloud) = syncing_games("box-art-cloud-only-changes");
    a.choose_box_art(EMERALD, "box-art.png", b"png from A");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    a.choose_box_art(EMERALD, "box-art.none", b"");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    assert_eq!(b.files("gba/Emerald"), ["box-art.none"]);

    a.choose_box_art(EMERALD, "box-art.jpg", b"jpg from A");
    a.rename(EMERALD, "gba/Hacks/Emerald (Hack).gba");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    assert_eq!(b.cloud_games(&cloud), ["gba/Hacks/Emerald (Hack).gba"]);
    assert_eq!(b.files("gba/Hacks/Emerald (Hack)"), ["box-art.jpg"]);
    assert!(b.files("gba").iter().all(|name| name != "Emerald"), "{:?}", b.files("gba"));

    a.delete(&cloud, "gba/Hacks/Emerald (Hack).gba");
    b.sync_ok(&cloud);
    assert!(b.files("gba/Hacks").is_empty(), "{:?}", b.files("gba/Hacks"));
}

#[test]
fn box_art_chosen_for_a_cloud_only_game_stays_until_its_rom_comes_down_and_the_newer_choice_wins() {
    let (a, b, cloud) = syncing_games("box-art-cloud-only-chosen");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    a.choose_box_art(EMERALD, "box-art.png", b"png from A");
    std::thread::sleep(Duration::from_millis(5));
    b.choose_box_art(EMERALD, "box-art.jpg", b"jpg from B");

    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    assert_eq!(b.files("gba/Emerald"), ["box-art.jpg"]);

    b.download_rom(&cloud, EMERALD).unwrap();
    b.sync_ok(&cloud);
    a.sync_ok(&cloud);
    for device in [&a, &b] {
        assert_eq!(device.files("gba/Emerald"), ["box-art.jpg"], "{}", device.name);
    }
}

#[test]
fn box_art_chosen_on_both_devices_offline_ends_up_as_the_one_chosen_last() {
    for last_syncs_first in [false, true] {
        let (a, b, cloud) = devices(&format!("box-art-newer-{last_syncs_first}"));
        a.sync_ok(&cloud);
        b.sync_ok(&cloud);

        a.choose_box_art(EMERALD, "box-art.png", b"png from A");
        std::thread::sleep(Duration::from_millis(5));
        b.choose_box_art(EMERALD, "box-art.jpg", b"jpg from B");
        let (first, second) = if last_syncs_first { (&b, &a) } else { (&a, &b) };
        first.sync_ok(&cloud);
        second.sync_ok(&cloud);
        first.sync_ok(&cloud);

        for device in [&a, &b] {
            assert_eq!(device.files("gba/Emerald"), ["box-art.jpg"], "{} {last_syncs_first}", device.name);
            assert_eq!(device.read("gba/Emerald/box-art.jpg").unwrap(), b"jpg from B");
        }
    }
}

#[test]
fn choosing_no_box_art_on_one_device_takes_the_box_art_off_the_other() {
    let (a, b, cloud) = devices("box-art-none");
    a.choose_box_art(EMERALD, "box-art.png", b"png from A");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    a.choose_box_art(EMERALD, "box-art.none", b"");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    assert_eq!(b.files("gba/Emerald"), ["box-art.none"]);
}

#[test]
fn renaming_a_rom_moves_its_box_art_on_the_other_device() {
    let (a, b, cloud) = devices("box-art-rename");
    a.choose_box_art(EMERALD, "box-art.png", b"png from A");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    a.rename(EMERALD, "gba/Hacks/Emerald (Hack).gba");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    assert_eq!(b.read("gba/Hacks/Emerald (Hack)/box-art.png").unwrap(), b"png from A");
    assert!(b.read("gba/Emerald/box-art.png").is_none());
}

#[test]
fn a_copy_kept_on_one_device_is_there_for_a_transfer_forward_on_the_other() {
    let (a, b, cloud) = devices("kept-copy");
    a.keep(kept(KADABRA, 5, "Black"));

    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    assert_eq!(b.kept_copies(&[KADABRA]), [kept(KADABRA, 5, "Black")]);
}

#[test]
fn the_newer_generations_copy_wins_on_both_devices() {
    for (first, second) in [(0, 1), (1, 0)] {
        let (a, b, cloud) = devices(&format!("kept-newer-{first}"));
        a.keep(kept(KADABRA, 5, "Black"));
        b.keep(kept(KADABRA, 4, "Platinum"));
        let both = [&a, &b];

        both[first].sync_ok(&cloud);
        both[second].sync_ok(&cloud);
        both[first].sync_ok(&cloud);

        for device in both {
            assert_eq!(device.kept_copies(&[KADABRA]), [kept(KADABRA, 5, "Black")], "{}", device.name);
        }
    }
}

#[test]
fn the_newer_copy_of_the_same_generation_wins() {
    let (a, b, cloud) = devices("kept-same-generation");
    b.keep(kept(KADABRA, 4, "Platinum"));
    std::thread::sleep(Duration::from_millis(5));
    a.keep(kept(KADABRA, 4, "HeartGold"));

    b.sync_ok(&cloud);
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    for device in [&a, &b] {
        assert_eq!(device.kept_copies(&[KADABRA]), [kept(KADABRA, 4, "HeartGold")], "{}", device.name);
    }
}

#[test]
fn a_copy_replaced_after_a_sync_reaches_the_other_device() {
    let (a, b, cloud) = devices("kept-replaced");
    a.keep(kept(KADABRA, 4, "Platinum"));
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    b.keep(kept(KADABRA, 5, "Black"));
    b.sync_ok(&cloud);
    a.sync_ok(&cloud);

    assert_eq!(a.kept_copies(&[KADABRA]), [kept(KADABRA, 5, "Black")]);
}

fn cloud_skins(cloud: &TestCloud) -> Option<crate::skins::Skins> {
    let record = block_on(cloud.provider().read_record("skins")).unwrap()?;
    Some(serde_json::from_slice(&record.json).unwrap())
}

#[test]
fn a_skin_chosen_on_one_device_goes_up_to_the_cloud() {
    let (a, _, cloud) = devices("skin-up");
    a.choose_skin("gba", "glacier", 5);

    a.sync_ok(&cloud);

    assert_eq!(cloud_skins(&cloud), Some(crate::skins::Skins::from([("gba".into(), skin("glacier", 5))])));
}

#[test]
fn a_skin_chosen_on_one_device_comes_down_to_the_other() {
    let (a, b, cloud) = devices("skin-down");
    b.choose_skin("gb", "classic-grey", 3);
    a.choose_skin("gba", "glacier", 5);

    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    let both = crate::skins::Skins::from([("gb".into(), skin("classic-grey", 3)), ("gba".into(), skin("glacier", 5))]);
    assert_eq!(b.skins(), both);
    assert_eq!(cloud_skins(&cloud), Some(both));
}

#[test]
fn the_newer_skin_choice_wins_on_both_devices() {
    for (first, second) in [(0, 1), (1, 0)] {
        let (a, b, cloud) = devices(&format!("skin-newer-{first}"));
        a.choose_skin("gba", "glacier", 5);
        a.choose_skin("nds", "crimson", 9);
        b.choose_skin("gba", "black", 7);
        b.choose_skin("nds", "polar-white", 8);
        let both = [&a, &b];

        both[first].sync_ok(&cloud);
        both[second].sync_ok(&cloud);
        both[first].sync_ok(&cloud);

        let newest = crate::skins::Skins::from([("gba".into(), skin("black", 7)), ("nds".into(), skin("crimson", 9))]);
        for device in both {
            assert_eq!(device.skins(), newest, "{}", device.name);
        }
    }
}

#[test]
fn no_skins_record_goes_up_until_a_skin_is_chosen() {
    let (a, b, cloud) = devices("skin-missing");

    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    assert_eq!(cloud_skins(&cloud), None);
    assert_eq!(b.skins(), crate::skins::Skins::new());
}

#[test]
fn a_skin_chosen_after_the_other_device_synced_reaches_it() {
    let (a, b, cloud) = devices("skin-later");
    a.choose_skin("gba", "glacier", 5);
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    b.choose_skin("gba", "black", 6);
    b.sync_ok(&cloud);
    a.sync_ok(&cloud);

    assert_eq!(a.skins()["gba"], skin("black", 6));
}

const RED_KEY: &str = "GB-00001-524544-ABCD";

#[test]
fn a_marker_wins_over_a_copy_on_another_device() {
    for (first, second) in [(0, 1), (1, 0)] {
        let (a, b, cloud) = devices(&format!("kept-marker-{first}"));
        a.keep(kept_as(KADABRA, RED_KEY, 5, "Black"));
        a.keep(kept_as("ABRA-00002-00000", RED_KEY, 5, "Black"));
        b.keep(kept_as(KADABRA, RED_KEY, 5, "Black"));
        let both = [&a, &b];

        both[first].sync_ok(&cloud);
        both[second].sync_ok(&cloud);
        both[first].sync_ok(&cloud);

        for device in both {
            assert_eq!(device.kept_copies(&[RED_KEY]), [kept_copies::marker(RED_KEY)], "{}", device.name);
        }
    }
}

#[test]
fn copies_of_two_pokemon_under_one_key_become_a_marker() {
    let (a, b, cloud) = devices("kept-clash");
    a.keep(kept_as(KADABRA, RED_KEY, 5, "Black"));
    b.keep(kept_as("ABRA-00002-00000", RED_KEY, 5, "White"));

    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    a.sync_ok(&cloud);

    for device in [&a, &b] {
        assert_eq!(device.kept_copies(&[RED_KEY]), [kept_copies::marker(RED_KEY)], "{}", device.name);
        assert_eq!(device.kept_copies(&[KADABRA]), [kept_as(KADABRA, RED_KEY, 5, "Black")], "{}", device.name);
    }
}

#[test]
fn syncing_kept_copies_again_writes_nothing() {
    let (a, b, cloud) = devices("kept-unchanged");
    a.keep(kept(KADABRA, 5, "Black"));
    b.keep(kept("ABRA-00002-00000", 4, "Platinum"));
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    a.sync_ok(&cloud);
    let writes = cloud.record_writes();

    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    assert_eq!(cloud.record_writes(), writes);
    assert_eq!(cloud.records().len(), 3);
}

fn put_blob(cloud: &TestCloud, blob: &str, bytes: &[u8]) {
    let provider = cloud.provider();
    let session = block_on(provider.start_upload(blob, bytes.len() as u64, &game_art::sha1_of(bytes))).unwrap();
    block_on(provider.upload(&session, 0, &mut &bytes[..], &|_| {})).unwrap();
}

fn get_blob(cloud: &TestCloud, blob: &str) -> Result<Vec<u8>, Error> {
    let mut bytes = Vec::new();
    block_on(cloud.provider().download(blob, &mut bytes))?;
    Ok(bytes)
}

#[test]
fn a_retired_blob_still_downloads_but_no_record_uses_it() {
    let cloud = TestCloud::new();
    put_blob(&cloud, "blob-1", b"old save");

    block_on(cloud.provider().retire_blob("blob-1")).unwrap();
    block_on(cloud.provider().retire_blob("blob-1")).unwrap();

    assert_eq!(get_blob(&cloud, "blob-1").unwrap(), b"old save");
    assert!(cloud.blobs().is_empty());
}

#[test]
fn purging_deletes_only_blobs_retired_longer_ago_than_asked() {
    let cloud = TestCloud::new();
    for blob in ["old", "recent", "live"] {
        put_blob(&cloud, blob, blob.as_bytes());
    }
    for (blob, days) in [("old", 31), ("recent", 29)] {
        block_on(cloud.provider().retire_blob(blob)).unwrap();
        cloud.retired_days_ago(blob, days);
    }

    block_on(cloud.provider().purge_retired(RETIRED_FOR)).unwrap();

    assert!(get_blob(&cloud, "old").is_err());
    assert_eq!(get_blob(&cloud, "recent").unwrap(), b"recent");
    assert_eq!(get_blob(&cloud, "live").unwrap(), b"live");
}

const RED: &str = "gb/Red.gb";
const CRYSTAL: &str = "gbc/Crystal.gbc";

fn three_games(test: &str) -> (Device, Device, TestCloud) {
    let (a, b, cloud) = (device(test, "A"), device(test, "B"), TestCloud::new());
    for (rom, save) in [(RED, "gb/Red.sav"), (CRYSTAL, "gbc/Crystal.sav"), (EMERALD, "gba/Emerald.sav")] {
        a.write(rom, rom.as_bytes());
        a.write(save, b"save");
    }
    (a, b, cloud)
}

// The engine asks whether a game waits to open before each game, so this moves the phone to mobile data
// once the first game's save is up.
fn sync_moving_to_mobile_data(a: &Device, cloud: &TestCloud) -> (Result<Report, Error>, Recorded) {
    let before = cloud.uploaded_bytes();
    let moves = || {
        if cloud.uploaded_bytes() > before {
            a.metered.store(true, Ordering::Relaxed);
        }
        false
    };
    let events = Recorded::default();
    let report = block_on(Engine { events: &events, others_waiting: &moves, ..a.engine(cloud, &no_wait) }.sync_all());
    (report, events)
}

#[test]
fn with_sync_on_mobile_data_off_games_after_a_move_to_mobile_data_wait() {
    let (a, _, cloud) = three_games("mobile-data-mid-run");
    a.mobile_data.store(false, Ordering::Relaxed);

    let (report, events) = sync_moving_to_mobile_data(&a, &cloud);

    let report = report.unwrap();
    assert_eq!(report.keys().collect::<Vec<_>>(), [RED]);
    assert!(report[RED].error.is_none(), "{report:?}");
    assert_eq!(cloud.uploaded_bytes(), 4);
    assert_eq!(cloud.records().len(), 1);
    assert_eq!(cloud.records()[0]["rom"]["path"], RED);
    for rom in [CRYSTAL, EMERALD] {
        assert_eq!(events.states(rom).last(), Some(&GameState::Waiting { reason: Wait::MobileData }), "{rom}");
    }
    assert_eq!(events.last_run(), Some(RunProgress::Transferring { done: 4, total: 4, waiting_roms: vec![] }));
    a.metered.store(false, Ordering::Relaxed);
    a.sync_ok(&cloud);
    assert_eq!(cloud.uploaded_bytes(), 12);
}

#[test]
fn a_full_sync_stopped_by_mobile_data_sends_no_rom_box_art_or_kept_copy() {
    let (a, b, cloud) = three_games("mobile-data-mid-run-full");
    a.sync_games(true);
    b.sync_games(true);
    b.write(RUBY, b"ruby rom");
    b.choose_box_art(RUBY, "box-art.png", b"png from B");
    b.sync_ok(&cloud);
    a.keep(kept(KADABRA, 5, "Black"));
    a.mobile_data.store(false, Ordering::Relaxed);
    let uploaded = cloud.uploaded_bytes();

    let (report, events) = sync_moving_to_mobile_data(&a, &cloud);

    report.unwrap();
    assert_eq!(cloud.uploaded_bytes(), uploaded + 4);
    assert!(events.box_art().is_empty());
    assert!(a.read("gba/Ruby/box-art.png").is_none());
    let Some(RunProgress::Transferring { mut waiting_roms, .. }) = events.last_run() else { panic!() };
    waiting_roms.sort();
    assert_eq!(waiting_roms, [RED, EMERALD, CRYSTAL]);
    b.sync_ok(&cloud);
    assert!(b.kept_copies(&[KADABRA]).is_empty());
    assert!(b.cloud_games(&cloud).is_empty());
}

#[test]
fn with_sync_on_mobile_data_on_a_move_to_mobile_data_still_sends_saves() {
    let (a, _, cloud) = three_games("mobile-data-on-mid-run");

    let (report, _) = sync_moving_to_mobile_data(&a, &cloud);

    let report = report.unwrap();
    assert!(a.metered.load(Ordering::Relaxed));
    assert_eq!(report.len(), 3, "{report:?}");
    assert!(report.values().all(|synced| synced.error.is_none()), "{report:?}");
    assert_eq!(cloud.uploaded_bytes(), 12);
}
