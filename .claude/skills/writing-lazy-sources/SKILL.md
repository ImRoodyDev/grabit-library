---
name: writing-lazy-sources
description: >-
  Add lazy (deferred) stream resolution to a grabit-library provider. Return cheap
  handles from getStreams and resolve the playable URL only on play via resolveLazy.
  Use when listing servers is cheap but resolving each to a playable URL is expensive
  (extra fetches, an embed hop, or a browser), or when the engine runs behind a server
  and the client resolves a source on demand. Covers the types contract, the
  self-contained id rule, wiring, validation, and the server/client flow.
---

# Writing lazy sources

## WHAT THIS IS

A **lazy source** is a placeholder a provider returns from `getStreams` instead of a fully
resolved stream. It carries a small `lazy: { id }` handle and no `playlist`. The host shows the
list immediately and calls the provider's `resolveLazy(id, ctx, requester)` only when the user
plays that source, at which point you do the expensive work and return the real playlist.

Use lazy sources when:

- Listing servers is cheap but each server needs extra fetches, an embed hop, or a browser to
  reach a playable URL. Resolve only the one the user picks, not all of them.
- The engine runs on a server and the client resolves a source on demand over HTTP.

This skill extends [[write-grabit-provider]]. Read that first for the base provider rules.

Keep code comments short and simple (max 2 lines, only where intent is not obvious), and avoid
long dashes (em dashes) or divider lines inside comments.

## THE CONTRACT (types)

- **`getStreams`** returns `InternalMediaSource[]`. A lazy entry OMITS `playlist` and SETS
  `lazy: { id: string, label?: string }`. It still needs `language`, `fileName`, and `xhr`.
- **`resolveLazy(id, ctx, requester)`** returns a NORMAL `InternalMediaSource` (real `playlist`,
  no `lazy`), or `null` when it cannot resolve.
- The engine wrapper adds `scheme`, `providerName`, the User-Agent, and the display `fileName` to
  both, so the host receives `source.scheme` and `source.lazy.id` for the resolve call.
- On the output `MediaSource`, `playlist` is optional and `lazy` is present, so the host can do
  `if (source.lazy) resolve() else play(source.playlist)`.

## THE ONE RULE: the id must be self-contained

`resolveLazy` runs in a SEPARATE call from `getStreams`. When the engine sits behind a server the
two calls are different HTTP requests, and even in-process you should not rely on state left in
memory by the list call. So `lazy.id` must carry everything `resolveLazy` needs (an embed URL, a
token, an episode key) to resolve on its own. Pack it into the id; do not stash it in a
module-level variable.

## WIRING

`getStreams` and `resolveLazy` both live in `stream.ts`. Wire `resolveLazy` in `index.ts`:

```ts
export default defineProviderModule(PROVIDER, manifest.providers['<scheme>'], { getStreams, resolveLazy });
```

## SKELETON

```ts
// stream.ts
import type { InternalMediaSource, ScrapeRequester, ProviderContext } from 'grabit-engine';
import { PROVIDER } from './config';

// Cheap list: one lazy handle per server. Pack the embed URL into the id so resolveLazy
// can resolve it standalone. No playlist yet.
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
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

## SERVER / CLIENT FLOW (engine behind a server)

The engine is a stateful singleton on the server (providers + browser pool). The client only
talks HTTP. A lazy source is JSON that travels to the client and comes back.

```
CLIENT                          SERVER (holds the GrabitManager singleton)
  POST /streams {media}  ------>  manager.getStreams(req)   -> MediaSource[] JSON
  render list, user taps a lazy source
  POST /streams/resolve  ------>  manager.resolveLazySource(scheme, id, req) -> resolved JSON
  play resolved.playlist
```

Server:

```ts
const manager = await GrabitManager.create({ source: { /* ... */ }, autoInit: true });

app.post('/api/streams', async (req, res) => {
	const { media, targetLanguageISO = 'en' } = req.body;
	res.json(await manager.getStreams({ media, targetLanguageISO, userAgent: req.get('user-agent'), userIP: req.ip }));
});

app.post('/api/streams/resolve', async (req, res) => {
	const { scheme, id, media, targetLanguageISO = 'en' } = req.body;
	const resolved = await manager.resolveLazySource(scheme, id, { media, targetLanguageISO, userAgent: req.get('user-agent'), userIP: req.ip });
	if (!resolved) return res.status(404).json({ error: 'Could not resolve source' });
	res.json(resolved);
});
```

Client:

```ts
async function play(source, media) {
	const playable = source.lazy
		? await fetch('/api/streams/resolve', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ scheme: source.scheme, id: source.lazy.id, media, targetLanguageISO: 'en' })
		  }).then((r) => r.json())
		: source;
	player.load(playable.playlist, { headers: playable.xhr.headers });
}
```

The client must resend the media context (type, tmdbId, season/episode, language) on the resolve
call, because the server rebuilds the requester from it. `resolveLazy` gets that requester for
proxy, UA, and headers.

## VALIDATION

When `config.xhr.validateSources` is on, the engine HEAD-checks each source's playlist. Lazy
sources have no URL yet, so the engine skips them. You do not need to guard this yourself, but
know that a lazy source is never dead-link filtered before play.

## SECURITY: sign or allowlist the id

`lazy.id` round-trips through the client, so it is attacker-controllable. If `resolveLazy` builds
a fetch URL from it, a tampered id is an SSRF vector (it could point the server fetch or proxy at
any host). For anything public-facing, pick one:

- HMAC-sign the id on the way out and verify it in `resolveLazy` (stays stateless), or
- allowlist the resolved host against the provider's known domains, or
- keep the id opaque and map it to the real data in a server-side cache with a TTL.

For personal or educational use you can skip this.

## DEFINITION OF DONE

- `getStreams` returns lazy handles that OMIT `playlist` and SET `lazy: { id }`; the id is
  self-contained.
- `resolveLazy` resolves from id + requester alone and returns a normal source or `null`.
- `resolveLazy` is wired into `defineProviderModule`.
- Tested end to end with `test-provider` (streams list, then a resolve), and for a server setup
  the resolve endpoint returns a real playlist. Note the SSRF handling in the `analysis/*.md` note.
```
