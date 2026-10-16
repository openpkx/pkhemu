use super::super::{ExecMem, EXEC_MEM_MODE_UNAVAILABLE};
use std::ffi::c_void;

// A debugger attaches only to apps signed with get-task-allow, which App Store and TestFlight builds aren't.
pub fn exec_mem_alloc(size: usize) -> Option<ExecMem> {
    (size == 0).then(|| ExecMem::probe(EXEC_MEM_MODE_UNAVAILABLE))
}

pub fn exec_mem_free(_rx: *mut c_void) -> bool {
    false
}

pub fn release_exec_mem() {}

pub fn jit_on() -> bool {
    false
}

pub fn enable_jit_url() -> Option<String> {
    None
}
