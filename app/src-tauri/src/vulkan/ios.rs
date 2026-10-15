use super::{lock, Gpu};
use ash::vk;
use std::sync::MutexGuard;

impl Gpu {
    pub fn entry(&self) -> ash::Entry {
        let get_instance_proc_addr = self.interface.get_instance_proc_addr;
        unsafe { ash::Entry::from_static_fn(ash::StaticFn { get_instance_proc_addr }) }
    }

    pub fn physical(&self) -> vk::PhysicalDevice {
        self.interface.gpu
    }

    pub fn sampled(&self) -> MutexGuard<'_, vk::Fence> {
        lock(&self.shared.sampled)
    }
}
