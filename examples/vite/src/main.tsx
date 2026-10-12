import { ChromaticGallery, type GalleryPhoto } from "chromatic-gallery";
import "chromatic-gallery/styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import photos from "./photos.json";
import "./page.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <main className="page">
      <header className="page-header">
        <h1>Gallery</h1>
        <a href="https://github.com/mrprkr/chromatic-gallery">View on GitHub</a>
      </header>
      <ChromaticGallery photos={photos as GalleryPhoto[]} />
    </main>
  </StrictMode>
);
