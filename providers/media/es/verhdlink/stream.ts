import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	type CheerioLoadRequest,
	deduplicateArray,
} from 'grabit-engine';
import { dispatchEmbed } from '../../../extractors/embedDispatch';
import { PROVIDER } from './config';

const MAX_EMBEDS = 8;

/**
 * Stream handler for VerHdLink (Spanish / Latino, movie-only).
 *
 * Flow: `/movie/<imdbId>` -> read the Latino / Castellano mirror embeds ->
 * dispatch each host to its extractor.
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type !== 'movie') return []; // site has no series/channels
	const imdbId = (requester.media as any).imdbId as string | undefined;
	if (!imdbId) {
		ctx.log.warn('[verhdlink] No IMDb id on the requester; cannot look up the movie.');
		return [];
	}

	// Build the /movie/{imdb:string} page URL from the provider's `entries` pattern.
	const pageUrl = PROVIDER.createResourceURL(requester);
	const pageOpt: CheerioLoadRequest = {
		...requester,
		followRedirects: true,
		extraHeaders: {
			accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			'accept-language': 'es-ES,es;q=0.9,en;q=0.8',
			Referer: PROVIDER.config.baseUrl + '/',
		},
	};

	let $: ReturnType<ProviderContext['cheerio']['$load']>;
	try {
		$ = (await ctx.cheerio.load(pageUrl, pageOpt, ctx.xhr)).$;
	} catch (error) {
		ctx.log.warn(`[verhdlink] Failed to load ${pageUrl.href}: ${(error as Error).message}`);
		return [];
	}

	// Mirror embeds live in `._player-mirrors` blocks tagged .latino / .castellano.
	// Fall back to every `[data-link]` on the page if that structure is absent.
	const embeds: { url: string; lang: string }[] = [];
	const mirrors = $('._player-mirrors');
	const collect = (scope: any, lang: string) => {
		$('[data-link]', scope).each((_: number, el: any) => {
			const raw = $(el).attr('data-link');
			if (!raw) return;
			const url = raw.replace(/^(https:)?\/\//, 'https://');
			if (/^https?:\/\//.test(url) && !/verhdlink/i.test(url)) embeds.push({ url, lang });
		});
	};

	if (mirrors.length) {
		mirrors.each((_: number, el: any) => {
			const cls = ($(el).attr('class') || '').toLowerCase();
			if (cls.includes('latino') || cls.includes('castellano') || cls.includes('espanol')) {
				collect(el, 'es');
			}
		});
	}
	if (embeds.length === 0) collect($.root(), 'es');

	const uniqueUrls = deduplicateArray(embeds.map((e) => e.url)) as string[];
	if (uniqueUrls.length === 0) {
		ctx.log.warn('[verhdlink] No mirror embeds found on the page.');
		return [];
	}
	ctx.log.info(
		`[verhdlink] ${uniqueUrls.length} embed(s): ${[...new Set(uniqueUrls.map(hostOf))].join(', ')}`,
	);

	const extractOpt: CheerioLoadRequest = { ...requester, extraHeaders: { Referer: PROVIDER.config.baseUrl + '/' } };
	const results: InternalMediaSource[] = [];
	for (const embed of uniqueUrls.slice(0, MAX_EMBEDS)) {
		const sources = await dispatchEmbed(embed, extractOpt, ctx, 'es');
		if (sources.length) results.push(...sources);
	}

	ctx.log.info(`[verhdlink] Returning ${results.length} source(s).`);
	return results;
}

function hostOf(u: string): string {
	try {
		return new URL(u).host;
	} catch {
		return u;
	}
}
