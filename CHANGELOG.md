# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - 2026-04-12

### Added

- Initial public release of squircle — a local-first image corner tool.
- True squircle corner profile (superellipse) with adjustable smoothness.
- Rounded rectangle mode as a fallback profile.
- Batch processing — drop multiple images and export them all at once.
- GIF export with animated corner rounding.
- Cover crop controls for framing before export.
- Upload progress indicator for GIF processing.
- Adjustable shadow, outline, and background controls.
- Transparent PNG export with proper dark gradient debanding.
- Dark mode UI built with Next.js 16, Tailwind CSS, and Radix primitives.
- Everything runs client-side — no images leave the browser.

### Fixed

- Reduced background and editor render overhead for smoother interaction.
- Corrected export file naming and crop slider layout.
- Fixed dark gradient banding in PNG exports.
- Added app icons and corrected README hero assets.

### Changed

- Refreshed README with polished landing details and deployment notes.
- Updated deployment access documentation for Vercel.
