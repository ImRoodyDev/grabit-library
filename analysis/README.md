# Provider Porting — Analysis

Porting providers from **[Zenda-Cross/vega-providers](https://github.com/Zenda-Cross/vega-providers)**
into grabit-library, following the agreed plan:

- **Priority:** the HubCloud bundle — port the shared HubCloud/GDFlix extractors first,
  then the Indian/dual-audio providers that reuse them.
- **Pace:** deep + tested, **one provider at a time** (fully port → test against real media
  with `test-provider` → document → next).

> Source repo is cloned (shallow) in the session scratchpad with a temporary
> `CLAUDE.md` describing its architecture, so we don't re-explore it each turn.

## Why this is a rewrite, not a copy

The two projects have **different provider models**:

| | vega-providers | grabit-library |
|---|---|---|
| Model | browse: `catalog → posts → meta → episodes → stream` | direct: `getStreams(requester, ctx)` from a TMDB/IMDB id |
| HTTP | `axios` + raw `fetch` | `ctx.xhr.fetch` (proxy/UA/Cloudflare aware) |
| HTML | `cheerio` | `ctx.cheerio.load` / `ctx.cheerio.$load` |
| Cloudflare | `providerContext.openWebView` (WebView solver) | `ctx.puppeteer.launch` (real browser) |
| Output | `Stream[] {server, link, type, quality, headers}` | `InternalMediaSource[] {fileName, playlist, language, xhr}` |

So each provider's **scraping logic** is re-expressed against grabit's contract:
search → `calculateMatchScore` match → drill to the file page → dispatch to an extractor.

## URL building — use the `entries` pattern, not hand-rolled URLs

All ported providers build their search/resource URLs through the `Provider` class and the
`config.entries` placeholders — **never** `new URL('/?s=' + encodeURI(...))`. This was swept
across the whole library (verified: no `new URL(\`/?s=…\`)` / `encodeURI(query)` remain).

- `entries[type].endpoint` holds the pattern with typed placeholders:
  `{title:form-uri}` (query term, spaces→`+`), `{title:uri}` (path term, spaces→`%20`),
  `{imdb:string}` / `{id:string}`, `{season:2}` / `{episode:2}` (zero-padded), or `{N}` index.
  `entries[type].queries` adds static (URL-encoded) query params. An **absolute-URL** endpoint
  passes straight through `new URL()` (used for hdhub4u's external pingora Typesense API).
- `PROVIDER.createResourceUrls(requester)` → the deduplicated, prioritized list of
  original + localized-title URLs (replaces the manual `[title, ...localizedTitles]` loop).
  Order respects `useTranslation`: dual-audio providers (`language` includes `en`) get
  English-title-first; `es`-only providers (cuevana) get Spanish-first — automatically.
- `PROVIDER.createResourceURL(requester, localizedIndex?)` → a single URL (e.g. verhdlink's
  `/movie/{imdb:string}`). `PROVIDER.createPatternString(pattern, media)` → a formatted
  fragment (e.g. 1cinevood's IMDb-first `?s={imdb:string}` passed as `createResourceUrls`'
  leading `customURL`).

Refactored to this convention and re-verified: hdhub4u, 4khdhub, vega, drive, 1cinevood,
cuevana, verhdlink (the older providers already followed it).

## Cloudflare handling (puppeteer switch)

Two layers, matching how the user switches between them:

1. **Default:** `ctx.xhr.fetch` already routes through impit + proxy and clears most
   Cloudflare checks. All normal hops use it.
2. **Fallback:** when a hop returns **HTTP 403** (a real CF challenge), the HubCloud
   extractor calls `ctx.puppeteer.launch()` to render the page in a real browser and
   reuses any `cf_clearance` cookie it earns for the following same-origin hops. This is
   the grabit equivalent of vega's `openWebView`.

## Status summary

| # | Added | Kind | Movies | Series | Notes |
|---|---|---|---|---|---|
| 1 | `extractors/hubcloud.ts` | extractor | ✅ | ⚠️ | Reusable. Handles vcloud mirrors, nested HubCloud, PixelDrain, CF-workers, direct `.mkv`, and the `search-recover.php` JSON API (with a title guard). CF 403 → puppeteer. |
| 2 | `extractors/hubchain.ts` | shared helper | — | — | The hdhub4u-family link chain (hubdrive / obfuscated `wp_http` redirect → HubCloud URL). Inlined into each provider bundle. |
| 3 | `extractors/postMatch.ts` | shared helper | — | — | Noisy-title cleaning, season-aware `pickBestPost`, `titleTokens` guard. Shared by all hdhub4u-family providers. |
| 4 | `media/multi/hdhub4u` | provider | ✅ **PASS** | ⚠️ partial | See [hdhub4u.md](hdhub4u.md). |
| 5 | `media/multi/4khdhub` | provider | ✅ **PASS** | ✅ **PASS** | Site `/?s=` search + CSS-selector meta; both media types verified. |
| 6 | `media/multi/vega` | provider | ✅ **PASS** | ✅ **PASS** | VMovies flagship. `/search.php` JSON + nexdrive→vcloud→HubCloud; both media types verified. |
| 7 | `extractors/streamwish.ts` | extractor | ✅ | — | StreamWish / FileLions / VidHide family (packed jwplayer → direct m3u8). Reusable. |
| 8 | `extractors/embedDispatch.ts` | shared helper | — | — | Routes an embed host → the right grabit extractor (streamwish/dood/filemoon/mixdrop/supervideo/dropload). |
| 9 | `media/es/verhdlink` (VerHdLink) | **Spanish** provider | ✅ **PASS** | n/a | From **webstreamr**. IMDb-keyed `/movie/<imdb>`; static mirror embeds → dispatch. Movie-only site. |
| — | `media/es/cuevana` (Cuevana) | Spanish provider | ⏸️ inactive | ⏸️ | Search+match work, but players load via JS behind Cloudflare (click-to-load); needs interactive rendering. `active:false`. |
| — | `media/multi/1cinevood` (Cinewood) | provider | ⏸️ needs verify | ⏸️ | Cloudflare "Just a moment" challenge. Fixed CF-wait + selectors + imdb-first query; awaiting user run (can't verify — Chrome-launch is off-limits). |
| 10 | `extractors/gdflix.ts` | extractor | ✅ built | — | GDFlix (ResumeCloud + G-Drive paths; FormData-free for Hermes). Reusable; not yet exercised by a live title. |
| — | `media/multi/drive` (MoviesDrive) | provider | ⏸️ inactive | ⏸️ | Code correct (search/match/candidates/resolve verified), but the site's HubCloud **recover backend returns `found:0` for every title** (dead site-side). `active:false`. |

Legend: ✅ verified working · ⚠️ works with known limitations · ⏸️ built but inactive/blocked · ❌ not working · ⏳ not started

> **Second source repo:** for Spanish we pulled from **[webstreamr](https://github.com/webstreamr/webstreamr)**
> (vega-providers has no Spanish sources). Its model: a source maps a TMDB/IMDb id → embed
> URLs, which extractors resolve — so grabit's `requester` (already carrying imdb/tmdb/title)
> makes IMDb-keyed sources like VerHdLink a very clean fit.

See [backlog.md](backlog.md) for the full vega inventory (what's next, what's skipped and why).

## Test results (real media, via `npx test-provider`)

| Provider | Media | Type | Result | Sources | Time |
|---|---|---|---|---|---|
| hdhub4u | Inception (tt1375666 / 2010) | movie | ✅ PASS | 7 | ~7 s |
| hdhub4u | Stranger Things S1E1 | serie | ⚠️ 0 (correct match, stale recover links on site) | 0 | ~1 s |
| hdhub4u | Breaking Bad S1E1 | serie | ⚠️ 0 (season-pack "Index of" folder not yet parsed) | 0 | ~3 s |
| 4khdhub | Inception (tt1375666 / 2010) | movie | ✅ PASS | 6 | ~3 s |
| 4khdhub | Breaking Bad S1E1 | serie | ✅ PASS | 6 | ~5 s |
| vega | Inception (tt1375666 / 2010) | movie | ✅ PASS | 9 | ~5 s |
| vega | Breaking Bad S1E1 | serie | ✅ PASS | 11 | ~5 s |
| verhdlink (es) | Inception (tt1375666) | movie | ✅ PASS | 4 | ~2 s |
| cuevana (es) | Origen/Inception | movie | ⚠️ match OK, embeds CF-gated | 0 | — |
| xpass (en) | Inception (tt1375666) | movie | ✅ PASS | 9 HLS | ~6 s |
| xpass (en) | Breaking Bad S1E1 | serie | ✅ PASS | 9 HLS | ~6 s |
| primesrc / nepu / goojara (en) | — | — | ⚠️ CF-blocked (see below) | 0 | — |

### English providers (nepu, goojara, primesrc, xpass)

**xpass works** (9 direct HLS for movies and series). **primesrc, nepu, goojara** are behind
Cloudflare *managed challenges* on their resolve/search endpoints — a 403 that persists even in
a puppeteer-solved browser — so they're implemented but `active: false`. Full write-up:
[en-providers.md](en-providers.md).

### Spanish providers (pre-existing WIP, verified/diagnosed this pass)

`providers/media/es/{verhdlink,cuevana}` were already scaffolded in the tree. **verhdlink is
working** (active, 4 sources). **cuevana** search/matching work but its embed list loads via a
Cloudflare-gated AJAX call that automated browsers can't complete — kept `active: false`. Full
diagnosis and the exact next step in [es-providers.md](es-providers.md).
| verhdlink | Inception (tt1375666) | movie | ✅ PASS | 4 (Dropload, Supervideo, Mixdrop, Doodstream) | ~2 s |
| cuevana | Inception (Origen) | movie | ⏸️ found page, embeds JS/CF-gated | 0 | — |
| 1cinevood | Inception | movie | ⏸️ Cloudflare challenge (fixes pending user run) | 0 | — |
| drive | Inception / Deadpool&Wolverine | movie | ⏸️ site recover backend `found:0` | 0 | — |

**Movie streams verified:** HubCloud→Google-Drive, Cloudflare-worker mirrors, PixelDrain,
and `cdn.fslsilo.best` direct `.mkv` — 4K/1080p dual-audio.

> **Testing note:** TMDB enrichment is rate-limited; repeated runs can throw a transient
> TMDB **401** that leaves the media title unset and causes a bad match. Pass
> `--title/--year/--imdb` explicitly to bypass TMDB when re-testing quickly.
