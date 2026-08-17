# WebStreamr ports: VixSrc, HomeCine, RgShows

Ported three sources from the `webstreamr` addon. VixSrc + RgShows landed under
`providers/media/multi/`, HomeCine under `providers/media/es/`. A new shared
`extractors/fastream.ts` was added and wired into `embedDispatch`.

## VixSrc — `providers/media/multi/vixsrc` — active, HTTP-first

TMDB-id based, multi-audio HLS. The upstream site restructured to a Next.js shell,
so the old "fetch `/movie/{id}` and regex the page" approach no longer works. Current chain:

1. `GET /api/movie/{tmdb}` (or `/api/tv/{tmdb}/{s}/{e}`), Referer = origin
   -> JSON `{ src: "/embed/<id>?token=…&expires=…&lang=…" }`
2. `GET` that `/embed/<id>?…` page -> `window.masterPlaylist` holds `token`, `expires`, `url`
3. playlist = `<url>&token=…&expires=…&h=1`

The signed master playlist is token-only (no Referer/UA needed) and carries multiple
audio tracks (verified Italian + English on Inception). Flag `CORS_BLOCKED`.
**Tested:** movie (tmdb 27205) and series (Breaking Bad 1x1) both return a valid m3u8.

## HomeCine — `providers/media/es/homecine` — active, HTTP-first

Spanish (Latino / Castellano) DooPlay site, no Cloudflare. Chain:

1. `/?s=<title>` search (localized + original title variants) -> best `a[oldtitle]`
   match via `calculateMatchScore` (>= 80). Movies exclude `/series/` hrefs, series keep them.
2. series: series page -> `#seasons a` whose href ends `-temporada-<s>-capitulo-<e>` -> episode page
3. player page -> `.les-content a[href="#tabN"]` (label carries the language) -> `#tabN iframe[src]`
4. dispatch each embed host through `extractors/embedDispatch`

Only Latino/Castellano tabs are taken (Subtitulado is skipped, matching webstreamr).
Embeds observed were all **fastream.to**. **Tested:** movie (Inception -> "El Origen")
and series (Breaking Bad 1x1) each return 2 Spanish sources.

## Fastream extractor — `providers/extractors/fastream.ts`

New shared extractor (HomeCine and other Spanish sites use it). The embed page carries a
Dean Edwards packed `<script>` with `jwplayer("vplayer").setup({sources:[{file:…}]})` —
structurally identical to `supervideo.ts`. Unpack with `unpackV2` +
`extractContructorJSONArguments`, read `sources[].file`.

Playback note: the returned `master.m3u8` is signed and **bound to the scraping session
(IP + client fingerprint), not just a Referer** — a fresh `curl` from the same machine
403s a token minted by the engine. Flagged `CORS_BLOCKED, REFERER_LOCKED, IP_LOCKED` so
the host consumes it through the scraper context / proxy. webstreamr routes Fastream via a
MediaFlow proxy for the same reason. Extraction itself is correct and returns real signed URLs.

## RgShows — `providers/media/multi/rgshows` — **active: false (blocked)**

Logic implemented against the documented contract (`GET /main/{movie|tv}/…` ->
`{ stream: { url } }`, headers Referer/Origin `www.rgshows.ru`). **Blocker with evidence:**

- `api.rgshows.ru` is `NXDOMAIN` even via Cloudflare authoritative DoH
  (`{"Status":3,...,"Authority":[{"name":"rgshows.ru","type":6,...}]}`) — the subdomain is gone.
- `rgshows.ru` (301) now redirects to `www.1tube.org`, a different Next.js app ("1Tube")
  with an unknown client-side stream architecture.

So RgShows cannot be ported against its old API. The code returns `[]` gracefully (warns
"host likely offline") and the manifest entry is `active: false`. Re-enable once a live host
is confirmed, or re-implement against 1tube.org (a from-scratch reverse-engineering job).
