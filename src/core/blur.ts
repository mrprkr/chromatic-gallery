const NEUTRAL = ["#e5e5e5", "#a3a3a3"];
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * A tiny base64 SVG gradient built from a photo's dominant colours, for use as
 * a blur placeholder. It costs nothing at request time: no image is read or
 * decoded. Falls back to a neutral grey gradient when no usable colours are
 * given.
 *
 * Runs in Node and the browser alike.
 */
export function colorBlur(colors?: readonly string[] | null): string {
  const palette = (colors ?? []).filter((c) => HEX.test(c)).slice(0, 3);
  const stops = (palette.length > 0 ? palette : NEUTRAL).map((color, i, arr) => {
    const offset = arr.length === 1 ? 100 : Math.round((i / (arr.length - 1)) * 100);
    return `<stop offset="${offset}%" stop-color="${color}"/>`;
  });

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">${stops.join("")}</linearGradient></defs>` +
    `<rect width="8" height="8" fill="url(#g)"/></svg>`;

  // The SVG is pure ASCII (hex colours only), so btoa is safe here.
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
