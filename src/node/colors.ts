import type { Sharp } from "sharp";

/** Pixels are sampled at this size, so clustering cost does not scale with the source. */
const SAMPLE_SIZE = 64;

/** How many dominant colours to pull out of a photo by default. */
export const DEFAULT_COLOR_COUNT = 3;

const MAX_ITERATIONS = 20;

export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

/**
 * k-means over a flat RGB buffer, returning the cluster centres as hex, most
 * populous first.
 *
 * Centres start from evenly spaced pixels rather than random ones, so the same
 * image always yields the same colours. That matters when the result is
 * written into content files: a non-deterministic version would rewrite them
 * on every run.
 */
export function extractDominantColors(
  pixels: Uint8Array,
  k: number = DEFAULT_COLOR_COUNT,
  maxIterations: number = MAX_ITERATIONS
): string[] {
  const numPixels = Math.floor(pixels.length / 3);
  if (numPixels === 0) return [];

  const centers: [number, number, number][] = [];
  for (let i = 0; i < k; i++) {
    const idx = Math.floor((i * numPixels) / k) * 3;
    centers.push([pixels[idx], pixels[idx + 1], pixels[idx + 2]]);
  }

  const assignments = new Uint8Array(numPixels);

  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;

    for (let p = 0; p < numPixels; p++) {
      const r = pixels[p * 3];
      const g = pixels[p * 3 + 1];
      const b = pixels[p * 3 + 2];

      let bestDist = Infinity;
      let bestCluster = 0;
      for (let c = 0; c < k; c++) {
        const dr = r - centers[c][0];
        const dg = g - centers[c][1];
        const db = b - centers[c][2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bestDist) {
          bestDist = dist;
          bestCluster = c;
        }
      }

      if (assignments[p] !== bestCluster) {
        assignments[p] = bestCluster;
        changed = true;
      }
    }

    // Nothing moved, so further iterations cannot change the result.
    if (!changed) break;

    const sums = Array.from({ length: k }, () => [0, 0, 0, 0]); // r, g, b, count
    for (let p = 0; p < numPixels; p++) {
      const c = assignments[p];
      sums[c][0] += pixels[p * 3];
      sums[c][1] += pixels[p * 3 + 1];
      sums[c][2] += pixels[p * 3 + 2];
      sums[c][3]++;
    }

    for (let c = 0; c < k; c++) {
      if (sums[c][3] > 0) {
        centers[c] = [
          Math.round(sums[c][0] / sums[c][3]),
          Math.round(sums[c][1] / sums[c][3]),
          Math.round(sums[c][2] / sums[c][3]),
        ];
      }
    }
  }

  const counts = new Array(k).fill(0);
  for (let p = 0; p < numPixels; p++) counts[assignments[p]]++;

  return centers
    .map((center, i) => ({ center, count: counts[i] }))
    .sort((a, b) => b.count - a.count)
    .map(({ center }) => rgbToHex(center[0], center[1], center[2]));
}

/** Sample an image down to a small square and extract its dominant colours. */
export async function extractColorsFromImage(
  image: Sharp,
  k: number = DEFAULT_COLOR_COUNT
): Promise<string[]> {
  const { data } = await image
    .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return extractDominantColors(new Uint8Array(data.buffer, data.byteOffset, data.byteLength), k);
}
