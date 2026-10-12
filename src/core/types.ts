/** One photo as the gallery renders it. */
export interface GalleryPhoto {
  /** Stable, URL-safe id. Used as the lightbox deep-link hash and the React key. */
  id: string;
  title: string;
  /** Image URL. `null` renders a lettered placeholder tile. */
  src: string | null;
  caption?: string;
  location?: string;
  /** Free-form category, shown on hover and used by the tag filter. */
  category?: string;
  /** Any date string `Date` can parse. Drives the timeline view. */
  date?: string | null;
  /** Dominant colours as `#rrggbb`, most dominant first. Drives ordering and the tone filter. */
  colors?: string[] | null;
  width?: number | null;
  height?: number | null;
  /** Placeholder painted while the image loads. `colorBlur(colors)` makes one. */
  blurDataURL?: string;
}

export type ViewMode = "grid" | "masonry" | "timeline";

export type ToneFamily =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "neutral";
