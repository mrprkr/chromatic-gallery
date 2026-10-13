import { useState } from "react";
import type { GalleryPhoto } from "../core/types";
import { useNearViewport } from "./hooks";
import type { ImageAdapter } from "./image";

export type TileLayout = "grid" | "masonry" | "bento";

const COVER_SIZES = "(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw";
const NATURAL_SIZES = "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw";

export function PhotoTile({
  photo,
  layout,
  categoryLabel,
  onClick,
  image,
  className,
}: {
  photo: GalleryPhoto;
  layout: TileLayout;
  categoryLabel?: string;
  onClick: () => void;
  image: ImageAdapter;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  // Switches the image to eager loading a couple of screens ahead, rather than
  // leaving it to the browser's lazy loading, which waits too long on Safari.
  const [nearRef, near] = useNearViewport<HTMLButtonElement>();
  // Grid and bento tiles crop to fill their cell; columns keep the natural ratio.
  const cover = layout !== "masonry";
  const { Image } = image;

  return (
    <button
      ref={nearRef}
      type="button"
      onClick={onClick}
      className={`cg-tile cg-tile-${layout}${className ? ` ${className}` : ""}`}
      aria-label={photo.title}
    >
      <div className={`cg-tile-frame${loaded ? " is-loaded" : ""}`}>
        {photo.src ? (
          <Image
            src={photo.src}
            alt={photo.caption || photo.title}
            width={photo.width ?? (cover ? 600 : 800)}
            height={photo.height ?? (cover ? 600 : 1000)}
            sizes={cover ? COVER_SIZES : NATURAL_SIZES}
            loading={near ? "eager" : "lazy"}
            onLoad={() => setLoaded(true)}
            blurDataURL={photo.blurDataURL}
            className={`cg-tile-img${cover ? " cg-cover" : ""}${loaded ? " is-loaded" : ""}`}
          />
        ) : (
          <div className="cg-tile-letter">
            <span>{photo.title.charAt(0)}</span>
          </div>
        )}
      </div>

      {/* A soft highlight sweeping over the placeholder while the image loads */}
      {photo.src && !loaded && <div aria-hidden className="cg-shimmer" />}

      <div aria-hidden className="cg-tile-shade" />
      {categoryLabel && (
        <div aria-hidden className="cg-tile-caption">
          <p>{categoryLabel}</p>
        </div>
      )}
    </button>
  );
}
