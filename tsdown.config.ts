import { defineConfig, type UserConfig } from "tsdown";

const shared: UserConfig = {
  format: ["esm", "cjs"],
  // Declarations come from TypeScript 7's native compiler. tsup's declaration
  // bundler needs the classic JavaScript compiler API, which 7 no longer has.
  dts: true,
  sourcemap: true,
  target: "es2020",
  platform: "neutral",
  // Keep .js for ESM and .cjs for CommonJS, matching package.json exports.
  fixedExtension: false,
  deps: { neverBundle: ["react", "react-dom", "react/jsx-runtime", "next", /^next\//, "sharp"] },
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
    clean: false,
  },
]);
