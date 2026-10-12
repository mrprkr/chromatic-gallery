import { ChromaticGallery, type GalleryPhoto } from "chromatic-gallery";
import "chromatic-gallery/styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import photos from "./photos.json";
import "./page.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <main className="page">
      <h1>Gallery</h1>
      <ChromaticGallery photos={photos as GalleryPhoto[]} />
    </main>
  </StrictMode>
);
