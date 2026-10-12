# Contributing

```bash
pnpm install
pnpm check   # typecheck, test, build and publint
```

- Keep `chromatic-gallery/core` free of dependencies and runnable in both Node and the browser.
- Anything rendered during SSR must match the first client render. Use `useSyncExternalStore` with a server snapshot for anything read from `window`.
- Changes to `extractDominantColors` or `computePhash` change values people have stored. Treat them as breaking.
- British English in docs and UI text.
