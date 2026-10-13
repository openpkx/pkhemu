// Android gives each thread its own nice value.
pub fn lower_priority() {
    unsafe { libc::setpriority(libc::PRIO_PROCESS as _, libc::gettid() as _, 10) };
}
