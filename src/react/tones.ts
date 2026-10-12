import type { CSSProperties } from "react";
import type { ToneFamily } from "../core/types";

export type ToneValue = ToneFamily | "all";

/** The six hues on the colour wheel, clockwise from the top, with their swatches. */
export const HUE_TONES: { value: Exclude<ToneFamily, "neutral">; swatch: string }[] = [
  { value: "red", swatch: "#d64545" },
  { value: "orange", swatch: "#e08a3c" },
  { value: "yellow", swatch: "#d9c23c" },
  { value: "green", swatch: "#4caf72" },
  { value: "blue", swatch: "#4a78d6" },
  { value: "purple", swatch: "#9b59c6" },
];

export const NEUTRAL_SWATCH = "#9ca3af";

/**
 * Smooth conic spectrum with each hue pinned to the centre of its 60° wedge
 * (red at 12 o'clock), blending into its neighbours. The first hue repeats at
 * 360° so there is no seam.
 */
export const WHEEL_GRADIENT = `conic-gradient(from 0deg, ${[
  ...HUE_TONES.map((t, i) => `${t.swatch} ${i * 60}deg`),
  `${HUE_TONES[0].swatch} 360deg`,
].join(", ")})`;

export function toneSwatch(tone: ToneValue): string | null {
  if (tone === "all") return null;
  if (tone === "neutral") return NEUTRAL_SWATCH;
  return HUE_TONES.find((t) => t.value === tone)?.swatch ?? null;
}

/** A round swatch; `null` shows the whole spectrum, standing for "all tones". */
export function swatchStyle(swatch: string | null): CSSProperties {
  return { background: swatch ?? WHEEL_GRADIENT };
}
