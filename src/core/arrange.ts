import { chromaticSortKey, hueFamily } from "./hue";
import type { GalleryPhoto } from "./types";

type Colored = Pick<GalleryPhoto, "colors">;

/**
 * Photos ordered round the colour wheel by their dominant colour, greys after
 * the hues. Returns a new array; the sort is stable, so ties keep input order.
 */
export function sortChromatically<T extends Colored>(photos: readonly T[]): T[] {
  return photos
    .map((photo, index) => ({ photo, index, key: chromaticSortKey(photo.colors?.[0]) }))
    .sort((a, b) => a.key - b.key || a.index - b.index)
    .map(({ photo }) => photo);
}

/** Fisher-Yates shuffle, returning a new array. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Re-arrange photos while keeping the chromatic progression intact.
 *
 * Each run of same-family photos is one band of the rainbow. Photos are
 * shuffled within their band and the starting band is rotated, but the bands
 * never swap places, so the colour journey stays the same and only the
 * arrangement inside it changes.
 */
export function shuffleWithinChromaticOrder<T extends Colored>(
  photos: readonly T[],
  random: () => number = Math.random
): T[] {
  if (photos.length === 0) return [];

  const bands: T[][] = [];
  let lastFamily: string | null = null;
  for (const photo of photos) {
    const family = hueFamily(photo.colors?.[0]);
    if (family !== lastFamily) {
      bands.push([]);
      lastFamily = family;
    }
    bands[bands.length - 1].push(photo);
  }

  const shuffled = bands.map((band) => shuffle(band, random));
  const offset = Math.floor(random() * shuffled.length);
  return [...shuffled.slice(offset), ...shuffled.slice(0, offset)].flat();
}

export interface TimelineGroup<T> {
  /** `YYYY-MM`, or `undated`. */
  key: string;
  label: string;
  photos: T[];
}

/** Year-month key (e.g. "2024-04") from a date string, or null if undated. */
export function monthKey(date?: string | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Group photos by month, newest first, with undated photos last. */
export function groupByMonth<T extends Pick<GalleryPhoto, "date">>(
  photos: readonly T[],
  options: { locale?: string; undatedLabel?: string } = {}
): TimelineGroup<T>[] {
  const { locale = "en-GB", undatedLabel = "Undated" } = options;
  const groups = new Map<string, T[]>();
  for (const photo of photos) {
    const key = monthKey(photo.date) ?? "undated";
    const bucket = groups.get(key);
    if (bucket) bucket.push(photo);
    else groups.set(key, [photo]);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === "undated") return 1;
      if (b === "undated") return -1;
      return b.localeCompare(a);
    })
    .map(([key, items]) => ({
      key,
      label: key === "undated" ? undatedLabel : monthLabel(key, locale),
      photos: items,
    }));
}

function monthLabel(key: string, locale: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString(locale, {
    month: "long",
    year: "numeric",
  });
}

type Sized = Pick<GalleryPhoto, "width" | "height">;

/** Height-to-width ratio assumed for a photo without dimensions (4:5 portrait). */
const FALLBACK_RATIO = 1.25;

/**
 * Splits photos into columns for a masonry layout, placing each photo in the
 * column that is currently shortest (by aspect ratio, as every column has the
 * same width). Round-robin placement lets column heights drift apart as the
 * list grows, leaving one column ending well before the others. Placement only
 * depends on earlier photos, so appending more never moves a photo already
 * placed. Ties go to the leftmost column, so a run of same-shaped photos still
 * reads row-first.
 */
export function balanceColumns<T extends Sized>(
  photos: readonly T[],
  columnCount: number
): { photo: T; index: number }[][] {
  const count = Math.max(1, Math.floor(columnCount));
  const columns: { photo: T; index: number }[][] = Array.from({ length: count }, () => []);
  const heights = new Array<number>(count).fill(0);
  photos.forEach((photo, index) => {
    let shortest = 0;
    for (let c = 1; c < count; c++) {
      // A small tolerance keeps near-equal columns filling left to right.
      if (heights[c] < heights[shortest] - 1e-6) shortest = c;
    }
    columns[shortest].push({ photo, index });
    const ratio = photo.width && photo.height ? photo.height / photo.width : FALLBACK_RATIO;
    heights[shortest] += ratio;
  });
  return columns;
}
