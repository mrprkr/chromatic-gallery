import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Component tests opt into jsdom per file; the rest run in Node.
    environment: "node",
  },
});
