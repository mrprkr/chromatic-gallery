import { useEffect, useRef, type ComponentType, type CSSProperties } from "react";

/**
 * Props the gallery passes to whichever image component renders a photo.
 * They mirror `next/image`, so an adapter for it is a thin wrapper.
 */
export interface GalleryImageProps {
  src: string;
  alt: string;
  /** Intrinsic size. Omitted when `fill` is set. */
  width?: number;
  height?: number;
  /** Fill the positioned parent instead of sizing from width and height. */
  fill?: boolean;
  sizes: string;
  quality?: number;
  /** Load eagerly and at high priority (the open lightbox photo). */
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
  onLoad?: () => void;
  draggable?: boolean;
  blurDataURL?: string;
}

export interface PreloadOptions {
  sizes: string;
  quality?: number;
}

export interface ImageAdapter {
  Image: ComponentType<GalleryImageProps>;
  /**
   * Warm the browser cache with the variant the lightbox will request, so
   * stepping to a neighbouring photo paints at once.
   */
  preload?: (src: string, options: PreloadOptions) => void;
}

const FILL: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
};

function PlainImage({
  src,
  alt,
  width,
  height,
  fill,
  sizes,
  priority,
  className,
  style,
  onLoad,
  draggable,
  blurDataURL,
}: GalleryImageProps) {
  const ref = useRef<HTMLImageElement>(null);

  // A cached image can finish loading before hydration attaches onLoad, which
  // would leave the tile stuck on its placeholder. Catch that case on mount.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth > 0) onLoad?.();
    // Only the first mount can miss the event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      draggable={draggable}
      onLoad={onLoad}
      className={className}
      style={{
        ...(fill ? FILL : null),
        // A filled image is letterboxed in the lightbox, where a background
        // gradient would show around it, so only tiles get the placeholder.
        ...(blurDataURL && !fill
          ? { backgroundImage: `url("${blurDataURL}")`, backgroundSize: "cover" }
          : null),
        ...style,
      }}
    />
  );
}

/** The default adapter: a plain `<img>`, lazily loaded. */
export const plainImage: ImageAdapter = {
  Image: PlainImage,
  preload(src) {
    const img = new window.Image();
    img.src = src;
  },
};
