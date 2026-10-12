import Image, { getImageProps } from "next/image";
import { ChromaticGallery, type ChromaticGalleryProps } from "../react/Gallery";
import type { GalleryImageProps, ImageAdapter } from "../react/image";

function NextGalleryImage({ blurDataURL, width, height, fill, ...props }: GalleryImageProps) {
  return (
    <Image
      {...props}
      {...(fill ? { fill: true } : { width, height })}
      {...(blurDataURL ? { placeholder: "blur" as const, blurDataURL } : {})}
    />
  );
}

/**
 * Renders gallery images with `next/image`, so they go through Next's image
 * optimiser, and preloads lightbox neighbours at the exact variant it will
 * request. Remote image hosts must be allowed in `images.remotePatterns`.
 */
export const nextImage: ImageAdapter = {
  Image: NextGalleryImage,
  preload(src, { sizes, quality }) {
    const { props } = getImageProps({ src, alt: "", fill: true, sizes, quality });
    const img = new window.Image();
    if (props.sizes) img.sizes = props.sizes;
    if (props.srcSet) img.srcset = props.srcSet;
    if (props.src) img.src = props.src;
  },
};

/**
 * `ChromaticGallery` with the `next/image` adapter built in. Render it straight
 * from a server component: the adapter is a function, so it cannot be passed
 * across the server/client boundary as a prop.
 */
export function NextChromaticGallery(props: Omit<ChromaticGalleryProps, "image">) {
  return <ChromaticGallery {...props} image={nextImage} />;
}
