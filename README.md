<p align="center">
  <img src=".github/assets/squircle-logo.svg" alt="squircle" width="120">
</p>

<p align="center">
  a browser-only image corner tool for rounded corners and true squircles.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-mit-000000?style=flat-square" alt="license badge"></a>
  <img src="https://img.shields.io/badge/next.js-16-000000?style=flat-square" alt="next.js badge">
</p>

<p align="center">
  <a href="https://squircle.micr.dev">live app</a> |
  <a href="https://squircle-microck-projects.vercel.app">vercel deployment</a> |
  <a href="https://github.com/Microck/squircle">github</a>
</p>

<p align="center">
  <video src=".github/assets/squircle-showcase.mp4" controls muted loop playsinline width="100%"></video>
</p>

---

drop one image or a whole batch, tune the corner profile, shadow, and outline, then export transparent-corner pngs without sending files to a server.

## why

most "round my image corners" tools either upload the file, flatten everything into a generic crop, or stop at one simple radius control. `squircle` keeps the work local, gives you a true squircle mode, and lets you dial the final presentation details before export instead of fixing them later in another editor.

## quickstart

```bash
pnpm install
pnpm dev
```

open `http://127.0.0.1:3000`.

if you want the dev server exposed on your local network:

```bash
pnpm dev --hostname 0.0.0.0 --port 3004
```

## feature surface

- drag and drop one image or many images in one pass
- switch between `squircle` and standard rounded-corner output
- tune corner radius with live preview
- add drop shadow with blur, opacity, offset, and color control
- add outer outline with width, opacity, and color control
- edit shadow and outline colors with picker plus hex input
- preview on dark or light surfaces before export
- export a single image as `png`
- export a whole batch as a `.zip` of rendered `png` files
- keep image processing in the browser instead of uploading source files

## input and output behavior

- supported input formats depend on what the browser can decode, including common formats such as `jpeg`, `png`, `webp`, `gif`, `avif`, and `svg`
- export is `png` only
- animated `gif` and animated `webp` inputs are currently treated as first-frame-only
- metadata is not preserved during export
- the output keeps the rendered source dimensions after the chosen corner, shadow, and outline settings are applied

## local development

`squircle` is a next.js app-router app with react 19, tailwind css v4, base ui primitives, `three` for the pixel-snow background, and `jszip` for batch export packaging.

use the normal app loop during development:

```bash
pnpm dev
```

for a production build check:

```bash
pnpm build
pnpm start
```

## testing

```bash
pnpm test
pnpm lint
pnpm build
```

## deployment

`squircle` is publicly deployed on vercel at [squircle-microck-projects.vercel.app](https://squircle-microck-projects.vercel.app).

the custom production domain is live at [squircle.micr.dev](https://squircle.micr.dev).

## license

released under the [mit license](LICENSE).
