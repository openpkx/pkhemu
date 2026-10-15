use super::super::{passes, Layout, Parallax};
use crate::gl::Window;
use crate::vulkan::{self, Frame, Gpu};
use ash::vk;
use std::io::Cursor;
use std::sync::Arc;

const VERTEX: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/screen.vert.spv"));
const FRAGMENT: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/screen.frag.spv"));

// In the order of the push constants in src/screen/vulkan.frag.
#[repr(C)]
#[derive(Clone, Copy, Default)]
struct Constants {
    source: [f32; 4],
    texel: [f32; 4],
    shell: [f32; 4],
    plate: [f32; 4],
    window: [f32; 2],
    image: [f32; 2],
    shift: [f32; 2],
    exact: [f32; 2],
    lean: [f32; 2],
    margin: f32,
    dp: f32,
    radius: f32,
    recess: f32,
    glass: f32,
    pad: f32,
}

impl Constants {
    fn bytes(&self) -> &[u8] {
        unsafe { std::slice::from_raw_parts(self as *const Constants as *const u8, size_of::<Constants>()) }
    }
}

#[derive(Default)]
struct Swapchain {
    handle: vk::SwapchainKHR,
    extent: vk::Extent2D,
    views: Vec<vk::ImageView>,
    framebuffers: Vec<vk::Framebuffer>,
    rendered: Vec<vk::Semaphore>,
}

pub struct Presenter {
    gpu: Arc<Gpu>,
    surfaces: ash::khr::surface::Instance,
    swapchains: ash::khr::swapchain::Device,
    surface: vk::SurfaceKHR,
    size: (i32, i32),
    format: vk::Format,
    swapchain: Swapchain,
    stale: bool,
    render_pass: vk::RenderPass,
    set_layout: vk::DescriptorSetLayout,
    pipeline_layout: vk::PipelineLayout,
    pipeline: vk::Pipeline,
    sampler: vk::Sampler,
    descriptors: vk::DescriptorPool,
    set: vk::DescriptorSet,
    pool: vk::CommandPool,
    commands: vk::CommandBuffer,
    acquired: vk::Semaphore,
    fence: vk::Fence,
    submitted: bool,
}

fn failed(call: &str) -> impl Fn(vk::Result) -> String + '_ {
    move |e| format!("{call}: {e}")
}

impl Presenter {
    pub fn new(gpu: Arc<Gpu>, window: &Window) -> Result<Presenter, String> {
        let surfaces = ash::khr::surface::Instance::new(&gpu.entry(), &gpu.instance);
        let swapchains = ash::khr::swapchain::Device::new(&gpu.instance, &gpu.device);
        let mut made = Presenter {
            gpu,
            surfaces,
            swapchains,
            surface: vk::SurfaceKHR::null(),
            size: window.size(),
            format: vk::Format::UNDEFINED,
            swapchain: Swapchain::default(),
            stale: false,
            render_pass: vk::RenderPass::null(),
            set_layout: vk::DescriptorSetLayout::null(),
            pipeline_layout: vk::PipelineLayout::null(),
            pipeline: vk::Pipeline::null(),
            sampler: vk::Sampler::null(),
            descriptors: vk::DescriptorPool::null(),
            set: vk::DescriptorSet::null(),
            pool: vk::CommandPool::null(),
            commands: vk::CommandBuffer::null(),
            acquired: vk::Semaphore::null(),
            fence: vk::Fence::null(),
            submitted: false,
        };
        unsafe { made.make(window) }?;
        Ok(made)
    }

    pub fn draws_with(&self, gpu: &Arc<Gpu>) -> bool {
        Arc::ptr_eq(&self.gpu, gpu)
    }

    unsafe fn make(&mut self, window: &Window) -> Result<(), String> {
        let gpu = self.gpu.clone();
        let device = &gpu.device;
        let layer = window.metal() as *const _ as *const vk::CAMetalLayer;
        let metal = ash::ext::metal_surface::Instance::new(&gpu.entry(), &gpu.instance);
        self.surface = metal
            .create_metal_surface(&vk::MetalSurfaceCreateInfoEXT::default().layer(layer), None)
            .map_err(failed("vkCreateMetalSurfaceEXT"))?;
        let supported = self
            .surfaces
            .get_physical_device_surface_support(gpu.physical(), gpu.queue_family, self.surface)
            .map_err(failed("vkGetPhysicalDeviceSurfaceSupportKHR"))?;
        if !supported {
            return Err("the core's Vulkan queue can't draw on the game screen".into());
        }
        let formats = self
            .surfaces
            .get_physical_device_surface_formats(gpu.physical(), self.surface)
            .map_err(failed("vkGetPhysicalDeviceSurfaceFormatsKHR"))?;
        // The OpenGL screen writes its colours to the layer unconverted, and this one does too.
        self.format = formats
            .iter()
            .map(|format| format.format)
            .find(|format| *format == vk::Format::B8G8R8A8_UNORM)
            .or(formats.first().map(|format| format.format))
            .ok_or("the game screen offers Vulkan no formats")?;

        let attachment = vk::AttachmentDescription::default()
            .format(self.format)
            .samples(vk::SampleCountFlags::TYPE_1)
            .load_op(vk::AttachmentLoadOp::CLEAR)
            .store_op(vk::AttachmentStoreOp::STORE)
            .initial_layout(vk::ImageLayout::UNDEFINED)
            .final_layout(vk::ImageLayout::PRESENT_SRC_KHR);
        let colour = [vk::AttachmentReference::default().layout(vk::ImageLayout::COLOR_ATTACHMENT_OPTIMAL)];
        let subpass = vk::SubpassDescription::default()
            .pipeline_bind_point(vk::PipelineBindPoint::GRAPHICS)
            .color_attachments(&colour);
        let dependency = vk::SubpassDependency::default()
            .src_subpass(vk::SUBPASS_EXTERNAL)
            .src_stage_mask(vk::PipelineStageFlags::COLOR_ATTACHMENT_OUTPUT)
            .dst_stage_mask(vk::PipelineStageFlags::COLOR_ATTACHMENT_OUTPUT)
            .dst_access_mask(vk::AccessFlags::COLOR_ATTACHMENT_WRITE);
        self.render_pass = device
            .create_render_pass(
                &vk::RenderPassCreateInfo::default()
                    .attachments(std::slice::from_ref(&attachment))
                    .subpasses(std::slice::from_ref(&subpass))
                    .dependencies(std::slice::from_ref(&dependency)),
                None,
            )
            .map_err(failed("vkCreateRenderPass"))?;

        let bindings = [
            vk::DescriptorSetLayoutBinding::default()
                .binding(0)
                .descriptor_type(vk::DescriptorType::SAMPLED_IMAGE)
                .descriptor_count(1)
                .stage_flags(vk::ShaderStageFlags::FRAGMENT),
            vk::DescriptorSetLayoutBinding::default()
                .binding(1)
                .descriptor_type(vk::DescriptorType::SAMPLER)
                .descriptor_count(1)
                .stage_flags(vk::ShaderStageFlags::FRAGMENT),
        ];
        self.set_layout = device
            .create_descriptor_set_layout(&vk::DescriptorSetLayoutCreateInfo::default().bindings(&bindings), None)
            .map_err(failed("vkCreateDescriptorSetLayout"))?;
        let constants = vk::PushConstantRange::default()
            .stage_flags(vk::ShaderStageFlags::FRAGMENT)
            .size(size_of::<Constants>() as u32);
        self.pipeline_layout = device
            .create_pipeline_layout(
                &vk::PipelineLayoutCreateInfo::default()
                    .set_layouts(std::slice::from_ref(&self.set_layout))
                    .push_constant_ranges(std::slice::from_ref(&constants)),
                None,
            )
            .map_err(failed("vkCreatePipelineLayout"))?;
        self.pipeline = self.make_pipeline()?;

        self.sampler = device
            .create_sampler(
                &vk::SamplerCreateInfo::default()
                    .mag_filter(vk::Filter::NEAREST)
                    .min_filter(vk::Filter::NEAREST)
                    .mipmap_mode(vk::SamplerMipmapMode::NEAREST)
                    .address_mode_u(vk::SamplerAddressMode::CLAMP_TO_EDGE)
                    .address_mode_v(vk::SamplerAddressMode::CLAMP_TO_EDGE)
                    .address_mode_w(vk::SamplerAddressMode::CLAMP_TO_EDGE),
                None,
            )
            .map_err(failed("vkCreateSampler"))?;
        let sizes = [
            vk::DescriptorPoolSize::default().ty(vk::DescriptorType::SAMPLED_IMAGE).descriptor_count(1),
            vk::DescriptorPoolSize::default().ty(vk::DescriptorType::SAMPLER).descriptor_count(1),
        ];
        self.descriptors = device
            .create_descriptor_pool(&vk::DescriptorPoolCreateInfo::default().max_sets(1).pool_sizes(&sizes), None)
            .map_err(failed("vkCreateDescriptorPool"))?;
        self.set = device
            .allocate_descriptor_sets(
                &vk::DescriptorSetAllocateInfo::default()
                    .descriptor_pool(self.descriptors)
                    .set_layouts(std::slice::from_ref(&self.set_layout)),
            )
            .map_err(failed("vkAllocateDescriptorSets"))?[0];
        let sampler = [vk::DescriptorImageInfo::default().sampler(self.sampler)];
        let write = vk::WriteDescriptorSet::default()
            .dst_set(self.set)
            .dst_binding(1)
            .descriptor_type(vk::DescriptorType::SAMPLER)
            .image_info(&sampler);
        device.update_descriptor_sets(&[write], &[]);

        self.pool = device
            .create_command_pool(
                &vk::CommandPoolCreateInfo::default()
                    .queue_family_index(gpu.queue_family)
                    .flags(vk::CommandPoolCreateFlags::RESET_COMMAND_BUFFER),
                None,
            )
            .map_err(failed("vkCreateCommandPool"))?;
        self.commands = device
            .allocate_command_buffers(
                &vk::CommandBufferAllocateInfo::default().command_pool(self.pool).command_buffer_count(1),
            )
            .map_err(failed("vkAllocateCommandBuffers"))?[0];
        self.acquired =
            device.create_semaphore(&vk::SemaphoreCreateInfo::default(), None).map_err(failed("vkCreateSemaphore"))?;
        self.fence = device.create_fence(&vk::FenceCreateInfo::default(), None).map_err(failed("vkCreateFence"))?;
        self.make_swapchain()
    }

    unsafe fn make_pipeline(&self) -> Result<vk::Pipeline, String> {
        let device = &self.gpu.device;
        let module = |spirv: &[u8]| {
            let code = ash::util::read_spv(&mut Cursor::new(spirv)).map_err(|e| e.to_string())?;
            device
                .create_shader_module(&vk::ShaderModuleCreateInfo::default().code(&code), None)
                .map_err(failed("vkCreateShaderModule"))
        };
        let vertex = module(VERTEX)?;
        let fragment = module(FRAGMENT).inspect_err(|_| device.destroy_shader_module(vertex, None))?;
        let stages = [
            vk::PipelineShaderStageCreateInfo::default()
                .stage(vk::ShaderStageFlags::VERTEX)
                .module(vertex)
                .name(c"main"),
            vk::PipelineShaderStageCreateInfo::default()
                .stage(vk::ShaderStageFlags::FRAGMENT)
                .module(fragment)
                .name(c"main"),
        ];
        let vertex_input = vk::PipelineVertexInputStateCreateInfo::default();
        // Metal can't turn primitive restart off, and nothing here draws indexed.
        let assembly = vk::PipelineInputAssemblyStateCreateInfo::default()
            .topology(vk::PrimitiveTopology::TRIANGLE_STRIP)
            .primitive_restart_enable(true);
        let viewport = vk::PipelineViewportStateCreateInfo::default().viewport_count(1).scissor_count(1);
        let rasterization = vk::PipelineRasterizationStateCreateInfo::default()
            .polygon_mode(vk::PolygonMode::FILL)
            .cull_mode(vk::CullModeFlags::NONE)
            .line_width(1.0);
        let multisample =
            vk::PipelineMultisampleStateCreateInfo::default().rasterization_samples(vk::SampleCountFlags::TYPE_1);
        let blend = [vk::PipelineColorBlendAttachmentState::default().color_write_mask(vk::ColorComponentFlags::RGBA)];
        let blending = vk::PipelineColorBlendStateCreateInfo::default().attachments(&blend);
        let dynamic = [vk::DynamicState::VIEWPORT, vk::DynamicState::SCISSOR];
        let dynamic = vk::PipelineDynamicStateCreateInfo::default().dynamic_states(&dynamic);
        let info = vk::GraphicsPipelineCreateInfo::default()
            .stages(&stages)
            .vertex_input_state(&vertex_input)
            .input_assembly_state(&assembly)
            .viewport_state(&viewport)
            .rasterization_state(&rasterization)
            .multisample_state(&multisample)
            .color_blend_state(&blending)
            .dynamic_state(&dynamic)
            .layout(self.pipeline_layout)
            .render_pass(self.render_pass);
        let made = device.create_graphics_pipelines(vk::PipelineCache::null(), &[info], None);
        device.destroy_shader_module(vertex, None);
        device.destroy_shader_module(fragment, None);
        made.map(|pipelines| pipelines[0]).map_err(|(_, e)| format!("vkCreateGraphicsPipelines: {e}"))
    }

    unsafe fn make_swapchain(&mut self) -> Result<(), String> {
        let gpu = self.gpu.clone();
        let device = &gpu.device;
        let caps = self
            .surfaces
            .get_physical_device_surface_capabilities(gpu.physical(), self.surface)
            .map_err(failed("vkGetPhysicalDeviceSurfaceCapabilitiesKHR"))?;
        let extent = extent(&caps, self.size);
        let most = if caps.max_image_count == 0 { u32::MAX } else { caps.max_image_count };
        let alpha = [vk::CompositeAlphaFlagsKHR::OPAQUE, vk::CompositeAlphaFlagsKHR::INHERIT]
            .into_iter()
            .find(|alpha| caps.supported_composite_alpha.contains(*alpha))
            .unwrap_or(vk::CompositeAlphaFlagsKHR::OPAQUE);
        let old = std::mem::take(&mut self.swapchain);
        let info = vk::SwapchainCreateInfoKHR::default()
            .surface(self.surface)
            .min_image_count((caps.min_image_count + 1).min(most))
            .image_format(self.format)
            .image_color_space(vk::ColorSpaceKHR::SRGB_NONLINEAR)
            .image_extent(extent)
            .image_array_layers(1)
            .image_usage(vk::ImageUsageFlags::COLOR_ATTACHMENT)
            .image_sharing_mode(vk::SharingMode::EXCLUSIVE)
            .pre_transform(caps.current_transform)
            .composite_alpha(alpha)
            .present_mode(vk::PresentModeKHR::FIFO)
            .clipped(true)
            .old_swapchain(old.handle);
        let made = self.swapchains.create_swapchain(&info, None);
        self.drop_swapchain(old);
        self.swapchain.handle = made.map_err(failed("vkCreateSwapchainKHR"))?;
        self.swapchain.extent = extent;
        self.stale = false;
        let images =
            self.swapchains.get_swapchain_images(self.swapchain.handle).map_err(failed("vkGetSwapchainImagesKHR"))?;
        for image in images {
            let view = device
                .create_image_view(
                    &vk::ImageViewCreateInfo::default()
                        .image(image)
                        .view_type(vk::ImageViewType::TYPE_2D)
                        .format(self.format)
                        .subresource_range(
                            vk::ImageSubresourceRange::default()
                                .aspect_mask(vk::ImageAspectFlags::COLOR)
                                .level_count(1)
                                .layer_count(1),
                        ),
                    None,
                )
                .map_err(failed("vkCreateImageView"))?;
            self.swapchain.views.push(view);
            let framebuffer = device
                .create_framebuffer(
                    &vk::FramebufferCreateInfo::default()
                        .render_pass(self.render_pass)
                        .attachments(&[view])
                        .width(extent.width)
                        .height(extent.height)
                        .layers(1),
                    None,
                )
                .map_err(failed("vkCreateFramebuffer"))?;
            self.swapchain.framebuffers.push(framebuffer);
            let rendered = device
                .create_semaphore(&vk::SemaphoreCreateInfo::default(), None)
                .map_err(failed("vkCreateSemaphore"))?;
            self.swapchain.rendered.push(rendered);
        }
        Ok(())
    }

    // Presentation can still be reading the old images, so everything waits first.
    unsafe fn drop_swapchain(&self, swapchain: Swapchain) {
        let device = &self.gpu.device;
        if swapchain.handle != vk::SwapchainKHR::null() {
            let _ = self.gpu.with_queue(|_| device.device_wait_idle());
        }
        for framebuffer in swapchain.framebuffers {
            device.destroy_framebuffer(framebuffer, None);
        }
        for view in swapchain.views {
            device.destroy_image_view(view, None);
        }
        for semaphore in swapchain.rendered {
            device.destroy_semaphore(semaphore, None);
        }
        self.swapchains.destroy_swapchain(swapchain.handle, None);
    }

    pub fn draw(&mut self, frame: &Frame, layout: &Layout, parallax: &[Parallax]) -> Result<(), String> {
        vulkan::check_awake();
        unsafe {
            if self.stale {
                self.make_swapchain()?;
            }
            let gpu = self.gpu.clone();
            let device = &gpu.device;
            // The core waits on the fence before drawing over its image, so the screen holds it until the next one.
            let mut sampled = gpu.sampled();
            if self.submitted {
                device.wait_for_fences(&[self.fence], true, u64::MAX).map_err(failed("vkWaitForFences"))?;
            }
            let index = match self.swapchains.acquire_next_image(
                self.swapchain.handle,
                u64::MAX,
                self.acquired,
                vk::Fence::null(),
            ) {
                Ok((index, _)) => index as usize,
                Err(vk::Result::ERROR_OUT_OF_DATE_KHR) => {
                    self.stale = true;
                    return Ok(());
                }
                Err(e) => return Err(format!("vkAcquireNextImageKHR: {e}")),
            };
            // The core can make a new image at a freed one's address, so the set is written every frame.
            let image = [vk::DescriptorImageInfo::default()
                .image_view(frame.image.image_view)
                .image_layout(frame.image.image_layout)];
            let write = vk::WriteDescriptorSet::default()
                .dst_set(self.set)
                .dst_binding(0)
                .descriptor_type(vk::DescriptorType::SAMPLED_IMAGE)
                .image_info(&image);
            device.update_descriptor_sets(&[write], &[]);
            self.record(frame, index, layout, parallax)?;
            device.reset_fences(&[self.fence]).map_err(failed("vkResetFences"))?;
            self.submitted = false;
            *sampled = vk::Fence::null();
            let waits = Some((self.acquired, vk::PipelineStageFlags::COLOR_ATTACHMENT_OUTPUT));
            gpu.submit(self.commands, waits, self.swapchain.rendered[index], self.fence)?;
            self.submitted = true;
            *sampled = self.fence;
            drop(sampled);
            let indices = [index as u32];
            let present = vk::PresentInfoKHR::default()
                .wait_semaphores(std::slice::from_ref(&self.swapchain.rendered[index]))
                .swapchains(std::slice::from_ref(&self.swapchain.handle))
                .image_indices(&indices);
            // A new size comes as a new window, so a suboptimal swapchain stays until it's out of date.
            match gpu.with_queue(|queue| self.swapchains.queue_present(queue, &present)) {
                Ok(_) => {}
                Err(vk::Result::ERROR_OUT_OF_DATE_KHR) => self.stale = true,
                Err(e) => return Err(format!("vkQueuePresentKHR: {e}")),
            }
        }
        Ok(())
    }

    unsafe fn record(&self, frame: &Frame, index: usize, layout: &Layout, parallax: &[Parallax]) -> Result<(), String> {
        let device = &self.gpu.device;
        let commands = self.commands;
        let extent = self.swapchain.extent;
        device
            .begin_command_buffer(
                commands,
                &vk::CommandBufferBeginInfo::default().flags(vk::CommandBufferUsageFlags::ONE_TIME_SUBMIT),
            )
            .map_err(failed("vkBeginCommandBuffer"))?;
        let (from, to) = self.gpu.ownership(frame.src_queue_family);
        let drawn = vk::ImageMemoryBarrier::default()
            .image(frame.image.create_info.image)
            .subresource_range(
                vk::ImageSubresourceRange::default()
                    .aspect_mask(vk::ImageAspectFlags::COLOR)
                    .level_count(1)
                    .layer_count(1),
            )
            .old_layout(frame.image.image_layout)
            .new_layout(frame.image.image_layout)
            .src_queue_family_index(from)
            .dst_queue_family_index(to)
            .src_access_mask(vk::AccessFlags::MEMORY_WRITE)
            .dst_access_mask(vk::AccessFlags::SHADER_READ);
        device.cmd_pipeline_barrier(
            commands,
            vk::PipelineStageFlags::ALL_COMMANDS,
            vk::PipelineStageFlags::FRAGMENT_SHADER,
            vk::DependencyFlags::empty(),
            &[],
            &[],
            &[drawn],
        );
        let [r, g, b] = layout.page;
        let page = vk::ClearValue { color: vk::ClearColorValue { float32: [r, g, b, 1.0] } };
        let everywhere = vk::Rect2D { offset: vk::Offset2D::default(), extent };
        device.cmd_begin_render_pass(
            commands,
            &vk::RenderPassBeginInfo::default()
                .render_pass(self.render_pass)
                .framebuffer(self.swapchain.framebuffers[index])
                .render_area(everywhere)
                .clear_values(std::slice::from_ref(&page)),
            vk::SubpassContents::INLINE,
        );
        let area = layout.area;
        let area = [area.x, area.y, area.width, area.height].map(|n| n.round() as i32);
        if let Some(rect) = within(area, extent) {
            let [r, g, b] = layout.area_color;
            let clear = vk::ClearAttachment {
                aspect_mask: vk::ImageAspectFlags::COLOR,
                color_attachment: 0,
                clear_value: vk::ClearValue { color: vk::ClearColorValue { float32: [r, g, b, 1.0] } },
            };
            device.cmd_clear_attachments(
                commands,
                &[clear],
                &[vk::ClearRect { rect, base_array_layer: 0, layer_count: 1 }],
            );
        }
        device.cmd_bind_pipeline(commands, vk::PipelineBindPoint::GRAPHICS, self.pipeline);
        device.cmd_bind_descriptor_sets(
            commands,
            vk::PipelineBindPoint::GRAPHICS,
            self.pipeline_layout,
            0,
            &[self.set],
            &[],
        );
        let look = layout.look.as_ref();
        let colour = |[r, g, b]: [f32; 3]| [r, g, b, 0.0];
        let height = extent.height as i32;
        for pass in passes(layout, parallax, height) {
            let [x, y, w, h] = pass.viewport;
            let top = height - y - h;
            let Some(scissor) = within([x, top, w, h], extent) else { continue };
            let viewport = vk::Viewport {
                x: x as f32,
                y: top as f32,
                width: w as f32,
                height: h as f32,
                min_depth: 0.0,
                max_depth: 1.0,
            };
            device.cmd_set_viewport(commands, 0, &[viewport]);
            device.cmd_set_scissor(commands, 0, &[scissor]);
            let moved = pass.moved;
            let constants = Constants {
                source: [pass.source.x, pass.source.y, pass.source.width, pass.source.height],
                texel: [1.0, 1.0, 0.0, 0.0],
                shell: look.map_or([0.0; 4], |look| colour(look.shell)),
                plate: look.map_or([0.0; 4], |look| colour(look.plate)),
                window: pass.window,
                image: pass.image,
                shift: [moved.shift.x, moved.shift.y],
                exact: [moved.exact.x, moved.exact.y],
                lean: [moved.lean.x, moved.lean.y],
                margin: layout.border,
                dp: look.map_or(0.0, |look| look.dp),
                radius: look.map_or(0.0, |look| look.radius),
                recess: if look.is_some() { 1.0 } else { 0.0 },
                glass: if look.is_some_and(|look| look.glass) { 1.0 } else { 0.0 },
                pad: 0.0,
            };
            device.cmd_push_constants(
                commands,
                self.pipeline_layout,
                vk::ShaderStageFlags::FRAGMENT,
                0,
                constants.bytes(),
            );
            device.cmd_draw(commands, 4, 1, 0, 0);
        }
        device.cmd_end_render_pass(commands);
        device.end_command_buffer(commands).map_err(failed("vkEndCommandBuffer"))
    }
}

// A surface that leaves the size to the swapchain says so with a current extent of u32::MAX.
fn extent(caps: &vk::SurfaceCapabilitiesKHR, (width, height): (i32, i32)) -> vk::Extent2D {
    if caps.current_extent.width != u32::MAX {
        return caps.current_extent;
    }
    let (min, max) = (caps.min_image_extent, caps.max_image_extent);
    vk::Extent2D {
        width: (width.max(1) as u32).min(max.width).max(min.width),
        height: (height.max(1) as u32).min(max.height).max(min.height),
    }
}

// A scissor can't start off the surface, though a viewport can.
fn within([x, y, w, h]: [i32; 4], extent: vk::Extent2D) -> Option<vk::Rect2D> {
    let (left, top) = (x.max(0), y.max(0));
    let right = (x + w).min(extent.width as i32);
    let bottom = (y + h).min(extent.height as i32);
    (right > left && bottom > top).then(|| vk::Rect2D {
        offset: vk::Offset2D { x: left, y: top },
        extent: vk::Extent2D { width: (right - left) as u32, height: (bottom - top) as u32 },
    })
}

impl Drop for Presenter {
    fn drop(&mut self) {
        let gpu = self.gpu.clone();
        let device = &gpu.device;
        unsafe {
            *gpu.sampled() = vk::Fence::null();
            let _ = gpu.with_queue(|_| device.device_wait_idle());
            let swapchain = std::mem::take(&mut self.swapchain);
            self.drop_swapchain(swapchain);
            device.destroy_fence(self.fence, None);
            device.destroy_semaphore(self.acquired, None);
            device.destroy_command_pool(self.pool, None);
            device.destroy_descriptor_pool(self.descriptors, None);
            device.destroy_sampler(self.sampler, None);
            device.destroy_pipeline(self.pipeline, None);
            device.destroy_pipeline_layout(self.pipeline_layout, None);
            device.destroy_descriptor_set_layout(self.set_layout, None);
            device.destroy_render_pass(self.render_pass, None);
            self.surfaces.destroy_surface(self.surface, None);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::screen::{Point, Rect, View};
    use crate::vulkan::tests::draw_two_rows;
    use objc2::rc::Retained;
    use objc2::runtime::AnyObject;
    use objc2::{class, msg_send};
    use objc2_core_foundation::{CGPoint, CGRect, CGSize};
    use std::ffi::c_void;
    use std::path::Path;

    fn whole(width: f32, height: f32) -> Rect {
        Rect { x: 0.0, y: 0.0, width, height }
    }

    #[test]
    fn draws_the_cores_image_on_the_metal_layer_and_lets_the_core_wait_for_it() {
        let _lock = crate::test_games::lock_core();
        let library = option_env!("PKH_EMU_MOLTENVK").expect("build.rs gives tests MoltenVK's path");
        let mut renderer = vulkan::Renderer::new(Path::new(library), &[]).unwrap();
        let interface = unsafe { &*renderer.interface().unwrap() };
        let rows = unsafe { draw_two_rows(interface) };
        let frame = renderer.frame(2, 2).unwrap();
        let layer: Retained<AnyObject> = unsafe { msg_send![class!(CAEAGLLayer), new] };
        let metal: Retained<AnyObject> = unsafe { msg_send![class!(CAMetalLayer), new] };
        let bounds = CGRect { origin: CGPoint { x: 0.0, y: 0.0 }, size: CGSize { width: 32.0, height: 24.0 } };
        let _: () = unsafe { msg_send![&metal, setBounds: bounds] };
        let _: () = unsafe { msg_send![&metal, setContentsScale: 2.0f64] };
        let pointer = |layer: &Retained<AnyObject>| Retained::as_ptr(layer) as *mut c_void;
        let window = unsafe { Window::from_layers(pointer(&layer), pointer(&metal), 100, 100) }.unwrap();
        let layout = Layout {
            page: [0.0; 3],
            area: whole(64.0, 48.0),
            area_color: [0.0; 3],
            canvas: Point::default(),
            border: 0.0,
            views: vec![View { source: whole(1.0, 1.0), target: whole(64.0, 48.0), window: 0 }],
            look: None,
        };

        let mut presenter = Presenter::new(frame.gpu.clone(), &window).unwrap();
        for _ in 0..3 {
            presenter.draw(&frame, &layout, &[]).unwrap();
        }
        unsafe { (interface.wait_sync_index)(interface.handle) };

        let extent = presenter.swapchain.extent;
        assert_eq!((extent.width, extent.height), (64, 48));
        drop(presenter);
        drop(rows);
    }

    fn caps(current: (u32, u32), min: (u32, u32), max: (u32, u32)) -> vk::SurfaceCapabilitiesKHR {
        let extent = |(width, height)| vk::Extent2D { width, height };
        vk::SurfaceCapabilitiesKHR {
            current_extent: extent(current),
            min_image_extent: extent(min),
            max_image_extent: extent(max),
            ..Default::default()
        }
    }

    #[test]
    fn sizes_the_swapchain_as_the_surface_is() {
        let sized = extent(&caps((640, 480), (1, 1), (4096, 4096)), (100, 100));

        assert_eq!((sized.width, sized.height), (640, 480));
    }

    #[test]
    fn sizes_the_swapchain_as_the_window_is_within_the_surfaces_limits_when_the_surface_leaves_it_open() {
        let open = (u32::MAX, u32::MAX);

        let window = extent(&caps(open, (1, 1), (4096, 4096)), (640, 480));
        let small = extent(&caps(open, (200, 200), (4096, 4096)), (100, 0));
        let big = extent(&caps(open, (1, 1), (512, 512)), (640, 480));

        assert_eq!((window.width, window.height), (640, 480));
        assert_eq!((small.width, small.height), (200, 200));
        assert_eq!((big.width, big.height), (512, 480));
    }
}
