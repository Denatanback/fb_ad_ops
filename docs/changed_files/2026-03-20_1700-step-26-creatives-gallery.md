# Changed Files — Step 26: Creatives Gallery

## Modified files

### `src/server/services/creatives.ts`
- Added exported type `GalleryCreative` (id, name, currentStatus, thumbnailUrl, previewUrl, assetUrl, sourceMimeType, approach)
- Added `listCreativesForGallery()` — lightweight query for gallery display, no labels/launches/audit fields

### `src/app/(workspace)/creatives/page.tsx`
- Added "Галерея" link button (`/creatives/gallery`) in the Actions section

### `src/app/globals.css`
- Added gallery CSS section with classes:
  - `.gallery-mode-bar`, `.gallery-mode-bar__active`
  - `.gallery-content`, `.gallery-status-section`, `.gallery-status-heading`, `.gallery-status-count`
  - `.gallery-approaches`, `.gallery-approach-block`, `.gallery-approach-heading`
  - `.gallery-type-section`, `.gallery-type-label`
  - `.gallery-grid`
  - `.gallery-card`, `.gallery-card__thumb`, `.gallery-card__img`, `.gallery-card__thumb-placeholder`
  - `.gallery-card__video-badge`, `.gallery-card__body`, `.gallery-card__name`

## New files

### `src/app/(workspace)/creatives/gallery/page.tsx`
- Server component gallery page at `/creatives/gallery`
- Groups creatives by status (ACTIVE → SCALING → QUEUE → STOPPED) → approach → media type
- `buildGalleryGroups()` helper converts flat `GalleryCreative[]` into nested `StatusGroup[]`
- Shows "Список" / "Галерея" mode bar at top
- Empty state with link to create first creative

### `src/components/creatives/creative-gallery-card.tsx`
- `CreativeGalleryCard` server component
- Resolves best available thumbnail: `thumbnailUrl` → `previewUrl` → `assetUrl` (static only) → null
- Detects media type via `detectCreativeMediaType()` from `creative-media.ts`
- Videos show poster image or "Видео" placeholder text + video badge overlay
- Renders as `<Link>` to `/creatives/{id}`, lazy-loads images
