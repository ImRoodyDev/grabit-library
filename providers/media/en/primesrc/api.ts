import type { ScrapeRequester, ProviderContext } from 'grabit-engine';
import { createCookiesFromSet, joinCookies } from 'grabit-engine';
import { PROVIDER } from './config';

/**
 * Single-host cookie jar built on the engine's cookie helpers (joinCookies /
 * createCookiesFromSet). The engine's CookieJar CLASS is not reachable from a provider bundle
 * (the bundler shim only re-exports provider-safe modules; httpControls is excluded), and one
 * scrape run only ever talks to primesrc.me, so a merged cookie string is all we need.
 */
export type CookieJar = { header(): string; bank(cookies: string): void; bankSetCookie(headers: Headers): void };
function createCookieJar(): CookieJar {
	let cookies = '';
	return {
		header: () => cookies,
		bank: (newCookies) => {
			if (newCookies) cookies = joinCookies(cookies, newCookies);
		},
		bankSetCookie: (headers) => {
			const set = createCookiesFromSet(headers);
			if (set) cookies = joinCookies(cookies, set);
		},
	};
}

/** Hosts grabit's embedDispatch can resolve — we prefer these when picking servers. */
export const SUPPORTED = /filemoon|moon|streamwish|filelions|lions|swish|wish|mixdrop|dood|supervideo|dropload/i;
/** How many distinct embeds we resolve + extract per request. */
export const MAX_EMBEDS = 5;

export type PrimeServer = { name: string; key: string };

/** Real CF interstitial markers only (not the benign /cdn-cgi JSD script). */
function isCloudflareChallenge(html: string): boolean {
	return /<title>\s*just a moment|__cf_chl_(?:f_)?tk|cf-browser-verification|cf_chl_opt/i.test(html);
}

/** Minimal HTML entity decode for JSON rendered inside a browser <pre>. */
function decodeEntities(s: string): string {
	return s
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#0?34;/g, '"')
		.replace(/&#0?39;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>');
}

/** Parse a JSON API body, unwrapping the <pre>…</pre> a browser wraps a raw JSON response in. */
function parseJson(body: string): any {
	if (!body) return null;
	try {
		return JSON.parse(body);
	} catch {
		/* not raw JSON — maybe browser-rendered */
	}
	const pre = body.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i)?.[1];
	if (pre) {
		try {
			return JSON.parse(decodeEntities(pre));
		} catch {
			/* give up */
		}
	}
	return null;
}

/** Recursively find the first http(s) URL in a JSON value (the embed link). */
function findUrl(value: any): string | null {
	if (typeof value === 'string') return /^https?:\/\//.test(value) ? value : null;
	if (value && typeof value === 'object')
		for (const key of Object.keys(value)) {
			const url = findUrl(value[key]);
			if (url) return url;
		}
	return null;
}

/** Pull the embed URL out of a resolve body (JSON, browser-wrapped JSON, or a challenge page). */
function urlFromBody(body: string): string | null {
	const json = parseJson(body);
	if (json) {
		const u = findUrl(json);
		if (u) return u;
	}
	// Browser-rendered / non-JSON: take the first external URL that isn't the site or CF.
	for (const raw of body.match(/https?:\/\/[^\s"'<>\\]+/g) ?? []) {
		const u = raw.replace(/\\u0026/gi, '&');
		if (/primesrc\.me|challenges\.cloudflare|cdn-cgi/i.test(u)) continue;
		return u;
	}
	return null;
}

/**
 * GET a primesrc API endpoint and return its body text.
 *
 * A failed status code does NOT mean an empty body: primesrc's API endpoints sit behind a
 * per-endpoint Cloudflare managed challenge that answers with 403 + the "Just a moment" HTML.
 * We read the body regardless of status; if it is that interstitial, we OPEN the same URL
 * top-level via solveChallenge (a real navigation auto-clears the managed challenge) and read
 * the resolved body from `solved.html`.
 */
async function fetchApiBody(
	url: URL,
	headers: Record<string, string>,
	requester: ScrapeRequester,
	ctx: ProviderContext,
): Promise<string> {
	const res = await ctx.xhr.fetch(url, { method: 'GET', clean: true, headers }, requester).catch(() => null);
	const body = res ? await res.text().catch(() => '') : '';
	if (body && !isCloudflareChallenge(body)) return body;

	try {
		const solved = await ctx.solveChallenge(url, requester, { waitForCookie: 'cf_clearance', headers });
		return solved.html ?? body;
	} catch (error) {
		ctx.log.debug(`[primesrc] solve fallback failed for ${url.pathname}: ${(error as Error).message}`);
		return body;
	}
}

/** Build the API request context: solved cookies/UA + the embed-page Referer the API expects. */
export async function primeApi(requester: ScrapeRequester, ctx: ProviderContext) {
	const base = new URL(PROVIDER.config.baseUrl);
	const apiUrl = PROVIDER.createResourceURL(requester);

	// The API is called from the embed page, so mirror its URL as the Referer.
	const imdb = apiUrl.searchParams.get('imdb') ?? '';
	const kind = apiUrl.searchParams.get('type') === 'tv' ? 'tv' : 'movie';
	const season = apiUrl.searchParams.get('season');
	const episode = apiUrl.searchParams.get('episode');
	const referer = new URL(`/embed/${kind}`, base);
	if (imdb) referer.searchParams.set('imdb', imdb);
	if (kind === 'tv' && season && episode) {
		referer.searchParams.set('season', season);
		referer.searchParams.set('episode', episode);
	}

	const solved = await ctx.solveChallenge(base, requester, { waitForCookie: 'cf_clearance' });
	const headers: Record<string, string> = {
		Referer: referer.href,
		'x-requested-with': 'XMLHttpRequest',
		...(solved.cookies ? { cookie: solved.cookies } : {}),
		...(solved.userAgent ? { 'User-Agent': solved.userAgent } : {}),
	};

	ctx.log.debug(
		`[primesrc] API context: ${Object.entries(headers)
			.map(([k, v]) => `${k}: ${v}`)
			.join('\n')}`,
	);
	// A jar shared across the run's resolveEmbed calls: the clearance the first embed solve
	// earns is banked here and reused (over xhr) for the rest, so we solve once, not per key.
	return { base, apiUrl, headers, jar: createCookieJar() };
}

/** Fetch the server list. Returns supported hosts (one key per host, capped at MAX_EMBEDS). */
export async function getServerList(
	apiUrl: URL,
	headers: Record<string, string>,
	requester: ScrapeRequester,
	ctx: ProviderContext,
): Promise<PrimeServer[]> {
	const body = await fetchApiBody(apiUrl, headers, requester, ctx);
	const json = parseJson(body);
	const servers: any[] = Array.isArray(json?.servers) ? json.servers : [];
	if (!servers.length) {
		ctx.log.warn('[primesrc] No servers returned by the API.');
		return [];
	}
	ctx.log.debug(`[primesrc] servers returned: ${servers.map((s) => s.name).join(', ')}`);

	const seenHost = new Set<string>();
	const picks: PrimeServer[] = [];
	for (const s of servers) {
		if (!s?.key || !SUPPORTED.test(s.name || '')) continue;
		const host = String(s.name).toLowerCase();
		if (seenHost.has(host)) continue;
		seenHost.add(host);
		picks.push({ name: s.name, key: s.key });
		if (picks.length >= MAX_EMBEDS) break;
	}
	return picks;
}

/**
 * Resolve one server key to its embed URL.
 *
 * /api/v1/l rejects the main-page cookie + `x-requested-with`, so we drop both and use only the
 * embed-endpoint clearance. The first key solves the challenge and banks its cookie in `jar`;
 * the rest reuse that cookie over `ctx.xhr` (no browser) and only re-solve if it stopped working.
 */
export async function resolveEmbed(
	key: string,
	base: URL,
	headers: Record<string, string>,
	jar: CookieJar,
	requester: ScrapeRequester,
	ctx: ProviderContext,
): Promise<string | null> {
	const url = new URL(`/api/v1/l?key=${encodeURIComponent(key)}`, base);
	// Clean headers for this endpoint: Referer + UA only (no main-page cookie, no x-requested-with).
	const resolveHeaders: Record<string, string> = {
		...(headers['User-Agent'] ? { 'User-Agent': headers['User-Agent'] } : {}),
	};

	// Fast path: reuse the clearance a prior embed solve earned for this endpoint (no browser).
	const banked = jar.header();
	if (banked) {
		ctx.log.debug(`[primesrc] Reusing embed clearance for key ${key}: ${banked}`);
		const res = await ctx.xhr
			.fetch(url, { method: 'GET', clean: true, headers: { ...resolveHeaders, cookie: banked } }, requester)
			.catch(() => null);
		if (res) jar.bankSetCookie(res.headers);
		const body = res ? await res.text().catch(() => '') : '';

		if (body && !isCloudflareChallenge(body)) {
			ctx.log.info(`[primesrc] Embed clearance worked for key ${key}.`);
			const link = urlFromBody(body);
			if (link) return link;
		}

		ctx.log.debug(`[primesrc] Embed clearance failed for key ${key}, falling back to CF-solve.`);
	}

	// Slow path: solve the endpoint's challenge, then bank its cookie for the next keys.
	const solved = await ctx.solveChallenge(url, requester, { headers: resolveHeaders });
	if (solved.cookies) {
		ctx.log.debug(`[primesrc] Solved embed challenge for key ${key}: ${solved.cookies}`);
		jar.bank(solved.cookies);
	}
	ctx.log.debug(`[primesrc] Banked embed clearance: ${solved.cookies ? 'yes' : 'none'}`);
	return urlFromBody(solved.html);
}
