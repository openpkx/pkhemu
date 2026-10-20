use std::ffi::{c_char, c_int, c_uint, c_void, CStr, CString};
use std::fs::{File, OpenOptions};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use std::os::unix::fs::FileExt;

const ACCESS_READ: c_uint = 1;
const ACCESS_WRITE: c_uint = 2;
const ACCESS_UPDATE_EXISTING: c_uint = 4;
const SEEK_START: c_int = 0;
const SEEK_CURRENT: c_int = 1;
const SEEK_END: c_int = 2;
const VERSION: u32 = 2;
pub const DIRECTORY_VERSION: u32 = 4;
const STAT_VALID: c_int = 1;
const STAT_DIRECTORY: c_int = 2;

#[repr(C)]
pub struct Interface {
    get_path: unsafe extern "C" fn(*mut Handle) -> *const c_char,
    open: unsafe extern "C" fn(*const c_char, c_uint, c_uint) -> *mut Handle,
    close: unsafe extern "C" fn(*mut Handle) -> c_int,
    size: unsafe extern "C" fn(*mut Handle) -> i64,
    tell: unsafe extern "C" fn(*mut Handle) -> i64,
    seek: unsafe extern "C" fn(*mut Handle, i64, c_int) -> i64,
    read: unsafe extern "C" fn(*mut Handle, *mut c_void, u64) -> i64,
    write: unsafe extern "C" fn(*mut Handle, *const c_void, u64) -> i64,
    flush: unsafe extern "C" fn(*mut Handle) -> c_int,
    remove: unsafe extern "C" fn(*const c_char) -> c_int,
    rename: unsafe extern "C" fn(*const c_char, *const c_char) -> c_int,
    truncate: unsafe extern "C" fn(*mut Handle, i64) -> i64,
    stat: unsafe extern "C" fn(*const c_char, *mut i32) -> c_int,
    mkdir: unsafe extern "C" fn(*const c_char) -> c_int,
    opendir: unsafe extern "C" fn(*const c_char, bool) -> *mut Dir,
    readdir: unsafe extern "C" fn(*mut Dir) -> bool,
    dirent_get_name: unsafe extern "C" fn(*mut Dir) -> *const c_char,
    dirent_is_dir: unsafe extern "C" fn(*mut Dir) -> bool,
    closedir: unsafe extern "C" fn(*mut Dir) -> c_int,
    stat_64: unsafe extern "C" fn(*const c_char, *mut i64) -> c_int,
}

#[repr(C)]
pub struct InterfaceInfo {
    version: u32,
    interface: *const Interface,
}

static INTERFACE: Interface = Interface {
    get_path,
    open,
    close,
    size,
    tell,
    seek,
    read,
    write,
    flush,
    remove,
    rename,
    truncate,
    stat,
    mkdir,
    opendir,
    readdir,
    dirent_get_name,
    dirent_is_dir,
    closedir,
    stat_64,
};

// The game a core reads by a path it couldn't open itself, such as a SAF file's /proc entry on Android.
static GAME: Mutex<Option<(String, File)>> = Mutex::new(None);

pub fn serve_game(path: &str, file: &File) -> Result<(), String> {
    let file = file.try_clone().map_err(|e| format!("{path}: {e}"))?;
    *GAME.lock().unwrap_or_else(|e| e.into_inner()) = Some((path.to_owned(), file));
    Ok(())
}

pub fn stop_serving_game() {
    GAME.lock().unwrap_or_else(|e| e.into_inner()).take();
}

// Dolphin puts the disc's region in a card's name, so card.raw opens as card.EUR.raw. The app can't tell the region
// Dolphin will read from a compressed disc, so the card answers to any.
static CARD: Mutex<Option<PathBuf>> = Mutex::new(None);

pub fn serve_card(card: Option<PathBuf>) {
    *CARD.lock().unwrap_or_else(|e| e.into_inner()) = card;
}

fn card(path: &str) -> Option<PathBuf> {
    let card = CARD.lock().unwrap_or_else(|e| e.into_inner()).clone()?;
    let (asked, stem) = (Path::new(path), card.file_stem()?.to_str()?);
    let region = asked.file_name()?.to_str()?.strip_prefix(stem)?.strip_prefix('.')?.strip_suffix(".raw")?;
    (!region.is_empty() && asked.parent() == card.parent()).then_some(card)
}

/// Answers RETRO_ENVIRONMENT_GET_VFS_INTERFACE with the version the app gives.
pub unsafe fn answer(info: *mut InterfaceInfo) -> bool {
    answer_up_to(info, VERSION)
}

pub unsafe fn answer_up_to(info: *mut InterfaceInfo, version: u32) -> bool {
    let info = &mut *info;
    if info.version > version {
        return false;
    }
    info.version = version;
    info.interface = &INTERFACE;
    true
}

pub struct Handle {
    path: CString,
    file: File,
    position: u64,
}

fn game(path: &str) -> Option<File> {
    let game = GAME.lock().unwrap_or_else(|e| e.into_inner());
    game.as_ref().filter(|(served, _)| served == path).and_then(|(_, file)| file.try_clone().ok())
}

fn open_file(path: &Path, mode: c_uint) -> std::io::Result<File> {
    let write = mode & ACCESS_WRITE != 0;
    let fresh = write && mode & ACCESS_UPDATE_EXISTING == 0;
    OpenOptions::new().read(mode & ACCESS_READ != 0 || !write).write(write).create(fresh).truncate(fresh).open(path)
}

unsafe extern "C" fn open(path: *const c_char, mode: c_uint, _hints: c_uint) -> *mut Handle {
    if path.is_null() {
        return std::ptr::null_mut();
    }
    let path = CStr::from_ptr(path);
    let text = path.to_string_lossy();
    let file = match game(&text) {
        Some(file) if mode & ACCESS_WRITE == 0 => Ok(file),
        Some(_) => return std::ptr::null_mut(),
        None => open_file(&card(&text).unwrap_or_else(|| PathBuf::from(&*text)), mode),
    };
    match file {
        Ok(file) => Box::into_raw(Box::new(Handle { path: path.to_owned(), file, position: 0 })),
        Err(_) => std::ptr::null_mut(),
    }
}

unsafe extern "C" fn close(handle: *mut Handle) -> c_int {
    if !handle.is_null() {
        drop(Box::from_raw(handle));
    }
    0
}

unsafe extern "C" fn get_path(handle: *mut Handle) -> *const c_char {
    (*handle).path.as_ptr()
}

unsafe extern "C" fn size(handle: *mut Handle) -> i64 {
    (*handle).file.metadata().map_or(-1, |metadata| metadata.len() as i64)
}

unsafe extern "C" fn tell(handle: *mut Handle) -> i64 {
    (*handle).position as i64
}

// libretro.h says seek returns the new position, but libretro-common's own VFS returns fseeko's 0 and Azahar
// counts anything else as a failed seek.
unsafe extern "C" fn seek(handle: *mut Handle, offset: i64, from: c_int) -> i64 {
    let handle = &mut *handle;
    let base = match from {
        SEEK_START => 0,
        SEEK_CURRENT => handle.position as i64,
        SEEK_END => size(handle),
        _ => return -1,
    };
    match base.checked_add(offset).filter(|&position| base >= 0 && position >= 0) {
        Some(position) => {
            handle.position = position as u64;
            0
        }
        None => -1,
    }
}

// Reads and writes go by position, so handles to the same file never move each other.
// Dolphin reads and writes nothing from a null buffer, which isn't a slice.
unsafe extern "C" fn read(handle: *mut Handle, buffer: *mut c_void, length: u64) -> i64 {
    if length == 0 {
        return 0;
    }
    let handle = &mut *handle;
    let buffer = std::slice::from_raw_parts_mut(buffer as *mut u8, length as usize);
    let mut done = 0;
    while done < buffer.len() {
        match handle.file.read_at(&mut buffer[done..], handle.position + done as u64) {
            Ok(0) => break,
            Ok(read) => done += read,
            Err(e) if e.kind() == std::io::ErrorKind::Interrupted => {}
            Err(_) => return -1,
        }
    }
    handle.position += done as u64;
    done as i64
}

unsafe extern "C" fn write(handle: *mut Handle, buffer: *const c_void, length: u64) -> i64 {
    if length == 0 {
        return 0;
    }
    let handle = &mut *handle;
    let buffer = std::slice::from_raw_parts(buffer as *const u8, length as usize);
    match handle.file.write_all_at(buffer, handle.position) {
        Ok(()) => {
            handle.position += length;
            length as i64
        }
        Err(_) => -1,
    }
}

unsafe extern "C" fn flush(handle: *mut Handle) -> c_int {
    use std::io::Write;
    if (*handle).file.flush().is_ok() {
        0
    } else {
        -1
    }
}

unsafe extern "C" fn truncate(handle: *mut Handle, length: i64) -> i64 {
    match u64::try_from(length).map(|length| (*handle).file.set_len(length)) {
        Ok(Ok(())) => 0,
        _ => -1,
    }
}

unsafe extern "C" fn remove(path: *const c_char) -> c_int {
    let path = CStr::from_ptr(path).to_string_lossy();
    if std::fs::remove_file(&*path).is_ok() {
        0
    } else {
        -1
    }
}

unsafe extern "C" fn rename(from: *const c_char, to: *const c_char) -> c_int {
    let (from, to) = (CStr::from_ptr(from).to_string_lossy(), CStr::from_ptr(to).to_string_lossy());
    if std::fs::rename(&*from, &*to).is_ok() {
        0
    } else {
        -1
    }
}

unsafe extern "C" fn stat_64(path: *const c_char, size: *mut i64) -> c_int {
    let text = CStr::from_ptr(path).to_string_lossy();
    let metadata = match game(&text) {
        Some(file) => file.metadata(),
        None => std::fs::metadata(card(&text).unwrap_or_else(|| PathBuf::from(&*text))),
    };
    match metadata {
        Ok(metadata) => {
            if !size.is_null() {
                *size = metadata.len() as i64;
            }
            STAT_VALID | if metadata.is_dir() { STAT_DIRECTORY } else { 0 }
        }
        Err(_) => 0,
    }
}

unsafe extern "C" fn stat(path: *const c_char, size: *mut i32) -> c_int {
    let mut long = 0;
    let flags = stat_64(path, &mut long);
    if !size.is_null() {
        *size = long.min(i32::MAX as i64) as i32;
    }
    flags
}

unsafe extern "C" fn mkdir(dir: *const c_char) -> c_int {
    match std::fs::create_dir(&*CStr::from_ptr(dir).to_string_lossy()) {
        Ok(()) => 0,
        Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => -2,
        Err(_) => -1,
    }
}

pub struct Dir {
    entries: Vec<(CString, bool)>,
    next: usize,
}

unsafe extern "C" fn opendir(dir: *const c_char, include_hidden: bool) -> *mut Dir {
    let Ok(read) = std::fs::read_dir(&*CStr::from_ptr(dir).to_string_lossy()) else { return std::ptr::null_mut() };
    let entries = read
        .flatten()
        .filter_map(|entry| {
            let name = entry.file_name().to_string_lossy().into_owned();
            let shown = include_hidden || !name.starts_with('.');
            let is_dir = entry.file_type().is_ok_and(|kind| kind.is_dir());
            shown.then(|| CString::new(name).ok().map(|name| (name, is_dir))).flatten()
        })
        .collect();
    Box::into_raw(Box::new(Dir { entries, next: 0 }))
}

unsafe extern "C" fn readdir(dir: *mut Dir) -> bool {
    let dir = &mut *dir;
    dir.next += 1;
    dir.next <= dir.entries.len()
}

unsafe extern "C" fn dirent_get_name(dir: *mut Dir) -> *const c_char {
    let dir = &*dir;
    dir.entries.get(dir.next.wrapping_sub(1)).map_or(std::ptr::null(), |(name, _)| name.as_ptr())
}

unsafe extern "C" fn dirent_is_dir(dir: *mut Dir) -> bool {
    let dir = &*dir;
    dir.entries.get(dir.next.wrapping_sub(1)).is_some_and(|(_, is_dir)| *is_dir)
}

unsafe extern "C" fn closedir(dir: *mut Dir) -> c_int {
    if !dir.is_null() {
        drop(Box::from_raw(dir));
    }
    0
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp(name: &str, contents: &[u8]) -> (std::path::PathBuf, CString) {
        let path = std::env::temp_dir().join(format!("pkh-emu-vfs-{name}"));
        std::fs::write(&path, contents).unwrap();
        let c = CString::new(path.to_string_lossy().as_bytes()).unwrap();
        (path, c)
    }

    unsafe fn read_all(handle: *mut Handle, length: usize) -> Vec<u8> {
        let mut buffer = vec![0; length];
        let read = read(handle, buffer.as_mut_ptr() as *mut c_void, length as u64);
        buffer.truncate(read as usize);
        buffer
    }

    #[test]
    fn hands_the_core_the_newest_version_it_can_use() {
        let mut info = InterfaceInfo { version: 1, interface: std::ptr::null() };
        assert!(unsafe { answer(&mut info) });
        assert_eq!(info.version, 2);
        assert!(!info.interface.is_null());

        let mut newer = InterfaceInfo { version: 3, interface: std::ptr::null() };
        assert!(!unsafe { answer(&mut newer) });
    }

    #[test]
    fn serves_the_game_from_its_open_file_under_a_path_that_does_not_open() {
        let _lock = crate::test_games::lock_core();
        let (path, _) = temp("game", b"0123456789");
        let file = File::open(&path).unwrap();
        serve_game("/proc/self/fd/9999", &file).unwrap();
        drop(file);
        std::fs::remove_file(&path).unwrap();

        unsafe {
            let first = open(c"/proc/self/fd/9999".as_ptr(), ACCESS_READ, 0);
            let second = open(c"/proc/self/fd/9999".as_ptr(), ACCESS_READ, 0);
            assert!(!first.is_null() && !second.is_null());
            assert_eq!(seek(first, 6, SEEK_START), 0);
            assert_eq!(read_all(second, 3), b"012");
            assert_eq!(read_all(first, 10), b"6789");
            assert_eq!((size(first), tell(second)), (10, 3));
            assert!(open(c"/proc/self/fd/9999".as_ptr(), ACCESS_WRITE, 0).is_null());
            close(first);
            close(second);
        }
        stop_serving_game();
        assert!(unsafe { open(c"/proc/self/fd/9999".as_ptr(), ACCESS_READ, 0) }.is_null());
    }

    #[test]
    fn reads_writes_and_moves_ordinary_files() {
        let (path, c) = temp("plain", b"");
        unsafe {
            let handle = open(c.as_ptr(), ACCESS_READ | ACCESS_WRITE, 0);
            assert_eq!(write(handle, b"hello world".as_ptr() as *const c_void, 11), 11);
            assert_eq!(seek(handle, -5, SEEK_END), 0);
            assert_eq!(tell(handle), 6);
            assert_eq!(read_all(handle, 5), b"world");
            assert_eq!(truncate(handle, 5), 0);
            assert_eq!(read(handle, std::ptr::null_mut(), 0), 0);
            assert_eq!(write(handle, std::ptr::null(), 0), 0);
            assert_eq!(CStr::from_ptr(get_path(handle)), c.as_c_str());
            close(handle);

            let updating = open(c.as_ptr(), ACCESS_WRITE | ACCESS_UPDATE_EXISTING, 0);
            assert_eq!(write(updating, b"J".as_ptr() as *const c_void, 1), 1);
            close(updating);
        }
        assert_eq!(std::fs::read(&path).unwrap(), b"Jello");

        let moved = CString::new(format!("{}-moved", path.display())).unwrap();
        unsafe {
            assert_eq!(rename(c.as_ptr(), moved.as_ptr()), 0);
            assert!(open(c.as_ptr(), ACCESS_READ, 0).is_null());
            assert_eq!(remove(moved.as_ptr()), 0);
            assert_eq!(remove(moved.as_ptr()), -1);
        }
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn azahar_writes_a_multi_byte_object_and_reads_it_back() {
        type Write = unsafe extern "C" fn(*const InterfaceInfo, *const c_char, u64) -> usize;
        type Read = unsafe extern "C" fn(*const InterfaceInfo, *const c_char, *mut u64) -> usize;
        let (path, c) = temp("azahar", b"");
        let mut info = InterfaceInfo { version: VERSION, interface: std::ptr::null() };
        let mut value = 0;
        let check = option_env!("PKH_EMU_AZAHAR_FILE_CHECK").expect("build.rs gives tests Azahar's file code");
        unsafe {
            assert!(answer(&mut info));
            let library = libloading::Library::new(check).unwrap();
            let write = library.get::<Write>(b"azahar_write_u64").unwrap();
            let read = library.get::<Read>(b"azahar_read_u64").unwrap();

            assert_eq!(write(&info, c.as_ptr(), 0x1122334455667788), 1);
            assert_eq!(read(&info, c.as_ptr(), &mut value), 1);
        }
        assert_eq!(value, 0x1122334455667788);
        assert_eq!(std::fs::read(&path).unwrap(), 0x1122334455667788u64.to_le_bytes());
    }

    #[test]
    fn opens_the_card_under_any_region_dolphin_names_it_after() {
        let _lock = crate::test_games::lock_core();
        let dir = std::env::temp_dir().join("pkh-emu-vfs-card");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let card = dir.join("card.raw");
        let asked = |name: &str| CString::new(dir.join(name).to_string_lossy().as_bytes()).unwrap();
        serve_card(Some(card.clone()));

        unsafe {
            let fresh = open(asked("card.EUR.raw").as_ptr(), ACCESS_WRITE, 0);
            assert_eq!(write(fresh, b"card".as_ptr() as *const c_void, 4), 4);
            close(fresh);
            let mut size = 0;
            assert_eq!(stat_64(asked("card.USA.raw").as_ptr(), &mut size), STAT_VALID);
            assert_eq!(size, 4);
            assert!(open(asked("card.raw.EUR").as_ptr(), ACCESS_READ, 0).is_null());
            assert!(open(asked("other.EUR.raw").as_ptr(), ACCESS_READ, 0).is_null());
        }
        assert_eq!(std::fs::read(&card).unwrap(), b"card");

        serve_card(None);
        assert!(unsafe { open(asked("card.EUR.raw").as_ptr(), ACCESS_READ, 0) }.is_null());
    }

    #[test]
    fn empties_a_file_opened_for_writing_alone() {
        let (path, c) = temp("fresh", b"old contents");
        unsafe { close(open(c.as_ptr(), ACCESS_WRITE, 0)) };
        assert_eq!(std::fs::read(&path).unwrap(), b"");
    }
}
