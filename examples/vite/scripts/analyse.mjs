// Runs analysePhoto over public/photos and writes src/photos.json.
// In a real site this runs at import or build time and the results live
// alongside each photo (front matter, YAML, a CMS field, a database row).
import { readdirSync, writeFileSync } from "node:fs";
import { analysePhoto } from "chromatic-gallery/node";

const dir = new URL("../public/photos/", import.meta.url);
const categories = ["street", "nature", "architecture", "travel"];
const places = ["Lisbon", "Kyoto", "Melbourne", "Reykjavík", undefined];

const files = readdirSync(dir).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f)).sort();
const photos = [];
for (const [i, file] of files.entries()) {
  const analysis = await analysePhoto(new URL(file, dir).pathname);
  photos.push({
    id: file.replace(/\.[^.]+$/, ""),
    title: `Sample ${i + 1}`,
    src: `/photos/${file}`,
    category: categories[i % categories.length],
    location: places[i % places.length],
    date: new Date(2026, 8 - (i % 6), 1 + i).toISOString().slice(0, 10),
    ...analysis,
  });
}

writeFileSync(new URL("../src/photos.json", import.meta.url), JSON.stringify(photos, null, 2));
console.log(`Analysed ${photos.length} photos`);
