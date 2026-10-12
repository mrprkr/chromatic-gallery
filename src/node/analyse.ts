import sharp, { type Sharp } from "sharp";
import { colorBlur } from "../core/blur";
import { DEFAULT_COLOR_COUNT, extractColorsFromImage } from "./colors";
import { computePhash } from "./phash";

export interface PhotoAnalysis {
  /** Displayed width, after EXIF orientation. */
  width: number;
  /** Displayed height, after EXIF orientation. */
  height: number;
  /** Dominant colours as `#rrggbb`, most dominant first. */
  colors: string[];
  /** 64-bit dHash as an unsigned decimal string. */
  phash: string;
  /** Gradient placeholder built from `colors`. */
  blurDataURL: string;
}

export interface AnalyseOptions {
  /** How many dominant colours to extract. Defaults to 3. */
  colorCount?: number;
}

/**
 * Everything the gallery needs to know about an image, in one pass: its
 * displayed size, dominant colours, perceptual hash and blur placeholder.
 * Run it once at import or build time and store the result alongside the
 * photo, so nothing is decoded at request time.
 */
export async function analysePhoto(
  input: Buffer | Uint8Array | string | Sharp,
  options: AnalyseOptions = {}
): Promise<PhotoAnalysis> {
  const base = typeof input === "string" || input instanceof Uint8Array ? sharp(input) : input;

  // Orientations 5 to 8 rotate the image a quarter turn, swapping its sides.
  const meta = await base.metadata();
  const quarterTurn = (meta.orientation ?? 1) >= 5;
  const width = (quarterTurn ? meta.height : meta.width) ?? 0;
  const height = (quarterTurn ? meta.width : meta.height) ?? 0;

  // Each pipeline resizes, so each gets its own clone, auto-rotated first.
  const [colors, phash] = await Promise.all([
    extractColorsFromImage(base.clone().rotate(), options.colorCount ?? DEFAULT_COLOR_COUNT),
    computePhash(base.clone().rotate()),
  ]);

  return { width, height, colors, phash, blurDataURL: colorBlur(colors) };
}
