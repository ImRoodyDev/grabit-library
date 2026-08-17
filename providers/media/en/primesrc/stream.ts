import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	type CheerioLoadRequest,
} from 'grabit-engine';
import { dispatchEmbed } from '../../../extractors/embedDispatch';
import { PROVIDER } from './config';

/** Hosts grabit's embedDispatch can resolve — we prefer these when picking servers. */
const SUPPORTED = /filemoon|moon|streamwish|filelions|lions|swish|wish|mixdrop|dood|supervideo|dropload/i;
/** How many distinct embeds we resolve + extract per request. */
const MAX_EMBEDS = 5;

/**
 * Stream handler for PrimeSrc.
 *
 * PrimeSrc exposes a clean JSON API: `/api/v1/s?imdb=…&type=…` lists servers (each
 * with a `key`), and `/api/v1/l?key=…` resolves a key to its embed URL. Both sit
 * behind Cloudflare, so we solve the challenge once and call the API over `ctx.xhr`
 * with the earned cookies (no direct puppeteer, stays universal); the resolved embed
 * hosts (Filemoon / Streamwish / Mixdrop / Dood / …) are then dispatched to grabit's extractors.
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const base = new URL(PROVIDER.config.baseUrl);
	// The servers-API path built from the `entries` pattern (imdb + type [+ s/e]).
	const apiPath = (() => {
		const u = PROVIDER.createResourceURL(requester);
		return u.pathname + u.search;
	})();

	// The API sits behind Cloudflare. Solve once, then call it over ctx.xhr with the earned cookies.
	const solved = await ctx.solveChallenge(base, requester, { waitForCookie: 'cf_clearance' });
	const apiHeaders: Record<string, string> = {
		Referer: base.origin + '/',
		'x-requested-with': 'XMLHttpRequest',
		...(solved.cookies ? { cookie: solved.cookies } : {}),
		...(solved.userAgent ? { 'User-Agent': solved.userAgent } : {}),
	};

	// 1. Server list.
	const data = await ctx.xhr
		.fetchResponse<any>(new URL(apiPath, base), { method: 'GET', clean: true, headers: apiHeaders }, requester)
		.catch((error) => {
			ctx.log.warn(`[primesrc] Server list failed: ${(error as Error).message}`);
			return null;
		});
	const servers: any[] = Array.isArray(data?.servers) ? data.servers : [];
	if (!servers.length) {
		ctx.log.warn('[primesrc] No servers returned by the API.');
		return [];
	}

	// Prefer supported hosts; one key per host is enough.
	const seenHost = new Set<string>();
	const picks = servers.filter((s) => {
		if (!s?.key || !SUPPORTED.test(s.name || '')) return false;
		const h = (s.name || '').toLowerCase();
		if (seenHost.has(h)) return false;
		seenHost.add(h);
		return true;
	});

	// 2. Resolve each key -> embed URL.
	const embeds: { name: string; url: string }[] = [];
	for (const s of picks.slice(0, MAX_EMBEDS)) {
		try {
			const link = findUrl(
				await ctx.xhr.fetchResponse<any>(
					new URL(`/api/v1/l?key=${encodeURIComponent(s.key)}`, base),
					{ method: 'GET', clean: true, headers: apiHeaders },
					requester,
				),
			);
			if (link) embeds.push({ name: s.name, url: link });
		} catch {
			/* skip a bad key */
		}
	}
	if (!embeds.length) {
		ctx.log.warn(`[primesrc] ${servers.length} server(s) but no embed resolved.`);
		return [];
	}
	ctx.log.info(`[primesrc] Resolved ${embeds.length} embed(s): ${embeds.map((e) => e.name).join(', ')}`);

	// 3. Dispatch each embed host to its extractor.
	const results: InternalMediaSource[] = [];
	const opts: CheerioLoadRequest = { ...requester, extraHeaders: { Referer: base.origin + '/' } };
	for (const embed of embeds) {
		try {
			const sources = await dispatchEmbed(embed.url, opts, ctx, 'en');
			if (sources.length) results.push(...sources);
		} catch (error) {
			ctx.log.debug(`[primesrc] Extractor failed for ${embed.url}: ${(error as Error).message}`);
		}
	}

	ctx.log.info(`[primesrc] Returning ${results.length} source(s).`);
	return results;
}

/** Recursively find the first http(s) URL in a JSON value (the embed link). */
function findUrl(v: any): string | null {
	if (typeof v === 'string') return /^https?:\/\//.test(v) ? v : null;
	if (v && typeof v === 'object')
		for (const k of Object.keys(v)) {
			const u = findUrl(v[k]);
			if (u) return u;
		}
	return null;
}
