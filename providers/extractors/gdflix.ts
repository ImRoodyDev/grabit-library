import {
	type InternalMediaSource,
	type ProviderContext,
	type ScrapeRequester,
	type MediaSource,
} from 'grabit-engine';

export interface GdflixMeta {
	fileName?: string;
	language: string;
	quality?: string;
}

const GDFLIX_UA =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0';

/**
 * Fetches a page as text, falling back to a real browser session on a Cloudflare
 * 403, reusing any earned cookie for later same-origin hops.
 */
async function fetchTextWithCloudflareFallback(
	target: URL,
	requester: ScrapeRequester,
	ctx: ProviderContext,
	cookieJar: { cookie: string },
): Promise<string | null> {
	const headers: Record<string, string> = {
		'User-Agent': GDFLIX_UA,
		Referer: target.origin + '/',
		...(cookieJar.cookie ? { cookie: cookieJar.cookie } : {}),
	};
	try {
		const res = await ctx.xhr.fetch(target, { method: 'GET', attachUserAgent: true, clean: true, headers }, requester);
		if (res.status !== 403) return await res.text().catch(() => null);
		ctx.log.warn(`[gdflix] Cloudflare 403 for ${target.href}, using browser session.`);
	} catch (error) {
		ctx.log.warn(`[gdflix] xhr fetch failed for ${target.href} (${(error as Error).message}), using browser.`);
	}

	let session: Awaited<ReturnType<ProviderContext['puppeteer']['launch']>> | null = null;
	try {
		session = await ctx.puppeteer.launch(target, {
			requester,
			browsingOptions: { ignoreError: true, loadCriteria: 'networkidle0' },
		});
		const html = await session.page.content();
		try {
			const cookies = await session.page.cookies();
			const str = cookies.map((c: any) => `${c.name}=${c.value}`).join('; ');
			if (str) cookieJar.cookie = str;
		} catch {
			/* best-effort */
		}
		return html;
	} catch (error) {
		ctx.log.error(`[gdflix] Browser fallback failed for ${target.href}: ${(error as Error).message}`);
		return null;
	} finally {
		await session?.page.close().catch(() => null);
	}
}

/**
 * Resolves a GDFlix file page into playable download URLs.
 *
 * Ported from vega-providers `extractors/gdflix.ts`. Covers the two reliable,
 * FormData-free paths — **ResumeCloud** (`.btn-secondary` → `.btn-success`) and
 * **G-Drive/Instant** (`.btn-danger` HEAD redirect). The token-POST paths
 * (indexbot / instant-keys) are skipped: they need `FormData`, which React
 * Native's Hermes runtime doesn't provide.
 */
export async function extractGdflixStreams(
	link: string | URL,
	requester: ScrapeRequester,
	ctx: ProviderContext,
	meta: GdflixMeta,
): Promise<InternalMediaSource[]> {
	const startURL = typeof link === 'string' ? new URL(link) : link;
	const baseUrl = startURL.origin;
	const cookieJar = { cookie: '' };
	ctx.log.debug(`[gdflix] Resolving: ${startURL.href}`);

	let html = await fetchTextWithCloudflareFallback(startURL, requester, ctx, cookieJar);
	if (!html) {
		ctx.log.warn('[gdflix] Could not load the GDFlix page.');
		return [];
	}

	let $ = ctx.cheerio.$load(html);

	// Some GDFlix pages bounce through an onload `location.replace('…')`.
	const onload = $('body').attr('onload') || '';
	const replaced = onload.includes('location.replace') ? onload.split("location.replace('")?.[1]?.split("'")?.[0] : '';
	if (replaced) {
		const next = await fetchTextWithCloudflareFallback(new URL(replaced, baseUrl), requester, ctx, cookieJar);
		if (next) $ = ctx.cheerio.$load(next);
	}

	const raw: { server: string; url: string }[] = [];

	// --- ResumeCloud: .btn-secondary -> page -> .btn-success ---
	try {
		const resumeHref = $('.btn-secondary').attr('href') || '';
		if (resumeHref && !resumeHref.includes('indexbot')) {
			const resumeURL = new URL(resumeHref, baseUrl);
			const resumeHtml = await fetchTextWithCloudflareFallback(resumeURL, requester, ctx, cookieJar);
			if (resumeHtml) {
				const link = ctx.cheerio.$load(resumeHtml)('.btn-success').attr('href');
				if (link) raw.push({ server: 'ResumeCloud', url: new URL(link, resumeURL.origin).href });
			}
		}
	} catch (error) {
		ctx.log.debug(`[gdflix] ResumeCloud failed: ${(error as Error).message}`);
	}

	// --- G-Drive / Instant: .btn-danger HEAD redirect (?url= unwrap) ---
	try {
		const seed = $('.btn-danger').attr('href') || '';
		if (seed && !seed.includes('?url=')) {
			const res = await ctx.xhr.fetch(
				new URL(seed, baseUrl),
				{ method: 'HEAD', attachUserAgent: true, clean: true, headers: { 'User-Agent': GDFLIX_UA }, redirect: 'manual' },
				requester,
			);
			const loc = res.headers.get('location') || (res.url && res.url !== seed ? res.url : '');
			const final = loc.split('?url=')[1] || loc || seed;
			if (final) raw.push({ server: 'G-Drive', url: final });
		}
	} catch (error) {
		ctx.log.debug(`[gdflix] G-Drive failed: ${(error as Error).message}`);
	}

	ctx.log.info(`[gdflix] Resolved ${raw.length} link(s).`);
	const label = [meta.fileName, meta.quality].filter(Boolean).join(' ').trim() || 'GDFlix';
	return raw.map((r) => {
		const format = guessFormat(r.url);
		return {
			fileName: `[${r.server}] ${label}`.trim(),
			playlist: r.url,
			language: meta.language,
			...(format ? { format } : {}),
			xhr: { flags: ['CORS_BLOCKED'], headers: { 'User-Agent': GDFLIX_UA } },
		} satisfies InternalMediaSource;
	});
}

function guessFormat(url: string): MediaSource['format'] | undefined {
	const l = url.toLowerCase();
	if (l.includes('.m3u8')) return 'm3u8';
	if (l.includes('.mkv')) return 'mkv';
	if (l.includes('.mp4')) return 'mp4';
	return undefined;
}
