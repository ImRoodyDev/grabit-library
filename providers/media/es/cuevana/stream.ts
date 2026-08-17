import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	type CheerioLoadRequest,
	type SerieMedia,
	deduplicateArray,
} from 'grabit-engine';
import { extractStreamwishStreams } from '../../../extractors/streamwish';
import { extractDoodstreamStreams } from '../../../extractors/doodstream';
import { extractFilemoonStreams } from '../../../extractors/filemoon';
import { extractMixdropStream } from '../../../extractors/mixdrop';
import { extractSupervideoStreams } from '../../../extractors/supervideo';
import { pickBestPost } from '../../../extractors/postMatch';
import { PROVIDER } from './config';

const MAX_EMBEDS = 6;

type SearchPost = { title: string; link: string; image: string };

/**
 * Stream handler for Cuevana (Spanish / Latino).
 *
 * Flow: search by (Spanish) title -> best-match watch page -> (series: pick the
 * SxE episode page) -> read the language submenus for embed URLs -> dispatch each
 * embed host to its extractor.
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const media = requester.media;

	const pageOpt: CheerioLoadRequest = {
		...requester,
		followRedirects: true,
		extraHeaders: {
			accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			'accept-language': 'es-ES,es;q=0.9,en;q=0.8',
			Referer: PROVIDER.config.baseUrl + '/',
		},
	};

	// --- 1. Search (prefer the Spanish localized title) --------------------
	// `createResourceUrls` expands the `/search/{title:uri}/` entry; since the
	// provider language is `es` and the media's original language differs, its
	// auto-selection tries the Spanish localized title first.
	let posts: SearchPost[] = [];
	for (const url of PROVIDER.createResourceUrls(requester)) {
		posts = await searchPosts(url, requester, ctx, pageOpt);
		if (posts.length > 0) break;
	}
	if (posts.length === 0) {
		ctx.log.warn('[cuevana] No search results.');
		return [];
	}

	// --- 2. Best match -----------------------------------------------------
	const best = pickBestPost(posts, media, 40);
	if (!best) {
		ctx.log.warn('[cuevana] No post cleared the match threshold.');
		return [];
	}
	ctx.log.info(`[cuevana] Best match: "${best.post.title}" (score ${best.score}) -> ${best.post.link}`);

	// --- 3. Resolve to the watch page (episode page for series) ------------
	let watchUrl = new URL(best.post.link, `${PROVIDER.config.baseUrl}/`);
	if (media.type === 'serie') {
		const epUrl = await fetchEpisodeUrl(watchUrl, media as SerieMedia, requester, ctx, pageOpt);
		if (!epUrl) {
			ctx.log.warn('[cuevana] Could not find the requested episode page.');
			return [];
		}
		watchUrl = epUrl;
	}

	// --- 4. Collect embed URLs from the language submenus ------------------
	const embeds = await getEmbedUrls(watchUrl, requester, ctx, pageOpt);
	if (embeds.length === 0) {
		ctx.log.warn('[cuevana] No embed URLs on the watch page.');
		return [];
	}
	ctx.log.info(`[cuevana] ${embeds.length} embed(s): ${[...new Set(embeds.map((e) => hostOf(e)))].join(', ')}`);

	// --- 5. Dispatch each embed to its extractor ---------------------------
	const results: InternalMediaSource[] = [];
	const extractOpt: CheerioLoadRequest = { ...requester, extraHeaders: { Referer: watchUrl.origin + '/' } };
	for (const embed of embeds.slice(0, MAX_EMBEDS)) {
		try {
			const sources = await dispatch(embed, extractOpt, ctx);
			if (sources.length) results.push(...sources);
		} catch (error) {
			ctx.log.debug(`[cuevana] Extractor failed for ${embed}: ${(error as Error).message}`);
		}
	}

	ctx.log.info(`[cuevana] Returning ${results.length} source(s).`);
	return results;
}

// ─── Search ──────────────────────────────────────────────────────────────────

async function searchPosts(
	url: URL,
	requester: ScrapeRequester,
	ctx: ProviderContext,
	pageOpt: CheerioLoadRequest,
): Promise<SearchPost[]> {
	const baseUrl = PROVIDER.config.baseUrl;
	try {
		const { $ } = await ctx.cheerio.load(url, pageOpt, ctx.xhr);
		const posts: SearchPost[] = [];
		const seen = new Set<string>();
		$('.TPost').each((_: number, el: any) => {
			const card = $(el);
			const href = card.find('a[href]').first().attr('href') || card.closest('a').attr('href');
			const title = card.find('.Title').first().text().trim();
			if (!href || !title) return;
			const link = new URL(href, `${baseUrl}/`).href;
			if (seen.has(link)) return;
			seen.add(link);
			posts.push({ title, link, image: card.find('img').first().attr('src') || '' });
		});
		ctx.log.debug(`[cuevana] Search ${url.href} -> ${posts.length} hit(s).`);
		return posts;
	} catch (error) {
		ctx.log.warn(`[cuevana] Search failed for ${url.href}: ${(error as Error).message}`);
		return [];
	}
}

/** Series: on the show page, follow the link whose `.Year` reads "SxE". */
async function fetchEpisodeUrl(
	pageUrl: URL,
	media: SerieMedia,
	requester: ScrapeRequester,
	ctx: ProviderContext,
	pageOpt: CheerioLoadRequest,
): Promise<URL | null> {
	try {
		const { $ } = await ctx.cheerio.load(pageUrl, pageOpt, ctx.xhr);
		const want = `${media.season}x${media.episode}`;
		let href: string | undefined;
		$('.TPost').each((_: number, el: any) => {
			if (href) return;
			const year = $(el).find('.Year').first().text().trim();
			if (year === want) href = $(el).find('a[href]').first().attr('href') || $(el).closest('a').attr('href');
		});
		return href ? new URL(href, pageUrl.origin) : null;
	} catch (error) {
		ctx.log.debug(`[cuevana] Episode lookup failed: ${(error as Error).message}`);
		return null;
	}
}

/** Reads embed URLs from the language submenus, resolving cuevana3 redirector pages. */
async function getEmbedUrls(
	watchUrl: URL,
	requester: ScrapeRequester,
	ctx: ProviderContext,
	pageOpt: CheerioLoadRequest,
): Promise<string[]> {
	let raw: string[] = [];

	// cuevana3 holds each server's embed on `<iframe data-src="…">` inside `.TPlayerTb`
	// tabs (revealed by clicking a `.clili` option). `data-video`/`data-tr` do not exist.
	const scrapeDom = ($: ReturnType<ProviderContext['cheerio']['$load']>): string[] => {
		const found: string[] = [];
		$('iframe[data-src], .TPlayerTb iframe[data-src], .clili[data-src], [data-src]').each((_: number, el: any) => {
			const u = $(el).attr('data-src');
			if (u && /^https?:\/\//.test(u)) found.push(u);
		});
		return found;
	};

	// Static parse first (some titles SSR the iframes).
	try {
		const { $ } = await ctx.cheerio.load(watchUrl, pageOpt, ctx.xhr);
		raw.push(...scrapeDom($));
	} catch (error) {
		ctx.log.debug(`[cuevana] Static embed parse failed: ${(error as Error).message}`);
	}

	// The iframes only materialise after clicking each `.clili` server, so a static solve
	// is not enough here: render with a real browser, click each option, then read the iframes.
	if (raw.length === 0) {
		ctx.log.info('[cuevana] No inline embeds; rendering the page with a browser session.');
		let session: Awaited<ReturnType<ProviderContext['puppeteer']['launch']>> | null = null;
		try {
			session = await ctx.puppeteer.launch(watchUrl, {
				requester,
				browsingOptions: { ignoreError: true, loadCriteria: 'networkidle2' },
			});
			await session.page
				.waitForSelector('.clili, iframe[data-src], .load-video iframe', { timeout: 15000 })
				.catch(() => null);
			raw = await session.page.evaluate(() => {
				const out: string[] = [];
				// Reveal every server's iframe by clicking its option.
				document.querySelectorAll<HTMLElement>('.clili').forEach((el) => el.click());
				document.querySelectorAll('iframe').forEach((el) => {
					const u = el.getAttribute('data-src') || (el as HTMLIFrameElement).src;
					if (u && /^https?:\/\//.test(u) && !/cuevana3\.[a-z]+\/(ver-|serie|pelicula)/.test(u)) out.push(u);
				});
				return out;
			});
		} catch (error) {
			ctx.log.warn(`[cuevana] Browser render failed: ${(error as Error).message}`);
		} finally {
			await session?.page.close().catch(() => null);
		}
	}

	// Resolve cuevana3 redirector pages (`url = '…'`) to the real embed host.
	const resolved: string[] = [];
	for (const u of deduplicateArray(raw) as string[]) {
		if (!/cuevana3/i.test(hostOf(u))) {
			resolved.push(u);
			continue;
		}
		try {
			const res = await ctx.xhr.fetch(
				new URL(u),
				{ method: 'GET', attachUserAgent: true, clean: true, headers: { Referer: watchUrl.origin + '/' } },
				requester,
			);
			const html = await res.text();
			const m = html.match(/url ?= ?'([^']+)'/);
			resolved.push(m?.[1] ?? u);
		} catch {
			resolved.push(u);
		}
	}
	return deduplicateArray(resolved) as string[];
}

// ─── Extractor dispatch ──────────────────────────────────────────────────────

function hostOf(u: string): string {
	try {
		return new URL(u).host;
	} catch {
		return u;
	}
}

async function dispatch(
	embed: string,
	opts: CheerioLoadRequest,
	ctx: ProviderContext,
): Promise<InternalMediaSource[]> {
	const url = new URL(embed);
	const host = url.host.toLowerCase();
	const meta = { language: 'es' as const };

	let out: InternalMediaSource[] | InternalMediaSource | null = null;
	if (/streamwish|vidhide|filelions|lions|swish|wish|dhtpre|dewsc|strwish/.test(host)) {
		out = await extractStreamwishStreams(url, opts, ctx, meta);
	} else if (/dood|d0o0d|ds2play|ds2video|dsvplay/.test(host)) {
		out = await extractDoodstreamStreams(url, opts, ctx, meta);
	} else if (/filemoon|moon/.test(host)) {
		out = await extractFilemoonStreams(url, opts, ctx, meta);
	} else if (/mixdrop|mdrop|mxdrop/.test(host)) {
		out = await extractMixdropStream(url, opts, ctx, meta);
	} else if (/supervideo|svideo/.test(host)) {
		out = await extractSupervideoStreams(url, opts, ctx, meta);
	} else {
		ctx.log.debug(`[cuevana] No extractor for host ${host}, skipping.`);
		return [];
	}

	if (!out) return [];
	return Array.isArray(out) ? out : [out];
}
