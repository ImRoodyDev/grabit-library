import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	type SerieMedia,
	deduplicateArray,
} from 'grabit-engine';
import { PROVIDER } from './config';

/**
 * Stream handler for Nepu.
 *
 * Fully HTTP-resolvable chain (no browser needed beyond one challenge solve):
 *   1. `/ajax/posts?q=` JSON search -> match by type + title -> watch/episode url
 *   2. watch page HTML -> the play button's `data-embed` id
 *   3. `POST /ajax/embed` (id=<embed id>) -> a <script> holding the manifest URLs
 *   4. take `plainManifestUrl` -> absolute `/ajax/hls?f=…&e=…&m=p&s=…`
 *
 * We use `plainManifestUrl`, not `opaqueManifestUrl`: the opaque variant's segment
 * URLs are encoded and only decodable by the page's custom Hls loader, while the
 * plain manifest's segments point directly at the CDN.
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const media = requester.media;
	const base = new URL(PROVIDER.config.baseUrl);
	const referer = base.origin + '/';

	const searchPaths = PROVIDER.createResourceUrls(requester).map((u) => u.pathname + u.search);
	const titles = deduplicateArray(
		[(media as any).title, ...((media as any).localizedTitles ?? [])].filter(Boolean),
	) as string[];
	// The search API tags series as "Shows".
	const wantType = media.type === 'movie' ? 'Movie' : 'Shows';
	const seasonEp =
		media.type === 'serie' ? { season: (media as SerieMedia).season, episode: (media as SerieMedia).episode } : null;

	const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
	const want = titles.map(norm);

	// The site is Cloudflare-gated; solve once, then run the whole chain over ctx.xhr.
	const solved = await ctx.solveChallenge(base, requester, { waitForCookie: 'cf_clearance' });
	const headers: Record<string, string> = {
		Referer: referer,
		...(solved.cookies ? { cookie: solved.cookies } : {}),
		...(solved.userAgent ? { 'User-Agent': solved.userAgent } : {}),
	};
	const ajaxHeaders = { ...headers, 'x-requested-with': 'XMLHttpRequest' };
	ctx.log.info('[nepu] Ajax headers:', ajaxHeaders);

	// 1. Search -> the watch/episode url.
	let found: { name: string; videoUrl: string } | null = null;
	for (const path of searchPaths) {
		const data = await ctx.xhr
			.fetchResponse<any>(new URL(path, base), { method: 'GET', clean: true, headers: ajaxHeaders }, requester)
			.catch(() => null);
		const items = (data?.data || []).filter((i: any) => i && i.type === wantType);
		// `name` carries the year ("Breaking Bad (2008)"), `second_name` is the clean title.
		const show = items.find((i: any) => want.includes(norm(i.name)) || want.includes(norm(i.second_name))) || items[0];
		if (show) {
			const videoUrl = seasonEp ? `${show.url}/season/${seasonEp.season}/episode/${seasonEp.episode}` : show.url;
			found = { name: show.name, videoUrl };
			break;
		}
	}
	if (!found) {
		ctx.log.warn('[nepu] No matching item found.');
		return [];
	}
	ctx.log.info(`[nepu] Best match: "${found.name}" -> ${found.videoUrl}`);

	// 2. Watch page -> the play button's `data-embed` id.
	const watchUrl = new URL(found.videoUrl, base);
	const watchHtml = await ctx.xhr
		.fetch(watchUrl, { method: 'GET', attachUserAgent: true, clean: true, headers }, requester)
		.then((r) => r.text())
		.catch(() => '');
	const embedId = ctx.cheerio.$load(watchHtml)('[data-embed]').first().attr('data-embed');
	if (!embedId) {
		ctx.log.warn('[nepu] No data-embed id on the watch page.');
		return [];
	}

	// 3. Resolve the id -> a <script> carrying the manifest URLs.
	const embedHtml = await ctx.xhr
		.fetch(
			new URL('/ajax/embed', base),
			{
				method: 'POST',
				attachUserAgent: true,
				clean: true,
				// This endpoint rejects Impit's TLS fingerprint, so use native fetch here.
				useImpit: false,
				// It also 403s without the Origin/accept pair the page itself sends.
				headers: {
					...ajaxHeaders,
					Referer: watchUrl.href,
					Origin: base.origin,
					accept: '*/*',
					'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
				},
				body: `id=${encodeURIComponent(embedId)}`,
			},
			requester,
		)
		.then((r) => r.text())
		.catch(() => '');

	// 4. Prefer the plain manifest: the opaque one's segments need the page's custom decoder.
	const manifest =
		embedHtml.match(/plainManifestUrl\s*=\s*"([^"]+)"/)?.[1] ??
		embedHtml.match(/opaqueManifestUrl\s*=\s*"([^"]+)"/)?.[1];
	if (!manifest) {
		ctx.log.warn('[nepu] No manifest URL in the embed response.');
		return [];
	}
	// The script escapes the query separators (&), so decode before building the URL.
	const playlist = new URL(manifest.replace(/\\u0026/g, '&'), base).href;
	ctx.log.info(`[nepu] Resolved HLS: ${playlist}`);

	return [
		{
			fileName: found.name ?? (media as any).title,
			playlist,
			language: 'en',
			format: 'm3u8',
			xhr: { flags: ['CORS_BLOCKED', 'REFERER_LOCKED'], headers: { Origin: base.origin, Referer: watchUrl.href } },
		} satisfies InternalMediaSource,
	];
}
