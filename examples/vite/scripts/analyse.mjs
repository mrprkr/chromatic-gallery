// Runs analysePhoto over public/photos and writes src/photos.json.
// In a real site this runs at import or build time and the results live
// alongside each photo (front matter, YAML, a CMS field, a database row).
import { readdirSync, writeFileSync } from "node:fs";
import { analysePhoto } from "chromatic-gallery/node";

const dir = new URL("../public/photos/", import.meta.url);
const categories = ["street", "nature", "architecture", "travel"];
// City each demo photo was taken in. In-flight shots and unknowns have none.
const sydney = [
  "1b4697cb-e984-44ae-82b4-87aacd01f322", "dscf0215", "dscf0241", "dscf0697",
  "dscf0784", "dscf0891", "dscf1632", "dscf1642", "dscf1709", "dscf1783-2",
  "dscf2025", "dscf2037", "dscf2235", "dscf2237", "dscf2381", "dscf4332",
  "dscf4585", "dscf4967", "dscf5124", "dscf5143",
];
const london = ["dscf5379", "dscf5567", "dscf5696", "dscf6963", "dscf7159"];
const locations = {
  ...Object.fromEntries(sydney.map((id) => [id, "Sydney"])),
  ...Object.fromEntries(london.map((id) => [id, "London"])),
  dscf1178: "Singapore",
  dscf1189: "Singapore",
};

// Random but stable per file, so every build of the demo looks the same.
function random(seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 2 ** 32;
  };
}
const pick = (list, r) => list[Math.floor(r() * list.length)];

const files = readdirSync(dir).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f)).sort();
const photos = [];
for (const [i, file] of files.entries()) {
  const analysis = await analysePhoto(new URL(file, dir).pathname);
  const id = file.replace(/\.[^.]+$/, "");
  const r = random(file);
  photos.push({
    id,
    title: `Sample ${i + 1}`,
    src: `photos/${file}`,
    category: pick(categories, r),
    location: locations[id],
    // Any day in the two years up to September 2026.
    date: new Date(Date.UTC(2024, 9, 1) + Math.floor(r() * 730) * 864e5).toISOString().slice(0, 10),
    ...analysis,
  });
}

writeFileSync(new URL("../src/photos.json", import.meta.url), JSON.stringify(photos, null, 2));
console.log(`Analysed ${photos.length} photos`);
