# VerHdLink — port report (Spanish)

- **Source:** webstreamr `src/source/VerHdLink.ts`
- **Added to:** `providers/media/es/verhdlink/{config,stream,index}.ts`
- **New shared code:** `extractors/streamwish.ts` (StreamWish/FileLions/VidHide family),
  `extractors/embedDispatch.ts` (host → extractor router).
- **Manifest:** `dir: providers/media/es`, `language: ["es"]`, `supportedMediaTypes: ["movie"]`.
- **Site:** https://verhdlink.cam — **movie-only**, IMDb-keyed, no Cloudflare JS challenge.

## Pipeline (grabit `getStreams`)

1. **Lookup** — `GET /movie/<imdbId>` directly (grabit's `requester.media.imdbId`). No search step.
2. **Parse** — mirror embeds live in `._player-mirrors` blocks tagged `.latino` / `.castellano`;
   read every `[data-link]`, normalise protocol-relative URLs, drop self-links.
3. **Dispatch** — `dispatchEmbed()` routes each host to its grabit extractor.

## Result — PASS

Inception (`tt1375666`) → **4 sources** in ~2 s, all resolved:

| Host | Extractor | Output |
|---|---|---|
| dr0pstream.com | Dropload | m3u8 |
| supervideo.cc | Supervideo | m3u8 (+ referer/origin headers) |
| mixdrop.ag | Mixdrop | mp4 (mxcontent.net) |
| dood.to → myvidplay.com | DoodStream | mp4 (cloudatacdn.com) |

All four hosts already had grabit extractors — no proxy needed. The new StreamWish
extractor covers the streamwish/vidhide/filelions family other Spanish sites use.

## Notes for future Spanish work

- **`embedDispatch.ts` is the reusable core** for any embed-list provider (Spanish or
  otherwise): scrape a page for host URLs, hand them to `dispatchEmbed`.
- **Cuevana** (bigger catalogue, has series) was attempted first but its watch pages load
  players via JS behind Cloudflare (click-to-load), so it needs interactive rendering —
  left `active:false` in the manifest. See README status table.
- Hosts still **without** a grabit extractor, seen on Spanish sites: **voe**, **waaw/streamsb**,
  **filelions-only mirrors**. Adding a `voe` extractor would widen coverage the most next.
