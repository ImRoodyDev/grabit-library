import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	attachExtension,
	pathJoin,
	ISO6391,
	MediaSource,
	extractContructorJSONArguments,
	ProviderFetchOptions,
	extractVariableByJSONKey,
} from 'grabit-engine';
import { PROVIDER } from './config';

const COMMON_HEADERS = {
	'accept-language': 'en-US,en;q=0.9,es;q=0.8',
	'cache-control': 'no-cache',
	pragma: 'no-cache',
	'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
	'sec-ch-ua-mobile': '?0',
	'sec-ch-ua-platform': '"Windows"',
};

/**
 * Stream handler for Ekola405gmt.
 *
 * Fetches and parses media streams from the provider's endpoint.
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	// Construct Yandex.Metrika cookies for bot detection evasion
	const ymCookies = makeYmCookies();

	// Step 1 — Extract the player configuration from the iframe
	const iframeURL = PROVIDER.createResourceURL(requester);
	ctx.log.debug(`Created iframe URL: ${iframeURL}`);

	const playerConfig = await getPlayerConfig(iframeURL, ymCookies, requester, ctx);
	if (!playerConfig) return [];

	// Step 2 — Fetch the file list and resolve sources for the requested media
	const sources = await getStreamSources(iframeURL, playerConfig, ymCookies, requester, ctx);
	if (sources.length === 0) {
		ctx.log.warn('No stream sources resolved from the file response.');
		return [];
	}
	ctx.log.info(`Resolved ${sources.length} stream source entries from file response`);

	// Step 3 — Resolve each source to its final streaming URL (one by one to avoid hammering the server)
	const servers = await resolveServers(sources, iframeURL, playerConfig, ymCookies, requester, ctx);

	// Step 4 — Map resolved servers to InternalMediaSource results (filter here if needed)
	const results: InternalMediaSource[] = servers.map((server) => ({
		fileName: server.title,
		format: server.format,
		language: server.language,
		playlist: server.url,
		xhr: { haveCorsPolicy: false, headers: server.headers },
	}));

	return results;
}

// --- Helper Functions ---

// ── Yandex.Metrika cookie generator ──────────────────────────────────────────
// These cookies are set by the ym() analytics script on every page load.
// The server checks for their presence as a basic bot-detection signal.
// Values just need to look plausible — they are never validated server-side.
//
//  _ym_uid   — random 19-digit visitor ID
//  _ym_d     — Unix timestamp (seconds) of the "first visit"
//  _ym_isad  — ad-blocker flag: 1 = no adblock, 2 = adblock detected
function makeYmCookies(): string {
	const now = Math.floor(Date.now() / 1000);
	// uid: current timestamp (10 digits) + 9 random digits
	const uid = `${now}${Math.floor(Math.random() * 1_000_000_000)
		.toString()
		.padStart(9, '0')}`;
	return `_ym_uid=${uid}; _ym_d=${now}; _ym_isad=2`;
}

/**
 * Loads the iframe page and extracts the HDVBPlayer configuration from its inline script.
 */
async function getPlayerConfig(
	iframeURL: URL,
	ymCookies: string,
	requester: ScrapeRequester,
	ctx: ProviderContext,
): Promise<PlayerConfig | null> {
	const rootIframe = await ctx.cheerio.load(
		iframeURL,
		{
			...requester,
			extraHeaders: {
				accept:
					'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
				...COMMON_HEADERS,
				priority: 'u=0, i',
				'sec-fetch-dest': 'iframe',
				'sec-fetch-mode': 'navigate',
				'sec-fetch-site': 'cross-site',
				'sec-fetch-storage-access': 'active',
				'upgrade-insecure-requests': '1',
				cookie: ymCookies,
				Referer: 'https://vegamovies.ad/',
			},
		},
		ctx.xhr,
	);

	// Find the script tag that contains the player configuration
	const targetedScript = rootIframe.$('script:contains("HDVBPlayer")').html();
	if (!targetedScript) {
		ctx.log.error('Player configuration script not found in iframe');
		return null;
	}
	ctx.log.info(`Found player configuration script in iframe: ${targetedScript.substring(0, 100)}...`);

	// Get player configuration code seems to switch sometimes between
	// using let/var and contructor argument
	const playerConfig: PlayerConfig | null = targetedScript.includes('HDVBPlayer({')
		? (extractContructorJSONArguments(targetedScript) as any)
		: (extractVariableByJSONKey(targetedScript, ['file', 'key', 'href']) as any);
	if (!playerConfig) {
		ctx.log.error('Failed to extract player configuration from script');
		return null;
	}
	ctx.log.info(`Extracted player configuration from script: ${JSON.stringify(playerConfig).substring(0, 100)}...`);
	return playerConfig;
}

/**
 * Fetches the playlist/file list from the player config endpoint
 * and resolves sources for the requested media type (movie or serie).
 */
async function getStreamSources(
	iframeURL: URL,
	playerConfig: PlayerConfig,
	ymCookies: string,
	requester: ScrapeRequester,
	ctx: ProviderContext,
): Promise<StreamSource[]> {
	const fileURL = new URL(playerConfig.file, iframeURL.origin);
	ctx.log.info(`Constructed file URL from player config: ${fileURL}`);

	const fileResponse = await ctx.xhr.fetch(
		fileURL,
		{
			method: 'POST',
			clean: true,
			attachUserAgent: true,
			headers: {
				accept: '*/*',
				...COMMON_HEADERS,
				'content-type': 'application/x-www-form-urlencoded',
				'content-length': '0',
				priority: 'u=1, i',
				'sec-fetch-dest': 'empty',
				'sec-fetch-mode': 'cors',
				'sec-fetch-site': 'same-origin',
				'sec-fetch-storage-access': 'active',
				'x-csrf-token': playerConfig.key,
				cookie: ymCookies,
				Referer: iframeURL.href,
				Origin: iframeURL.origin,
				Dnt: '1',
			},
		},
		requester,
	);
	const file = await fileResponse.json().then((data) => (Array.isArray(data) ? data.flat() : []));
	// ctx.log.info(`Fetched file streams information: ${JSON.stringify(file)}`);

	// Resolve file information from response based on media type
	const streamInfos =
		requester.media.type == 'movie'
			? createStreamSources(file as StreamInfo[])
			: requester.media.type == 'serie'
				? createStreamSources(file as StreamInfo[], requester.media.season, requester.media.episode)
				: [];

	return streamInfos;
}

/**
 * Resolves each stream source entry to its final streaming URL.
 * Processes one by one to avoid hammering the server.
 */
async function resolveServers(
	sources: StreamSource[],
	iframeURL: URL,
	playerConfig: PlayerConfig,
	ymCookies: string,
	requester: ScrapeRequester,
	ctx: ProviderContext,
): Promise<ResolvedStreamServer[]> {
	const fileURL = new URL(playerConfig.file, iframeURL.origin);
	const fileDir = fileURL.pathname.split('/').slice(0, -1).join('/');
	const fileExtension = fileURL.pathname.split('.').pop() || '';
	const postHeaders: Record<string, string> = {
		accept: '*/*',
		...COMMON_HEADERS,
		'content-type': 'application/x-www-form-urlencoded',
		priority: 'u=0, i',
		'sec-fetch-dest': 'empty',
		'sec-fetch-mode': 'cors',
		'sec-fetch-site': 'same-origin',
		'sec-fetch-storage-access': 'active',
		'x-csrf-token': playerConfig.key,
		cookie: ymCookies,
		Referer: iframeURL.href,
		Origin: iframeURL.origin,
	};

	const m3u8Headers: Record<string, string> = {
		accept: '*/*',
		...COMMON_HEADERS,
		priority: 'u=1, i',
		'sec-fetch-dest': 'empty',
		'sec-fetch-mode': 'cors',
		'sec-fetch-site': 'same-site',
		Referer: iframeURL.origin + '/',
		Origin: iframeURL.origin,
	};

	const resolved: ResolvedStreamServer[] = [];
	for (const source of sources) {
		try {
			const server = await resolveStreamURL(source, fileURL, fileDir, fileExtension, postHeaders, m3u8Headers, requester, ctx);
			if (server) resolved.push(server);
		} catch (error) {
			ctx.log.error(`Error fetching stream for source ${source.title}:`, error);
		}
	}

	return resolved;
}

/**
 * Resolves a single stream source to its final URL by POSTing for the m3u8
 * link and following any redirect.
 */
async function resolveStreamURL(
	source: StreamSource,
	fileURL: URL,
	fileDir: string,
	fileExtension: string,
	postHeaders: Record<string, string>,
	m3u8Headers: Record<string, string>,
	requester: ScrapeRequester,
	ctx: ProviderContext,
): Promise<ResolvedStreamServer | null> {
	const idPath = pathJoin(fileDir, source.file.startsWith('~') ? source.file.slice(1) : source.file);
	const entry = attachExtension(source.end_tag ?? fileExtension, idPath);
	const targetURL = new URL(entry, fileURL.origin);

	// POST to get the raw m3u8 URL
	const fileTextResponse = await ctx.xhr.fetch(
		targetURL,
		{ method: 'POST', clean: true, attachUserAgent: true, headers: postHeaders },
		requester,
	);
	// ctx.log.info(`Fetched file: ${source.title} at URL: ${targetURL}`);
	const m3u8URL = await fileTextResponse.text();

	// GET the m3u8 URL to follow any redirect
	const m3u8Opts: ProviderFetchOptions = {
		method: 'GET',
		clean: true,
		attachUserAgent: true,
		headers: m3u8Headers,
	};
	const m3u8FileResponse = await ctx.xhr.fetch(m3u8URL, m3u8Opts, requester);
	const finalURL = m3u8FileResponse.headers.get('Location') || m3u8FileResponse.headers.get('location') || m3u8URL;
	ctx.log.info(`Successfully fetched stream for source ${source.title}, lang: ${source.language}: ${finalURL}`);

	return {
		title: 'Video Stream',
		url: finalURL,
		format: (finalURL.split('.').pop() as MediaSource['format']) || 'm3u8',
		language: source.language,
		headers: m3u8Headers,
	};
}

// --- File Information Resolvers ---
function createStreamSources(contents: StreamInfo[], season?: number, episode?: number): StreamSource[] {
	let sources: StreamSource[] = [];

	if (isSerieFileInformation(contents)) {
		const id = `${season}-${episode}`;
		// Find the season folder that contains the episode
		const s_folder = contents.find((s_item) => s_item.folder?.some((ep) => ep.id?.trim() === id));
		if (s_folder) {
			const e_folder = s_folder.folder.find((ep) => ep.id?.trim() === id);
			if (e_folder && Array.isArray(e_folder.folder)) {
				const flat_files = e_folder.folder.flat();
				sources = flat_files.map((file) => ({
					id: file.id,
					file: file.file,
					end_tag: file.end_tag || null,
					title: file.title,
					language: ISO6391.getCode(file.title.split(' ').shift() || '') || 'unknown',
				}));
			}
		}
	} else if (isMovieFileInformation(contents)) {
		// Simple flat file list — no season/episode folder nesting
		sources = contents.map((file) => ({
			id: file.id,
			file: file.file,
			end_tag: null,
			title: file.title,
			language: ISO6391.getCode(file.title.split(' ').shift() || '') || 'unknown',
		}));
	}

	return sources;
}

function isSerieFileInformation(info: StreamInfo[]): info is SerieStreamInfo[] {
	return info.every((item) => 'folder' in item && Array.isArray(item.folder));
}

function isMovieFileInformation(info: StreamInfo[]): info is MovieStreamInfo[] {
	return info.every((item) => 'file' in item && typeof item.file === 'string');
}

// --- Types ---

type PlayerConfig = {
	file: string;
	id: string;
	cuid: string;
	key: string;
	movie: string;
	host: string;
	masterId: string;
	masterHash: string;
	userIp: string;
	poster: string;
	href: string;
	p2p: boolean;
};

type StreamSource = {
	id: string;
	file: string;
	end_tag: string | null;
	title: string;
	language: string;
};

type ResolvedStreamServer = {
	title: string;
	url: string;
	format: MediaSource['format'];
	language: string;
	headers: Record<string, string>;
};

type MovieStreamInfo = {
	title: string;
	id: string;
	translator: string;
	targets: string;
	file: string;
};

type SerieStreamInfo = {
	title: string;
	id: string;
	folder: {
		episode: string;
		title: string;
		id: string;
		folder: (
			| {
					file: string;
					end_tag: string | null;
					title: string;
					translator: string;
					id: string;
			  }
			| []
		)[];
	}[];
};

type StreamInfo = MovieStreamInfo | SerieStreamInfo;
