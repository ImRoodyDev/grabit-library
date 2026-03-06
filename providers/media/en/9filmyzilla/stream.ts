import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	type ProviderFetchOptions,
	cosineSimilarity,
	CheerioLoadResult,
	SerieMedia,
	Media,
	MovieMedia,
} from 'grabit-engine';
import { extractCherryUpnsStream } from '../../../extractors/cherryupns';
import { PROVIDER, locators } from './config';

// Threshold for considering a title match as valid (out of 100)
// This threshold can be adjusted based on testing to balance between matching accuracy and recall
const TITLE_MATCH_THRESHOLD = 85;
const REMOVE_PARENTHESES_REGEX = /\s*\([^)]*\)\s*/g;
const DETECT_SEASON_REGEX = /\bseason\s+(\d+)\b/i;
const DETECT_EPISODE_REGEX = /\bepisode\s+(\d+)\b/i;

/**
 * Stream handler for 9filmyzilla.
 *
 * Fetches and parses media streams from the provider's endpoint.
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type == 'channel') return [];

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
			cookie: 'starstruck_eaba890c7302d2af9e8bbf05a869c2b9=cb0a907fd1a24b17d4f16b19a0d30d68;',
		},
	};

	// Build deduplicated, prioritized search URLs (ID-based first, then localized title variants)
	const searchURLs = PROVIDER.createResourceUrls(requester);
	// Create the search URL based on the requester's media information
	let resourceURL = searchURLs[0]!;
	// Loop through all search URL candidates until a best match is found
	let bestMatch: ReturnType<typeof selectBestResult> = null;
	for (let i = 0; i < searchURLs.length; i++) {
		try {
			resourceURL = searchURLs[i]!;
			ctx.log.debug(`Search attempt ${i + 1}/${searchURLs.length}: ${resourceURL}`);

			const resultsPage = await ctx.cheerio.load(resourceURL, pageRequestOpt, ctx.xhr);
			const $results = resultsPage.$(locators.$results).toArray();

			if ($results.length > 0) {
				ctx.log.info(`Found ${$results.length} results on attempt ${i + 1}.`);
				bestMatch = selectBestResult(resultsPage, $results, requester.media);
				if (bestMatch) break;
			}
			ctx.log.debug(`No match on attempt ${i + 1}, trying next...`);
		} catch (error) {
			ctx.log.error(`Error during search attempt ${i + 1}: ${(error as Error).message}`);
		}
	}

	if (!bestMatch || !bestMatch.scores.inputs.href) {
		ctx.log.warn('No matching result found after filtering.');
		return [];
	}

	// Create the full URL for the best match page
	const bestResourceURL = new URL(bestMatch.scores.inputs.href, resourceURL.origin);
	pageRequestOpt.extraHeaders.Referer = resourceURL.href; // Update referer for the best resource page
	const bestResourcePage = await ctx.cheerio.load(bestResourceURL, pageRequestOpt, ctx.xhr);
	pageRequestOpt.extraHeaders.Referer = bestResourceURL.href; // Update referer for subsequent requests
	ctx.log.info(`Loaded media page for best match: ${bestResourceURL.href}`);

	// Check whether to take movie approach to extract streams
	// Because sometimes series results are playing in movie path which is weird but I have to deal with it
	const takeMovieApproach = bestResourceURL.href.includes('/movies/') && requester.media.type === 'serie';

	// !!!!NOTE: Select the supported server to extract the stream from
	let multiaudioServer: Server | null = null;
	// If the requester is requesting an serie episode
	// The first case you have to select the episode that the user is request and only one server is used for this
	// Server = epidose number
	if (requester.media.type === 'serie' && takeMovieApproach) {
		const episodes = extractServers(bestResourcePage);
		ctx.log.info(`Extracted episode server: ${JSON.stringify(episodes)}`);

		// Select server that match the season and episode number in the server name
		multiaudioServer =
			episodes.find((server) => server.name.includes(PROVIDER.createPatternString('s{season:2} e{episode:2}', requester.media))) ?? null;
		ctx.log.info(`Selected episode server: ${JSON.stringify(multiaudioServer)}`);
	}
	// For cases when  you need to provide episode and season in the url path
	else if (requester.media.type === 'serie' && !takeMovieApproach) {
		// the last path in the url should contain season and episode number like /serie-name-season-1-episode-2
		// So i have to extract the path from the bestResourceURL that contain the title example /serie-name
		// Later i can attacht the pattern -season-1-episode-2 at the end of the path to create the query to select the server
		const episodePath = PROVIDER.createPatternString('episodes/{query:string}-season-{season:1}-episode-{episode:1}', requester.media, {
			query: bestResourceURL.pathname
				.split('/')
				.filter((segment) => segment.trim() !== '')
				.slice(-1)[0],
		});

		const episodeURL = new URL(episodePath, bestResourceURL.origin);
		ctx.log.info(`Constructed episode URL for server selection: ${episodeURL.href}`);

		// Extract servers from the episode page
		const episodePage = await ctx.cheerio.load(episodeURL, pageRequestOpt, ctx.xhr);
		pageRequestOpt.extraHeaders.Referer = episodeURL.href; // Update referer for the episode page
		const episodeServers = extractServers(episodePage);
		ctx.log.info(`Extracted episode servers: ${JSON.stringify(episodeServers)}`);

		// Select server that match the season and episode number in the server name
		multiaudioServer = episodeServers.find((server) => server.name.includes('multi audio') || server.name.includes('english')) ?? null;
		ctx.log.info(`Selected episode server from episode page: ${JSON.stringify(multiaudioServer)}`);
	} else if (requester.media.type === 'movie') {
		const servers = extractServers(bestResourcePage);
		ctx.log.info(`Extracted video servers: ${JSON.stringify(servers)}`);

		// Find the best server based on language
		multiaudioServer = servers.find((server) => server.name.includes('multi audio') || server.name.includes('english')) ?? null;
		ctx.log.info(`Selected multi audio server: ${JSON.stringify(multiaudioServer)}`);
	}

	if (!multiaudioServer) {
		ctx.log.warn('No suitable server found.');
		return [];
	}

	// Extract stream from the selected server
	// By fetching the iframe URL and then fetching the download URL
	//  from the iframe response and finally decrypting the download URL response to get the real stream url
	const iframeRequestURL = new URL('wp-admin/admin-ajax.php', resourceURL.origin);
	const iframeRequestOpts: ProviderFetchOptions = {
		method: 'POST',
		clean: true,
		attachUserAgent: true,
		body: new URLSearchParams({
			action: 'doo_player_ajax',
			post: multiaudioServer.post,
			nume: multiaudioServer.nume,
			type: multiaudioServer.type,
		}),
		headers: {
			accept: '*/*',
			'accept-language': 'en-US,en;q=0.9,es;q=0.8',
			'cache-control': 'no-cache',
			'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
			pragma: 'no-cache',
			priority: 'u=1, i',
			'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"Windows"',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'same-origin',
			'x-requested-with': 'XMLHttpRequest',
			cookie: pageRequestOpt.extraHeaders.cookie,
			Referer: pageRequestOpt.extraHeaders.Referer,
			Origin: resourceURL.origin,
		},
	};
	const iframeResponse = await ctx.xhr.fetchResponse<{ embed_url: string; type: 'iframe' | string }>(
		iframeRequestURL,
		iframeRequestOpts,
		requester,
	);

	if (iframeResponse) ctx.log.info(`Received iframe information: ${JSON.stringify(iframeResponse)}`);

	// Extract streams from the cherry.upns.online iframe
	if (iframeResponse.embed_url.includes('cherry.upns.online')) {
		return await extractCherryUpnsStream(new URL(iframeResponse.embed_url), ctx, requester);
	} else {
		ctx.log.error('Unsupported or missing iframe embed URL in the response.');
		return [];
	}
}

type Server = {
	name: string;
	type: 'tv' | 'movie';
	post: string;
	nume: string;
	languageIso?: string;
	nameIsDirectEpisode: boolean;
};

function extractServers(page: CheerioLoadResult) {
	const $servers = page.$('.dooplay_player .ajax_mode > .dooplay_player_option').toArray();
	return $servers
		.map(($server) => {
			const serverName = page.$($server).find('.title').text().toLocaleLowerCase().trim();
			const nameIsDirectEpisode = !!serverName.match(DETECT_EPISODE_REGEX);
			const dataPost = page.$($server).attr('data-post');
			const dataNume = page.$($server).attr('data-nume');
			const dataType = page.$($server).attr('data-type') as 'tv' | 'movie';
			const flagURL = page.$($server).find('img').attr('src');
			const languageIso = flagURL ? flagURL.split('/').pop()?.split('.').shift() : undefined;
			return {
				name: serverName,
				type: dataType,
				post: dataPost,
				nume: dataNume,
				languageIso,
				nameIsDirectEpisode,
			};
		})
		.filter((server) => !server.name.includes('trailer') && !!server.post && !!server.nume)
		.sort(
			(a, b) =>
				Object.entries(b).reduce((acc, [key, value]) => acc + Number(!!value), 0) -
				Object.entries(a).reduce((acc, [key, value]) => acc + Number(!!value), 0),
		) as Server[];
}

function selectBestResult(resultsPage: CheerioLoadResult, results: any[], media: Media) {
	// Get the best matching result based onserie
	if (media.type === 'serie') {
		return (
			results
				.map(($result) => ({ $result, scores: tvResultsScores(resultsPage, $result, media) }))
				.filter(({ scores }) => {
					const { isSerie, titleContainsSeason, seasonMatch, titleMatch } = scores;
					return isSerie && (titleContainsSeason ? seasonMatch && titleMatch : titleMatch);
				})
				.sort((a, b) => {
					// Prefer explicit season-in-title matches, then rank by similarity
					const bScore = (b.scores.titleContainsSeason && b.scores.seasonMatch ? 100 : 0) + b.scores.titleScore;
					const aScore = (a.scores.titleContainsSeason && a.scores.seasonMatch ? 100 : 0) + a.scores.titleScore;
					return bScore - aScore;
				})
				.at(0) ?? null
		);
	}

	// Get the best matching movie result based on title similarity
	if (media.type === 'movie') {
		return (
			results
				.map(($result) => ({ $result, scores: movieResultScores(resultsPage, $result, media) }))
				.filter(({ scores }) => scores.titleMatch && scores.isMovie)
				.sort((a, b) => b.scores.titleScore - b.scores.yearDiff - (a.scores.titleScore - a.scores.yearDiff))
				.at(0) ?? null
		);
	}

	return null;
}

function movieResultScores(resultsPage: CheerioLoadResult, $result: any, media: MovieMedia) {
	const type = resultsPage.$($result).find('article .thumbnail span').text().trim().toLowerCase() as 'movie' | 'tv';
	const title = resultsPage.$($result).find(locators.$result_title).text().replace(REMOVE_PARENTHESES_REGEX, '').trim();
	const year = resultsPage.$($result).find(locators.$result_year).text().trim();
	const href = resultsPage.$($result).find(locators.$result_entry).attr('href');

	// Calculate scores
	const titleScore = cosineSimilarity(media.title, title) * 100;
	const yearDiff = Math.abs(parseInt(year) - media.releaseYear);
	const isMovie = type === 'movie';
	return {
		titleScore,
		titleMatch: titleScore > TITLE_MATCH_THRESHOLD,
		isMovie,
		yearDiff,
		inputs: {
			title,
			year,
			type,
			href,
		},
	};
}

function tvResultsScores(resultsPage: CheerioLoadResult, $result: any, media: SerieMedia) {
	const type = resultsPage.$($result).find('article .thumbnail span').text().trim().toLowerCase() as 'movie' | 'tv';
	const title = resultsPage.$($result).find(locators.$result_title).text().replace(REMOVE_PARENTHESES_REGEX, '').trim();
	const href = resultsPage.$($result).find(locators.$result_entry).attr('href');

	// Detect whether the result title includes an explicit season label
	const titleContainsSeason = !!title.match(DETECT_SEASON_REGEX);
	// Align the target title structure with the result title format
	const targetTitle = titleContainsSeason ? `${media.title} Season ${media.season}` : media.title;

	// Sometimes I see that series results are splitted by title + season in the title,
	// so I will try to detect season number in the title and prefer those results if the season number matches the requester's season
	const isSerie = titleContainsSeason || type === 'tv';
	const titleScore = cosineSimilarity(targetTitle, title) * 100;
	const seasonMatch = titleContainsSeason ? title.toLowerCase().includes(`season ${media.season}`) : false;
	const titleMatch = titleScore > TITLE_MATCH_THRESHOLD;
	return {
		titleScore,
		titleContainsSeason,
		seasonMatch,
		titleMatch,
		isSerie,
		inputs: {
			title,
			type,
			href,
		},
	};
}
