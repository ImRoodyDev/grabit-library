# Porting backlog — vega-providers → grabit-library

Full inventory of vega's providers and their porting disposition. Enabled = `disabled:false`
in vega's `manifest.json` ("what they are using"). Domains live in vega's `urls.json`.

## ✅ Ported

| Provider | grabit path | Extractors | Status |
|---|---|---|---|
| hubcloud (extractor) | `extractors/hubcloud.ts` | — | ✅ reusable |
| hubchain (shared) | `extractors/hubchain.ts` | — | ✅ shared link-chain resolver |
| postMatch (shared) | `extractors/postMatch.ts` | — | ✅ shared search-result matching |
| hdhub4u | `media/multi/hdhub4u` | hubcloud, hubchain | ✅ movies / ⚠️ series |
| 4khdhub | `media/multi/4khdhub` | hubcloud, hubchain | ✅ movies / ✅ series |
| vega (VMovies) | `media/multi/vega` | hubcloud | ✅ movies / ✅ series |
| streamwish (extractor) | `extractors/streamwish.ts` | — | ✅ StreamWish/FileLions/VidHide family |
| embedDispatch (shared) | `extractors/embedDispatch.ts` | — | ✅ host → extractor router |
| **VerHdLink** (Spanish) | `media/es/verhdlink` | dispatch (dropload/supervideo/mixdrop/dood) | ✅ movies (from webstreamr) |

### ✅ Extractor added
- **GDFlix** (`extractors/gdflix.ts`) — ResumeCloud + G-Drive paths (FormData-free for Hermes).
- **HubCloud recover-redirect fix** — `handleSearchRecover` now resolves old-domain
  (`hubcloud.foo` → `hubcloud.cx`) 302s before calling `?api=search` (the redirect drops the param).

### ⏸️ Built but inactive (blocked)
- **1cinevood** (`media/multi/1cinevood`) — Cloudflare "Just a moment"; CF-wait + selector + imdb-first fixes applied, awaiting a user run to verify.
- **cuevana** (`media/es/cuevana`) — JS/CF-gated click-to-load players; needs interactive rendering.
- **drive / MoviesDrive** (`media/multi/drive`) — code verified end-to-end, but the site's HubCloud
  **recover backend returns `found:0` for every title** (dead site-side). Reuses hubcloud + gdflix.
  Re-enable if the site's recover index comes back, or point it at direct-link titles.

### 🇪🇸 webstreamr — other Spanish sources (clean, IMDb/TMDB-keyed, reuse `embedDispatch`)
- **CineHDPlus** — `[data-num="SxE"] [data-link]`; has **series**. Good next Spanish target.
- **HomeCine** — search `/?s=`, iframe-per-option.
- Adding a **`voe` extractor** would unlock more mirrors across these Spanish sites.

## 🔜 Next priority — HubCloud/GDFlix bundle (enabled, dual-audio)

These reuse the same extractors, so they're the highest-leverage batch. Ones marked (gdflix)
still need the GDFlix extractor (`extractors/gdflix.ts`) ported. The rest can reuse the
already-ported `hubcloud` + `hubchain` + `postMatch` modules.

**Extractor usage was verified by grepping each vega `stream.ts`** (`import extractors/*`).

### a) hubcloud-only — reuse existing modules, no new extractor (quickest)

| vega value | Site | Notes |
|---|---|---|
| eonMovies | new3.eonmovies.click | hubcloud only. |
| luxMovies (RogMovies) | new1.rogmovies.click | hubcloud only (vega file imports hubcloud; gdflix path unused for enabled flow). |
| movies4u | movies4u.ax | hubcloud only. |
| 1cinevood | cinevood.cl | hubcloud only. |

### b) hubcloud + **GDFlix** — port `extractors/gdflix.ts` first, then these

| vega value | Site | Extra |
|---|---|---|
| drive (MoviesDrive) | moviesdrive | gdflix |
| katmovies | katmoviehd.top | gdflix |
| zeefliz | zeefliz.beer | gdflix + zcloud |
| Joya9tv | joya9tv1.com | gdflix |
| kmMovies | kmmovies.online | gofile |

### c) **driveseed/driveleech** group — needs a NEW extractor (separate from hubcloud)

`mod`, `topmovies`, `uhd` resolve through a `_wp_http` **FORM-POST** chain to
driveseed/driveleech file pages (`.btn-success` workers, `/wfile?type=1/2` CF workers,
`.btn-danger` gdrive-instant). This is **not** the HubCloud chain — my earlier assumption
that `mod` was a quick hubcloud reuse was wrong. Port a `driveseed` extractor for this group.

## 🟨 Other enabled (English/global) — bespoke, port individually

| vega value | Site | Why later |
|---|---|---|
| showbox | showbox.media | febbox API + cookie/token flow; direct mp4/m3u8. Good EN fit, self-contained rewrite. |
| world4u | world4ufree.diy | bespoke (no shared extractor import). |
| a111477 | 111477 open-dir | Direct `.mkv/.mp4` files via a Cloudflare-worker proxy; fuzzy directory matching. |
| movieBoxWeb | themoviebox.org | JSON API. |
| gokuHD | gokuhd.com | Embed-host based. |
| moviezwap | moviezwap | Regional, bespoke. |
| torrentio | — | **Returns torrent magnets**, not HTTP streams — likely doesn't fit grabit's playback model. Skip unless magnets are wanted. |

## ⏭️ Skipped — already in grabit or disabled in vega

| vega value | Reason |
|---|---|
| primewire | grabit already has `media/en/primewire`; vega's copy is `disabled`. |
| autoEmbed | grabit already has `media/multi/autoembed`; vega's copy is `disabled`. |
| supeVideo (extractor) | grabit already has `extractors/supervideo.ts` — compare before reusing. |
| multi, protonMovies, cinemaLuxe, filmyfly, movieBox, mkvDrama, katMovieFix, ringz, netflixMirror, primeMirror, ogomovies, vadapav, moviesApi, ridoMovies, flixhq, hiAnime, animetsu, tokyoInsider, kissKh, dooflix, guardahd, skyMovieHD, uniquestream | `disabled` in vega (not currently used). Port on request only. |

## Extractors still to port

| vega extractor | Used by | Priority |
|---|---|---|
| gdflix | drive, movies4u, luxMovies, kmMovies, 1cinevood | high (unlocks the rest of the bundle) |
| gofile | a few | low |
| zcloud | a few | low |
| supeVideo | — | already exists in grabit |
