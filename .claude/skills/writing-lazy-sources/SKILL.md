---
name: writing-lazy-sources
description: >-
  Add lazy (deferred) stream resolution to a grabit-library provider. Expose a
  getLazyStreams worker that returns cheap handles and a resolveLazy worker that
  resolves the playable URL on play. Both live in a separate lazy.ts file. Use when
  listing servers is cheap but resolving each to a playable URL is expensive (extra
  fetches, an embed hop, or a browser), or when the engine runs behind a server and
  the client resolves a source on demand. Covers the types contract, the lazy.ts
  convention, the self-contained id rule, wiring, the manager lazy flag, validation,
  and the server/client resolve-on-tap flow.
---

# Writing lazy sources

## WHAT THIS IS

A **lazy source** is a placeholder a provider returns instead of a fully resolved stream. It
carries a small `lazy: { id }` handle and no `playlist`. The host shows the list immediately and
calls the provider's `resolveLazy(id, ctx, requester)` only when the user plays that source, at
which point you do the expensive work and return the real playlist.

A provider exposes lazy support through **two workers**, kept in a dedicated `lazy.ts` file:

- **`getLazyStreams(requester, ctx)`** — the cheap listing. Returns lazy handles (no `playlist`).
- **`resolveLazy(id, ctx, requester)`** — resolves one handle to a real source on play.

`getStreams` (the eager, fully-resolved lister) stays in `stream.ts` and is unaffected. A provider
can ship **any combination** of `getStreams`, `getLazyStreams`, and `resolveLazy` — pass whichever
you implement to `defineProviderModule`.

Use lazy sources when:

- Listing servers is cheap but each server needs extra fetches, an embed hop, or a browser to
  reach a playable URL. Resolve only the one the user picks, not all of them.
- The engine runs on a server and the client resolves a source on demand over HTTP.

This skill extends [[write-grabit-provider]]. Read that first for the base provider rules.

Keep code comments short and simple (max 2 lines, only where intent is not obvious), and avoid
long dashes (em dashes) or divider lines inside comments.

## THE CONTRACT (types)

- **`getLazyStreams`** returns `InternalMediaSource[]`. Each entry OMITS `playlist` and SETS
  `lazy: { id: string, label?: string }`. It still needs `language`, `fileName`, and `xhr`.
- **`resolveLazy(id, ctx, requester)`** returns a NORMAL `InternalMediaSource` (real `playlist`,
  no `lazy`), or `null` when it cannot resolve.
- The engine wrapper adds `scheme`, `providerName`, the User-Agent, and the display `fileName` to
  both, so the host receives `source.scheme` and `source.lazy.id` for the resolve call.
- On the output `MediaSource`, `playlist` is optional and `lazy` is present, so the host can do
  `if (source.lazy) resolve() else play(source.playlist)`.

### The manager lazy flag

The engine decides eager vs lazy with `GrabitManager.create({ ..., lazy: true })`:

- `lazy: false` (default) — `manager.getStreams()` calls each provider's **`getStreams`**.
- `lazy: true` — `manager.getStreams()` calls each provider's **`getLazyStreams`**, falling back to
  `getStreams` when a provider has no lazy worker. `manager.getLazyStreams()` forces this regardless
  of the flag. Either way the host resolves a handle with `manager.resolveLazySource(scheme, id, req)`.

So a provider that implements `getLazyStreams` is only exercised when the host runs the manager in
lazy mode (or calls `getLazyStreams` explicitly). Always keep a working `getStreams` too unless the
provider is lazy-only by design.

## THE ONE RULE: the id must be self-contained

`resolveLazy` runs in a SEPARATE call from `getLazyStreams`. When the engine sits behind a server the
two calls are different HTTP requests, and even in-process you should not rely on state left in
memory by the list call. So `lazy.id` must carry everything `resolveLazy` needs (an embed URL, a
token, an episode key) to resolve on its own. Pack it into the id; do not stash it in a
module-level variable.

## FILE LAYOUT & WIRING

Put both lazy workers in `lazy.ts`; keep `getStreams` in `stream.ts`. Wire everything in `index.ts`:

```ts
// index.ts
import { defineProviderModule } from 'grabit-engine';
import manifest from '../../../../manifest.json';
import { PROVIDER } from './config';
import { getStreams } from './stream';
import { getLazyStreams, resolveLazy } from './lazy';

export default defineProviderModule(PROVIDER, manifest.providers['<scheme>'], {
	getStreams,
	getLazyStreams,
	resolveLazy,
});
```

## SKELETON (lazy.ts)

```ts
// lazy.ts
import type { InternalMediaSource, ScrapeRequester, ProviderContext } from 'grabit-engine';
import { PROVIDER } from './config';

// Cheap list: one lazy handle per server. Pack the embed URL into the id so resolveLazy
// can resolve it standalone. No playlist yet.
export async function getLazyStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const url = PROVIDER.createResourceURL(requester);
	const res = await ctx.xhr.fetch(url, { method: 'GET', attachUserAgent: true, clean: true }, requester);
	const $ = ctx.cheerio.$load(await res.text());

	return $('[data-embed]').toArray().map((el) => ({
		language: 'en',
		fileName: $(el).text().trim() || 'Server',
		lazy: { id: encodeURIComponent($(el).attr('data-embed')!), label: $(el).attr('data-quality') },
		xhr: { flags: [], headers: {} }
	}));
}

// Resolve on play, purely from id + requester. Returns a normal source (has playlist, no lazy).
export async function resolveLazy(id: string, ctx: ProviderContext, requester: ScrapeRequester): Promise<InternalMediaSource | null> {
	const embedUrl = new URL(decodeURIComponent(id));
	const file = await extractM3u8(embedUrl, ctx, requester); // the expensive part
	if (!file) return null;
	return {
		language: 'en',
		fileName: 'Source',
		playlist: file,
		format: 'm3u8',
		xhr: { flags: ['REFERER_LOCKED'], headers: { Referer: embedUrl.origin } }
	};
}
```

Often `getStreams` and `getLazyStreams` share the same "list the servers" step and differ only in
whether they resolve. Factor the shared scrape into a helper imported by both files so they do not
drift.

## SERVER / CLIENT FLOW (engine behind a server, resolve on tap)

The engine is a stateful singleton on the scrape server. The client only talks HTTP, through a
**main server** that fronts the scrape server. A lazy source is JSON that travels to the client and
comes back. Both servers **return the resolved source as JSON — they do not redirect**. The client
resolves a source only when the user plays it and builds the (proxied) playback URL itself. Do NOT
302-redirect through the servers: it adds a hop for every viewer and a plain redirect cannot carry
`xhr.headers`.

```
CLIENT                       MAIN SERVER                     SCRAPE SERVER (holds GrabitManager)
 GET /play ...  ----------->  GET /sources ...  ----------->  manager.getStreams(req)  (lazy mode)
                              <----------- MediaSource[] (lazy handles) ------------------
 render list, user taps a lazy source
 GET /resolve?scheme&id --->  GET /sources/resolve/:scheme?id&media -----> manager.resolveLazySource
                              <----------- resolved MediaSource JSON --------------------
 <----------- resolved MediaSource JSON --------------------
 build the (proxied) URL from source.xhr and play it
```

Scrape server (returns JSON, never redirects):

```ts
const manager = await GrabitManager.create({ source: { /* ... */ }, lazy: process.env.LAZY === 'true' });

// Eager or lazy depending on config.lazy — same call site.
app.get('/api/sources/movies/:tmdbId', async (req, res) => {
	res.json(await manager.getStreams({ media: { type: 'movie', tmdbId: req.params.tmdbId }, targetLanguageISO: 'en', userAgent: req.get('user-agent'), userIP: req.ip }));
});

// Resolve one lazy handle. scheme in the path, id + media in the query. Returns JSON.
app.get('/api/sources/resolve/:scheme', async (req, res) => {
	const { id, tmdbID, season, episode, type } = req.query;
	const media = type === 'serie' ? { type, tmdbId: tmdbID, season: +season, episode: +episode } : { type: 'movie', tmdbId: tmdbID };
	const resolved = await manager.resolveLazySource(req.params.scheme, String(id), { media, targetLanguageISO: 'en', userAgent: req.get('user-agent'), userIP: req.ip });
	if (!resolved) return res.status(404).json({ error: 'Could not resolve source' });
	res.json(resolved);
});
```

Client (resolve on tap, then play with a client-side proxy). Many players expose a lazy hook for
exactly this — e.g. `react-native-cross-player`'s `lazyLoadSources` + `onLazyLoadSource(source)`,
which fires right before a source is used and returns the completed `{ source, format, options }`:

```ts
async function onLazyLoadSource(source) {
	if (source.url) return; // already resolved
	const resolved = await fetch(`/api/sources/resolve/${source.scheme}?id=${encodeURIComponent(source.lazyId)}&type=movie&tmdbID=${tmdbId}`).then((r) => r.json());
	// The player applies the proxy client-side from xhr.flags/xhr.headers — no server redirect.
	return { source: resolved.playlist, format: resolved.format, options: { useProxy: needsProxy(resolved.xhr.flags), headers: resolved.xhr.headers } };
}
```

The client must resend the media context (type, tmdbId, season/episode, language) on the resolve
call, because the scrape server rebuilds the requester from it. `resolveLazy` gets that requester for
proxy, UA, and headers. Keep the proxy on the client so `REFERER_LOCKED`/`IP_LOCKED` sources keep
their headers.

## TESTING (`--mode lazy`)

Validate the whole lazy flow with the `test-provider` CLI's lazy mode. It lists the handles via
`getLazyStreams` (fallback `getStreams`), then resolves one through `resolveLazy` — exactly what the
manager does in lazy mode, so you do not need to stand up a server to check it:

```bash
# list handles, then resolve the first
npx test-provider --scheme <scheme> --type movie --tmdb 27205 --mode lazy
# resolve every handle (proves each id is self-contained)
npx test-provider --scheme <scheme> --type movie --tmdb 27205 --mode lazy --resolve-all
# pick a specific handle, and always check series too
npx test-provider --scheme <scheme> --type serie --tmdb 1396 --season 1 --episode 1 --mode lazy --lazy-index 1
```

The **Lazy Handles** section must show handles with a `Lazy id` and no playlist; the **Resolved On
Play** section must show a real `Playlist`. If resolve returns null or the wrong URL, the id is not
carrying everything `resolveLazy` needs (re-read [the self-contained id rule](#the-one-rule-the-id-must-be-self-contained)).
Run the eager path too (`--mode streams`) so `getStreams` still works.

## VALIDATION

When `config.xhr.validateSources` is on, the engine HEAD-checks resolved sources. Lazy handles have
no URL yet, so `getLazyStreams` output is never validated or dead-link filtered before play.

## SECURITY: sign or allowlist the id

`lazy.id` round-trips through the client, so it is attacker-controllable. If `resolveLazy` builds a
fetch URL from it, a tampered id is an SSRF vector (it could point the server fetch or proxy at any
host). For anything public-facing, pick one:

- HMAC-sign the id on the way out and verify it in `resolveLazy` (stays stateless), or
- allowlist the resolved host against the provider's known domains, or
- keep the id opaque and map it to the real data in a server-side cache with a TTL.

For personal or educational use you can skip this.

## DEFINITION OF DONE

- Lazy workers live in `lazy.ts`: `getLazyStreams` returns handles that OMIT `playlist` and SET
  `lazy: { id }` (self-contained id); `resolveLazy` resolves from id + requester alone and returns a
  normal source or `null`.
- `getStreams` (eager) stays in `stream.ts`; both are passed to `defineProviderModule` in `index.ts`.
- Tested end to end with `test-provider --mode lazy` (handles listed, then resolved to a real
  playlist) for movie **and** series, and `--mode streams` still passes. For a server setup the
  manager runs with `lazy: true`, the scrape server's resolve endpoint returns a real playlist, and
  the client resolves on tap (JSON, no redirect) and plays. Note the SSRF handling in the `analysis/*.md` note.
```
