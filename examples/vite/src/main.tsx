import { ChromaticGallery, type GalleryPhoto } from "chromatic-gallery";
import "chromatic-gallery/styles.css";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import photos from "./photos.json";
import "./page.css";

const INSTALL = "npm i chromatic-gallery";

function Install() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked: the command stays selectable.
    }
  };
  return (
    <div className="install">
      <code>{INSTALL}</code>
      <button type="button" onClick={copy} aria-live="polite">
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <main className="page">
      <header className="promo">
        <div>
          <h1>chromatic-gallery</h1>
          <p>A React photo gallery that arranges photos by colour. This page is the demo: drag the tone wheel, switch views, open a photo.</p>
        </div>
        <div className="promo-actions">
          <Install />
          <a className="button primary" href="https://github.com/mrprkr/chromatic-gallery">View on GitHub</a>
          <a className="button" href="https://www.npmjs.com/package/chromatic-gallery">npm</a>
        </div>
      </header>
      <ChromaticGallery photos={photos as GalleryPhoto[]} />
    </main>
  </StrictMode>
);
