# Changelog

## 0.1.2

- Tiles load their images two screens before they scroll into view, instead of relying on the browser's `loading="lazy"`, which waits until an image is almost on screen in Safari and Firefox. Image adapters receive the new `loading` prop.
- Columns view places each photo in the shortest column, so columns end level rather than drifting apart, and the next batch mounts when the shortest column nears the viewport, not the tallest. No more empty columns while scrolling.
- `balanceColumns` in `chromatic-gallery/core`.

## 0.1.0

First release, extracted from the gallery on [mrprkr.com](https://mrprkr.com/gallery).

- `ChromaticGallery` React component: chromatic ordering, tone wheel and tag filters, grid, columns and timeline views, shuffle, progressive loading and a swipeable, deep-linkable lightbox.
- Plain CSS with custom properties and `light-dark()` theming. No CSS framework needed.
- `chromatic-gallery/next`: `next/image` adapter with lightbox preloading.
- `chromatic-gallery/core`: chromatic sort and shuffle, tone families, timeline grouping, blur placeholders, perceptual hash distance and duplicate grouping.
- `chromatic-gallery/node`: `analysePhoto`, dominant colour extraction and dHash, built on Sharp.
