# README outline

## current README intent

- title and short product description
- local development
- verification
- deployment note
- license

## recommended structure

1. centered brand asset
2. badges
3. one-line value proposition
4. showcase media
5. why
6. quickstart
7. feature surface
8. input and output behavior
9. local development
10. testing
11. deployment
12. license

## section mapping

| previous section | new section |
| --- | --- |
| `# Squircle` | centered brand asset + intro |
| `## What it does` | `## feature surface` |
| `## Stack` | `## local development` |
| `## Local development` | `## quickstart` + `## local development` |
| `## Verification` | `## testing` |
| `## Product notes` | `## input and output behavior` |
| `## Deployment` | `## deployment` |
| `## License` | `## license` |

## missing sections checklist

- [x] showcase media near the top
- [x] quickstart before deeper detail
- [x] clearer feature surface
- [x] explicit input/output behavior
- [x] browser-only/local-processing positioning
- [x] concise deployment section

## tailored skeleton

```md
<p align="center">
  <img src=".github/assets/squircle-logo.svg" alt="squircle" width="720">
</p>

<p align="center">
  <!-- badges -->
</p>

---

`squircle` is ...

<p align="center">
  <video src=".github/assets/squircle-showcase.mp4" controls muted loop playsinline width="100%"></video>
</p>

## why

...

## quickstart

```bash
pnpm install
pnpm dev
```

## feature surface

- ...

## input and output behavior

- ...

## local development

...

## testing

```bash
pnpm test
pnpm lint
pnpm build
```

## deployment

...

## license

[mit license](LICENSE)
```
