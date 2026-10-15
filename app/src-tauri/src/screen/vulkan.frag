#version 450
layout(location = 0) in vec2 uv;
layout(location = 0) out vec4 color;
layout(set = 0, binding = 0) uniform texture2D frameImage;
layout(set = 0, binding = 1) uniform sampler frameSampler;
layout(push_constant) uniform Pass {
  vec4 source;
  vec4 texel4;
  vec4 shell4;
  vec4 plate4;
  vec2 window;
  vec2 image;
  vec2 shift;
  vec2 exact;
  vec2 lean;
  float margin;
  float dp;
  float radius;
  float recess;
  float glass;
};
// frame.glsl, the OpenGL screen's shader body, follows, so these give its names their Vulkan meaning.
#define frame sampler2D(frameImage, frameSampler)
#define texel texel4.xyz
#define shell shell4.rgb
#define plate plate4.rgb
#define at (window * uv)
