// Generates abstract sample "photos" so the example runs without real images.
// Replace public/photos with your own and run `pnpm photos` to re-analyse.
import { existsSync, mkdirSync } from "node:fs";
import sharp from "sharp";

const dir = new URL("../public/photos/", import.meta.url);
if (existsSync(new URL("sample-00.jpg", dir))) process.exit(0);
mkdirSync(dir, { recursive: true });

const palettes = [
  ["#d64545", "#7a1f1f"], ["#e08a3c", "#f4d6a0"], ["#d9c23c", "#5c5320"],
  ["#4caf72", "#1d4d33"], ["#4a78d6", "#a8c4f0"], ["#9b59c6", "#3a1f4d"],
  ["#c9c9c9", "#3d3d3d"], ["#2f6f8f", "#e3eef3"], ["#b5523b", "#efd9c6"],
];
const sizes = [[1200, 800], [800, 1200], [1000, 1000], [1400, 700]];

for (let i = 0; i < 27; i++) {
  const [a, b] = palettes[i % palettes.length];
  const [w, h] = sizes[i % sizes.length];
  const cx = 20 + ((i * 37) % 60);
  const cy = 20 + ((i * 53) % 60);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><radialGradient id="g" cx="${cx}%" cy="${cy}%" r="80%">
      <stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/>
    </radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${(cx * w) / 100}" cy="${(cy * h) / 100}" r="${Math.min(w, h) / 6}" fill="${b}" opacity="0.35"/>
  </svg>`;
  const name = `sample-${String(i).padStart(2, "0")}`;
  await sharp(Buffer.from(svg))
    .jpeg({ quality: 85 })
    .toFile(new URL(`${name}.jpg`, dir).pathname);
}
console.log("Generated sample photos in public/photos");
