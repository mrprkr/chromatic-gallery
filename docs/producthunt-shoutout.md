# Product Hunt shoutout: built with Claude Code

Three lengths, same facts. Pick one, or cut between them.

## Short (a comment reply)

Built with Claude Code. It wrote the colour analysis and the React gallery, generated the abstract demo images with WebGL shaders, drew the logo as a shader too, laid the Product Hunt cards out in Figma, and opened the pull requests. I made the design calls and pressed merge.

## Medium (maker comment)

A note on how this was made. chromatic-gallery was built almost entirely with Claude Code, the agentic coding tool from Anthropic.

The library itself is the usual story: it wrote the colour extraction, the perceptual hashing for duplicate detection, the gallery views and the lightbox, and the tests and CI around them. The part that surprised me was everything around the code. The demo's abstract images are WebGL shaders it wrote and rendered in headless Chromium. The logo is another shader: three panels of red, green and blue light that add up to white where they cross. It built the Figma file for the Product Hunt cards through Figma's MCP server, screenshotted the live demo with Playwright to put real UI in them, exported the lot back into the repo, and opened the PR.

I gave direction in plain sentences ("I prefer the dark background, but use a gradient so it's less stark", "treat the gels as light so they get brighter where they overlap") and it iterated until it looked right. Design, code, assets and release all came out of one conversation.

## Long (launch post section)

### How it was built

chromatic-gallery is a one-person project, and most of the work was done by Claude Code.

**The library.** It wrote `analysePhoto`, which pulls dominant colours, a blur placeholder and a perceptual hash from each image at build time, and the React components that sort photos round the colour wheel, filter them by tone and tag, and show them in grid, columns and timeline views with a swipeable lightbox. It set up the build with tsdown so the type declarations work on TypeScript 7, wrote the tests, and configured CI on Node 22 and 24, Dependabot, GitHub releases and npm trusted publishing.

**The demo.** The demo needed images in every colour, so it wrote fragment shaders and a Playwright script that renders them in headless Chromium: folded sheets lit along their edges, one per hue round the wheel. It stripped EXIF and GPS data from the real photos, wrote captions, and deployed the site to GitHub Pages.

**The brand.** The logo is also a shader. Three rounded panels of red, green and blue light cross on a dark gradient; where two overlap they go cyan, magenta or yellow, and all three together go white. The red and blue channels are pulled slightly apart at the edges, like a misregistered print. It went through four directions in one session (dark, glass spheres, a light-background version with subtractive colour, then additive light on a dark gradient), each rendered and placed in Figma side by side so I could compare.

**The launch assets.** Using Figma's MCP server it built the frames for these Product Hunt images, captured the live demo with Playwright (with the shuffle seeded so the same photos land in frame on every run), uploaded the captures as fills, exported the cards back into the repo, set the Open Graph image and favicons, and opened the pull request with a description a reviewer could follow.

What I did: pick a direction, say what was wrong with each version, and merge.
