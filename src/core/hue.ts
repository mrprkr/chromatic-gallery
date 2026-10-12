import type { ToneFamily } from "./types";

const HEX6 = /^#[0-9a-fA-F]{6}$/;

/**
 * Below this saturation a colour reads as grey. Ordering and the tone filter
 * share it, so a near-grey never sorts into the middle of a hue band.
 */
const NEUTRAL_SATURATION = 0.12;

interface Hsv {
  /** Degrees, 0 to 360. */
  h: number;
  /** 0 to 1. */
  s: number;
  /** 0 to 1. */
  v: number;
}

function hexToHsv(hex: string): Hsv {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const s = max === 0 ? 0 : d / max;

  let h = 0;
  if (d === 0) h = 0;
  else if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;

  return { h, s, v: max };
}

/** Map a dominant hex colour to a broad tone family. */
export function hueFamily(hex?: string | null): ToneFamily {
  if (!hex || !HEX6.test(hex)) return "neutral";
  const { h, s } = hexToHsv(hex);

  // Low-saturation colours (greys, near-blacks and near-whites) read as neutral.
  if (s < NEUTRAL_SATURATION) return "neutral";

  if (h < 15 || h >= 330) return "red";
  if (h < 45) return "orange";
  if (h < 70) return "yellow";
  if (h < 160) return "green";
  if (h < 255) return "blue";
  return "purple";
}

/**
 * Sort key for chromatic ordering. Saturated colours sort by hue; greys go
 * after every hue, dark to light; photos with no usable colour go last.
 */
export function chromaticSortKey(hex?: string | null): number {
  if (!hex || !HEX6.test(hex)) return 2000;
  const { h, s, v } = hexToHsv(hex);
  if (s < NEUTRAL_SATURATION) return 720 + v * 360;
  return h;
}
