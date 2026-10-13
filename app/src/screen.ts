import { origin, type Point } from "./fit";
import type { Layout } from "./screens";

// Pixel positions run past what mediump holds exactly on some phones. Both stages share the window uniform, so they share a precision.
const precision = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif`;

const vertex = `${precision}
attribute vec2 p;
uniform vec2 window;
varying vec2 at;
void main() { at = window * vec2((p.x + 1.0) / 2.0, (1.0 - p.y) / 2.0); gl_Position = vec4(p, 0.0, 1.0); }`;

const RECESS = {
  wall: 0.5,
  shadowDp: 13,
  shadow: 0.8,
  shadowGame: 0.6,
  light: -1,
  sheen: 0.5,
  sheenGame: 0.03,
  rim: 0.7,
};

const float = (value: number) => value.toFixed(3);

// The native twin of this shader is in app/src-tauri/src/screen.rs. A change to one belongs in both.
// The window is the opening in the shell, and the game sits on a plate below it, seen from q at q - shift. A ray that leaves
// the window first shows the wall it hits. The lip's shadow stays on the plate and leans away from a light fixed in the room.
const fragment = `${precision}
varying vec2 at;
uniform sampler2D frame;
uniform vec4 source;
uniform vec2 window;
uniform vec2 image;
uniform float margin;
uniform vec2 shift;
uniform vec2 exact;
uniform vec2 lean;
uniform vec3 shell;
uniform vec3 plate;
uniform float dp;
uniform float radius;
uniform float recess;
uniform float glass;
void main() {
  vec2 q = at;
  float t = 2.0;
  float side = 0.0;
  if (shift.x > 0.0) { float u = q.x / shift.x; if (u < t) { t = u; side = 1.0; } }
  if (shift.x < 0.0) { float u = (window.x - q.x) / -shift.x; if (u < t) { t = u; side = 2.0; } }
  if (shift.y > 0.0) { float u = q.y / shift.y; if (u < t) { t = u; side = 3.0; } }
  if (shift.y < 0.0) { float u = (window.y - q.y) / -shift.y; if (u < t) { t = u; side = 4.0; } }
  vec3 c;
  float onGame = 0.0;
  if (t < 1.0) {
    float lit = side == 3.0 ? 0.45 : side == 4.0 ? 1.0 : 0.72;
    c = shell * mix(1.0, lit * (1.0 - 0.3 * t), ${float(RECESS.wall)});
  } else {
    vec2 p = q - shift;
    vec2 g = p - margin;
    if (g.x >= 0.0 && g.y >= 0.0 && g.x < image.x && g.y < image.y) {
      c = texture2D(frame, source.xy + source.zw * g / image).rgb;
      onGame = 1.0;
    } else {
      c = plate;
    }
    float w = max(${float(RECESS.shadowDp)} * dp, 1.0);
    vec2 l = clamp(lean * ${float(RECESS.light)} * 1.5, -0.85, 0.85);
    float top = 1.0 - smoothstep(0.0, w * (1.0 + l.y), p.y);
    float sides = (1.0 + l.x) * (1.0 - smoothstep(0.0, w * 0.5 * (1.0 + l.x), p.x))
      + (1.0 - l.x) * (1.0 - smoothstep(0.0, w * 0.5 * (1.0 - l.x), window.x - p.x));
    float bottom = 1.0 - smoothstep(0.0, w * 0.3 * (1.0 - l.y), window.y - p.y);
    c *= 1.0 - recess * clamp(top + 0.45 * sides + 0.25 * bottom, 0.0, 1.0) * ${float(RECESS.shadow)}
      * mix(1.0, ${float(RECESS.shadowGame)}, onGame) * 0.85;
  }
  float u = (q.x * 0.55 + q.y) - (window.x * 0.55 + window.y) * 0.35 + (exact.x * 0.55 + exact.y) * 30.0;
  vec2 bands = vec2(u / (window.y * 0.16), (u - window.y * 0.45) / (window.y * 0.05));
  float band = exp(-bands.x * bands.x) + 0.35 * exp(-bands.y * bands.y);
  c += vec3(glass * band * mix(${float(RECESS.sheen)} * 0.22, ${float(RECESS.sheenGame)}, onGame));
  float edge = min(min(q.x, window.x - q.x), window.y - q.y);
  float rimLine = (1.0 - smoothstep(0.0, dp * 1.5, q.y)) + 0.35 * (1.0 - smoothstep(0.0, dp, edge));
  c += vec3(glass * rimLine * ${float(RECESS.rim)} * 0.35);
  float outside = length(max(abs(q - window / 2.0) - window / 2.0 + radius, 0.0)) - radius;
  gl_FragColor = vec4(mix(c, shell, recess * clamp(outside + 0.5, 0.0, 1.0)), 1.0);
}`;

export type Rgb = [number, number, number];
// The radius rounds the window's corners, in canvas pixels, and the dp is the canvas pixels in one.
export type Look = { shell: Rgb; plate: Rgb; dp: number; radius: number; glass: boolean };
// A window's whole-pixel shift moves the plate, and the exact one in canvas pixels moves the glass's sheen.
// The lean is the exact shift as a fraction of the most the tilt gives.
export type Parallax = { shift: Point; exact: Point; lean: Point };

const still: Parallax = { shift: origin, exact: origin, lean: origin };

export type Frame = { width: number; height: number; pixels: Uint16Array };

export function createScreen(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, desynchronized: true });
  if (!gl) throw new Error("WebGL is unavailable");
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const p = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(p);
  gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const source = uniform("source");
  const windowSize = uniform("window");
  const image = uniform("image");
  const margin = uniform("margin");
  const shift = uniform("shift");
  const exact = uniform("exact");
  const lean = uniform("lean");
  const shell = uniform("shell");
  const plate = uniform("plate");
  const dpUniform = uniform("dp");
  const radius = uniform("radius");
  const recess = uniform("recess");
  const glass = uniform("glass");

  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 2);

  let textureSize = "";
  let uploaded: Frame | undefined;
  return (frame: Frame, layout: Layout, look?: Look, parallax: readonly Parallax[] = []) => {
    const size = `${frame.width}x${frame.height}`;
    if (size !== textureSize) {
      textureSize = size;
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, frame.width, frame.height, 0, gl.RGB, gl.UNSIGNED_SHORT_5_6_5, frame.pixels);
    } else if (frame !== uploaded) {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, frame.width, frame.height, gl.RGB, gl.UNSIGNED_SHORT_5_6_5, frame.pixels);
    }
    uploaded = frame;
    const edge = layout.border;
    gl.uniform1f(margin, edge);
    gl.uniform1f(recess, look ? 1 : 0);
    gl.uniform1f(glass, look?.glass ? 1 : 0);
    if (look) {
      gl.uniform3fv(shell, look.shell);
      gl.uniform3fv(plate, look.plate);
      gl.uniform1f(dpUniform, look.dp);
      gl.uniform1f(radius, look.radius);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(...look.shell, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    for (const view of layout.views) {
      const { x, y, width, height } = view.target;
      const windowWidth = width + 2 * edge;
      const windowHeight = height + 2 * edge;
      const moved = look ? (parallax[view.window] ?? still) : still;
      gl.viewport(x - edge, canvas.height - (y - edge) - windowHeight, windowWidth, windowHeight);
      gl.uniform2f(windowSize, windowWidth, windowHeight);
      gl.uniform2f(image, width, height);
      gl.uniform2f(shift, moved.shift.x, moved.shift.y);
      gl.uniform2f(exact, moved.exact.x, moved.exact.y);
      gl.uniform2f(lean, moved.lean.x, moved.lean.y);
      gl.uniform4f(source, view.source.x, view.source.y, view.source.width, view.source.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  };
}
