// Renders the extreme demo samples into public/photos with WebGL shaders in
// headless Chromium: generative pieces (gen-*), grainy shape textures in each
// tone family (tex-*) and rim-lit folded sheets at every step round the colour
// wheel (fold-*). They push the colour sort to its limits: single saturated
// hues, near-black, near-white, monochrome and full spectrum.
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
#define PI 3.14159265
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 hash2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 6; i++) { v += a * noise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5; }
  return v;
}
vec3 hsv(float h, float s, float v) {
  vec3 k = clamp(abs(mod(h * 6.0 + vec3(0, 4, 2), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return v * mix(vec3(1), k, s);
}
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
// uv: 0..1 with y down, matching the image. p: centred, aspect-corrected.
vec2 UV() { return vec2(gl_FragCoord.x, res.y - gl_FragCoord.y) / res; }
vec2 P() { return (vec2(gl_FragCoord.x, res.y - gl_FragCoord.y) - 0.5 * res) / res.y; }
`;

// [file, width, height, fragment main()]. Captions live in analyse.mjs.
const generative = [
  ["gen-neon-plasma", 1600, 1066, `
    vec2 p = P() * 3.0;
    float v = sin(p.x * 2.1 + sin(p.y * 1.3)) + sin(length(p - vec2(1.2, -0.4)) * 4.0) + sin(p.x * p.y * 1.7);
    float t = 0.5 + 0.5 * sin(v * 2.4);
    outColor = vec4(mix(vec3(1.0, 0.0, 0.62), vec3(0.0, 0.95, 1.0), smoothstep(0.2, 0.8, t)) * (0.75 + 0.25 * cos(v * 5.0)), 1);`],
  ["gen-primary-cells", 1066, 1600, `
    vec2 p = P() * 7.0;
    vec2 i = floor(p), f = fract(p);
    float d1 = 9.0, d2 = 9.0; vec2 id;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(x, y), o = hash2(i + g);
      float d = length(g + o - f);
      if (d < d1) { d2 = d1; d1 = d; id = i + g; } else if (d < d2) d2 = d;
    }
    float k = floor(hash(id) * 3.0);
    vec3 c = k < 1.0 ? vec3(0.9, 0.02, 0.05) : k < 2.0 ? vec3(0.0, 0.18, 0.95) : vec3(1.0, 0.86, 0.0);
    outColor = vec4(c * smoothstep(0.02, 0.06, d2 - d1), 1);`],
  ["gen-spectrum-vortex", 1600, 1600, `
    vec2 p = P();
    float r = length(p), a = atan(p.y, p.x);
    float h = a / (2.0 * PI) + 0.35 / (r + 0.05) + 0.08 * fbm(p * 6.0);
    outColor = vec4(hsv(fract(h), 1.0, smoothstep(0.0, 0.08, r)), 1);`],
  ["gen-molten-core", 1600, 1066, `
    vec2 p = P() * 2.5;
    vec2 q = vec2(fbm(p), fbm(p + 5.2));
    vec2 r = vec2(fbm(p + 4.0 * q + 1.7), fbm(p + 4.0 * q + 9.2));
    float f = fbm(p + 4.0 * r);
    vec3 c = mix(vec3(0.25, 0.0, 0.0), vec3(1.0, 0.22, 0.0), smoothstep(0.2, 0.6, f));
    c = mix(c, vec3(1.0, 0.85, 0.2), smoothstep(0.6, 0.85, f * f * 1.6));
    outColor = vec4(c, 1);`],
  ["gen-event-horizon", 1066, 1600, `
    vec2 p = P();
    float r = length(p - vec2(0.0, -0.05));
    float ring = exp(-pow((r - 0.28) * 28.0, 2.0)) * (0.6 + 0.4 * fbm(vec2(atan(p.y, p.x) * 3.0, r * 8.0)));
    vec3 c = vec3(0.012, 0.0, 0.03) + vec3(0.35, 0.05, 0.9) * ring * 0.55 + vec3(0.02, 0.0, 0.05) * fbm(p * 4.0);
    outColor = vec4(c, 1);`],
  ["gen-whiteout", 1600, 1066, `
    vec2 p = P() * 2.0;
    float f = fbm(p + fbm(p * 1.5));
    vec3 c = vec3(0.97, 0.965, 0.95) - vec3(0.02, 0.035, 0.0) * smoothstep(0.35, 0.75, f) - vec3(0.0, 0.01, 0.04) * (1.0 - f);
    outColor = vec4(c, 1);`],
  ["gen-moire", 1600, 1600, `
    vec2 p = P();
    float a = sin(length(p - vec2(-0.15, 0.0)) * 260.0), b = sin(length(p - vec2(0.15, 0.05)) * 260.0);
    outColor = vec4(vec3(step(0.0, a * b)), 1);`],
  ["gen-toxic-bloom", 1066, 1600, `
    vec2 p = P() * 4.0;
    float f = fbm(p + 2.0 * vec2(fbm(p * 0.7), fbm(p * 0.7 + 3.1)));
    float bands = smoothstep(0.45, 0.5, fract(f * 9.0));
    vec3 c = mix(vec3(0.02, 0.08, 0.0), vec3(0.55, 1.0, 0.0), bands * smoothstep(0.25, 0.65, f));
    outColor = vec4(c, 1);`],
  ["gen-ultramarine-caustics", 1600, 1066, `
    vec2 p = mod(UV() * vec2(res.x / res.y, 1.0) * 2.0 * PI, 2.0 * PI) - 250.0, i = p;
    float c = 1.0;
    for (int n = 0; n < 5; n++) {
      float t = 1.0 - 3.5 / float(n + 1);
      i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
      c += 1.0 / length(vec2(p.x / (sin(i.x + t) / 0.005), p.y / (cos(i.y + t) / 0.005)));
    }
    c = pow(abs(1.17 - pow(c / 5.0, 1.4)), 8.0);
    outColor = vec4(clamp(vec3(0.0, 0.03, 0.35) + vec3(0.25, 0.6, 1.0) * c, 0.0, 1.0), 1);`],
  ["gen-sunset-bands", 1066, 1600, `
    vec2 uv = UV();
    float y = uv.y + 0.04 * sin(uv.x * 9.0 + fbm(uv * 4.0) * 4.0);
    float b = floor(y * 9.0) / 8.0;
    outColor = vec4(mix(vec3(1.0, 0.0, 0.4), vec3(1.0, 0.62, 0.0), b), 1);`],
];

// Textures, two per tone family: a warped mesh gradient, abstract shapes that
// each carry their own gradient and soft shadow, and film grain over the top.
// Each palette stays inside its family so the analysis files it there.
const palettes = {
  red: ["#5c0711", "#b3121f", "#e8343a", "#ff7a6b", "#8a0f2e"],
  orange: ["#6b2603", "#c2500a", "#f07d1a", "#ffb067", "#a33a12"],
  yellow: ["#6e5a05", "#c9a20a", "#f2d22e", "#fff09a", "#a98a12"],
  green: ["#0b3d22", "#1b7a43", "#3fbf6e", "#a6e8b8", "#2e6b2a"],
  blue: ["#06204f", "#1546a8", "#3b7bf0", "#9cc4ff", "#1a2f7a"],
  purple: ["#2a0a4a", "#5b1b95", "#9248d6", "#d1a6ff", "#6b1f7a"],
  neutral: ["#1d1d1f", "#4a4a4d", "#8c8c90", "#d9d9db", "#6b6b70"],
};

// Random but stable per name, so every run renders the same textures.
function random(seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 2 ** 32;
  };
}

const vec3 = (hex) =>
  `vec3(${[1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3)).join(", ")})`;
const f = (n) => n.toFixed(3);

function texture(tone, variant) {
  const r = random(`${tone}-${variant}`);
  const colors = palettes[tone].map(vec3).join(", ");
  const points = Array.from({ length: 5 }, () => `vec2(${f(r() * 1.6 - 0.8)}, ${f(r() * 1.2 - 0.6)})`).join(", ");
  // Variant 1 favours orbs and rings, variant 2 capsules and slabs.
  const kinds = variant === 1 ? ["circle", "circle", "ring", "capsule"] : ["capsule", "box", "box", "ring"];
  const shapes = Array.from({ length: 5 + Math.floor(r() * 3) }, () => {
    const kind = kinds[Math.floor(r() * kinds.length)];
    const c = `vec2(${f(r() * 1.4 - 0.7)}, ${f(r() * 1.0 - 0.5)})`;
    const size = 0.08 + r() * 0.28, angle = r() * Math.PI, shift = f(r() * 5);
    const q = `rot(${f(angle)}) * (p - ${c})`;
    const d = {
      circle: `length(p - ${c}) - ${f(size)}`,
      ring: `abs(length(p - ${c}) - ${f(size)}) - ${f(size * 0.18)}`,
      capsule: `sdCapsule(${q}, ${f(size * 1.2)}, ${f(size * 0.32)})`,
      box: `sdBox(${q}, vec2(${f(size)}, ${f(size * (0.35 + r() * 0.5))}), ${f(size * 0.3)})`,
    }[kind];
    return `shape(col, p, ${d}, ${shift});`;
  });
  return `
    vec2 p = P();
    vec3 col = mesh(p, 0.0);
    ${shapes.join("\n    ")}
    float g = hash(gl_FragCoord.xy * 0.731 + ${f(r() * 100)}) + hash(gl_FragCoord.xy * 1.37 + 17.0) - 1.0;
    col += g * 0.075;
    col *= 1.0 - 0.35 * pow(length(UV() - 0.5) * 1.3, 2.5);
    outColor = vec4(clamp(col, 0.0, 1.0), 1);`.replace(
    "vec2 p = P();",
    `vec2 p = P();\n    vec3 C[5] = vec3[5](${colors});\n    vec2 M[5] = vec2[5](${points});`
  );
}

// mesh() and shape() read the palette and mesh points from main's locals, so
// they are macros rather than functions.
const TEXTURE_PRELUDE = `
mat2 rot(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }
float sdBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float sdCapsule(vec2 p, float h, float r) { p.x -= clamp(p.x, -h, h); return length(p) - r; }
#define mesh(P_, S_) meshGradient(P_, S_, C, M)
vec3 meshGradient(vec2 p, float s, vec3 C[5], vec2 M[5]) {
  p += 0.25 * (vec2(fbm(p * 1.8 + s), fbm(p * 1.8 + s + 7.3)) - 0.5);
  vec3 acc = vec3(0); float wsum = 0.0;
  for (int i = 0; i < 5; i++) {
    vec2 m = M[(i + int(s)) % 5];
    float w = 1.0 / pow(dot(p - m, p - m) + 0.02, 1.6);
    acc += C[i] * w; wsum += w;
  }
  return acc / wsum;
}
// Soft shadow under the shape, then the shape filled with its own gradient and a lit rim.
#define shape(COL, P_, D_, S_) { float d_ = D_; \\
  COL *= 1.0 - 0.35 * (1.0 - smoothstep(-0.01, 0.06, d_ - 0.012)); \\
  float a_ = 1.0 - smoothstep(-0.0015, 0.0015, d_); \\
  vec3 f_ = mesh(P_ * 1.3 + S_, S_) * (1.0 + 0.25 * smoothstep(-0.03, 0.0, d_)); \\
  COL = mix(COL, f_, a_); }
`;

const textures = Object.keys(palettes).flatMap((tone) =>
  [1, 2].map((variant) => [`tex-${tone}-${variant}`, ...(variant === 1 ? [1600, 1066] : [1066, 1600]), texture(tone, variant)])
);

// Folds: layered sheets with curved edges on a near-black ground, each lit
// along its edge with a bright rim and falling off into shadow, casting a dark
// gap onto the sheet beneath. Fourteen hues round the wheel plus two
// neutrals, each held near one hue so the sort shows a clean spectrum.
const FOLD_PRELUDE = `
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
async function render(main, width, height, prelude = "") {
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
    { frag: `${PRELUDE}${prelude}void main() {${main}\n}`, width, height }
  );
}

function save(file, dataUrl) {
  writeFileSync(new URL(`${file}.jpg`, dir), Buffer.from(dataUrl.split(",")[1], "base64"));
  console.log(`  ${file}.jpg`);
}

for (const [file, width, height, main] of generative) save(file, await render(main, width, height));
for (const [file, width, height, main] of textures) save(file, await render(main, width, height, TEXTURE_PRELUDE));
for (const [file, width, height, main] of folds) save(file, await render(main, width, height, FOLD_PRELUDE));
await browser.close();

