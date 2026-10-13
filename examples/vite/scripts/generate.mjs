// Renders the abstract demo samples into public/photos with a WebGL shader in
// headless Chromium: rim-lit folded sheets at every step round the colour
// wheel (fold-*), plus two neutrals. Each holds near one hue, so the colour
// sort shows them as a clean spectrum alongside the photos.
//
//   pnpm generate
//
// Set CHROMIUM_PATH if Playwright's bundled Chromium is not installed.
import { writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const dir = new URL("../public/photos/", import.meta.url);

const PRELUDE = `#version 300 es
precision highp float;
uniform vec2 res;
out vec4 outColor;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 hsv(float h, float s, float v) {
  vec3 k = clamp(abs(mod(h * 6.0 + vec3(0, 4, 2), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return v * mix(vec3(1), k, s);
}
// Centred, aspect-corrected, y down to match the image.
vec2 P() { return (vec2(gl_FragCoord.x, res.y - gl_FragCoord.y) - 0.5 * res) / res.y; }
`;

// Random but stable per name, so every run renders the same images.
function random(seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 2 ** 32;
  };
}

const f = (n) => n.toFixed(3);

// Folds: layered sheets with curved edges on a near-black ground, each lit
// along its edge with a bright rim and falling off into shadow, casting a dark
// gap onto the sheet beneath. Fourteen hues round the wheel plus two
// neutrals, each held near one hue so the sort shows a clean spectrum.
const FOLD = `
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
// Signed distance to a curved edge u = a + b v + c v² + d sin(k v) in a frame
// rotated by th; positive on the sheet's side.
float edge(vec2 p, float th, float a, float b, float c, float d, float k) {
  vec2 q = mat2(cos(th), sin(th), -sin(th), cos(th)) * p;
  float g = a + b * q.y + c * q.y * q.y + d * sin(k * q.y);
  float dg = b + 2.0 * c * q.y + d * k * cos(k * q.y);
  return (q.x - g) / sqrt(1.0 + dg * dg);
}
// Lit near the edge, desaturating towards white at the rim, dark far inside.
// A faint back-light from the far side keeps wide sheets from going flat black.
vec3 sheet(float d, float h, float sat, float fall, float glow, float back) {
  float t = exp(-max(d, 0.0) / fall);
  vec3 c = hsv(h, sat * mix(1.0, 0.45, pow(t, 4.0)), glow * pow(t, 1.4));
  c += hsv(h, sat, 0.35) * back * smoothstep(0.2, 1.2, d);
  c += hsv(h, sat * 0.35, 1.0) * exp(-max(d, 0.0) / 0.004) * 0.7;
  return c;
}
`;

function fold(name, hue, sat) {
  const r = random(name);
  const th = (r() - 0.5) * 1.2;
  const count = 4 + Math.floor(r() * 2);
  const layers = Array.from({ length: count }, (_, i) => {
    const a = -0.75 + (1.5 * (i + r() * 0.6)) / count;
    const b = (r() - 0.5) * 0.5, c = (r() - 0.5) * 1.4, d = r() * 0.08, k = 1.5 + r() * 3;
    let sd = `edge(p, ${f(th + (r() - 0.5) * 0.35)}, ${f(a)}, ${f(b)}, ${f(c)}, ${f(d)}, ${f(k)})`;
    // Some sheets end in a rounded corner where a second edge cuts across.
    if (r() < 0.4) sd = `smin(${sd}, edge(p, ${f(th + 1.9 + r() * 0.8)}, ${f(0.15 + r() * 0.45)}, 0.0, ${f((r() - 0.5) * 0.8)}, 0.0, 1.0), 0.18)`;
    const h = f((hue + (r() - 0.5) * 0.05 + 1) % 1);
    const fall = f(0.22 + r() * 0.45), glow = f(0.8 + r() * 0.25), back = f(r());
    return `{ float d = ${sd};
      float cov = smoothstep(-aa, aa, d);
      col *= 1.0 - 0.9 * exp(min(d, 0.0) / 0.03) * (1.0 - cov);
      col = mix(col, sheet(d, ${h}, ${f(sat)}, ${fall}, ${glow}, ${back}), cov); }`;
  });
  return `
    vec2 p = P();
    float aa = 1.5 / res.y;
    vec3 col = hsv(${f(hue)}, ${f(sat)}, 0.025);
    ${layers.join("\n    ")}
    col += (hash(gl_FragCoord.xy * 0.731) + hash(gl_FragCoord.xy * 1.37 + 17.0) - 1.0) * 0.03;
    outColor = vec4(clamp(col, 0.0, 1.0), 1);`;
}

const foldHues = [
  ["red", 0], ["vermilion", 1 / 24], ["orange", 1 / 12], ["amber", 1 / 8], ["yellow", 1 / 6], ["lime", 1 / 4],
  ["green", 1 / 3], ["teal", 1 / 2], ["azure", 7 / 12], ["blue", 0.62], ["indigo", 0.7], ["violet", 0.76],
  ["magenta", 0.85], ["rose", 0.93],
];
const folds = [
  ...foldHues.map(([name, hue], i) => [`fold-${name}`, ...(i % 2 ? [1600, 1066] : [1066, 1600]), fold(name, hue, 0.9)]),
  ["fold-graphite", 1066, 1600, fold("graphite", 0.6, 0.0)],
  ["fold-silver", 1600, 1066, fold("silver", 0.58, 0.06)],
];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage();

// Draws one full-screen triangle with the fragment shader and returns a JPEG.
async function render(main, width, height) {
  return page.evaluate(
    ({ frag, width, height }) => {
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
      gl.viewport(0, 0, width, height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return canvas.toDataURL("image/jpeg", 0.9);
    },
    { frag: `${PRELUDE}${FOLD}void main() {${main}\n}`, width, height }
  );
}

function save(file, dataUrl) {
  writeFileSync(new URL(`${file}.jpg`, dir), Buffer.from(dataUrl.split(",")[1], "base64"));
  console.log(`  ${file}.jpg`);
}

for (const [file, width, height, main] of folds) save(file, await render(main, width, height));
await browser.close();

