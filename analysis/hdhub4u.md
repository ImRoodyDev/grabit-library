# hdhub4u — port report

- **Source:** vega-providers `providers/hdhub4u/*` + `providers/extractors/hubcloud.ts`
- **Added to:** `providers/media/multi/hdhub4u/{config,stream,index}.ts`, `providers/extractors/hubcloud.ts`
- **Manifest:** added under `dir: providers/media/multi`, `language: ["hi","en"]` (dual-audio).
- **Site:** hdhub4u (domain rotates; currently `https://new1.hdhub4u.af`).

## Pipeline (grabit `getStreams`)

1. **Search** — the site's Typesense API
   `https://search.pingora.fyi/collections/post/documents/search` (no key needed).
   Queried with the media title + localized titles.
2. **Match** — `calculateMatchScore(cleanTitle, media)`; titles are stripped of
   download/quality/language noise first. Series get a **season bonus/penalty** so we land
   on the correct season post rather than the newest one.
3. **Meta** — parse the post page for candidate download links:
   - Movie: quality-labelled anchors (480p/720p/1080p/2160p/4K).
   - Series: `Episode N` `<strong>` groups and `a:contains("Episode")`, filtered to the
     requested episode. **No generic-quality fallback for series** (it grabs wrong episodes).
4. **Resolve** — port of vega's link chain to a HubCloud page:
   - direct `hubcloud`/`/drive/` → straight to the extractor;
   - `hubdrive` intermediate → follow the success button;
   - obfuscated `s('o',…)` link → layered decode (base64×2 → ROT13 → base64 → JSON) →
     `_wp_http_*` token dance (capped wait) → blog redirect → HubCloud link.
5. **Extract** — `extractHubcloudStreams()` → `InternalMediaSource[]`.

## HubCloud extractor (`extractors/hubcloud.ts`)

Reusable across all HubCloud-based providers. Given a HubCloud/vcloud/hubdrive URL:

- Hop 1: page → vcloud link (decodes `atob(atob(...))` / `var url=...r=` scripts).
- Hop 2: vcloud page → mirror buttons, classified into servers:
  **Pixeldrain** (rewritten to `/api/file/<token>?download`), **Cf-Worker** (`*.workers.dev`),
  nested **HubCloud** (HEAD-redirect chased, `googleusercontent` unwrapped),
  **CfStorage**, **FastDl**, **HubCdn**, and direct `.mkv`/`?token=` links.
- **`search-recover.php`** (series file-search): calls its `?api=search` JSON endpoint,
  then **guards** each fuzzy hit against `meta.matchTokens` (the requested title tokens) so
  an unrelated recovered file is dropped rather than returned.
- **Cloudflare 403 → `ctx.puppeteer.launch()`**, reusing the earned `cf_clearance` cookie.

## Results

- **Movies — PASS.** Inception returned **7 real sources** (HubCloud→Google Drive,
  CF-worker mirrors, PixelDrain, `cdn.fslsilo.best` direct `.mkv`) in ~7 s. See
  [README](README.md#test-results-real-media-via-test-provider).
- **Series — partial.** Matching + episode detection are correct (verified it lands on
  "Stranger Things (Season 1)" and extracts the S01E01 links), but the site serves these
  through `search-recover.php` links whose folder token was **stale** (recovered an
  unrelated file → correctly rejected by the title guard → 0 sources, no false positives).

## Known limitations / next steps for series

Series posts on hdhub4u use at least three different episode layouts:

1. **`Episode N` → drive link** (handled).
2. **`Episode N` → `search-recover.php`** with a stale token (handled but often unrecoverable
   site-side).
3. **Season-pack "Index of …" → `hubdrive.tips/file/<id>` folder** (Breaking Bad style) —
   **not yet parsed**. Would need a small hubdrive-folder lister to pick the E01 file.

Recommended follow-up (if series coverage matters): add a `hubdrive.tips` folder extractor
and, when no per-episode candidate is found, fall back to opening the season-pack folder and
selecting the file matching `SxxEyy`. Movies need no further work.
