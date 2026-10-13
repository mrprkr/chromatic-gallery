// Renders the extreme demo samples into public/photos with WebGL shaders in
// headless Chromium: pure generative pieces (gen-*) and heavy treatments of
// existing demo photos (fx-*), and grainy shape textures in each tone family (tex-*). They push the colour analysis to its limits:
// single saturated hues, near-black, near-white, monochrome and full spectrum.
//
//   pnpm generate
//
// Set CHROMIUM_PATH if Playwright's bundled Chromium is not installed.
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const dir = new URL("../public/photos/", import.meta.url);

const PRELUDE = `#version 300 es
precision highp float;
uniform vec2 res;
uniform sampler2D tex;
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
vec3 img(vec2 uv) { return texture(tex, clamp(uv, 0.0, 1.0)).rgb; }
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

// [file, source photo, fragment main()]
const treatments = [
  ["fx-thermal-towers", "dscf6869", `
    float l = luma(img(UV()));
    vec3 c = l < 0.25 ? mix(vec3(0, 0, 0.1), vec3(0.4, 0, 0.7), l / 0.25)
      : l < 0.5 ? mix(vec3(0.4, 0, 0.7), vec3(1, 0.1, 0.1), (l - 0.25) / 0.25)
      : l < 0.75 ? mix(vec3(1, 0.1, 0.1), vec3(1, 0.8, 0), (l - 0.5) / 0.25)
      : mix(vec3(1, 0.8, 0), vec3(1), (l - 0.75) / 0.25);
    outColor = vec4(c, 1);`],
  ["fx-infrared-canopy", "dscf2237", `
    vec3 s = img(UV());
    // Aerochrome swap: foliage-heavy green becomes red, red becomes green, blue holds.
    vec3 c = vec3(s.g * 1.5 + s.b * 0.2, s.r * 0.75, s.b * 0.9 + s.g * 0.1);
    outColor = vec4(pow(clamp(c, 0.0, 1.0), vec3(0.85)), 1);`],
  ["fx-duotone-bridge", "dscf0697", `
    float l = smoothstep(0.1, 0.85, luma(img(UV())));
    outColor = vec4(mix(vec3(0.2, 0.0, 0.45), vec3(1.0, 0.25, 0.55), l), 1);`],
  ["fx-inverted-sails", "dscf2235", `
    // Inverted, then gradient-mapped into five flat acid bands.
    float l = 1.0 - luma(img(UV()));
    vec3 bands[5] = vec3[5](vec3(0.18, 0.0, 0.4), vec3(1.0, 0.0, 0.55), vec3(1.0, 0.45, 0.0), vec3(0.75, 1.0, 0.0), vec3(0.0, 1.0, 0.85));
    outColor = vec4(bands[int(clamp(l * 5.0, 0.0, 4.0))], 1);`],
  ["fx-glitch-tunnel", "dscf6683", `
    vec2 uv = UV();
    float row = floor(uv.y * 60.0);
    float shift = step(0.7, hash(vec2(row, 3.0))) * (hash(vec2(row, 7.0)) - 0.5) * 0.25;
    float split = 0.012 + 0.03 * step(0.85, hash(vec2(floor(uv.y * 14.0), 1.0)));
    vec3 c = vec3(img(uv + vec2(shift + split, 0)).r, img(uv + vec2(shift, 0)).g, img(uv + vec2(shift - split, 0)).b);
    c = mix(c, vec3(c.r * 1.4, c.g * 0.6, c.b * 1.5), 0.6);
    outColor = vec4(c * (0.88 + 0.12 * step(0.5, fract(gl_FragCoord.y / 3.0))), 1);`],
  ["fx-solarised-maple", "dscf7028", `
    vec3 s = img(UV());
    vec3 c = abs(sin(s * PI * 1.5));
    outColor = vec4(c.brg, 1);`],
  ["fx-halftone-terrace", "dscf5571", `
    vec2 px = gl_FragCoord.xy;
    vec3 s = img(UV());
    float k = 1.0 - max(s.r, max(s.g, s.b));
    vec3 cmy = (1.0 - s - k) / max(1.0 - k, 0.001);
    vec4 ink = vec4(cmy, k);
    vec3 c = vec3(1);
    float angles[4] = float[4](0.26, 1.31, 0.79, 0.0);
    vec3 tints[4] = vec3[4](vec3(0, 1, 1), vec3(1, 0, 1), vec3(1, 1, 0), vec3(0));
    for (int i = 0; i < 4; i++) {
      float a = angles[i];
      vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * px / 12.0;
      float d = length(fract(q) - 0.5);
      float dot_ = 1.0 - smoothstep(-0.04, 0.04, d - 0.6 * sqrt(ink[i]));
      c *= mix(vec3(1), tints[i], dot_);
    }
    outColor = vec4(c, 1);`],
  ["fx-kaleido-luna-park", "dscf0784", `
    vec2 p = P();
    float a = atan(p.y, p.x), r = length(p), seg = PI / 6.0;
    a = abs(mod(a, 2.0 * seg) - seg);
    vec3 s = img(0.5 + vec2(cos(a), sin(a)) * vec2(0.6, 0.4) * fract(r * 1.4 + 0.2));
    outColor = vec4(clamp(mix(vec3(luma(s)), s, 2.2) * 1.15, 0.0, 1.0), 1);`],
  ["fx-onebit-train", "dscf5379", `
    float l = luma(img(UV()));
    ivec2 i = ivec2(gl_FragCoord.xy) % 4;
    int bayer[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
    float t = (float(bayer[i.y * 4 + i.x]) + 0.5) / 16.0;
    outColor = vec4(vec3(step(t, pow(l, 1.2))), 1);`],
  ["fx-acid-canola", "dscf3932", `
    vec2 uv = UV();
    vec3 s = img(uv);
    float h = fract(luma(s) * 3.0 + uv.x * 0.6 + 0.25 * fbm(uv * 5.0));
    outColor = vec4(hsv(h, 1.0, 0.35 + 0.65 * smoothstep(0.0, 0.6, max(s.r, max(s.g, s.b)))), 1);`],
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

function toDataUrl(id) {
  return `data:image/jpeg;base64,${readFileSync(new URL(`${id}.jpg`, dir)).toString("base64")}`;
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage();

// Draws one full-screen triangle with the fragment shader and returns a JPEG.
// With a source photo, the canvas takes the photo's size and it is bound as tex.
async function render(main, width, height, source, prelude = "") {
  return page.evaluate(
    async ({ frag, width, height, source }) => {
      let image;
      if (source) {
        image = new Image();
        image.src = source;
        await image.decode();
        width = image.naturalWidth;
        height = image.naturalHeight;
      }
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
      if (image) {
        gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      }
      gl.viewport(0, 0, width, height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return canvas.toDataURL("image/jpeg", 0.9);
    },
    { frag: `${PRELUDE}${prelude}void main() {${main}\n}`, width, height, source }
  );
}

function save(file, dataUrl) {
  writeFileSync(new URL(`${file}.jpg`, dir), Buffer.from(dataUrl.split(",")[1], "base64"));
  console.log(`  ${file}.jpg`);
}

for (const [file, width, height, main] of generative) save(file, await render(main, width, height));
for (const [file, source, main] of treatments) save(file, await render(main, 0, 0, toDataUrl(source)));
for (const [file, width, height, main] of textures) save(file, await render(main, width, height, undefined, TEXTURE_PRELUDE));
await browser.close();

