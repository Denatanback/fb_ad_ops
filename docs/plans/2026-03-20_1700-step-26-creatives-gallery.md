# Step 26 — Creatives Gallery

**Date:** 2026-03-20
**Scope:** Add a visual gallery mode to the Creatives area

## Problem

The existing Creatives page is a flat filterable list with no immediate visual feedback. Working with image/video creatives requires clicking into each row to see any preview. A gallery view would make it far faster to visually scan and identify creatives by appearance rather than name.

## Design decisions

### Dedicated page over toggle

A dedicated `/creatives/gallery` page was chosen over a toggle on the existing page because:
- The gallery groups by status → approach → media type (three-level hierarchy), whereas the list is a flat filtered table — they serve different interaction models
- Keeping them as separate pages means each is simpler and focused
- Easy to link between them with "Список" / "Галерея" buttons

### Gallery grouping: status → approach → media type

Display order for lifecycle statuses: **ACTIVE → SCALING → QUEUE → STOPPED** (active work surfaces first; stopped items sink to the bottom).

Within each status, creatives are sub-grouped by **approach name** (alphabetical), then split into **Видео** and **Изображения** sections within each approach block.

### Preview URL priority

`thumbnailUrl` → `previewUrl` → `assetUrl` (static only) → placeholder text.

For video creatives: `assetUrl` is the actual video file, not usable as `<img>` src. Only `thumbnailUrl` and `previewUrl` are used as image sources. If neither exists, a dark placeholder reading "Видео" is shown.

### Media type detection

Reuses existing `detectCreativeMediaType()` from `src/server/services/creative-media.ts`. Checks `sourceMimeType` first (MIME prefix), then falls back to filename extension. Defaults to "static".

### No autoplay, no inline video elements

Videos are represented by their thumbnail/poster frame only. No `<video>` tags anywhere in the gallery.

### Navigation

- Creatives list page: "Галерея" button added to the Actions panel
- Gallery page: "Список" ← → "Галерея" mode bar at the top

## Data access

`listCreativesForGallery()` — lightweight Prisma query selecting only gallery-needed fields (`id`, `name`, `currentStatus`, `thumbnailUrl`, `previewUrl`, `assetUrl`, `sourceMimeType`, `approach`). No labels, no launch counts, no audit fields.

## Architecture

| Layer | What |
|---|---|
| Service | `listCreativesForGallery()` in `src/server/services/creatives.ts` |
| Component | `CreativeGalleryCard` in `src/components/creatives/creative-gallery-card.tsx` |
| Page | `src/app/(workspace)/creatives/gallery/page.tsx` |
| CSS | Gallery classes in `src/app/globals.css` |
