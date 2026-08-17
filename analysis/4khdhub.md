# 4khdhub — port report

- **Source:** vega-providers `providers/4khdhub/*` (+ shared `extractors/hubcloud.ts`)
- **Added to:** `providers/media/multi/4khdhub/{config,stream,index}.ts`
- **Reuses:** `extractors/hubcloud.ts`, `extractors/hubchain.ts`, `extractors/postMatch.ts`
- **Manifest:** `dir: providers/media/multi`, `language: ["hi","en"]` (dual-audio).
- **Site:** 4khdhub (domain rotates; currently `https://4khdhub.one`).

## Pipeline (grabit `getStreams`)

1. **Search** — the site's own `/?s=<title>` page; results parsed from `.card-grid`
   children (`.movie-card-title`, `href`, `img`).
2. **Match** — shared `pickBestPost` (season-aware, noisy-title cleaning).
3. **Meta** — parse the post page:
   - Movie: `.download-item` → `.flex-1.text-left.font-semibold` label +
     `.grid.grid-cols-2.gap-2 a:contains('HubCloud')`.
   - Series: `.season-item` groups **a season + quality** (`.episode-number` = "S05",
     `.episode-title` = "S05 1080p BluRay"); inside, each `.episode-download-item` is one
     episode (`.episode-file-title` = "…S05E01…", `.episode-file-info .badge-psa` =
     "Episode-01", `.episode-links a` = HubCloud). We filter by **season** at the group
     level and **episode** at the item level.
4. **Resolve** — shared `resolveToHubcloud` (hubdrive / obfuscated `wp_http` chain).
   4khdhub links are often already direct `hubcloud.ist/drive/<id>` URLs.
5. **Extract** — `extractHubcloudStreams()` → `InternalMediaSource[]`.

## Results — both media types PASS

- **Movies:** Inception → **6 sources**, ~3 s.
- **Series:** Breaking Bad **S1E1** → **6 sources**, ~5 s (season+episode correctly filtered
  from a post that carries all seasons S01–S05).

See [README](README.md#test-results-real-media-via-test-provider) for the results table.

## Notes

- 4khdhub's series markup is cleaner and more reliable than hdhub4u's (real per-episode
  HubCloud links rather than stale `search-recover` / season-pack folders), so series works
  end-to-end here.
- This was the first provider built entirely on the shared `hubcloud`/`hubchain`/`postMatch`
  modules — confirms the reuse pattern for the rest of the HubCloud bundle (mod, uhd,
  world4u, katmovies, topmovies, …).
