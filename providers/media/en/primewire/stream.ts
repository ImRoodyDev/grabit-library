import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	type ProviderFetchOptions,
	encodeURI,
	createCookiesFromSet,
	CheerioLoadRequest,
	CheerioLoadResult,
	Media,
	SerieMedia,
	Crypto,
	joinCookies,
	calculateMatchScore,
	extractYearFromText,
	deduplicateArray,
} from 'grabit-engine';
import { extractMixdropStream } from '../../../extractors/mixdrop';
import { PROVIDER, locators } from './config';

const ID_TYPE_REGEX = /^\/([^/]+)\/(\d+)(?:-([^/]+))?(?:\/|$)/;

/**
 * Stream handler for Primewire.
 *
 * Fetches and parses media streams from the provider's endpoint.
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];

	// Page request options for HTML page loads
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
			TE: 'trailers',
			cookie: `visitor_info={%22domain%22:%22primewire.si%22%2C%22uuid%22:%22c11d1745-cbca-4ded-bc6f-baf247d5775c%22%2C%22mouse_moved%22:true%2C%22suspected_bot%22:null%2C%22adblock%22:false};cf_clearance=ltoiF1P.tXyph8NiUKY97otV9WJRW_h1zStICwaak_8-1773891180-1.2.1.1-ZvT_pb681AZGSoWRMI6sP0IRQezt0ZRDOp40eYeHRfOxBekyRgna..e7y7y9PX.HqUlAySnJoNVm9n5mCj_fZPpC4wOAQMDN25_Dx50kPH.ezoC_7oWITfdXgRsyNZsXmm8MdvWhojRn660bDClg5hX6fsjmEghJpVhIKRvEquOF_bt.qSg5J_0Cm4BrhMBU4vSLBZA_cFnWVx0JyKya.vEiG4gUWzmJ33.jFXNRPXQ`,
			Referer: new URL(PROVIDER.config.baseUrl).origin + '/',
		},
	} satisfies CheerioLoadRequest;
	// Get cookies from provider
	pageRequestOpt.extraHeaders.cookie = (await getKeyCookies(pageRequestOpt, requester, ctx)) ?? '';

	// Build deduplicated, prioritized search URLs (ID-based first, then localized title variants)
	const titleCount = requester.media.localizedTitles.length ?? 0;
	const searchURLs = deduplicateArray([
		// First: ID-based search (default createResourceURL)
		((): string => {
			const resourceIdURL = PROVIDER.createResourceURL(requester);
			const searchQuery = resourceIdURL.searchParams.get('s');
			resourceIdURL.searchParams.set('ds', createSearchHash(searchQuery));
			return resourceIdURL.href;
		})(),
		// Then: localized title variants following the translation priority order
		...Array.from({ length: titleCount + 1 }, (_, i) => {
			const localizedIndex = PROVIDER.useTranslation(requester.media)
				? i < titleCount
					? i
					: null
				: i === 0
					? null
					: i - 1;
			const queryURL = PROVIDER.createResourceURL(requester, localizedIndex);
			const encodedTitle =
				localizedIndex == null
					? encodeURI((requester.media as any).title, 'form-uri')
					: encodeURI((requester.media as any).localizedTitles[localizedIndex]!, 'form-uri');
			queryURL.searchParams.set('s', encodedTitle);
			queryURL.searchParams.set('ds', createSearchHash(encodedTitle));
			return queryURL.href;
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
			pageRequestOpt.extraHeaders.Referer = resourceURL.href;
			const $results = resultsPage.$(locators.$results).toArray();

			if ($results.length > 0) {
				ctx.log.info(`Found ${$results.length} results on attempt ${i + 1}.`);
				bestResult = selectBestResult(resultsPage, $results, requester.media);
				if (bestResult) break;
			}
			ctx.log.debug(`No match on attempt ${i + 1}, trying next...`);
		} catch (error) {
			ctx.log.error(`Error during search attempt ${i + 1}: ${error}`);
		}
	}

	if (!bestResult) {
		ctx.log.warn('No suitable match found for the media.');
		return [];
	}
	ctx.log.info(
		`Best match found: ${bestResult.inputs.title} (${bestResult.inputs.year}) with score ${bestResult.score} href: ${bestResult.inputs.entry}`,
	);

	// Create the full URL for the best match page
	const bestResourceURL = new URL(bestResult.inputs.entry, resourceURL.origin);
	ctx.log.info(`Created best match location URL: ${bestResourceURL.href}`);

	// Get servers based on media type
	let servers: ResolvedServer[] = [];
	if (bestResult.inputs.entry.includes('/movie/')) {
		pageRequestOpt.extraHeaders.Referer = bestResourceURL.href;
		servers = await getServers(bestResourceURL, pageRequestOpt.extraHeaders.cookie, requester, ctx);
	} else if (bestResult.inputs.entry.includes('/tv/') && requester.media.type === 'serie') {
		const episodeURL = await getEpisodeURL(bestResourceURL, pageRequestOpt, requester, ctx);
		if (!episodeURL) return [];
		pageRequestOpt.extraHeaders.Referer = episodeURL.href;
		servers = await getServers(episodeURL, pageRequestOpt.extraHeaders.cookie, requester, ctx);
		bestResourceURL.pathname = episodeURL.pathname;
	}

	if (servers.length === 0) {
		ctx.log.warn('No streaming servers found for the matched media entry.');
		return [];
	}
	ctx.log.info(`Found servers:\n${servers.map((s) => JSON.stringify(s)).join('\n')}`);

	// Loop over servers and call the appropriate extractor
	const results: InternalMediaSource[] = [];
	for (const server of servers) {
		try {
			ctx.log.info(`Processing server: ${server.name} (Quality: ${server.quality})`);
			const extractOpts = {
				...requester,
				extraHeaders: {
					Referer: bestResourceURL.href,
				},
			};

			// Mixdrop
			if (server.name.includes('mixdrop')) {
				const source = await extractMixdropStream(new URL(server.url), extractOpts, ctx, {
					fileName: `${server.file_name ?? ''} ${server.quality || ''}`.trim(),
					language: 'en',
				});
				if (source) results.push(source);
			}
		} catch (error) {
			ctx.log.error(`Error processing server ${server.name}: ${error}`);
		}
	}

	return results;
}

// --- Types ---

type ResolvedServer = {
	name: string;
	url: string;
	quality: string | null;
	file_name: string | null;
	file_size: string | null;
};

type RawServer = {
	quality: string | null;
	name: string;
	key: string;
	file_size: string | null;
	file_name: string | null;
};

type MediaInfo = {
	type: 'movie' | 'serie' | 'tv';
	tvmaze_id: number | null;
	tmdb_image: string | null;
	tmdb_id: number;
	tmdb_backdrop: string | null;
	title: string;
	status: string;
	release_date: string;
	pw_id: number;
	imdb_id: string;
	description: string;
};

type ServerResponse = {
	servers: RawServer[];
	info: MediaInfo;
};

type StreamingLink = {
	link: string;
	host_id: number;
	host: string;
};

type PuppeteerHeaders = Record<string, string>;

// --- Helper Functions ---

function parseStreamingLinkPayload(rawPayload: string, ctx: ProviderContext): StreamingLink | null {
	const payload = rawPayload.trim();
	if (!payload) return null;

	try {
		const parsed = JSON.parse(payload) as Partial<StreamingLink>;
		if (typeof parsed.link !== 'string' || parsed.link.trim() === '') return null;
		return {
			link: parsed.link,
			host_id: typeof parsed.host_id === 'number' ? parsed.host_id : 0,
			host: typeof parsed.host === 'string' ? parsed.host : '',
		};
	} catch (error) {
		ctx.log.debug(`Failed to parse Primewire streaming payload as JSON: ${error}`);
		return null;
	}
}

async function extractStreamingLinkFromPage(
	page: Awaited<ReturnType<ProviderContext['puppeteer']['launch']>>['page'],
	ctx: ProviderContext,
): Promise<StreamingLink | null> {
	await page.waitForFunction(() => document.body?.innerText.trim().length > 0, { timeout: 10000 }).catch(() => null);

	const rawPayload = await page.evaluate(() => {
		const preformattedPayload = document.querySelector('pre')?.textContent?.trim();
		if (preformattedPayload) return preformattedPayload;

		const bodyPayload = document.body?.innerText?.trim();
		if (bodyPayload) return bodyPayload;

		return document.documentElement?.textContent?.trim() ?? '';
	});

	const parsed = parseStreamingLinkPayload(rawPayload, ctx);
	if (parsed) return parsed;

	ctx.log.debug(`Primewire streaming payload was not valid JSON: ${rawPayload.slice(0, 500)}`);
	return null;
}

async function getKeyCookies(
	pageRequestOpt: CheerioLoadRequest,
	requester: ScrapeRequester,
	ctx: ProviderContext,
): Promise<string | null> {
	const resourceURL = new URL('home', PROVIDER.config.baseUrl);
	ctx.log.info(`Fetching cookies from: ${resourceURL.href}`);

	const response = await ctx.xhr.fetch(
		resourceURL,
		{
			attachUserAgent: true,
			clean: true,
			method: 'GET',
			headers: {
				...pageRequestOpt.extraHeaders,
				Referer: resourceURL.href,
			},
		},
		requester,
	);

	if (!response.ok) {
		ctx.log.error(`Failed to fetch cookies: ${response.status} ${response.statusText}`);
		return null;
	}
	const setCookieHeader = createCookiesFromSet(response.headers as any);
	const savedCookies = joinCookies(setCookieHeader, pageRequestOpt.extraHeaders?.cookie ?? '');
	ctx.log.info(`Received cookies: ${setCookieHeader} -> Saved cookies: ${savedCookies}`);
	return savedCookies;
}

function createSearchHash(searchQuery: string | null): string {
	return Crypto.createHash('sha1')
		.update((searchQuery || '') + 'JyjId97F9PVqUPuMO0')
		.digest('hex')
		.slice(0, 10);
}

function selectBestResult(resultsPage: CheerioLoadResult, results: any[], media: Media) {
	return (
		results
			.map((element) => {
				const year =
					extractYearFromText(resultsPage.$(element).find(locators.$result_year).text().trim())?.toString() || '';
				const title = resultsPage.$(element).find(locators.$result_title).text().trim();
				const entry = resultsPage.$(element).find(locators.$result_entry).attr('href') || '';
				const score = calculateMatchScore({ title, year }, media);
				return {
					inputs: { entry, title, year },
					score,
				};
			})
			.filter((result) => result.score >= 85)
			.sort((a, b) => b.score - a.score)
			.at(0) ?? null
	);
}

function extractResultIdFromURL(targetURL: URL): { type: string; id: string; name: string | null } | null {
	const match = targetURL.pathname.match(ID_TYPE_REGEX);
	if (!match) return null;
	return { type: match[1]!, id: match[2]!, name: match[3] || null };
}

async function getEpisodeURL(
	showURL: URL,
	pageRequestOpt: CheerioLoadRequest,
	requester: ScrapeRequester,
	ctx: ProviderContext,
): Promise<URL | null> {
	if (requester.media.type !== 'serie') return null;
	const media = requester.media as SerieMedia;

	const { type, id, name = encodeURI(media.title, 'form-uri') } = extractResultIdFromURL(showURL) || {};
	if (!type || !id) {
		ctx.log.warn('Could not extract type and id from the URL.');
		return null;
	}

	// Load the TV show page to extract season/episode information
	const showPage = await ctx.cheerio.load(showURL, pageRequestOpt, ctx.xhr);
	ctx.log.debug(`Loaded TV show page: ${showURL.href}`);

	// Find episodes for the target season
	const $episodes = showPage.$(`.show_season[data-id="${media.season}"] > .tv_episode_item`).toArray();
	if ($episodes.length === 0) {
		ctx.log.warn('No seasons found for the TV show.');
		return null;
	}
	ctx.log.info(`Found ${$episodes.length} episodes for season ${media.season}.`);

	// Find the matching episode
	const episode = $episodes
		.map((element) => {
			const episodeText = showPage.$(element).find('a').first().text().trim().split('\n').at(0) || '';
			const href = showPage.$(element).find('a').first().attr('href');
			const season = showPage.$(element).find('.episode-checkbox').attr('data-season')?.trim();
			const episodeId = showPage.$(element).find('.episode-checkbox').attr('value')?.trim();
			return { season, episode: episodeText, episodeId, href };
		})
		.find((ep) => ep.episode.includes(`E${media.episode}`) && ep.season === media.season.toString());

	if (!episode) {
		ctx.log.warn('Could not find the matching episode for the TV show.');
		return null;
	}
	ctx.log.info(
		`Found matching episode:\nSeason: ${episode.season}\nEpisode: ${episode.episode}\nID: ${episode.episodeId}\nHref: ${episode.href}`,
	);

	const episodeHref =
		episode.href ??
		PROVIDER.createPatternString('tv/{custom_id:string}/{name:string}-season-{season:1}-episode-{episode:1}', media, {
			custom_id: id,
			name,
		});
	return new URL(episodeHref, showURL.origin);
}

async function getServers(
	targetURL: URL,
	cookies: string | null,
	requester: ScrapeRequester,
	ctx: ProviderContext,
): Promise<ResolvedServer[]> {
	const { type, id } = extractResultIdFromURL(targetURL) || {};
	if (!type || !id) {
		ctx.log.warn('Could not extract type and id from the URL.');
		return [];
	}

	// Fetch the server list from the API
	const serverRequestURL = new URL('api/v1/s', PROVIDER.config.baseUrl);
	if (targetURL.hash.trim() !== '') {
		serverRequestURL.searchParams.set('e_id', targetURL.hash.substring(1));
	}
	serverRequestURL.searchParams.set('s_id', id);
	serverRequestURL.searchParams.set('type', type);
	ctx.log.info(`Fetching video servers from API: ${serverRequestURL.href} with id: ${id} and type: ${type}`);

	const apiOpts: ProviderFetchOptions = {
		attachUserAgent: true,
		method: 'GET',
		headers: {
			accept: '*/*',
			'accept-language': 'en-US,en;q=0.9,es;q=0.8',
			'cache-control': 'no-cache',
			pragma: 'no-cache',
			priority: 'u=1, i',
			'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"Windows"',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'same-origin',
			Dnt: '1',
			cookie: cookies || '',
			Referer: new URL('embed/movie?s_id=' + id, PROVIDER.config.baseUrl).href,
		},
	};
	const serverResponse = await ctx.xhr.fetchResponse<ServerResponse>(serverRequestURL, apiOpts, requester);
	const rawServers = serverResponse.servers.filter((server) => server.key !== undefined);
	ctx.log.debug(`Received ${rawServers.length} raw servers from API.`);

	// Filter out servers that do not have a valid key or name
	const validServers = rawServers.filter(
		(server) => [, /*'filemoon'*/ 'mixdrop'].includes(server.name.toLowerCase()) && server.key,
	);
	ctx.log.info(`Filtered valid servers: ${validServers.length} out of ${rawServers.length}.`);

	// Resolve each server's streaming link
	const resolved: ResolvedServer[] = [];
	// FOR NOW we will only process the first 2 servers to avoid potential blocking issues, but this can be adjusted as needed
	for (const server of validServers.slice(0, 2)) {
		try {
			const serverURL = new URL(`/links/go/${server.key}?embed=true`, PROVIDER.config.baseUrl);
			// !!! NOTE : Doing retry because sometimes when you fetch 2 iframe its seems to block the other request
			// thats why we do a retry with delay if the first attempt fail, and we also set maxAttempts to 2 to avoid infinite retry loop in case of persistent failure
			try {
				const resolveOpts: ProviderFetchOptions = {
					attachUserAgent: true,
					retryTimeout: 250,
					maxAttempts: 2,
					method: 'GET',
					headers: {
						accept: '*/*',
						'accept-language': 'en-US,en;q=0.9,es;q=0.8',
						'cache-control': 'no-cache',
						pragma: 'no-cache',
						priority: 'u=1, i',
						'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
						'sec-ch-ua-mobile': '?0',
						'sec-ch-ua-platform': '"Windows"',
						'sec-fetch-dest': 'empty',
						'sec-fetch-mode': 'cors',
						'sec-fetch-site': 'same-origin',
						cookie: cookies!,
						Referer: targetURL.href,
					},
				};
				ctx.log.debug(`Resolving server ${server.name} with URL: ${serverURL.href}`);
				const streamingLink = await ctx.xhr.fetchResponse<StreamingLink>(serverURL, resolveOpts, requester);
				resolved.push({
					name: server.name.toLowerCase(),
					url: streamingLink.link,
					quality: server.quality,
					file_name: server.file_name,
					file_size: server.file_size,
				});
				continue; // Skip browser session if API resolution succeeded
			} catch (error) {
				ctx.log.warn(
					`API resolution failed for server ${server.name} (key: ${server.key}), falling back to browser session. Error: ${error}`,
				);
			}

			// Browser session fallback
			ctx.log.info('--- Browser Session Fallback ---');
			let streamingSession: Awaited<ReturnType<ProviderContext['puppeteer']['launch']>> | null = null;
			try {
				// Load browser session
				streamingSession = await ctx.puppeteer.launch(serverURL, {
					requester,
					browsingOptions: {
						ignoreError: true,
						loadCriteria: 'networkidle0',
					},
				});

				const streamingLink = await extractStreamingLinkFromPage(streamingSession.page, ctx);
				if (!streamingLink?.link) {
					ctx.log.warn(`Primewire returned no streaming link for server ${server.name} (key: ${server.key}).`);
					continue;
				}
				resolved.push({
					name: server.name.toLowerCase(),
					url: streamingLink.link,
					quality: server.quality,
					file_name: server.file_name,
					file_size: server.file_size,
				});
			} catch (error) {
				ctx.log.error(`Error during browser session for server ${server.name} (key: ${server.key}): ${error}`);
			} finally {
				await streamingSession?.page.close().catch(() => null);
			}
		} catch (error) {
			ctx.log.error(`Error resolving server ${server.name} (key: ${server.key}): ${error}`);
		}
	}

	return resolved;
}
