import type { ToneFamily, ViewMode } from "../core/types";

/** Every piece of text the gallery renders, so it can be translated or reworded. */
export interface GalleryLabels {
  all: string;
  allTags: string;
  allTones: string;
  filters: string;
  tag: string;
  tone: string;
  views: Record<ViewMode, string>;
  /** Suffix for each view button's accessible name, e.g. "Grid view". */
  viewSuffix: string;
  shuffle: string;
  empty: string;
  undated: string;
  closeBackdrop: string;
  closeLightbox: string;
  previous: string;
  next: string;
  photoNavigation: string;
  filterByTone: string;
  toneWheelHint: string;
  toneWheelClearHint: string;
  /** Fallback heading in the lightbox for a photo without a category. */
  photo: string;
  tones: Record<ToneFamily, string>;
}

export const defaultLabels: GalleryLabels = {
  all: "All",
  allTags: "All tags",
  allTones: "All tones",
  filters: "Filters",
  tag: "Tag",
  tone: "Tone",
  views: { grid: "Grid", masonry: "Columns", timeline: "Timeline" },
  viewSuffix: "view",
  shuffle: "Shuffle photos",
  empty: "No photos match these filters.",
  undated: "Undated",
  closeBackdrop: "Close gallery",
  closeLightbox: "Close lightbox",
  previous: "Previous photo",
  next: "Next photo",
  photoNavigation: "Photo navigation",
  filterByTone: "Filter by tone",
  toneWheelHint: "drag the ring",
  toneWheelClearHint: "tap centre to clear",
  photo: "Photo",
  tones: {
    red: "Red",
    orange: "Orange",
    yellow: "Yellow",
    green: "Green",
    blue: "Blue",
    purple: "Purple",
    neutral: "Neutral",
  },
};

export function mergeLabels(overrides?: DeepPartialLabels): GalleryLabels {
  if (!overrides) return defaultLabels;
  return {
    ...defaultLabels,
    ...overrides,
    views: { ...defaultLabels.views, ...overrides.views },
    tones: { ...defaultLabels.tones, ...overrides.tones },
  };
}

export type DeepPartialLabels = Partial<Omit<GalleryLabels, "views" | "tones">> & {
  views?: Partial<GalleryLabels["views"]>;
  tones?: Partial<GalleryLabels["tones"]>;
};
