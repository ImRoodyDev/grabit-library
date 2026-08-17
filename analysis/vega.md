# vega (VMovies) — port report

- **Source:** vega-providers `providers/vega/*` (+ shared `extractors/hubcloud.ts`)
- **Added to:** `providers/media/multi/vega/{config,stream,index}.ts`
- **Reuses:** `extractors/hubcloud.ts`, `extractors/hubchain.ts` (detectQuality), `extractors/postMatch.ts`
- **Manifest:** `dir: providers/media/multi`, `language: ["hi","en"]`, name **VMovies**.
- **Site:** vegamovies (domain rotates; `vegamovies.catering` → `new1.vegamovies.futbol`).
  The provider relies on `followRedirects` + grabit's Cloudflare-aware `ctx.xhr`.

## Pipeline (grabit `getStreams`)

1. **Search** — the site's `/search.php?q=<title>&page=1` Typesense endpoint (JSON
   `hits[].document`: post_title, permalink, post_thumbnail).
2. **Match** — shared `pickBestPost` (season-aware).
3. **Meta / candidates** — parse the post page:
   - **Movie:** each `a:has(.dwd-button)` is a quality download → a `nexdrive` dotlink.
   - **Series:** posts are headed `<h3>Season N … 480p/720p/1080p</h3>`; the wanted-season
     headings are followed by an "⚡ Episode Links" button (a `nexdrive` page). That page
     lists episodes as `<h4>-:Episodes: N:-</h4>`, each with **V-Cloud / G-Direct / DropGalaxy**
     buttons — we take the **V-Cloud (vcloud)** one for the requested episode.
4. **Resolve** — `resolveVegaLink`: a `nexdrive` dotlink page exposes an
   `<a href="…cloud…">` (a `vcloud.fit` URL); cloud URLs pass straight through.
5. **Extract** — `extractHubcloudStreams()` handles the vcloud page → mirrors →
   `InternalMediaSource[]`.

## Results — both media types PASS

- **Movies:** Inception → **9 sources** (3 qualities × 3 mirrors), ~5 s.
- **Series:** Breaking Bad **S1E1** → **11 sources**, ~5 s (season+episode correctly
  filtered from a "Season 1–5 Complete" post; V-Cloud button per episode).

See [README](README.md#test-results-real-media-via-test-provider) for the results table.

## Notes / gotchas encountered (useful for the rest of the bundle)

- `vegamovies.catering` 301-redirects to the live content domain — needed `followRedirects`.
- The episode-list page numbers episodes as **"-:Episodes: N:-"**, so `episodeNumberOf`
  matches `episodes?\s*:?\s*(\d+)` (not just "Episode N").
- Each episode exposes several hosts; only **V-Cloud/vcloud** feeds the HubCloud extractor —
  fastdl/dropgalaxy are skipped. A future `fastdl`/`dropgalaxy` extractor would add mirrors.
- `extractHubcloudStreams` accepts a **vcloud** URL directly (not only `hubcloud`), since the
  vcloud page carries the same mirror-button layout.
