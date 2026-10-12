import { defineConfig, type Options } from "tsup";

const shared: Options = {
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  target: "es2020",
  external: ["react", "react-dom", "next", "sharp"],
};

export default defineConfig([
  {
    ...shared,
    entry: { index: "src/react/index.ts", next: "src/next/index.tsx" },
    // Both entries render on the client. The directive must sit at the top of
    // the emitted file, so it goes in a banner rather than the source.
    banner: { js: '"use client";' },
    clean: true,
  },
  {
    ...shared,
    entry: { core: "src/core/index.ts", node: "src/node/index.ts" },
  },
]);
