// Runs analysePhoto over public/photos and writes src/photos.json.
// In a real site this runs at import or build time and the results live
// alongside each photo (front matter, YAML, a CMS field, a database row).
import { readdirSync, writeFileSync } from "node:fs";
import { analysePhoto } from "chromatic-gallery/node";

const dir = new URL("../public/photos/", import.meta.url);
// What each demo photo shows: a caption, a category and, where known, the city.
// Hand-written so the captions and tags match the pictures.
const details = {
  "1b4697cb-e984-44ae-82b4-87aacd01f322": ["Luna Park ferris wheel", "travel", "Sydney"],
  dscf0215: ["Sydney streetscape", "street", "Sydney"],
  dscf0241: ["Palm-lined street", "street", "Sydney"],
  dscf0697: ["Harbour Bridge ironwork", "architecture", "Sydney"],
  dscf0784: ["Luna Park by the harbour", "travel", "Sydney"],
  dscf0891: ["Ice cream shop", "street", "Singapore"],
  dscf1178: ["Glass dome and greenery", "architecture", "Doha"],
  dscf1189: ["Airport lounge", "travel", "Doha"],
  dscf1632: ["Restaurant at dusk", "street", "Singapore"],
  dscf1642: ["Festoon lights at night", "street", "Sydney"],
  dscf1709: ["Koi in motion", "nature"],
  "dscf1783-2": ["Street march", "street", "Sydney"],
  dscf2025: ["Tunnel passage", "architecture"],
  dscf2037: ["Escalator light trails", "architecture"],
  dscf2235: ["Opera House sails", "architecture", "Sydney"],
  dscf2237: ["Tree canopy", "nature", "Sydney"],
  dscf2381: ["Aerial road view", "street"],
  dscf3932: ["Canola field", "nature"],
  dscf4249: ["Wing at sunset", "travel"],
  dscf4332: ["Night street", "street", "Sydney"],
  dscf4585: ["Club stairs in blue light", "street"],
  dscf4860: ["Wing over the coast", "travel"],
  dscf4927: ["Tail fin", "travel"],
  dscf4934: ["Aerial river valley", "nature"],
  dscf4946: ["Wing above clouds", "travel"],
  dscf4967: ["Aerial over Sydney Harbour", "travel", "Sydney"],
  dscf5124: ["Bridge truss detail", "architecture", "Sydney"],
  dscf5143: ["Steel structure", "architecture", "Sydney"],
  dscf5379: ["Train arriving", "travel", "London"],
  dscf5567: ["Corner pub", "architecture", "London"],
  dscf5696: ["Tube roundel", "street", "London"],
  dscf6963: ["Apartment blocks", "architecture", "London"],
  dscf7159: ["Glass towers", "architecture"],
  dscf5571: ["Brick terrace with flower boxes", "architecture", "London"],
  dscf5999: ["Cotswold cottages", "travel", "Cirencester"],
  dscf6034: ["Self-driving cars in traffic", "street", "London"],
  dscf6139: ["Gothic clock tower", "architecture", "London"],
  dscf6430: ["BT Tower", "architecture", "London"],
  dscf6431: ["Pub with hanging baskets", "architecture", "London"],
  dscf6595: ["Train window reflections", "street", "London"],
  dscf6683: ["Colourful tunnel", "street", "London"],
  dscf6819: ["The Shard from the river", "travel", "London"],
  dscf6849: ["Tower of London", "travel", "London"],
  dscf6860: ["Gherkin and office towers", "architecture", "London"],
  dscf6869: ["City towers at dusk", "architecture", "London"],
  dscf7028: ["Autumn maple leaves", "nature"],
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

const files = readdirSync(dir).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f)).sort();
const photos = [];
for (const [i, file] of files.entries()) {
  const analysis = await analysePhoto(new URL(file, dir).pathname);
  const id = file.replace(/\.[^.]+$/, "");
  const r = random(file);
  const [caption, category, location] = details[id] ?? [`Sample ${i + 1}`, "street"];
  photos.push({
    id,
    title: caption,
    src: `photos/${file}`,
    category,
    location,
    // Any day in the two years up to September 2026.
    date: new Date(Date.UTC(2024, 9, 1) + Math.floor(r() * 730) * 864e5).toISOString().slice(0, 10),
    ...analysis,
  });
}

writeFileSync(new URL("../src/photos.json", import.meta.url), JSON.stringify(photos, null, 2));
console.log(`Analysed ${photos.length} photos`);
