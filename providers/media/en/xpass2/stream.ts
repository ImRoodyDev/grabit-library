import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	createCookiesFromSet,
} from 'grabit-engine';
import { PROVIDER } from './config';

/** How many source entries we resolve into playable HLS URLs. */
const MAX_SOURCES = 8;

type Stream = { name: string; file: string };

/**
 * Stream handler for Xpass2 (play.xpass.top) — HTTP-first variant of `xpass`.
 *
 * The embed page server-renders the signed source-list URL (`var dataUrl="/data/…&sig=…"`),
 * so we can resolve everything over plain `ctx.xhr`:
 *   embed page -> `dataUrl` -> signed source list -> each `playlist.json` -> HLS `file`.
 * Only if `ctx.xhr` hits a Cloudflare gate do we solve the challenge and retry over `ctx.xhr`
 * with the earned cookies, so the provider stays universal (no direct puppeteer).
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const base = new URL(PROVIDER.config.baseUrl);
	const embedUrl = PROVIDER.createResourceURL(requester); // built from the entries pattern
	const referer = base.origin + '/';

	// --- 1. Plain HTTP first --------------------------------------------------
	const viaHttp = await resolveViaXhr(embedUrl, base, requester, ctx);
	if (viaHttp.streams && !viaHttp.cfBlocked) {
		if (viaHttp.streams.length) {
			ctx.log.info(`[xpass2] Resolved ${viaHttp.streams.length} HLS stream(s) via ctx.xhr (no browser).`);
			return toSources(viaHttp.streams, referer, base);
		}
		ctx.log.warn('[xpass2] ctx.xhr reached the source list but found no playable stream.');
		return [];
	}

	// --- 2. Cloudflare gate -> solve the challenge, then resolve over ctx.xhr ---
	ctx.log.info('[xpass2] Cloudflare gate on the HTTP path, solving the challenge.');
	const viaSolve = await resolveViaSolve(embedUrl, base, requester, ctx);
	if (!viaSolve.length) {
		ctx.log.warn('[xpass2] No playable stream after the challenge solve.');
		return [];
	}
	ctx.log.info(`[xpass2] Resolved ${viaSolve.length} HLS stream(s) via challenge solve.`);
	return toSources(viaSolve, referer, base);
}

// ─── HTTP path ────────────────────────────────────────────────────────────────

async function resolveViaXhr(
	embedUrl: URL,
	base: URL,
	requester: ScrapeRequester,
	ctx: ProviderContext,
): Promise<{ streams?: Stream[]; cfBlocked: boolean }> {
	const pageHeaders = { Referer: base.origin + '/', 'accept-language': 'en-US,en;q=0.9' };
	try {
		// Embed page -> the server-rendered `dataUrl`.
		const pageRes = await ctx.xhr.fetch(
			embedUrl,
			{ method: 'GET', attachUserAgent: true, clean: true, headers: pageHeaders },
			requester,
		);
		const html = await pageRes.text();
		if (pageRes.status === 403 || isCloudflare(html)) return { cfBlocked: true };

		const dataUrl = html.match(/var\s+dataUrl\s*=\s*["']([^"']+)["']/)?.[1];
		if (!dataUrl) {
			ctx.log.debug('[xpass2] No dataUrl in embed HTML.');
			return { streams: [], cfBlocked: false };
		}

		// The signed endpoints validate the embed-page Referer + the session cookie the
		// embed response sets (Referer=origin / no cookie returns an app-level 403 "Error").
		const cookie = createCookiesFromSet(pageRes.headers as any) || '';
		const apiHeaders: Record<string, string> = {
			Referer: embedUrl.href,
			'accept-language': 'en-US,en;q=0.9',
			'x-requested-with': 'XMLHttpRequest',
			...(cookie ? { cookie } : {}),
		};

		// Signed source list -> each playlist.json -> HLS files.
		return resolveFromDataUrl(dataUrl, base, apiHeaders, requester, ctx);
	} catch (error) {
		// A hard network/parse failure here is most likely the CF edge, let the solver try.
		ctx.log.debug(`[xpass2] HTTP path errored (${(error as Error).message}); treating as gated.`);
		return { cfBlocked: true };
	}
}

/** Resolve a signed `dataUrl` (source list) into HLS streams over ctx.xhr. Shared by the plain
 *  HTTP path and the post-solve path; only the auth headers/cookies differ. */
async function resolveFromDataUrl(
	dataUrl: string,
	base: URL,
	apiHeaders: Record<string, string>,
	requester: ScrapeRequester,
	ctx: ProviderContext,
): Promise<{ streams?: Stream[]; cfBlocked: boolean }> {
	const listRes = await ctx.xhr.fetch(
		new URL(dataUrl, base),
		{ method: 'GET', attachUserAgent: true, clean: true, headers: apiHeaders },
		requester,
	);
	const listText = await listRes.text();
	if (isCloudflare(listText)) return { cfBlocked: true };
	let sources: any[];
	try {
		sources = JSON.parse(listText);
	} catch {
		ctx.log.debug(`[xpass2] Source list not JSON (status ${listRes.status}): ${listText.slice(0, 80)}`);
		return { streams: [], cfBlocked: false };
	}
	if (!Array.isArray(sources)) return { streams: [], cfBlocked: false };

	// Each source -> its playlist.json -> HLS files.
	const streams: Stream[] = [];
	const seen = new Set<string>();
	for (const s of sources.slice(0, MAX_SOURCES)) {
		if (!s?.url) continue;
		try {
			const pjRes = await ctx.xhr.fetch(
				new URL(s.url, base),
				{ method: 'GET', attachUserAgent: true, clean: true, headers: apiHeaders },
				requester,
			);
			const pjText = await pjRes.text();
			if (isCloudflare(pjText)) return { cfBlocked: true };
			const files: { file: string; label?: string }[] = [];
			findFiles(JSON.parse(pjText), files);
			for (const f of files) {
				if (seen.has(f.file)) continue;
				seen.add(f.file);
				streams.push({ name: f.label || s.name || 'Xpass', file: f.file });
			}
		} catch {
			/* skip a bad source */
		}
	}
	return { streams, cfBlocked: false };
}

// ─── Cloudflare fallback: solve, then resolve over ctx.xhr with the earned cookies ──

async function resolveViaSolve(embedUrl: URL, base: URL, requester: ScrapeRequester, ctx: ProviderContext): Promise<Stream[]> {
	const solved = await ctx.solveChallenge(embedUrl, requester, { waitForCookie: 'cf_clearance' });
	const dataUrl = solved.html.match(/var\s+dataUrl\s*=\s*["']([^"']+)["']/)?.[1];
	if (!dataUrl) {
		ctx.log.debug('[xpass2] No dataUrl in the solved embed HTML.');
		return [];
	}
	// Reuse the cf_clearance + session cookies the solver earned for the signed endpoints.
	const apiHeaders: Record<string, string> = {
		Referer: embedUrl.href,
		'accept-language': 'en-US,en;q=0.9',
		'x-requested-with': 'XMLHttpRequest',
		...(solved.cookies ? { cookie: solved.cookies } : {}),
		...(solved.userAgent ? { 'User-Agent': solved.userAgent } : {}),
	};
	const res = await resolveFromDataUrl(dataUrl, base, apiHeaders, requester, ctx);
	return res.streams ?? [];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * True only for an actual Cloudflare *interstitial* (the "Just a moment" JS/managed
 * challenge). NOT triggered by the benign `challenge-platform` JSD script tag that
 * Cloudflare injects into normal pages — matching that would false-positive on the
 * real embed HTML and force an unnecessary puppeteer fallback.
 */
function isCloudflare(html: string): boolean {
	return /<title>\s*just a moment|__cf_chl_(?:f_)?tk|cf-browser-verification|cf_chl_opt/i.test(html);
}

/** Recursively collects `{file: "http…"}` entries (the HLS URLs) from a playlist.json. */
function findFiles(v: any, out: { file: string; label?: string }[]): void {
	if (Array.isArray(v)) return v.forEach((x) => findFiles(x, out));
	if (v && typeof v === 'object') {
		if (typeof v.file === 'string' && /^https?:\/\//.test(v.file)) out.push({ file: v.file, label: v.label });
		for (const k of Object.keys(v)) if (k !== 'file') findFiles(v[k], out);
	}
}

function toSources(streams: Stream[], referer: string, base: URL): InternalMediaSource[] {
	return streams.map(
		(s) =>
			({
				fileName: `${s.name}`,
				playlist: s.file,
				language: 'en',
				format: 'm3u8',
				xhr: { flags: ['CORS_BLOCKED'], headers: { Referer: referer, Origin: base.origin } },
			}) satisfies InternalMediaSource,
	);
}
