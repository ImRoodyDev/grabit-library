---
name: write-grabit-provider
description: >-
  Author or fix a grabit-library provider (scraper). HTTP-first — resolve with
  ctx.xhr.fetch + ctx.cheerio, use the engine unpackers for packed <script> URLs, and
  follow script ids/keys to their resolve endpoint; fall back to ctx.puppeteer (DOM
  extract or network listener) ONLY for a real Cloudflare interstitial. Use whenever
  adding/porting a provider, wiring an extractor, or diagnosing a 403 / "gated" site.
---

# Write a grabit-library provider

## ROLE
You are an **expert web-scraping engineer** for **grabit-library** (a provider library for
`grabit-engine`). You write robust, self-contained scrapers. **Golden rule:** fetch the page with
**`ctx.xhr.fetch` + `ctx.cheerio`** and **scan the HTML body** for where the source is — data in a
`<script>` element (JSON/config, an id/key, a direct URL, or packed code) or a **player element
with a `src`** (iframe/video/`source`/`data-src`). Extract it there (using the engine unpackers /
id-follow). Only when the source isn't in the body — it's injected by client JS, or a real
Cloudflare interstitial blocks you — fall back to **`ctx.puppeteer` + a network listener** (or DOM
extract). Never jump to puppeteer before ruling out an app-level Referer/cookie/signed-URL 403.

## USE THE TOOLS (don't work from memory)
- **context7 MCP** — fetch current docs before using any `grabit-engine`/`cheerio`/
  `puppeteer-real-browser` API (`resolve-library-id` → `query-docs`).
- **Browser pane (`mcp__Claude_Browser__*`)** — recon: `navigate` the real embed/watch page,
  `read_network_requests` (and read a body by `requestId`) to map the request chain,
  `javascript_tool` to replay `fetch()` in-page.
- **Bash + `curl`** — reproduce a request outside the browser (no `cf_clearance`) to isolate CF
  vs app-level gating, changing one header at a time.
- **CLIs**: `npx bundle-provider <scheme>` (build), `npx test-provider ...` (the only real proof).

## CONVENTIONS (must follow)
- Files: `config.ts` (`ProviderConfig` + `export const PROVIDER = Provider.create(config)`),
  `stream.ts` (`getStreams(requester, ctx): Promise<InternalMediaSource[]>`), `index.ts`
  (`defineProviderModule(PROVIDER, manifest.providers['<scheme>'], { getStreams })`). Add the
  **`manifest.json`** entry (`dir`, `language`, `active`, `supportedMediaTypes`).
- **URLs come from the `entries` pattern — never hand-roll `new URL('/?s='+encodeURI(...))`.**
  Placeholders: `{title:form-uri}` (query, spaces→`+`), `{title:uri}` (path, spaces→`%20`),
  `{imdb:string}`/`{id:string}`, `{season:1}`/`{episode:1}` (zero-pad **digits** —
  `{season:number}` is INVALID). Resolve with `PROVIDER.createResourceURL(requester)` or
  `PROVIDER.createResourceUrls(requester)` (deduped id + localized-title variants, ordering
  respects provider `language`). Absolute-URL endpoints pass through `new URL()` (external APIs);
  static query params go in `entries.queries`; IMDb-first extra URL via
  `createPatternString('/?s={imdb:string}', media)` passed as `createResourceUrls(requester, customURL)`.
- **HTTP**: `ctx.xhr.fetch(url, { method, attachUserAgent:true, clean:true, headers, body? }, requester)`
  → raw `Response` (`.status`, `.headers.get()`, `.text()`, `.url`). Read `.text()` then
  `JSON.parse` so you can detect challenges. Cookies: `createCookiesFromSet(res.headers)` → forward.
- **Cheerio**: `ctx.cheerio.$load(html)` / `ctx.cheerio.load(url, requestOpt, ctx.xhr)`.
- **Return** `InternalMediaSource[]` `{ fileName, playlist, language, format?, xhr:{ flags, headers } }`;
  `[]` (never throw) for unsupported types / no results. Dispatch known embed hosts
  (Filemoon/Streamwish/Mixdrop/Dood/Supervideo/Dropload) via `extractors/embedDispatch`.
- **`xhr.flags`** (`SourceFlag[]`, replaces the old `haveCorsPolicy` boolean) — set the
  consumption hints that apply so the host plays the source correctly:
  `CORS_BLOCKED` (direct fetch blocked → needs proxy), `REFERER_LOCKED` (needs the Referer in
  `xhr.headers`), `IP_LOCKED` (URL bound to the scraper IP), `GEO_BLOCKED`, `PROXY_ONLY`,
  `EXTERNAL`. e.g. a HubCloud/vcloud stream that needs a Referer → `flags: ['CORS_BLOCKED','REFERER_LOCKED']`.
- **Engine HTTP options** on `ctx.xhr.fetch`: `cookieJar` (a `CookieJar` that carries cookies
  across hops, no manual `createCookiesFromSet`), and `redirect` (`'manual'` to read a Location
  header without following it). Per-host `maxHostConcurrency` (default 10), `honorRateLimit`, and
  `coalesce` are NOT fetch options anymore: they live in the provider `config.xhr` and default on,
  so set them there. Proxy is host-config on the manager/requester
  (`proxy: { agent, auth? } | { resolver, headers? }`), never a provider fetch option.
- **CF-solving**: `ctx.solveChallenge(url, requester, { waitForCookie:'cf_clearance' })` →
  `{ html, cookies, cookieMap, userAgent }` (puppeteer on Node; the host injects an RN
  hidden-WebView / FlareSolverr solver via `setChallengeSolver`). Feed the cookies into a
  `CookieJar` for the next hops. Raw `ctx.puppeteer` is still there for network-listener flows.
- **`ctx.puppeteer` vs `ctx.solveChallenge` (and `env`)**: Reach for **`ctx.puppeteer`** only when
  you truly need the live `page` object: listening to network requests to capture the media URL, or
  injecting/interacting directly in the browser. That path is Node only, so **mark the provider
  `env: "node"` in `manifest.json`** (the engine skips node-only providers in browser/RN). Use
  **`ctx.solveChallenge`** when you only need the rendered HTML (pass a challenge, read the DOM): it
  runs everywhere because the host can supply an RN WebView / FlareSolverr solver, so those providers
  stay `env: "universal"`. If you reach for puppeteer just to grab challenge HTML, prefer
  `ctx.solveChallenge` instead and keep the provider universal.
- **Lazy sources** (item 8): return `{ ..., lazy:{ id } }` and export a
  `resolveLazy(id, ctx, requester)` worker; the host resolves the final URL on play. Full contract,
  self-contained-id rule, and server/client flow in the **writing-lazy-sources** skill.
- **Comments**: short and simple, **max 2 lines**, only where intent isn't obvious. No verbose
  blocks or heavy JSDoc, and no long dashes (em dashes) or divider lines inside code comments.

## WORKFLOW

### Phase 1 — Recon (browser)
`navigate` the real embed/watch URL (fix the path if it 404s). `read_network_requests` to map the
chain that ends in a `.m3u8`/`.mp4`; read the JSON bodies. **Locate where the stream URL lives**
and whether the critical values (sig, id, source list) are **server-rendered into the HTML** (grep
the embed HTML) or **computed by client JS**. Server-rendered ⇒ HTTP-first works without a browser.

### Phase 2 — Resolve the stream, HTTP-FIRST (this is the core)
Fetch the page with `ctx.xhr.fetch`, load it with `ctx.cheerio`, and **scan the HTML body** for
where the source/player is — a `<script>` element holding data, or a **player element with a
`src`** (`iframe[src]`, `video[src]`, `source[src]`, or `[data-src]`). Then match the case:

1. **A direct URL is present** — a JSON field, an HTML attr, `var file="…"`, an m3u8/mp4 in the
   body, or a **player `src`/`data-src`** (an embed-host iframe → dispatch via `embedDispatch`;
   a direct m3u8/mp4 → use it). Extract it. Done.

2. **URL is inside a packed / eval-obfuscated `<script>`** (Dean Edwards `p,a,c,k,e,d`) → use the
   **grabit-engine unpackers** instead of a browser:
   ```ts
   import { detectPacked, extractEvalCode, unpackV2, extractVariableValue } from 'grabit-engine';
   const script = $('script:contains("eval(")').html() ?? '';       // or the specific script
   const packed = extractEvalCode(script);                          // the eval payload
   if (packed && detectPacked(packed)) {
     const code = unpackV2(packed);                                 // readable JS
     const file = extractVariableValue(code, 'file')                // or 'MDCore.wurl', 'source'…
       ?? code.match(/https?:\/\/[^"']+\.m3u8[^"']*/)?.[0];
   }
   ```
   Also available for JSON/args embedded in scripts: `extractVariableJSON`,
   `extractVariableByJSONKey`, `extractContructorJSONArguments`, `extractContructorJSONArgumentsByName`.
   **Canonical example:** `providers/extractors/mixdrop.ts`.

3. **The script holds an id / key you must resolve** (e.g. `a[data-embed]`, a server `key`, a
   `var dataUrl=…`) → **extract the id, then follow it** with a second `ctx.xhr.fetch` to the
   resolve endpoint (GET or POST), forwarding **Referer = the page URL** and the **cookie** the
   page set. Then treat that response with cases 1–2 (it may be JSON, packed, or an embed URL to
   send through `extractors/embedDispatch`).
   **Examples:** `nepu` (`data-embed` → `POST /ajax/embed`), `primesrc` (`key` → `/api/v1/l`),
   `xpass2` (`var dataUrl` → signed `/data/…` → `playlist.json`).

4. **The source isn't in the body** (injected by client JS) **or a genuine CF interstitial blocks
   you** (see Phase 3) → **fall back to `ctx.puppeteer`**, preferring a **network listener**:
   - **Network listener (preferred)** — `const p = page.waitForResponse(r => /\.m3u8(\?|$)|\.mp4/i.test(r.url()), {timeout: 25000})`,
     let the player load, then take `p.url()` + `p.request().headers()` (Referer/Origin for playback).
   - **DOM / `page.evaluate` extract** — when there's no clear media request: read the rendered DOM
     or re-run the fetch chain in-page (cookies + Referer set automatically).
   Always `await session?.page.close()` in `finally`.

### Phase 3 — A 403/challenge is NOT automatically Cloudflare. DIAGNOSE.
- **Real CF interstitial** — a full HTML page whose `<title>` is `Just a moment…`, or contains
  `__cf_chl`, `cf_chl_opt`, `cf-browser-verification`. → genuine gate → Phase 2 step 4 fallback.
  - ⚠️ The benign `/cdn-cgi/challenge-platform/.../jsd/...` script is injected into **normal**
    pages too — **do not** treat its presence as a gate (it false-positives and forces a needless
    browser fallback). Match only the interstitial markers above.
- **App-level 403/401** — short body (`Error`, tiny JSON), no CF markers. → NOT Cloudflare. Usually:
  **Referer** (wants the embed/watch page URL, not the origin), **Cookie** (session cookie set by a
  prior response — capture with `createCookiesFromSet` and forward), **signed/expiring param**
  (`expires`/`sig`/`token` must be taken fresh from the page and used before expiry), or missing
  **`x-requested-with`/`Origin`/`Accept`**.
- **Isolate with `curl`** — replay the failing request from the shell, changing ONE thing at a time
  (Referer origin↔embed URL, with/without cookie, fresh↔stale sig). The variant that flips
  **403→200** names the cause. A plain `curl` (browser UA) also shows whether the first hit is even
  CF-challenged — if curl gets real HTML, `ctx.xhr` can too, so the problem is downstream.

### Phase 4 — Validate & finalize
- `test-provider` for **movie AND series**; confirm real playable URLs (pass `--title/--year/--imdb`
  to dodge TMDB rate-limit 401s). `bundle-provider` (all) to confirm nothing else broke.
- If even a **solved browser** still 403s a critical endpoint (per-endpoint managed challenge /
  Turnstile), implement the logic correctly, set the manifest entry `active:false`, and document
  the blocker **with evidence** (status + body + which header flipped it).
- Write a short `analysis/*.md` note: what works, what's blocked, the diagnosis, the `active` call.

## HTTP-FIRST + FALLBACK SKELETON (adapt)
```ts
function isCloudflare(html: string): boolean {              // real interstitial only
  return /<title>\s*just a moment|__cf_chl_(?:f_)?tk|cf-browser-verification|cf_chl_opt/i.test(html);
}
export async function getStreams(requester, ctx) {
  if (requester.media.type === 'channel') return [];
  const base = new URL(PROVIDER.config.baseUrl);
  const url = PROVIDER.createResourceURL(requester);        // from entries
  const http = await viaXhr(url, base, requester, ctx);     // { sources?, cfBlocked }
  if (http.sources && !http.cfBlocked) return http.sources; // may be [] if genuinely nothing
  ctx.log.info('[scheme] CF interstitial — puppeteer fallback.');
  return viaPuppeteer(url, requester, ctx);                 // DOM extract OR network listener
}
async function viaXhr(url, base, requester, ctx) {
  const res = await ctx.xhr.fetch(url, { method:'GET', attachUserAgent:true, clean:true, headers:{ Referer: base.origin + '/' } }, requester);
  const html = await res.text();
  if (res.status === 403 || isCloudflare(html)) return { cfBlocked: true };
  const cookie = createCookiesFromSet(res.headers as any) || '';
  const apiHeaders = { Referer: url.href, 'x-requested-with': 'XMLHttpRequest', ...(cookie ? { cookie } : {}) };
  // case 1: URL in body → extract. case 2: packed <script> → extractEvalCode/unpackV2/extractVariableValue.
  // case 3: id/key in script → ctx.xhr.fetch(resolveUrl, { headers: apiHeaders }, requester) → parse.
  return { sources: /* InternalMediaSource[] */ [], cfBlocked: false };
}
```

## DEFINITION OF DONE
- All URLs from `entries`/`Provider` helpers (no hand-rolled `?s=`/`encodeURI(query)`).
- HTTP-first: `ctx.xhr` + `ctx.cheerio` + engine unpackers + id-follow; `ctx.puppeteer` reached
  **only** behind a correct interstitial check (never on an app-403 or the JSD script).
- `test-provider` returns real sources for movie **and** series (or logic complete + `active:false`
  + documented block). Bundles clean; `analysis/*.md` note written.

## Reference implementations in this repo
- Unpacker: `providers/extractors/mixdrop.ts` · Embed dispatch: `providers/extractors/embedDispatch.ts`
- id/key-follow: `providers/media/en/nepu`, `providers/media/en/primesrc`
- HTTP-first + CF fallback: `providers/media/en/xpass2` (vs browser-only `xpass`)
- Cookies/headers dance: `providers/media/en/primewire`
- Entries pattern + link chain: `providers/media/multi/{vega,4khdhub,hdhub4u}`, `providers/extractors/{hubcloud,hubchain,postMatch}.ts`
