<p align="center">
  <img src=".github/assets/squircle-logo.svg" alt="squircle" width="120">
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-mit-000000?style=flat-square" alt="license badge"></a>
  <img src="https://img.shields.io/badge/next.js-16-000000?style=flat-square" alt="next.js badge">
</p>

<p align="center">
  <video src="https://github.com/user-attachments/assets/4e1796d0-0bb1-4033-8105-49d24be46d91" controls muted loop playsinline width="800"></video>
</p>

---

drop one image, animated gif, or a whole batch, tune the corner profile, crop, shadow, and outline, then export transparent-corner files without sending anything to a server.

## why

most "round my image corners" tools online either dont work, mess up the image quality or are missing features i would like to have. `squircle` keeps the work local, gives you a true squircle mode, and lets you dial the final presentation details before export instead of fixing them later in another editor.

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

- drag and drop one image, animated gif, or many files in one pass
- switch between `squircle` and standard rounded-corner output
- crop with a cover-style zoom slider and drag-to-reposition preview
- tune corner radius with live preview
- add drop shadow with blur, opacity, offset, and color control
- add outer outline with width, opacity, and color control
- edit shadow and outline colors with picker plus hex input
- preview on dark or light surfaces before export
- export a single still image as `png`
- export a single animated gif as `gif`
- export a whole batch as a `.zip` of rendered `png` and `gif` files
- keep image and gif processing in the browser instead of uploading source files

## input and output behavior

- supported input formats depend on what the browser can decode, including common formats such as `jpeg`, `png`, `webp`, `gif`, `avif`, and `svg`
- animated `gif` inputs stay animated through preview and export
- still-image exports are `png`
- animated gif exports are `gif`
- video input is not supported yet
- metadata is not preserved during export
- the output keeps the rendered source dimensions after the chosen crop, corner, shadow, and outline settings are applied

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


## license

released under the [mit license](LICENSE).
