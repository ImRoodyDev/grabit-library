import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	type CheerioLoadResult,
	type Media,
	calculateMatchScore,
	CheerioLoadRequest,
	MovieMedia,
	ProviderFetchOptions,
	extractContructorJSONArguments,
	extractVariableValue,
	SerieMedia,
	deduplicateArray,
} from 'grabit-engine';
import { locators, PROVIDER } from './config';
import { extractMixdropStream } from '../../../extractors/mixdrop';
import { extractDoodstreamStreams } from '../../../extractors/doodstream';
import { extractSupervideoStreams } from '../../../extractors/supervideo';
import { extractDroploadStreams } from '../../../extractors/dropload';

const ESCAPED_SLASH_RE = /\\\//;
const SCRIPT_TAG_RE = /<script[^>]*>[\s\S]*?<\/script>/gi;
const LINK_TAG_RE = /<link[^>]*\/?>/gi;

/**
 * Stream handler for Repelishd.
 *
 * Fetches and parses media streams from the provider's endpoint.
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];

	// Page Extra headers
	const pageRequestOpt = {
		...requester,
		extraHeaders: {
			accept:
				'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
			'accept-language': 'en-US,en;q=0.9,es;q=0.8',
			'cache-control': 'no-cache',
			pragma: 'no-cache',
			priority: 'u=0, i',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"Windows"',
			'sec-fetch-dest': 'document',
			'sec-fetch-mode': 'navigate',
			'sec-fetch-site': 'same-origin',
			'sec-fetch-user': '?1',
			'upgrade-insecure-requests': '1',
			'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
			Referer: new URL(PROVIDER.config.baseUrl).origin + '/',
		},
	};

	// Build deduplicated, prioritized search URLs (ID-based first, then localized title variants)
	const titleCount = requester.media.localizedTitles.length ?? 0;
	const searchURLs = deduplicateArray([
		// First: ID-based search (default createResourceURL)
		((): string => {
			const resourceIdURL = PROVIDER.createResourceURL(requester);
			return resourceIdURL.href;
		})(),
		// Then: localized title variants following the translation priority order
		...Array.from({ length: titleCount + 1 }, (_, i) => {
			const pattern = '?story={title:form-uri}&do=search&subaction=search';
			const path = PROVIDER.createPatternString(pattern, requester.media, {}, i);
			return new URL(path, PROVIDER.config.baseUrl).href;
		}),
	]).map((url) => new URL(url));

	// Loop through all search URL candidates until a best match `is found
	let resourceURL: URL = searchURLs[0]!;
	let bestResult: ReturnType<typeof selectBestResult> = null;
	for (let i = 0; i < searchURLs.length; i++) {
		try {
			resourceURL = searchURLs[i]!;
			ctx.log.debug(`Search attempt ${i + 1}/${searchURLs.length}: ${resourceURL}`);

			const resultsPage = await ctx.cheerio.load(resourceURL, pageRequestOpt, ctx.xhr);
			// ctx.log.info(`Page HTML: ${resultsPage.$.html()}`);

			// Extract media information from the search results
			const mediaEntries = resultsPage.$(locators.$results).toArray();
			ctx.log.debug(`Found ${mediaEntries.length} media entries in search results.`);

			// Select the best matching result based on title and year
			bestResult = selectBestResult(resultsPage, mediaEntries, requester.media);
			if (bestResult) break;
			ctx.log.debug(`No match on attempt ${i + 1}, trying next...`);
		} catch (error) {
			ctx.log.error(`Error during search attempt ${i + 1} with URL ${resourceURL.href}: ${(error as Error).message}`);
		}
	}

	if (!bestResult) {
		ctx.log.warn('No best matching result found for the media. Returning empty stream list.');
		return [];
	}
	ctx.log.debug(`Best matching entry: ${bestResult.inputs.title} (${bestResult.inputs.year}) with score ${bestResult.score}`);

	// Create the full URL for the best match page
	const bestResourceURL = new URL(bestResult.inputs.entry, resourceURL.origin);
	pageRequestOpt.extraHeaders.Referer = resourceURL.href; // Set Referer to the search page
	ctx.log.info(`Created best match location URL: ${bestResourceURL.href}`);

	// Load available streams from the best match page
	const results: InternalMediaSource[] = [];
	let servers: Server[] = [];
	if (requester.media.type === 'movie') {
		const allServers = (await extractMoviesServers(requester, ctx)) ?? [];
		servers.push(...allServers);
	} else if (requester.media.type === 'serie') {
		// For series, we need to navigate to the specific episode page first
		bestResourceURL.hash = `#season-${requester.media.season}`;
		ctx.log.info(`Navigating to episode page with URL: ${bestResourceURL.href}`);
		const episodesPage = await ctx.cheerio.load(bestResourceURL, pageRequestOpt, ctx.xhr);
		// ctx.log.debug(`Episode page HTML: ${episodesPage.$.html()}`);

		const allServers = (await extractSeriesServers(episodesPage, requester, ctx)) ?? [];
		servers.push(...allServers);
	}

	ctx.log.info(`Found servers:\n${servers?.map((s) => JSON.stringify(s)).join(',\n ')}`);

	// Loop through the servers and construct InternalMediaSource objects
	for (const server of servers) {
		try {
			// Extract mixdrop
			if (server.name.includes('mixdrop')) {
				const id = server.url.split('/').pop() || '';
				const mixdropURL = new URL(`https://mixdrop.top/e/${id}`);
				const opts: CheerioLoadRequest = {
					...requester,
					extraHeaders: {
						cookie: 'PHPSESSID=vbm82pf154krs00pr9psdolsbf',
						referer: resourceURL.origin + '/',
					},
				};
				const source = await extractMixdropStream(mixdropURL, opts, ctx, { language: requester.targetLanguageISO });
				if (source) results.push(source);
				else ctx.log.warn(`Failed to extract stream from Mixdrop URL: ${mixdropURL.href}`);
			}
			// Extract doodstream
			else if (server.name.includes('doodstream')) {
				const opts: CheerioLoadRequest = {
					...requester,
					extraHeaders: {
						referer: resourceURL.origin + '/',
					},
				};
				const source = await extractDoodstreamStreams(new URL(server.url), opts, ctx, { language: requester.targetLanguageISO });
				if (source) results.push(source);
				else ctx.log.warn(`Failed to extract stream from Doodstream URL: ${server.url}`);
			}
			// Extract supervideo
			else if (server.name.includes('supervideo')) {
				const opts: CheerioLoadRequest = {
					...requester,
					extraHeaders: {
						referer: resourceURL.origin + '/',
					},
				};
				const source = await extractSupervideoStreams(new URL(server.url), opts, ctx, { language: PROVIDER.getPrimaryLanguage() });
				if (source) results.push(...source);
				else ctx.log.warn(`Failed to extract stream from Supervideo URL: ${server.url}`);
			}
			// extract dropload
			else if (server.name.includes('dropload')) {
				const opts: CheerioLoadRequest = {
					...requester,
					extraHeaders: {
						referer: resourceURL.origin + '/',
					},
				};
				const sources = await extractDroploadStreams(new URL(server.url), opts, ctx, { language: PROVIDER.getPrimaryLanguage() });
				if (sources) results.push(...sources);
				else ctx.log.warn(`Failed to extract stream from Dropload URL: ${server.url}`);
			}
		} catch (error) {
			ctx.log.error(`Error processing server ${server.name}: ${(error as Error).message}`);
		}
	}

	return results;
}

function selectBestResult(resultsPage: CheerioLoadResult, results: any[], media: Media) {
	return (
		results
			.map((element) => {
				const entry = resultsPage.$(element).find(locators.$result_entry).attr('href') || '';
				const title = resultsPage.$(element).find(locators.$result_title).text().trim();
				const year = resultsPage.$(element).find(locators.$result_year).text().trim();
				const score = calculateMatchScore({ title, year }, media);
				// console.debug(`Evaluating entry: ${title} (${year}) with score ${score}`);
				return {
					inputs: {
						entry,
						title,
						year,
					},
					score,
				};
			})
			.filter((result) => result.score >= 85)
			.sort((a, b) => b.score - a.score)
			.at(0) ?? null
	);
}

async function extractMoviesServers(requester: ScrapeRequester, ctx: ProviderContext) {
	const imdbId = (requester.media as MovieMedia).imdbId;
	const resourceURL = new URL(`ddl/${imdbId}`, 'https://verhdlink.cam');
	ctx.log.info(`Fetching movie servers from URL: ${resourceURL.href}`);
	const fetchOpts: ProviderFetchOptions = {
		method: 'GET',
		clean: true,
		attachUserAgent: true,
		headers: {
			accept: '*/*',
			'accept-language': 'en-US,en;q=0.9,es;q=0.8',
			'cache-control': 'no-cache',
			pragma: 'no-cache',
			priority: 'u=1',
			'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"Windows"',
			'sec-fetch-dest': 'script',
			'sec-fetch-mode': 'no-cors',
			'sec-fetch-site': 'cross-site',
			'sec-fetch-storage-access': 'active',
			cookie:
				'cf_clearance=YyYM9geBrHyRJItMlhvovS2gANi5_j4IIBEeN4yqMEQ-1772311865-1.2.1.1-iEfEm5xb69kea2U2VYqW9kR4nG7kvSLYG0YYvW43udiTSpcnvdtRGRb5jU5q3naoiZITVT1bRzZfv10pRW53w779y_Kls1G.UZjE_OhKZC7OtKdwj3JpQpMdMSXNxAytVcmLIRU1HOhXOHi5XhI9Lt41Tq16xBZvGNaZr_QLm9UjMh3ekOhujJGCsyYzA0bngSGU8HSdRCeiqk0YXo.cTR6ayQ9p4qlc2IgtjAOHIRg',
			Referer: PROVIDER.config.baseUrl,
		},
	};
	const serverCodeInjection = await ctx.xhr.fetchResponse<string>(resourceURL, fetchOpts, requester);
	ctx.log.debug(`Received server code response: ${serverCodeInjection?.substring(0, 200)}...`);

	// Extract the template literal argument from document.write(`...`)
	const html = extractContructorJSONArguments(serverCodeInjection) as { 0: string };
	if (!html || !html[0]) {
		ctx.log.warn('No HTML found in server code injection.');
		return null;
	}
	// Remove wrapping backtick chars added by the template literal
	const htmlContent = html[0].slice(1, -1);
	ctx.log.debug(`Extracted HTML from server code injection: ${htmlContent?.substring(0, 200)}...`);

	// Unescape JS string escapes (e.g. <\/script> → </script>) and strip <script>/<link> tags
	// so Cheerio doesn't swallow the DOM inside a <script> block.
	const cleanedHTML = htmlContent.replace(ESCAPED_SLASH_RE, '/').replace(SCRIPT_TAG_RE, '').replace(LINK_TAG_RE, '');

	// parse to cheerio
	const page$ = ctx.cheerio.$load(cleanedHTML, null, false);
	// ctx.log.debug(`Loaded HTML: ${page$.html()}`);
	const servers = page$('.streams').toArray();
	ctx.log.info(`Extracted ${servers.length} server entries from the HTML.`);

	return (
		servers
			.map((element) => {
				const serverName = page$(element).find('.streaming').text().trim().toLowerCase();
				const onclick = page$(element).attr('onclick');
				const quality = page$(element).find('.quality mark').text().trim();
				const size = page$(element).find('span[style*="float:right"] span[style*="color:#999"]').text().trim();
				if (!onclick) {
					ctx.log.warn(`No onclick attribute found for server entry: ${serverName}`);
					return null;
				}
				const serverURL = extractVariableValue(onclick, 'window.parent.location.href');
				// ctx.log.debug(`Extracted server: ${serverName} with URL: ${serverURL}, quality: ${quality}, and size: ${size}`);
				return { name: serverName, url: serverURL, quality, size };
			})
			// Sort by mixdrop > doodstream > supervideo
			.sort((a, b) => {
				const priority = ['mixdrop', 'doodstream', 'supervideo'];
				const aPriority = priority.findIndex((p) => a?.name.includes(p)) ?? Number.POSITIVE_INFINITY;
				const bPriority = priority.findIndex((p) => b?.name.includes(p)) ?? Number.POSITIVE_INFINITY;
				return aPriority - bPriority;
			})
			.filter((server) => server !== null && !server.url?.includes('verhdlink')) as Server[]
	);
}

async function extractSeriesServers(page: CheerioLoadResult, requester: ScrapeRequester, ctx: ProviderContext) {
	const $server = page.$(`.dooplay_player .tt_series ul > li`).toArray();
	ctx.log.info(`Extracted ${$server.length} server entries from the episode page.`);
	return $server
		.map((element) => {
			// ctx.log.debug(`Processing server entry element: ${page.$(element).html()}`);
			// Select data-num
			const dataNum = page.$(element).find('a').first().attr('data-num')?.toLowerCase().trim();
			const anchors = page.$(element).find('a').toArray();
			// ctx.log.debug(`Processing server entry with data-num: ${dataNum} and ${anchors.length} anchor(s).`);
			return anchors.map((anchor) => {
				const serverName = page.$(anchor).text().trim().toLowerCase();
				const link = page.$(anchor).attr('data-link');
				// ctx.log.debug(`Extracted server: ${serverName} with data-num: ${dataNum} and link: ${link}`);
				if (!link || serverName === '') {
					ctx.log.warn(`Missing data-link or server name data-num: ${dataNum}, serverName: ${serverName}, link: ${link}`);
					return null;
				}

				return {
					id: dataNum,
					name: serverName,
					url: link,
					quality: '',
					size: '',
				} satisfies Server;
			});
		})
		.flat()
		.filter((server) => server !== null)
		.filter((server) => server!.id === `${(requester.media as SerieMedia).season}x${(requester.media as SerieMedia).episode}`) // Sort by mixdrop > doodstream > supervideo
		.sort((a, b) => {
			const priority = ['mixdrop', 'doodstream', 'supervideo', 'dropload'];
			const aPriority = priority.findIndex((p) => a?.name.includes(p)) ?? Number.POSITIVE_INFINITY;
			const bPriority = priority.findIndex((p) => b?.name.includes(p)) ?? Number.POSITIVE_INFINITY;
			return aPriority - bPriority;
		})
		.filter((server) => server !== null && !server.url?.includes('verhdlink')) as Server[];
}

type Server = {
	id?: string | undefined;
	name: string;
	url: string;
	quality: string;
	size: string;
};
