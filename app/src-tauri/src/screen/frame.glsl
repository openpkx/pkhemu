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
    c = shell * mix(1.0, lit * (1.0 - 0.3 * t), 0.500);
  } else {
    vec2 p = q - shift;
    vec2 g = p - margin;
    if (g.x >= 0.0 && g.y >= 0.0 && g.x < image.x && g.y < image.y) {
      vec2 uv = source.xy + source.zw * g / image;
      c = texture(frame, vec2(uv.x * texel.x, uv.y * texel.y + texel.z)).rgb;
      onGame = 1.0;
    } else {
      c = plate;
    }
    float w = max(13.000 * dp, 1.0);
    vec2 l = clamp(lean * -1.000 * 1.5, -0.85, 0.85);
    float top = 1.0 - smoothstep(0.0, w * (1.0 + l.y), p.y);
    float sides = (1.0 + l.x) * (1.0 - smoothstep(0.0, w * 0.5 * (1.0 + l.x), p.x))
      + (1.0 - l.x) * (1.0 - smoothstep(0.0, w * 0.5 * (1.0 - l.x), window.x - p.x));
    float bottom = 1.0 - smoothstep(0.0, w * 0.3 * (1.0 - l.y), window.y - p.y);
    c *= 1.0 - recess * clamp(top + 0.45 * sides + 0.25 * bottom, 0.0, 1.0) * 0.800
      * mix(1.0, 0.600, onGame) * 0.85;
  }
  float u = (q.x * 0.55 + q.y) - (window.x * 0.55 + window.y) * 0.35 + (exact.x * 0.55 + exact.y) * 30.0;
  vec2 bands = vec2(u / (window.y * 0.16), (u - window.y * 0.45) / (window.y * 0.05));
  float band = exp(-bands.x * bands.x) + 0.35 * exp(-bands.y * bands.y);
  c += vec3(glass * band * mix(0.500 * 0.22, 0.030, onGame));
  float edge = min(min(q.x, window.x - q.x), window.y - q.y);
  float rimLine = (1.0 - smoothstep(0.0, dp * 1.5, q.y)) + 0.35 * (1.0 - smoothstep(0.0, dp, edge));
  c += vec3(glass * rimLine * 0.700 * 0.35);
  float outside = length(max(abs(q - window / 2.0) - window / 2.0 + radius, 0.0)) - radius;
  color = vec4(mix(c, shell, recess * clamp(outside + 0.5, 0.0, 1.0)), 1.0);
}
