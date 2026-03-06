import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	calculateMatchScore,
	Media,
	ProviderFetchOptions,
	SerieMedia,
	tldts,
} from 'grabit-engine';
import { PROVIDER } from './config';
import { extractGoodstreamStreams } from '../../../extractors/goodstream';
import { extractVimeosStreams } from '../../../extractors/vimeos';
import { extractFilemoonStreams } from '../../../extractors/filemoon';

/**
 * Stream handler for Lamovie.
 *
 * Fetches and parses media streams from the provider's endpoint.
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
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
			'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"Windows"',
			'sec-fetch-dest': 'document',
			'sec-fetch-mode': 'navigate',
			'sec-fetch-site': 'same-origin',
			'sec-fetch-user': '?1',
			'upgrade-insecure-requests': '1',
			Referer: new URL(PROVIDER.config.baseUrl).origin + '/',
		},
	};

	// Build deduplicated, prioritized search URLs (ID-based first, then localized title variants)
	const searchURLs = PROVIDER.createResourceUrls(requester);
	// Create the search URL based on the requester's media information
	let resourceURL = searchURLs[0]!;
	let bestResult: BestResult = null;
	for (const [i, url] of searchURLs.entries()) {
		try {
			resourceURL = createSearchURL(url.searchParams.get('q') ?? '', requester);
			ctx.log.debug(`Search attempt ${i + 1}/${searchURLs.length}: ${resourceURL}`);

			const opts: ProviderFetchOptions = {
				method: 'GET',
				attachUserAgent: true,
				clean: true,
				headers: {
					accept: 'application/json',
					'accept-language': 'en-US,en;q=0.9,es;q=0.8',
					'cache-control': 'no-cache',
					'content-type': 'application/json',
					pragma: 'no-cache',
					priority: 'u=1, i',
					'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
					'sec-ch-ua-mobile': '?0',
					'sec-ch-ua-platform': '"Windows"',
					'sec-fetch-dest': 'empty',
					'sec-fetch-mode': 'cors',
					'sec-fetch-site': 'same-origin',
					referer: resourceURL.origin + '/',
				},
			};
			const results = await ctx.xhr.fetchResponse<ApiSearchResults>(resourceURL, opts, requester);
			// ctx.log.info(`Api response: ${JSON.stringify(results)}`);

			const mediaEntries = results.data?.posts ?? [];
			ctx.log.debug(`Found ${mediaEntries.length} media entries in search results.`);

			// Select the best matching result based on title and year
			bestResult = selectBestResult(mediaEntries, requester.media);
			if (bestResult) break; // Exit the loop if we found a result or if we've already retried with the Spanish title
		} catch (error) {
			ctx.log.error(`Error during search attempt ${i + 1}: ${(error as Error).message}`);
		}
	}

	if (!bestResult) {
		ctx.log.warn('No matching media entry found after evaluating search results.');
		return [];
	}
	ctx.log.debug(`Best matching entry: ${bestResult.inputs.title} (${bestResult.inputs.year}) with score ${bestResult.score}`);

	// Create the full URL for the best match page
	const bestResourceURL = new URL(bestResult.inputs.entry, resourceURL.origin);
	pageRequestOpt.extraHeaders.Referer = resourceURL.href; // Set Referer to the search page
	ctx.log.info(`Created best match location URL: ${bestResourceURL.href}`);

	let servers: Awaited<ReturnType<typeof getServers>> = [];
	if (requester.media.type === 'serie') {
		const episodeInfo = await getEpisodeId(bestResult, requester, ctx);
		if (!episodeInfo) {
			ctx.log.warn('Could not find episode information for the matched series entry.');
			return [];
		}
		servers.push(...(await getServers(episodeInfo._id, bestResult, requester, ctx)));
	} else {
		servers.push(...(await getServers(bestResult.inputs.id, bestResult, requester, ctx)));
	}

	if (servers.length === 0) {
		ctx.log.warn('No streaming servers found for the matched media entry.');
		return [];
	}

	// Log the found servers
	ctx.log.debug(`Found servers:\n${servers.map((s) => JSON.stringify(s)).join('\n')}`);

	// Loop throught add to avoid doing map promise
	// ❌ all run at the same time ( if we have 5 servers, we will do 5 requests at the same time, and if provider has rate limit, we can get blocked)
	const results: InternalMediaSource[] = [];
	for (const server of servers) {
		try {
			ctx.log.info(`Processing server: ${server.serverName} (Language: ${server.lang}, Quality: ${server.quality})`);

			// Doodstream
			if (server.serverName.includes('goodstream')) {
				const source = await extractGoodstreamStreams(new URL(server.url), requester, ctx, {
					fileName: `HLS ${server.quality}`,
					format: 'm3u8',
					language: server.lang || 'es',
				});
				if (source) {
					results.push(...source);
				}
			}
			// Vimeos
			else if (server.serverName.includes('vimeos')) {
				const source = await extractVimeosStreams(new URL(server.url), requester, ctx, {
					fileName: `HLS ${server.quality}`,
					format: 'm3u8',
					language: server.lang || 'es',
				});
				if (source) {
					results.push(...source);
				}
			}
			// filemoon
			else if (server.serverName.includes('filemoon')) {
				const source = await extractFilemoonStreams(new URL(server.url), requester, ctx, {
					fileName: `HLS ${server.quality}`,
					format: 'm3u8',
					language: server.lang || 'es',
				});
				if (source) {
					results.push(...source);
				}
			}
		} catch (error) {
			ctx.log.error(`Error processing server ${server.url}: ${(error as Error).message}`);
			continue; // Skip this server and continue with the next one
		}
	}

	return results;
}

type BestResult = ReturnType<typeof selectBestResult>;

type ApiSearchResults = {
	error: boolean;
	data: { posts: { _id: string; slug: string; type: string; original_title: string; title: string; release_date: string }[] };
};
type ApiEpisodeListResults = {
	error: boolean;
	data: { posts: { _id: string; episode_number: number; season_number: number; show_id: string }[] };
};

type ApiPlayerResponse = {
	error: boolean;
	message: string;
	data?: {
		embeds: Embed[];
		downloads: Download[];
	};
};

type Embed = {
	lang: string;
	quality: string;
	url: string;
};

type Download = {
	url: string;
	server: string;
	lang: string;
	quality: string;
	size: string;
	subtitle: number;
	format: string | null;
	resolution: string | null;
};
function selectBestResult(results: ApiSearchResults['data']['posts'], media: Media) {
	return (
		results
			.map((element) => {
				const path = PROVIDER.createPatternString('/{type:string}/{slug:string}/', media, {
					type: element.type.includes('movie') ? 'peliculas' : 'series',
					slug: element.slug,
				});
				const entry = new URL(path, PROVIDER.config.baseUrl).href;
				const title = element.original_title || element.title;
				const es_title = element.title;
				const year = new Date(element.release_date).getFullYear().toString();
				const score = calculateMatchScore({ title, year }, media);
				const scoreT = calculateMatchScore({ title: es_title, year }, media);
				// Use the best score between original title and Spanish title
				const finalScore = Math.max(score, scoreT);
				// console.debug(`Evaluating entry: ${title} (${year}) with score ${score}`);
				return {
					inputs: {
						id: element._id,
						entry,
						title,
						es_title,
						year,
					},
					score: finalScore,
				};
			})
			.filter((result) => result.score >= 100)
			.sort((a, b) => b.score - a.score)
			.at(0) ?? null
	);
}

async function getEpisodeId(result: NonNullable<BestResult>, requester: ScrapeRequester, ctx: ProviderContext) {
	const media = requester.media as SerieMedia;
	const postPerPage = 15;
	const targetPage = (media.episode - (1 % 1)) % postPerPage;
	ctx.log.debug(`Fetching episode list for season ${media.season}, page ${targetPage} to find episode ${media.episode}`);

	const fetchURL = new URL('/wp-api/v1/single/episodes/list', PROVIDER.config.baseUrl);
	// query params
	const params = new URLSearchParams({
		_id: result.inputs.id,
		season: media.season.toString(),
		page: targetPage.toString(),
		postsPerPage: postPerPage.toString(),
	});
	fetchURL.search = params.toString();
	ctx.log.debug(`Constructed episode list URL: ${fetchURL.href}`);
	const opts: ProviderFetchOptions = {
		method: 'GET',
		attachUserAgent: true,
		clean: true,
		headers: {
			accept: 'application/json',
			'accept-language': 'en-US,en;q=0.9,es;q=0.8',
			'cache-control': 'no-cache',
			'content-type': 'application/json',
			pragma: 'no-cache',
			priority: 'u=1, i',
			'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"Windows"',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'same-origin',
			Referer: result.inputs.entry,
		},
	};
	const responseData = await ctx.xhr.fetchResponse<ApiEpisodeListResults>(fetchURL, opts, requester);
	ctx.log.debug(`Received episode list response with ${responseData.data?.posts?.length ?? 0} episodes`);

	const episodeEntry = (responseData.data?.posts ?? []).find(
		(ep) => ep.episode_number === media.episode && ep.season_number === media.season,
	);
	if (!episodeEntry) {
		ctx.log.warn(`Episode S${media.season}E${media.episode} not found in episode list.`);
		return null;
	}
	ctx.log.debug(`Found matching episode entry: S${episodeEntry.season_number}E${episodeEntry.episode_number} with ID ${episodeEntry._id}`);
	return episodeEntry;
}

async function getServers(mediaId: string, result: NonNullable<BestResult>, requester: ScrapeRequester, ctx: ProviderContext) {
	const fetchURL = new URL('wp-api/v1/player', PROVIDER.config.baseUrl);
	// query params
	const params = new URLSearchParams({
		postId: mediaId,
		demo: '0',
	});
	fetchURL.search = params.toString();
	ctx.log.debug(`Constructed API players URL: ${fetchURL.href}`);

	const opts: ProviderFetchOptions = {
		method: 'GET',
		attachUserAgent: true,
		clean: true,
		headers: {
			accept: 'application/json',
			'accept-language': 'en-US,en;q=0.9,es;q=0.8',
			'cache-control': 'no-cache',
			'content-type': 'application/json',
			pragma: 'no-cache',
			priority: 'u=1, i',
			'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"Windows"',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'same-origin',
			Referer: result.inputs.entry,
		},
	};
	const responseData = await ctx.xhr.fetchResponse<ApiPlayerResponse>(fetchURL, opts, requester);
	ctx.log.debug(`Received players response with ${responseData.data?.embeds?.length ?? 0} embeds servers`);

	// Normalize and return the stream sources
	return (
		responseData.data?.embeds
			.map((embed) => {
				const nLang = embed.lang.toLowerCase().split('-')[0] || '';
				const lang = ['es', 'en'].includes(nLang)
					? nLang
					: nLang === 'latino'
						? 'es'
						: nLang === 'sub'
							? 'es'
							: nLang === 'ingles'
								? 'en'
								: null;
				const name = tldts.parse(embed.url).domainWithoutSuffix ?? null;
				if (!name) return null;

				return {
					lang,
					url: embed.url,
					quality: embed.quality,
					serverName: name,
				};
			})
			.filter((source) => source !== null)
			.sort((a, b) => {
				const serversOrder = ['filemoon', 'doodstream', 'goodstream', 'streamtape', 'vimeos', 'voe'];

				// Lower number = higher priority (consistent convention)
				const aLangPriority = a.lang === 'es' ? 0 : 1;
				const bLangPriority = b.lang === 'es' ? 0 : 1;

				const aServerIdx = serversOrder.indexOf(a.serverName);
				const bServerIdx = serversOrder.indexOf(b.serverName);

				// Unlisted servers go to the end
				const aServerPriority = aServerIdx !== -1 ? aServerIdx : serversOrder.length;
				const bServerPriority = bServerIdx !== -1 ? bServerIdx : serversOrder.length;

				// 1. Sort by language first (es before en)
				if (aLangPriority !== bLangPriority) {
					return aLangPriority - bLangPriority;
				}

				// 2. Then sort by server preference
				return aServerPriority - bServerPriority;
			}) ?? []
	);
}

/**
 * Replicates `Ad(str)` — the "keyify" normalizer.
 * Used to normalize the raw user input before it becomes the `q` param.
 *
 * Steps:
 *   1. NFKD normalization
 *   2. Strip combining diacritical marks (\u0300–\u036f)
 *   3. Trim whitespace
 *   4. Lowercase
 *   5. Remove anything that isn't a Unicode letter, digit, space, or hyphen
 *   6. Collapse whitespace → single hyphen
 *   7. Collapse consecutive hyphens
 */
function keyify(input: string): string {
	if (typeof input !== 'string') {
		console.warn('keyify received non-string, coercing to empty string');
		input = '';
	}

	let result = input
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.trim();

	result = result.toLowerCase();
	result = result.replace(/[^\p{L}\p{N} -]+/gu, '');
	result = result.replace(/\s+/g, '-').replace(/-+/g, '-');

	return result;
}

function createSearchURL(query: string, requester: ScrapeRequester): URL {
	const path = PROVIDER.createPatternString(
		'/wp-api/v1/search?filter=%7B%7D&postType=any&q={keyify:form-uri}&postsPerPage=26',
		requester.media,
		{
			// The site caps the search term at 16 chars after keyify-then-un-hyphenate
			keyify: keyify(query).split('-').join(' ').substring(0, 16),
		},
	);
	return new URL(path, PROVIDER.config.baseUrl);
}
