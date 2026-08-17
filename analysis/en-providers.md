# English providers — nepu, goojara, primesrc, xpass

Four English providers added under `providers/media/en/`. Two had reference scraper code
(nepu, goojara → Ciarands/mw-providers); two were from scratch (primesrc, xpass).

## Summary

| Provider | Source of logic | Result | Active |
|---|---|---|---|
| **xpass2** | HTTP-first variant of xpass | ✅ **PASS — 9 HLS over `ctx.xhr` (no browser)**, puppeteer only on CF | ✅ yes |
| **xpass** | from scratch (site RE) | ✅ **PASS** — movies **9** HLS, series **9** HLS (puppeteer) | ✅ yes |
| primesrc | from scratch (site RE) | ⚠️ servers API works; `/api/v1/l` resolve is CF-blocked | ❌ no |
| nepu | mw-providers `sources/nepu` | ⚠️ search/match works; `/ajax/embed` 403 under CF | ❌ no |
| goojara | mw-providers `sources/goojara` | ⚠️ CF blocks the `/xhrr.php` search POST | ❌ no |

**The common blocker:** these three (nepu, goojara, primesrc) put a **Cloudflare managed
challenge** on their critical XHR endpoints (search POST / embed POST / key-resolve). That
403 persists *even inside a CF-solved browser* — verified with both the in-app browser and
grabit's puppeteer-real-browser. The site's own JS re-runs the Turnstile/JSD to get past it;
automated sessions can't. Their scraping logic is ported/implemented correctly and set
`active: false` so they resume if/when the sites are scrapable. xpass has only a JS-challenge
(not a per-endpoint managed challenge), so puppeteer sails through.

## xpass — ✅ working (play.xpass.top)

- **URLs:** `/e/movie/{imdb}` and `/e/tv/{imdb}/{season}/{episode}` (fixed from the original
  `/e/movie?imdb=` which 404s). Built from the `entries` pattern via `createResourceURL`.
- **Flow:** load the embed in a puppeteer-solved context → the player fetches a **signed**
  `/data/<type>/<tmdb>?…&sig=…` source list → each entry points at a `playlist.json` exposing a
  direct **HLS** `file`. We read the signed URL from the page's resource timeline and fetch the
  list + playlists *inside the page* (the signature is generated there), then return every m3u8.
- **Result:** Inception → 9 HLS; Breaking Bad S1E1 → 9 HLS. Real, direct playlists (tik/vid/mix/…).

## xpass2 — ✅ working, HTTP-first (play.xpass.top)

Same site as `xpass`, but resolves over plain `ctx.xhr` and only falls back to
`ctx.puppeteer` when the page is genuinely Cloudflare-gated (per request).

- **Why it can skip the browser:** the signed source-list URL is **server-rendered** into the
  embed HTML (`var dataUrl="/data/…&sig=…"`) — no client JS needed to produce the signature.
- **Flow:** `ctx.xhr` GET embed page → extract `dataUrl` → GET the signed source list → GET each
  `playlist.json` → HLS `file`s. The signed endpoints validate the **embed-page `Referer`** and
  the **session cookie** the embed response sets (using `Referer: origin` / no cookie returns an
  app-level `403 "Error"` — this was the key fix, not Cloudflare).
- **CF detection** is limited to the real interstitial (`<title>Just a moment`, `__cf_chl…`);
  the benign `challenge-platform` JSD script that Cloudflare injects into *normal* pages is
  intentionally NOT treated as a gate (matching it caused a needless puppeteer fallback).
- **Result:** Inception → 9 HLS, Breaking Bad S1E1 → 9 HLS, both **via `ctx.xhr` (no browser)**.
  The puppeteer fallback is verified to also produce 9 (it ran while the CF detector was mis-set).

## primesrc — ⚠️ servers OK, resolve CF-blocked (primesrc.me)

- Clean JSON API: `/api/v1/s?imdb=…&type=…` lists 24 servers (Filemoon/Streamwish/Mixdrop/Dood/
  Filelions/Voe/…), each with a `key`; `/api/v1/l?key=…` resolves the embed URL.
- `/api/v1/s` works, but **`/api/v1/l` returns 403** (CF managed challenge) even via grabit's
  puppeteer. Implemented to resolve keys in-browser and dispatch supported hosts through
  `embedDispatch`; blocked at the resolve step. `entries` repointed at `/api/v1/s`.

## nepu — ⚠️ CF blocks the embed POST (nepu.to)

- Ported from mw-providers: `/ajax/posts?q=` JSON search → watch page → `a[data-embed]` →
  `POST /ajax/embed` → HLS `file`. Search + match work inside a CF-solved browser, but
  **`POST /ajax/embed` returns 403** under CF (verified). Implemented with the network-capture
  fallback (let the player load, grab the `.m3u8`), but the player never loads because the POST
  is blocked. mw-providers also ships nepu `disabled`.

## goojara — ⚠️ CF blocks the search POST (ww1.goojara.to)

- Ported from mw-providers: `POST /xhrr.php` search → `.mfeed` match → resolve id → `/id` page
  → follow `go.php` redirects to wootly/upstream/mixdrop/dood. The search **`POST /xhrr.php`
  returns 403** under CF even in a solved browser (verified), so the chain can't start. Full
  flow is ported (driven through puppeteer; `go.php` resolved via browser tabs; mixdrop/dood via
  `embedDispatch`); the `wootly` host is left as a TODO. mw-providers ships goojara `disabled`.

## Config fixes applied
- `{season:number}`/`{episode:number}` → `{season:1}`/`{episode:1}` (the valid zero-pad-digit
  placeholder; `number` is not a recognized spec and would be left unsubstituted) — primesrc, xpass.
- xpass endpoints corrected to the real `/e/movie/{id}` and `/e/tv/{id}/{s}/{e}` shapes.
- xpass config `name` aligned to the manifest ("Xpass"); xpass config header de-duplicated
  (was a copy of primesrc's).
