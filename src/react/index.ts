// Everything here is a client export. Server-side helpers (sorting, blur
// placeholders, duplicate detection) live in chromatic-gallery/core, which
// has no "use client" directive and can be called from server code.
export { ChromaticGallery, type ChromaticGalleryProps } from "./Gallery";
export type { CategoryOption } from "./Controls";
export { plainImage, type ImageAdapter, type GalleryImageProps, type PreloadOptions } from "./image";
export type { GalleryLabels, DeepPartialLabels } from "./labels";
export type { GalleryPhoto, ViewMode, ToneFamily } from "../core/types";
