use std::ffi::{c_char, c_int, c_uint, c_void, CStr, CString};
use std::fs::{File, OpenOptions};
use std::sync::Mutex;

use std::os::unix::fs::FileExt;

const ACCESS_READ: c_uint = 1;
const ACCESS_WRITE: c_uint = 2;
const ACCESS_UPDATE_EXISTING: c_uint = 4;
const SEEK_START: c_int = 0;
const SEEK_CURRENT: c_int = 1;
const SEEK_END: c_int = 2;
const VERSION: u32 = 2;

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
}

#[repr(C)]
pub struct InterfaceInfo {
    version: u32,
    interface: *const Interface,
}

static INTERFACE: Interface =
    Interface { get_path, open, close, size, tell, seek, read, write, flush, remove, rename, truncate };

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

/// Answers RETRO_ENVIRONMENT_GET_VFS_INTERFACE with the version the app gives.
pub unsafe fn answer(info: *mut InterfaceInfo) -> bool {
    let info = &mut *info;
    if info.version > VERSION {
        return false;
    }
    info.version = VERSION;
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

fn open_file(path: &str, mode: c_uint) -> std::io::Result<File> {
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
        None => open_file(&text, mode),
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
unsafe extern "C" fn read(handle: *mut Handle, buffer: *mut c_void, length: u64) -> i64 {
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
    fn empties_a_file_opened_for_writing_alone() {
        let (path, c) = temp("fresh", b"old contents");
        unsafe { close(open(c.as_ptr(), ACCESS_WRITE, 0)) };
        assert_eq!(std::fs::read(&path).unwrap(), b"");
    }
}
