// Renders the project mark into docs/brand/ with a WebGL shader in headless
// Chromium: three rounded panels of red, green and blue light on a dark mesh
// gradient, brightening where they cross, split into red, green and blue at
// the edges like a misregistered print, then worn with grain.
//
//   pnpm mark
//
// Set CHROMIUM_PATH if Playwright's bundled Chromium is not installed.
import { writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const dir = new URL("../../../docs/brand/", import.meta.url);

const FRAG = `#version 300 es
precision highp float;
uniform vec2 res;
uniform float zoom;
uniform vec2 shift;
out vec4 outColor;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
vec3 hsv(float h, float s, float v) {
  vec3 k = clamp(abs(mod(h * 6.0 + vec3(0, 4, 2), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return v * mix(vec3(1), k, s);
}
mat2 rot(float a) { return mat2(cos(a), sin(a), -sin(a), cos(a)); }
float box(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }

// Three frames, each a photo-shaped card turned a third of the way round
// from the last and pushed off centre so all three cross in the middle. They
// act like panels of coloured light: red, green and blue that add where they
// cross, so pairs brighten to cyan, magenta and yellow and the middle to
// white. Returns the light and how much of the ground it covers.
vec4 panels(vec2 p) {
  vec3 c = vec3(0);
  float cover = 0.0, n = 0.0;
  for (int i = 0; i < 3; i++) {
    float a = float(i) / 3.0 * 6.2832 - 1.5708;
    // Long axis points out from the centre, twisted a little so the
    // crossings are uneven like cards dropped on a table.
    vec2 q = rot(-a - 1.5708 + 0.3) * (p - 0.15 * vec2(cos(a), sin(a)));
    float d = box(q, vec2(0.17, 0.27), 0.03);
    float inside = smoothstep(0.0015, -0.0015, d);
    float h = float(i) / 3.0 - 0.1 * (q.y / 0.54 + 0.5);
    c += hsv(h, 1.0, 0.8 + 0.15 * smoothstep(0.27, -0.27, q.y)) * inside;
    // A bright edge where the panel's cut catches the light.
    c += hsv(h, 0.35, 1.0) * exp(-abs(d) / 0.002) * 0.5;
    cover = max(cover, max(inside, exp(-abs(d) / 0.002) * 0.5));
    n += inside;
  }
  // Each extra layer adds light, so crossings glow brighter than the ground.
  c *= 1.0 + 0.3 * max(n - 1.0, 0.0);
  return vec4(1.0 - exp(-c * 2.0), cover * 0.94);
}

// Ground with the panels laid over it.
vec3 lay(vec2 p, vec3 bg) { vec4 l = panels(p); return mix(bg, l.rgb, l.a); }

// The cards' soft shadow on the table, offset down and right.
float shadow(vec2 p) {
  float s = 0.0;
  for (int i = 0; i < 3; i++) {
    float a = float(i) / 3.0 * 6.2832 - 1.5708;
    vec2 q = rot(-a - 1.5708 + 0.3) * (p - vec2(0.012, 0.02) - 0.15 * vec2(cos(a), sin(a)));
    s = max(s, exp(-max(box(q, vec2(0.17, 0.27), 0.03), 0.0) / 0.035));
  }
  return s;
}

// Dark mesh gradient: near-black with faint plum, teal and navy washes pooled
// at a few points, so the panels' light sits on depth rather than a flat void.
vec3 ground(vec2 p) {
  vec3 c = vec3(0.035, 0.035, 0.045);
  c += vec3(0.20, 0.05, 0.24) * exp(-dot(p - vec2(-0.5, -0.35), p - vec2(-0.5, -0.35)) / 0.2);
  c += vec3(0.03, 0.18, 0.2) * exp(-dot(p - vec2(0.55, -0.3), p - vec2(0.55, -0.3)) / 0.22);
  c += vec3(0.06, 0.08, 0.26) * exp(-dot(p - vec2(0.45, 0.45), p - vec2(0.45, 0.45)) / 0.2);
  c += vec3(0.16, 0.1, 0.03) * exp(-dot(p - vec2(-0.5, 0.42), p - vec2(-0.5, 0.42)) / 0.18);
  return c;
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y);
  vec2 uv = (px - 0.5 * res) / res.y;
  vec2 p = (uv - shift) / zoom;
  // Chromatic aberration: each channel sampled at a slightly different
  // scale, growing towards the edge, plus a sideways shear, so the fringes
  // read as a misregistered print.
  float k = 0.012 + 0.09 * dot(p, p);
  vec2 o = vec2(0.009, 0.002);
  vec3 bg = ground(uv) * (1.0 - 0.35 * shadow(p));
  vec3 col = vec3(lay(p * (1.0 - k) - o, bg).r, lay(p, bg).g, lay(p * (1.0 + k) + o, bg).b);
  col *= 0.94 + 0.06 * noise(px * 0.7) * (0.6 + 0.4 * noise(p * 40.0));
  col += (hash(px + 0.37) - 0.5) * 0.035;
  outColor = vec4(clamp(col, 0.0, 1.0), 1);
}`;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage();

// Draws one full-screen triangle with the fragment shader and returns a PNG.
async function render(width, height, zoom, shift = [0, 0]) {
  return page.evaluate(
    ({ frag, width, height, zoom, shift }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true });
      const compile = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, `#version 300 es
        void main() { gl_Position = vec4(vec2[3](vec2(-1, -1), vec2(3, -1), vec2(-1, 3))[gl_VertexID], 0, 1); }`));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, frag));
      gl.linkProgram(program);
      gl.useProgram(program);
      gl.uniform2f(gl.getUniformLocation(program, "res"), width, height);
      gl.uniform1f(gl.getUniformLocation(program, "zoom"), zoom);
      gl.uniform2f(gl.getUniformLocation(program, "shift"), ...shift);
      gl.viewport(0, 0, width, height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return canvas.toDataURL("image/png");
    },
    { frag: FRAG, width, height, zoom, shift }
  );
}

function save(file, dataUrl) {
  writeFileSync(new URL(file, dir), Buffer.from(dataUrl.split(",")[1], "base64"));
  console.log(`  docs/brand/${file}`);
}

save("mark.png", await render(1024, 1024, 0.8));
save("hero.png", await render(1600, 800, 0.8, [0.48, 0]));
await browser.close();
