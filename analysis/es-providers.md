# Spanish providers — verhdlink & cuevana

Two Spanish/Latino providers existed as work-in-progress in the tree
(`providers/media/es/{verhdlink,cuevana}`) alongside a shared `extractors/embedDispatch.ts`
and `extractors/streamwish.ts`. This pass verified and diagnosed them.

## verhdlink — ✅ WORKING (active)

- **Path:** `providers/media/es/verhdlink/`
- **Site:** verhdlink.cam · **movie-only** · keyed by IMDb id (`/movie/<imdbId>`).
- **Flow:** load the movie page → collect `[data-link]` mirror embeds (Latino/Castellano)
  → `dispatchEmbed` to the host extractor.
- **Test:** Inception (tt1375666) → **✅ PASS — 4 sources**: dr0pstream (dropload),
  supervideo, mixdrop, doodstream. ~2 s.
- Static HTML exposes the embeds directly, so no browser render needed. Solid.

## cuevana — ⚠️ search/match OK, embeds BLOCKED (kept `active: false`)

- **Path:** `providers/media/es/cuevana/`
- **Site:** cuevana3 (www3.cuevana3.is), a **Next.js SPA behind Cloudflare**.
- **What works:** search (`/search/<title>/`) and matching are perfect — e.g. Spanish title
  "Origen" → `ver-pelicula/origen`, score 150.
- **What's blocked:** the embed/server list. Investigated in depth:
  - The page ships an **empty** `.embed_div > .load-video`; there is **no** `data-video` /
    `data-tr` / `__NEXT_DATA__`.
  - `static/cdn/bct-public.js` populates the servers as `.clili` options, each pointing at a
    `.TPlayerTb` tab holding `<iframe data-src="…">`; clicking a `.clili` copies
    `data-src`→`src`. So the **real embed URL is `iframe[data-src]`**, revealed on click.
  - That server list is fetched by a **Cloudflare-gated AJAX call** (jQuery, `base_url+'switch'`
    style, `_csrf` from `<meta name="csrf-token">`). In an automated browser (both grabit's
    puppeteer-real-browser and a manual render) the `.clili`/`iframe[data-src]` **never
    populate** — the CF challenge / bot-gating stops the server fetch.
- **Fix applied:** corrected the extraction to the real mechanism (`iframe[data-src]` +
  clicking `.clili`) instead of the non-existent `data-video`/`data-tr`. This is the right
  target, but is **pending live verification** because the servers don't load in an
  automated session.
- **Next step to finish cuevana:** replicate the exact server-fetch AJAX (endpoint + action +
  `_csrf` + a valid `cf_clearance`), **or** port the mechanism from the maintained
  **webstreamr** `cuevana` source (the other repo the user referenced). Until then it stays
  `active: false` so it doesn't ship returning nothing.

## Notes

- `test-provider` requires `--tmdb` even for imdb-keyed providers (verhdlink). TMDB enrichment
  is rate-limited — repeated runs throw a transient **401** that blanks the title and causes a
  wrong match; pass `--title/--year/--imdb` explicitly when re-testing.
- Both reuse the existing embed extractors (dropload, supervideo, mixdrop, doodstream,
  streamwish, filemoon) via `extractors/embedDispatch.ts` — no new extractor was needed.
