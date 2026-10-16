use ash::vk;
use std::cell::Cell;
use std::ffi::{c_char, c_uint, c_void, CStr};
use std::path::Path;
#[cfg(test)]
use std::sync::atomic::Ordering;
use std::sync::{Arc, Condvar, Mutex, MutexGuard, OnceLock};

#[cfg(target_os = "ios")]
mod ios;

const INTERFACE_VULKAN: c_uint = 0;
const INTERFACE_VERSION: c_uint = 5;

pub type CreateDevice = unsafe extern "C" fn(
    context: *mut Context,
    instance: vk::Instance,
    gpu: vk::PhysicalDevice,
    surface: vk::SurfaceKHR,
    get_instance_proc_addr: vk::PFN_vkGetInstanceProcAddr,
    required_extensions: *const *const c_char,
    num_required_extensions: c_uint,
    required_layers: *const *const c_char,
    num_required_layers: c_uint,
    required_features: *const vk::PhysicalDeviceFeatures,
) -> bool;

#[repr(C)]
pub struct Negotiation {
    pub interface_type: c_uint,
    pub interface_version: c_uint,
    pub get_application_info: Option<unsafe extern "C" fn() -> *const vk::ApplicationInfo<'static>>,
    pub create_device: Option<CreateDevice>,
    pub destroy_device: Option<unsafe extern "C" fn()>,
}

#[repr(C)]
#[derive(Default)]
pub struct Context {
    pub gpu: vk::PhysicalDevice,
    pub device: vk::Device,
    pub queue: vk::Queue,
    pub queue_family_index: u32,
    pub presentation_queue: vk::Queue,
    pub presentation_queue_family_index: u32,
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct Image {
    pub image_view: vk::ImageView,
    pub image_layout: vk::ImageLayout,
    pub create_info: vk::ImageViewCreateInfo<'static>,
}

#[repr(C)]
pub struct Interface {
    pub interface_type: c_uint,
    pub interface_version: c_uint,
    pub handle: *mut c_void,
    pub instance: vk::Instance,
    pub gpu: vk::PhysicalDevice,
    pub device: vk::Device,
    pub get_device_proc_addr: vk::PFN_vkGetDeviceProcAddr,
    pub get_instance_proc_addr: vk::PFN_vkGetInstanceProcAddr,
    pub queue: vk::Queue,
    pub queue_index: c_uint,
    pub set_image: unsafe extern "C" fn(*mut c_void, *const Image, u32, *const vk::Semaphore, u32),
    pub get_sync_index: unsafe extern "C" fn(*mut c_void) -> u32,
    pub get_sync_index_mask: unsafe extern "C" fn(*mut c_void) -> u32,
    pub set_command_buffers: unsafe extern "C" fn(*mut c_void, u32, *const vk::CommandBuffer),
    pub wait_sync_index: unsafe extern "C" fn(*mut c_void),
    pub lock_queue: unsafe extern "C" fn(*mut c_void),
    pub unlock_queue: unsafe extern "C" fn(*mut c_void),
    pub set_signal_semaphore: unsafe extern "C" fn(*mut c_void, vk::Semaphore),
}

#[derive(Default)]
struct Handoff {
    image: Option<(Image, u32)>,
    waits: Vec<vk::Semaphore>,
    commands: Vec<vk::CommandBuffer>,
    signal: vk::Semaphore,
    generation: u64,
}

thread_local! {
    static ASLEEP: Cell<bool> = const { Cell::new(false) };
}

pub fn sleep() {
    ASLEEP.set(true);
}

pub fn wake() {
    ASLEEP.set(false);
}

// iOS fails GPU work sent while the app is in the background. The simulator doesn't, so a debug build fails here instead.
pub fn check_awake() {
    debug_assert!(!ASLEEP.get(), "Vulkan work was sent while the app is in the background");
}

fn lock<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    mutex.lock().unwrap_or_else(|e| e.into_inner())
}

// The core's own threads submit work, so the core's lock waits while the app is in the background.
#[derive(Default)]
struct Queue {
    locked: bool,
    held: bool,
}

// The core submits from its own threads, so these sit behind the interface's handle.
struct Shared {
    device: ash::Device,
    handoff: Mutex<Handoff>,
    queue: Mutex<Queue>,
    queue_free: Condvar,
    // The fence of the screen's last draw from the core's image, which the core draws over next.
    sampled: Mutex<vk::Fence>,
}

impl Shared {
    fn new(device: ash::Device) -> Shared {
        Shared {
            device,
            handoff: Mutex::default(),
            queue: Mutex::default(),
            queue_free: Condvar::new(),
            sampled: Mutex::new(vk::Fence::null()),
        }
    }

    fn lock_queue(&self, by_core: bool) {
        let queue = lock(&self.queue);
        let mut queue = self
            .queue_free
            .wait_while(queue, |queue| queue.locked || (by_core && queue.held))
            .unwrap_or_else(|e| e.into_inner());
        queue.locked = true;
    }

    fn unlock_queue(&self) {
        lock(&self.queue).locked = false;
        self.queue_free.notify_all();
    }

    fn hold_queue(&self, held: bool) {
        lock(&self.queue).held = held;
        self.queue_free.notify_all();
    }

    fn handoff(&self) -> MutexGuard<'_, Handoff> {
        lock(&self.handoff)
    }

    fn wait_sampled(&self) {
        let sampled = lock(&self.sampled);
        if *sampled != vk::Fence::null() {
            let _ = unsafe { self.device.wait_for_fences(&[*sampled], true, u64::MAX) };
        }
    }
}

unsafe fn shared<'a>(handle: *mut c_void) -> &'a Shared {
    &*(handle as *const Shared)
}

unsafe extern "C" fn set_image(
    handle: *mut c_void,
    image: *const Image,
    num_semaphores: u32,
    semaphores: *const vk::Semaphore,
    src_queue_family: u32,
) {
    let mut handoff = shared(handle).handoff();
    // pNext can't be copied safely, and only the image and its format are read.
    handoff.image = image.as_ref().map(|image| {
        let mut image = *image;
        image.create_info.p_next = std::ptr::null();
        (image, src_queue_family)
    });
    handoff.waits.clear();
    if num_semaphores > 0 && !semaphores.is_null() {
        handoff.waits.extend_from_slice(std::slice::from_raw_parts(semaphores, num_semaphores as usize));
    }
}

unsafe extern "C" fn get_sync_index(_: *mut c_void) -> u32 {
    0
}

unsafe extern "C" fn get_sync_index_mask(_: *mut c_void) -> u32 {
    1
}

unsafe extern "C" fn set_command_buffers(handle: *mut c_void, count: u32, commands: *const vk::CommandBuffer) {
    if count > 0 && !commands.is_null() {
        shared(handle).handoff().commands.extend_from_slice(std::slice::from_raw_parts(commands, count as usize));
    }
}

// Frames read back are done with before video_refresh returns. A frame the screen draws from the core's image isn't.
unsafe extern "C" fn wait_sync_index(handle: *mut c_void) {
    shared(handle).wait_sampled();
}

unsafe extern "C" fn lock_queue(handle: *mut c_void) {
    shared(handle).lock_queue(true);
}

unsafe extern "C" fn unlock_queue(handle: *mut c_void) {
    shared(handle).unlock_queue();
}

unsafe extern "C" fn set_signal_semaphore(handle: *mut c_void, semaphore: vk::Semaphore) {
    shared(handle).handoff().signal = semaphore;
}

struct Readback {
    buffer: vk::Buffer,
    memory: vk::DeviceMemory,
    size: u64,
    mapped: *const u8,
}

// The core's device. The screen can hold it past its game, until it lets go of the game's last frame.
pub struct Gpu {
    pub instance: ash::Instance,
    pub device: ash::Device,
    pub queue_family: u32,
    queue: vk::Queue,
    memory: vk::PhysicalDeviceMemoryProperties,
    destroy_device: Option<unsafe extern "C" fn()>,
    shared: Box<Shared>,
    interface: Box<Interface>,
}

impl Gpu {
    pub fn with_queue<R>(&self, f: impl FnOnce(vk::Queue) -> R) -> R {
        self.shared.lock_queue(false);
        let result = f(self.queue);
        self.shared.unlock_queue();
        result
    }

    // The core's command buffers go first, and libretro doesn't wait on the image's semaphores when there are some.
    pub unsafe fn submit(
        &self,
        commands: vk::CommandBuffer,
        wait: Option<(vk::Semaphore, vk::PipelineStageFlags)>,
        signal: vk::Semaphore,
        fence: vk::Fence,
    ) -> Result<(), String> {
        check_awake();
        let (mut submitted, mut waits, core_signal) = {
            let mut handoff = self.shared.handoff();
            let core_commands = std::mem::take(&mut handoff.commands);
            let waits = std::mem::take(&mut handoff.waits);
            let waits = if core_commands.is_empty() { waits } else { Vec::new() };
            (core_commands, waits, std::mem::take(&mut handoff.signal))
        };
        submitted.push(commands);
        let mut stages = vec![vk::PipelineStageFlags::ALL_COMMANDS; waits.len()];
        if let Some((semaphore, stage)) = wait {
            waits.push(semaphore);
            stages.push(stage);
        }
        let signals: Vec<vk::Semaphore> =
            [core_signal, signal].into_iter().filter(|s| *s != vk::Semaphore::null()).collect();
        let submit = vk::SubmitInfo::default()
            .wait_semaphores(&waits)
            .wait_dst_stage_mask(&stages)
            .command_buffers(&submitted)
            .signal_semaphores(&signals);
        self.with_queue(|queue| self.device.queue_submit(queue, &[submit], fence))
            .map_err(|e| format!("vkQueueSubmit: {e}"))
    }

    pub fn ownership(&self, src_queue_family: u32) -> (u32, u32) {
        match src_queue_family {
            family if family == self.queue_family || family == vk::QUEUE_FAMILY_IGNORED => {
                (vk::QUEUE_FAMILY_IGNORED, vk::QUEUE_FAMILY_IGNORED)
            }
            family => (family, self.queue_family),
        }
    }
}

impl Drop for Gpu {
    fn drop(&mut self) {
        unsafe {
            let _ = self.device.device_wait_idle();
            if let Some(destroy) = self.destroy_device {
                destroy();
            }
            self.device.destroy_device(None);
            self.instance.destroy_instance(None);
        }
    }
}

#[derive(Clone)]
pub struct Frame {
    pub gpu: Arc<Gpu>,
    pub image: Image,
    pub src_queue_family: u32,
    pub width: u32,
    pub height: u32,
    generation: u64,
}

impl Frame {
    pub fn current(&self) -> bool {
        self.gpu.shared.handoff().generation == self.generation
    }
}

struct Device {
    gpu: Arc<Gpu>,
    pool: vk::CommandPool,
    commands: vk::CommandBuffer,
    fence: vk::Fence,
    readback: Option<Readback>,
}

// Boolean settings turned on when the instance is made, each named by the layer or driver that reads it.
pub type Settings = &'static [(&'static CStr, &'static CStr)];

// Shader harness: time spent waiting for the GPU in the readback, and the last frame in 8 bits.
#[cfg(test)]
pub mod harness {
    use std::sync::atomic::{AtomicBool, AtomicU64};
    use std::sync::Mutex;

    pub static READBACK_WAIT_NS: AtomicU64 = AtomicU64::new(0);
    pub static KEEP_RGB8: AtomicBool = AtomicBool::new(false);
    pub static LAST_RGB8: Mutex<(u32, u32, Vec<u8>)> = Mutex::new((0, 0, Vec::new()));
}

pub struct Renderer {
    entry: ash::Entry,
    settings: Settings,
    negotiation: *const Negotiation,
    device: Option<Device>,
    rgba: Vec<u8>,
}

// The library stays loaded once opened, since the screen can hold a device past its game.
fn load(library: &Path) -> Result<ash::Entry, String> {
    static LOADED: OnceLock<Result<(libloading::Library, ash::Entry), String>> = OnceLock::new();
    let loaded = LOADED.get_or_init(|| unsafe {
        let loaded = libloading::Library::new(library).map_err(|e| format!("{}: {e}", library.display()))?;
        let get_instance_proc_addr = loaded
            .get::<vk::PFN_vkGetInstanceProcAddr>(b"vkGetInstanceProcAddr\0")
            .map_err(|e| format!("{}: {e}", library.display()))?;
        let entry = ash::Entry::from_static_fn(ash::StaticFn { get_instance_proc_addr: *get_instance_proc_addr });
        Ok((loaded, entry))
    });
    loaded.as_ref().map(|(_, entry)| entry.clone()).map_err(Clone::clone)
}

// The Vulkan version the host's device would have: the instance's, capped by the first GPU's. Only Android picks a
// renderer by it.
#[allow(dead_code)]
pub fn version(library: &Path) -> Result<u32, String> {
    let entry = load(library)?;
    unsafe {
        let instance_version = entry.try_enumerate_instance_version().ok().flatten().unwrap_or(vk::API_VERSION_1_0);
        let app = vk::ApplicationInfo::default().api_version(instance_version);
        let instance = entry
            .create_instance(&vk::InstanceCreateInfo::default().application_info(&app), None)
            .map_err(|e| format!("vkCreateInstance: {e}"))?;
        let gpus = instance.enumerate_physical_devices().map_err(|e| format!("vkEnumeratePhysicalDevices: {e}"));
        let gpu_version = gpus.and_then(|gpus| {
            let gpu = gpus.first().ok_or("Vulkan found no GPU")?;
            Ok(instance.get_physical_device_properties(*gpu).api_version)
        });
        instance.destroy_instance(None);
        gpu_version.map(|version| version.min(instance_version))
    }
}

impl Renderer {
    pub fn new(library: &Path, settings: Settings) -> Result<Renderer, String> {
        Ok(Renderer { entry: load(library)?, settings, negotiation: std::ptr::null(), device: None, rgba: Vec::new() })
    }

    // The device is made on first use, so the core's negotiation interface, set after its hardware render
    // request, can still choose it.
    pub fn negotiate(&mut self, negotiation: *const Negotiation) -> bool {
        let usable = unsafe { negotiation.as_ref() }.is_some_and(|n| n.interface_type == INTERFACE_VULKAN);
        let taken = usable && self.device.is_none();
        if taken {
            self.negotiation = negotiation;
        }
        taken
    }

    pub fn interface(&mut self) -> Result<*const Interface, String> {
        if self.device.is_none() {
            self.device = Some(unsafe { Device::new(&self.entry, self.negotiation.as_ref(), self.settings) }?);
        }
        Ok(self.device.as_ref().map_or(std::ptr::null(), |device| &*device.gpu.interface))
    }

    // iOS fails GPU work sent from the background, and the core's worker threads can still be sending some.
    pub fn sleep(&self) {
        if let Some(device) = &self.device {
            device.gpu.shared.hold_queue(true);
            let _ = device.gpu.with_queue(|_| unsafe { device.gpu.device.device_wait_idle() });
        }
    }

    pub fn wake(&self) {
        if let Some(device) = &self.device {
            device.gpu.shared.hold_queue(false);
        }
    }

    pub fn frame(&self, width: u32, height: u32) -> Option<Frame> {
        let gpu = &self.device.as_ref()?.gpu;
        let handoff = gpu.shared.handoff();
        let (image, src_queue_family) = handoff.image?;
        Some(Frame { gpu: gpu.clone(), image, src_queue_family, width, height, generation: handoff.generation })
    }

    // Azahar frees its image, commands and semaphores on a reset or a state load, and hands new ones over only on its
    // next present.
    pub fn forget(&self) {
        if let Some(device) = &self.device {
            let mut handoff = device.gpu.shared.handoff();
            let generation = handoff.generation + 1;
            *handoff = Handoff { generation, ..Handoff::default() };
        }
    }

    pub fn read(&mut self, width: u32, height: u32, out: &mut Vec<u16>) -> Result<(u32, u32), String> {
        let frame = self.frame(width, height);
        let device = self.device.as_mut().ok_or("the core read a frame before the Vulkan device existed")?;
        let frame = frame.ok_or("the core set no image")?;
        let swap = match frame.image.create_info.format {
            vk::Format::R8G8B8A8_UNORM | vk::Format::R8G8B8A8_SRGB => false,
            vk::Format::B8G8R8A8_UNORM | vk::Format::B8G8R8A8_SRGB => true,
            format => return Err(format!("the core's image has format {}", format.as_raw())),
        };
        let size = width as u64 * height as u64 * 4;
        unsafe {
            device.copy(&frame, size)?;
            self.rgba.clear();
            self.rgba.extend_from_slice(std::slice::from_raw_parts(device.readback_ptr(), size as usize));
        }
        #[cfg(test)]
        if harness::KEEP_RGB8.load(Ordering::Relaxed) {
            let mut last = harness::LAST_RGB8.lock().unwrap();
            last.2.clear();
            last.2.extend(self.rgba.chunks_exact(4).flat_map(|p| {
                if swap {
                    [p[2], p[1], p[0]]
                } else {
                    [p[0], p[1], p[2]]
                }
            }));
            (last.0, last.1) = (width, height);
        }
        out.clear();
        out.extend(self.rgba.chunks_exact(4).map(|p| match swap {
            false => crate::gl::rgb565(p[0], p[1], p[2]),
            true => crate::gl::rgb565(p[2], p[1], p[0]),
        }));
        Ok((width, height))
    }
}

fn offered(available: &[vk::ExtensionProperties], name: &CStr) -> bool {
    available.iter().any(|extension| extension.extension_name_as_c_str() == Ok(name))
}

impl Gpu {
    unsafe fn new(entry: &ash::Entry, negotiation: Option<&Negotiation>, settings: Settings) -> Result<Gpu, String> {
        let fallback = vk::ApplicationInfo::default()
            .application_name(c"pkh-emu")
            .engine_name(c"pkh-emu")
            .api_version(vk::API_VERSION_1_1);
        let app = negotiation
            .and_then(|n| n.get_application_info)
            .and_then(|get| get().as_ref())
            .map_or(fallback, |app| *app);
        // MoltenVK is the driver itself, not a loader, so it offers no portability enumeration; a loader put in its
        // place for validation does. The surface extensions are for the iOS screen, where it draws on a Metal layer,
        // and Android doesn't offer the Metal one.
        let available = entry.enumerate_instance_extension_properties(None).unwrap_or_default();
        let portability = offered(&available, ash::khr::portability_enumeration::NAME);
        let layer_settings = !settings.is_empty() && offered(&available, ash::ext::layer_settings::NAME);
        let extensions: Vec<*const c_char> =
            [ash::khr::surface::NAME, ash::ext::metal_surface::NAME, ash::khr::portability_enumeration::NAME]
                .into_iter()
                .filter(|name| offered(&available, name))
                .chain(layer_settings.then_some(ash::ext::layer_settings::NAME))
                .map(CStr::as_ptr)
                .collect();
        let flags = if portability {
            vk::InstanceCreateFlags::ENUMERATE_PORTABILITY_KHR
        } else {
            vk::InstanceCreateFlags::empty()
        };
        let on = vk::TRUE;
        // ash's values() counts bytes, not values.
        let settings: Vec<vk::LayerSettingEXT> = settings
            .iter()
            .map(|&(layer, name)| vk::LayerSettingEXT {
                ty: vk::LayerSettingTypeEXT::BOOL32,
                value_count: 1,
                p_values: &on as *const vk::Bool32 as *const c_void,
                ..vk::LayerSettingEXT::default().layer_name(layer).setting_name(name)
            })
            .collect();
        let mut settings = vk::LayerSettingsCreateInfoEXT::default().settings(&settings);
        let mut info =
            vk::InstanceCreateInfo::default().application_info(&app).enabled_extension_names(&extensions).flags(flags);
        if layer_settings {
            info = info.push_next(&mut settings);
        }
        let instance = entry.create_instance(&info, None).map_err(|e| format!("vkCreateInstance: {e}"))?;
        let gpu = match instance.enumerate_physical_devices() {
            Ok(gpus) if !gpus.is_empty() => gpus[0],
            found => {
                instance.destroy_instance(None);
                return Err(
                    found.map_or_else(|e| format!("vkEnumeratePhysicalDevices: {e}"), |_| "Vulkan found no GPU".into())
                );
            }
        };
        let device_extensions = instance.enumerate_device_extension_properties(gpu).unwrap_or_default();
        let required: Vec<*const c_char> = [ash::khr::swapchain::NAME]
            .into_iter()
            .filter(|name| offered(&device_extensions, name))
            .map(CStr::as_ptr)
            .collect();
        let get_instance_proc_addr = entry.static_fn().get_instance_proc_addr;
        let mut context = Context::default();
        let core_creates = negotiation.and_then(|n| n.create_device);
        let by_core = core_creates.is_some_and(|create| {
            create(
                &mut context,
                instance.handle(),
                gpu,
                vk::SurfaceKHR::null(),
                get_instance_proc_addr,
                required.as_ptr(),
                required.len() as c_uint,
                std::ptr::null(),
                0,
                std::ptr::null(),
            )
        });
        // Azahar picks its features from what the GPU offers, so a device it didn't make could lack them.
        if core_creates.is_some() && (!by_core || context.device == vk::Device::null()) {
            instance.destroy_instance(None);
            return Err("the core couldn't make its Vulkan device".into());
        }
        let (device, queue, queue_family) = if by_core {
            (ash::Device::load(instance.fp_v1_0(), context.device), context.queue, context.queue_family_index)
        } else {
            match create_device(&instance, gpu, &device_extensions) {
                Ok(created) => created,
                Err(e) => {
                    instance.destroy_instance(None);
                    return Err(e);
                }
            }
        };
        let destroy_device = negotiation.filter(|_| by_core).and_then(|n| n.destroy_device);
        let shared = Box::new(Shared::new(device.clone()));
        let interface = Box::new(Interface {
            interface_type: INTERFACE_VULKAN,
            interface_version: INTERFACE_VERSION,
            handle: &*shared as *const Shared as *mut c_void,
            instance: instance.handle(),
            gpu,
            device: device.handle(),
            get_device_proc_addr: instance.fp_v1_0().get_device_proc_addr,
            get_instance_proc_addr,
            queue,
            queue_index: queue_family,
            set_image,
            get_sync_index,
            get_sync_index_mask,
            set_command_buffers,
            wait_sync_index,
            lock_queue,
            unlock_queue,
            set_signal_semaphore,
        });
        Ok(Gpu {
            memory: instance.get_physical_device_memory_properties(gpu),
            instance,
            device,
            queue_family,
            queue,
            destroy_device,
            shared,
            interface,
        })
    }
}

impl Device {
    unsafe fn new(entry: &ash::Entry, negotiation: Option<&Negotiation>, settings: Settings) -> Result<Device, String> {
        let gpu = Arc::new(Gpu::new(entry, negotiation, settings)?);
        let mut made = Device {
            gpu,
            pool: vk::CommandPool::null(),
            commands: vk::CommandBuffer::null(),
            fence: vk::Fence::null(),
            readback: None,
        };
        let device = &made.gpu.device;
        made.pool = device
            .create_command_pool(
                &vk::CommandPoolCreateInfo::default()
                    .queue_family_index(made.gpu.queue_family)
                    .flags(vk::CommandPoolCreateFlags::RESET_COMMAND_BUFFER),
                None,
            )
            .map_err(|e| format!("vkCreateCommandPool: {e}"))?;
        made.commands = device
            .allocate_command_buffers(
                &vk::CommandBufferAllocateInfo::default().command_pool(made.pool).command_buffer_count(1),
            )
            .map_err(|e| format!("vkAllocateCommandBuffers: {e}"))?[0];
        made.fence =
            device.create_fence(&vk::FenceCreateInfo::default(), None).map_err(|e| format!("vkCreateFence: {e}"))?;
        Ok(made)
    }

    fn readback_ptr(&self) -> *const u8 {
        self.readback.as_ref().map_or(std::ptr::null(), |readback| readback.mapped)
    }

    unsafe fn ensure_readback(&mut self, size: u64) -> Result<(), String> {
        if self.readback.as_ref().is_some_and(|readback| readback.size >= size) {
            return Ok(());
        }
        self.drop_readback();
        let buffer = self
            .gpu
            .device
            .create_buffer(
                &vk::BufferCreateInfo::default()
                    .size(size)
                    .usage(vk::BufferUsageFlags::TRANSFER_DST)
                    .sharing_mode(vk::SharingMode::EXCLUSIVE),
                None,
            )
            .map_err(|e| format!("vkCreateBuffer: {e}"))?;
        let needs = self.gpu.device.get_buffer_memory_requirements(buffer);
        let host = vk::MemoryPropertyFlags::HOST_VISIBLE | vk::MemoryPropertyFlags::HOST_COHERENT;
        let types = &self.gpu.memory.memory_types[..self.gpu.memory.memory_type_count as usize];
        let fits = |(i, kind): &(usize, &vk::MemoryType)| {
            needs.memory_type_bits & (1 << i) != 0 && kind.property_flags.contains(host)
        };
        // The CPU reads uncached memory slowly.
        let index = types
            .iter()
            .enumerate()
            .filter(fits)
            .max_by_key(|(_, kind)| kind.property_flags.contains(vk::MemoryPropertyFlags::HOST_CACHED))
            .map(|(i, _)| i as u32);
        let Some(index) = index else {
            self.gpu.device.destroy_buffer(buffer, None);
            return Err("Vulkan has no host-visible memory to read frames into".into());
        };
        let memory = match self.gpu.device.allocate_memory(
            &vk::MemoryAllocateInfo::default().allocation_size(needs.size).memory_type_index(index),
            None,
        ) {
            Ok(memory) => memory,
            Err(e) => {
                self.gpu.device.destroy_buffer(buffer, None);
                return Err(format!("vkAllocateMemory: {e}"));
            }
        };
        let mapped = self
            .gpu
            .device
            .bind_buffer_memory(buffer, memory, 0)
            .and_then(|()| self.gpu.device.map_memory(memory, 0, vk::WHOLE_SIZE, vk::MemoryMapFlags::empty()));
        self.readback = Some(Readback { buffer, memory, size, mapped: std::ptr::null() });
        match mapped {
            Ok(mapped) => {
                self.readback.as_mut().map(|readback| readback.mapped = mapped as *const u8);
                Ok(())
            }
            Err(e) => {
                self.drop_readback();
                Err(format!("mapping the readback buffer: {e}"))
            }
        }
    }

    unsafe fn drop_readback(&mut self) {
        if let Some(readback) = self.readback.take() {
            self.gpu.device.destroy_buffer(readback.buffer, None);
            self.gpu.device.free_memory(readback.memory, None);
        }
    }

    unsafe fn copy(&mut self, frame: &Frame, size: u64) -> Result<(), String> {
        let (image, width, height) = (frame.image, frame.width, frame.height);
        self.ensure_readback(size)?;
        let buffer = self.readback.as_ref().map(|readback| readback.buffer).unwrap_or_default();
        let (from, to) = frame.gpu.ownership(frame.src_queue_family);
        let colour =
            vk::ImageSubresourceRange::default().aspect_mask(vk::ImageAspectFlags::COLOR).level_count(1).layer_count(1);
        let barrier = |old, new, from, to, src_access, dst_access| {
            vk::ImageMemoryBarrier::default()
                .image(image.create_info.image)
                .subresource_range(colour)
                .old_layout(old)
                .new_layout(new)
                .src_queue_family_index(from)
                .dst_queue_family_index(to)
                .src_access_mask(src_access)
                .dst_access_mask(dst_access)
        };
        let layout = image.image_layout;
        let acquire = barrier(
            layout,
            vk::ImageLayout::TRANSFER_SRC_OPTIMAL,
            from,
            to,
            vk::AccessFlags::MEMORY_WRITE,
            vk::AccessFlags::TRANSFER_READ,
        );
        let release = barrier(
            vk::ImageLayout::TRANSFER_SRC_OPTIMAL,
            layout,
            to,
            from,
            vk::AccessFlags::TRANSFER_READ,
            vk::AccessFlags::empty(),
        );
        let to_host = vk::BufferMemoryBarrier::default()
            .buffer(buffer)
            .size(vk::WHOLE_SIZE)
            .src_queue_family_index(vk::QUEUE_FAMILY_IGNORED)
            .dst_queue_family_index(vk::QUEUE_FAMILY_IGNORED)
            .src_access_mask(vk::AccessFlags::TRANSFER_WRITE)
            .dst_access_mask(vk::AccessFlags::HOST_READ);
        let region = vk::BufferImageCopy::default()
            .image_subresource(
                vk::ImageSubresourceLayers::default().aspect_mask(vk::ImageAspectFlags::COLOR).layer_count(1),
            )
            .image_extent(vk::Extent3D { width, height, depth: 1 });
        let device = &self.gpu.device;
        let commands = self.commands;
        let recorded = device
            .begin_command_buffer(
                commands,
                &vk::CommandBufferBeginInfo::default().flags(vk::CommandBufferUsageFlags::ONE_TIME_SUBMIT),
            )
            .and_then(|()| {
                let (all, transfer) = (vk::PipelineStageFlags::ALL_COMMANDS, vk::PipelineStageFlags::TRANSFER);
                let none = vk::DependencyFlags::empty();
                device.cmd_pipeline_barrier(commands, all, transfer, none, &[], &[], &[acquire]);
                device.cmd_copy_image_to_buffer(
                    commands,
                    image.create_info.image,
                    vk::ImageLayout::TRANSFER_SRC_OPTIMAL,
                    buffer,
                    &[region],
                );
                device.cmd_pipeline_barrier(commands, transfer, all, none, &[], &[], &[release]);
                device.cmd_pipeline_barrier(
                    commands,
                    transfer,
                    vk::PipelineStageFlags::HOST,
                    none,
                    &[],
                    &[to_host],
                    &[],
                );
                device.end_command_buffer(commands)
            });
        recorded.map_err(|e| format!("recording the frame's readback: {e}"))?;
        self.gpu.submit(commands, None, vk::Semaphore::null(), self.fence)?;
        #[cfg(test)]
        let waiting = std::time::Instant::now();
        device.wait_for_fences(&[self.fence], true, u64::MAX).map_err(|e| format!("vkWaitForFences: {e}"))?;
        #[cfg(test)]
        harness::READBACK_WAIT_NS.fetch_add(waiting.elapsed().as_nanos() as u64, Ordering::Relaxed);
        device.reset_fences(&[self.fence]).map_err(|e| format!("vkResetFences: {e}"))
    }
}

impl Drop for Device {
    fn drop(&mut self) {
        unsafe {
            let _ = self.gpu.device.device_wait_idle();
            self.drop_readback();
            self.gpu.device.destroy_fence(self.fence, None);
            self.gpu.device.destroy_command_pool(self.pool, None);
        }
    }
}

unsafe fn create_device(
    instance: &ash::Instance,
    gpu: vk::PhysicalDevice,
    extensions: &[vk::ExtensionProperties],
) -> Result<(ash::Device, vk::Queue, u32), String> {
    let wanted = vk::QueueFlags::GRAPHICS | vk::QueueFlags::COMPUTE;
    let families = instance.get_physical_device_queue_family_properties(gpu);
    let family =
        families.iter().position(|family| family.queue_flags.contains(wanted)).ok_or("Vulkan has no graphics queue")?;
    // Vulkan requires the portability subset wherever it's offered, as MoltenVK does.
    let enabled: Vec<*const c_char> = [c"VK_KHR_portability_subset", ash::khr::swapchain::NAME]
        .into_iter()
        .filter(|name| offered(extensions, name))
        .map(CStr::as_ptr)
        .collect();
    let features = instance.get_physical_device_features(gpu);
    let priorities = [1.0];
    let queue = vk::DeviceQueueCreateInfo::default().queue_family_index(family as u32).queue_priorities(&priorities);
    let info = vk::DeviceCreateInfo::default()
        .queue_create_infos(std::slice::from_ref(&queue))
        .enabled_extension_names(&enabled)
        .enabled_features(&features);
    let device = instance.create_device(gpu, &info, None).map_err(|e| format!("vkCreateDevice: {e}"))?;
    let queue = device.get_device_queue(family as u32, 0);
    Ok((device, queue, family as u32))
}

#[cfg(test)]
pub mod tests {
    use super::{Image, Interface};
    use ash::vk;

    pub struct TwoRows {
        device: ash::Device,
        image: vk::Image,
        view: vk::ImageView,
        memory: vk::DeviceMemory,
    }

    impl Drop for TwoRows {
        fn drop(&mut self) {
            unsafe {
                self.device.destroy_image_view(self.view, None);
                self.device.destroy_image(self.image, None);
                self.device.free_memory(self.memory, None);
            }
        }
    }

    unsafe fn memory(
        instance: &ash::Instance,
        device: &ash::Device,
        interface: &Interface,
        needs: vk::MemoryRequirements,
        flags: vk::MemoryPropertyFlags,
    ) -> vk::DeviceMemory {
        let properties = instance.get_physical_device_memory_properties(interface.gpu);
        let index = (0..properties.memory_type_count)
            .find(|&i| {
                needs.memory_type_bits & (1 << i) != 0
                    && properties.memory_types[i as usize].property_flags.contains(flags)
            })
            .unwrap();
        let info = vk::MemoryAllocateInfo::default().allocation_size(needs.size).memory_type_index(index);
        device.allocate_memory(&info, None).unwrap()
    }

    // Blue on the top row and red on the bottom, handed over as Azahar does.
    pub unsafe fn draw_two_rows(interface: &Interface) -> TwoRows {
        let entry =
            ash::Entry::from_static_fn(ash::StaticFn { get_instance_proc_addr: interface.get_instance_proc_addr });
        let instance = ash::Instance::load(entry.static_fn(), interface.instance);
        let device = ash::Device::load(instance.fp_v1_0(), interface.device);
        let format = vk::Format::R8G8B8A8_UNORM;
        let image_info = vk::ImageCreateInfo::default()
            .image_type(vk::ImageType::TYPE_2D)
            .format(format)
            .extent(vk::Extent3D { width: 2, height: 2, depth: 1 })
            .mip_levels(1)
            .array_layers(1)
            .samples(vk::SampleCountFlags::TYPE_1)
            .usage(
                vk::ImageUsageFlags::TRANSFER_DST | vk::ImageUsageFlags::TRANSFER_SRC | vk::ImageUsageFlags::SAMPLED,
            );
        let image = device.create_image(&image_info, None).unwrap();
        let needs = device.get_image_memory_requirements(image);
        let image_memory = memory(&instance, &device, interface, needs, vk::MemoryPropertyFlags::DEVICE_LOCAL);
        device.bind_image_memory(image, image_memory, 0).unwrap();

        let pixels: [u8; 16] = [0, 0, 255, 255, 0, 0, 255, 255, 255, 0, 0, 255, 255, 0, 0, 255];
        let buffer_info = vk::BufferCreateInfo::default().size(16).usage(vk::BufferUsageFlags::TRANSFER_SRC);
        let buffer = device.create_buffer(&buffer_info, None).unwrap();
        let host = vk::MemoryPropertyFlags::HOST_VISIBLE | vk::MemoryPropertyFlags::HOST_COHERENT;
        let buffer_memory = memory(&instance, &device, interface, device.get_buffer_memory_requirements(buffer), host);
        device.bind_buffer_memory(buffer, buffer_memory, 0).unwrap();
        let mapped = device.map_memory(buffer_memory, 0, 16, vk::MemoryMapFlags::empty()).unwrap();
        std::ptr::copy_nonoverlapping(pixels.as_ptr(), mapped as *mut u8, 16);
        device.unmap_memory(buffer_memory);

        let pool_info = vk::CommandPoolCreateInfo::default().queue_family_index(interface.queue_index);
        let pool = device.create_command_pool(&pool_info, None).unwrap();
        let alloc = vk::CommandBufferAllocateInfo::default().command_pool(pool).command_buffer_count(1);
        let commands = device.allocate_command_buffers(&alloc).unwrap()[0];
        let colour =
            vk::ImageSubresourceRange::default().aspect_mask(vk::ImageAspectFlags::COLOR).level_count(1).layer_count(1);
        let layout = |old, new| {
            vk::ImageMemoryBarrier::default()
                .image(image)
                .subresource_range(colour)
                .old_layout(old)
                .new_layout(new)
                .src_queue_family_index(vk::QUEUE_FAMILY_IGNORED)
                .dst_queue_family_index(vk::QUEUE_FAMILY_IGNORED)
                .src_access_mask(vk::AccessFlags::MEMORY_WRITE)
                .dst_access_mask(vk::AccessFlags::MEMORY_READ | vk::AccessFlags::MEMORY_WRITE)
        };
        let all = vk::PipelineStageFlags::ALL_COMMANDS;
        let none = vk::DependencyFlags::empty();
        device.begin_command_buffer(commands, &vk::CommandBufferBeginInfo::default()).unwrap();
        let to_copy = layout(vk::ImageLayout::UNDEFINED, vk::ImageLayout::TRANSFER_DST_OPTIMAL);
        device.cmd_pipeline_barrier(commands, all, all, none, &[], &[], &[to_copy]);
        let region = vk::BufferImageCopy::default()
            .image_subresource(
                vk::ImageSubresourceLayers::default().aspect_mask(vk::ImageAspectFlags::COLOR).layer_count(1),
            )
            .image_extent(vk::Extent3D { width: 2, height: 2, depth: 1 });
        device.cmd_copy_buffer_to_image(commands, buffer, image, vk::ImageLayout::TRANSFER_DST_OPTIMAL, &[region]);
        let to_shader = layout(vk::ImageLayout::TRANSFER_DST_OPTIMAL, vk::ImageLayout::SHADER_READ_ONLY_OPTIMAL);
        device.cmd_pipeline_barrier(commands, all, all, none, &[], &[], &[to_shader]);
        device.end_command_buffer(commands).unwrap();
        (interface.lock_queue)(interface.handle);
        let submit = vk::SubmitInfo::default().command_buffers(std::slice::from_ref(&commands));
        device.queue_submit(interface.queue, &[submit], vk::Fence::null()).unwrap();
        device.queue_wait_idle(interface.queue).unwrap();
        (interface.unlock_queue)(interface.handle);
        device.destroy_command_pool(pool, None);
        device.destroy_buffer(buffer, None);
        device.free_memory(buffer_memory, None);

        let create_info = vk::ImageViewCreateInfo::default()
            .image(image)
            .view_type(vk::ImageViewType::TYPE_2D)
            .format(format)
            .subresource_range(colour);
        let view = device.create_image_view(&create_info, None).unwrap();
        let handed = Image { image_view: view, image_layout: vk::ImageLayout::SHADER_READ_ONLY_OPTIMAL, create_info };
        (interface.set_image)(interface.handle, &handed, 0, std::ptr::null(), interface.queue_index);
        TwoRows { device, image, view, memory: image_memory }
    }
}
