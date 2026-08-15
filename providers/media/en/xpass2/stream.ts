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
 * Only if `ctx.xhr` hits a Cloudflare gate do we fall back to `ctx.puppeteer`.
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

	// --- 2. Cloudflare gate -> puppeteer fallback -----------------------------
	ctx.log.info('[xpass2] Cloudflare gate on the HTTP path — falling back to ctx.puppeteer.');
	const viaBrowser = await resolveViaPuppeteer(embedUrl, requester, ctx);
	if (!viaBrowser.length) {
		ctx.log.warn('[xpass2] No playable stream after the puppeteer fallback.');
		return [];
	}
	ctx.log.info(`[xpass2] Resolved ${viaBrowser.length} HLS stream(s) via puppeteer fallback.`);
	return toSources(viaBrowser, referer, base);
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

		// Signed source list.
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
	} catch (error) {
		// A hard network/parse failure here is most likely the CF edge — let puppeteer try.
		ctx.log.debug(`[xpass2] HTTP path errored (${(error as Error).message}); treating as gated.`);
		return { cfBlocked: true };
	}
}

// ─── Puppeteer fallback ─────────────────────────────────────────────────────

async function resolveViaPuppeteer(embedUrl: URL, requester: ScrapeRequester, ctx: ProviderContext): Promise<Stream[]> {
	let session: Awaited<ReturnType<ProviderContext['puppeteer']['launch']>> | null = null;
	try {
		session = await ctx.puppeteer.launch(embedUrl, {
			requester,
			browsingOptions: { ignoreError: true, loadCriteria: 'networkidle2' },
		});
		const result = (await session.page.evaluate(async (maxSources: number) => {
			const html = document.documentElement.outerHTML;
			const dataUrl = (html.match(/var\s+dataUrl\s*=\s*["']([^"']+)["']/) || [])[1];
			if (!dataUrl) return { streams: [] as any[] };
			const list = await (await fetch(dataUrl)).json();
			const sources: any[] = Array.isArray(list) ? list : [];
			const findFiles = (v: any, out: any[]) => {
				if (Array.isArray(v)) return v.forEach((x) => findFiles(x, out));
				if (v && typeof v === 'object') {
					if (typeof v.file === 'string' && /^https?:\/\//.test(v.file)) out.push({ file: v.file, label: v.label });
					for (const k of Object.keys(v)) if (k !== 'file') findFiles(v[k], out);
				}
			};
			const streams: any[] = [];
			const seen = new Set<string>();
			for (const s of sources.slice(0, maxSources)) {
				if (!s?.url) continue;
				try {
					const files: any[] = [];
					findFiles(await (await fetch(s.url)).json(), files);
					for (const f of files) {
						if (seen.has(f.file)) continue;
						seen.add(f.file);
						streams.push({ name: f.label || s.name || 'Xpass', file: f.file });
					}
				} catch {
					/* skip */
				}
			}
			return { streams };
		}, MAX_SOURCES)) as { streams: Stream[] };
		return result.streams || [];
	} catch (error) {
		ctx.log.error(`[xpass2] Puppeteer fallback failed: ${(error as Error).message}`);
		return [];
	} finally {
		await session?.page.close().catch(() => null);
	}
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
				xhr: { flags: ['cors-blocked'], headers: { Referer: referer, Origin: base.origin } },
			}) satisfies InternalMediaSource,
	);
}
