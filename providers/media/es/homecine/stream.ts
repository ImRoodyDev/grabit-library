import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	type SerieMedia,
	calculateMatchScore,
} from 'grabit-engine';
import { PROVIDER } from './config';
import { dispatchEmbed } from '../../../extractors/embedDispatch';

/**
 * Stream handler for HomeCine (Spanish).
 *
 * HTTP-only chain:
 *   1. /?s=<title> search -> best a[oldtitle] match (movie or /series/ page)
 *   2. series: series page -> #seasons a ending -temporada-<s>-capitulo-<e> -> episode page
 *   3. page -> .les-content a[href="#tabN"] (language label) -> #tabN iframe src
 *   4. dispatch each embed host (fastream, supervideo, …) to its extractor
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const media = requester.media;
	const isSerie = media.type === 'serie';
	const base = new URL(PROVIDER.config.baseUrl);
	const referer = base.origin + '/';

	const pageOpts = {
		...requester,
		extraHeaders: {
			accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
			'accept-language': 'es-ES,es;q=0.9,en;q=0.8',
			Referer: referer,
		},
	};

	// 1. Search across the localized-title + original-title variants.
	const searchURLs = PROVIDER.createResourceUrls(requester);
	let pageUrl: URL | null = null;
	for (const url of searchURLs) {
		const html = await ctx.xhr
			.fetch(url, { method: 'GET', attachUserAgent: true, clean: true, headers: pageOpts.extraHeaders }, requester)
			.then((r) => r.text())
			.catch(() => '');
		if (!html) continue;
		const $ = ctx.cheerio.$load(html);

		let best: { href: string; score: number } | null = null;
		$('a[oldtitle]').each((_i, el) => {
			const href = $(el).attr('href');
			const oldtitle = ($(el).attr('oldtitle') ?? '').trim();
			if (!href || !oldtitle) return;
			// Movies exclude /series/ pages; series only keep them.
			if (isSerie !== href.includes('/series/')) return;
			const score = calculateMatchScore({ title: oldtitle }, media);
			if (!best || score > best.score) best = { href, score };
		});
		// 80+ title similarity is the engine's "match" threshold.
		if (best && best.score >= 80) {
			pageUrl = new URL(best.href, base);
			break;
		}
	}
	if (!pageUrl) {
		ctx.log.warn('[homecine] No matching result found.');
		return [];
	}
	ctx.log.info(`[homecine] Matched page: ${pageUrl.href}`);

	// 2. For series, drill from the series page to the episode page.
	let playerHtml = await ctx.xhr
		.fetch(pageUrl, { method: 'GET', attachUserAgent: true, clean: true, headers: pageOpts.extraHeaders }, requester)
		.then((r) => r.text())
		.catch(() => '');
	if (isSerie) {
		const s = media as SerieMedia;
		const suffix = `-temporada-${s.season}-capitulo-${s.episode}`;
		const $s = ctx.cheerio.$load(playerHtml);
		const epHref = $s('#seasons a')
			.toArray()
			.map((el) => $s(el).attr('href') ?? '')
			.find((h) => h.endsWith(suffix));
		if (!epHref) {
			ctx.log.warn(`[homecine] Episode ${suffix} not found.`);
			return [];
		}
		pageUrl = new URL(epHref, base);
		playerHtml = await ctx.xhr
			.fetch(pageUrl, { method: 'GET', attachUserAgent: true, clean: true, headers: pageOpts.extraHeaders }, requester)
			.then((r) => r.text())
			.catch(() => '');
	}

	// 3. Map each language tab to its iframe embed.
	const $ = ctx.cheerio.$load(playerHtml);
	const embeds: string[] = [];
	$('.les-content a').each((_i, el) => {
		const label = $(el).text().toLowerCase();
		if (!label.includes('latino') && !label.includes('castellano')) return;
		const tab = $(el).attr('href');
		if (!tab || !tab.startsWith('#')) return;
		const src = $(`${tab} iframe`).attr('src');
		if (src) embeds.push(src);
	});
	if (!embeds.length) {
		ctx.log.warn('[homecine] No Spanish embeds on the player page.');
		return [];
	}

	// 4. Dispatch each embed host to its extractor.
	const results: InternalMediaSource[] = [];
	for (const embed of embeds) {
		const sources = await dispatchEmbed(embed, { ...pageOpts, extraHeaders: { Referer: pageUrl.href } }, ctx, 'es');
		results.push(...sources);
	}
	ctx.log.info(`[homecine] Resolved ${results.length} source(s).`);
	return results;
}
