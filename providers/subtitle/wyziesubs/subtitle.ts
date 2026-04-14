import {
	type ScrapeRequester,
	type InternalSubtitleSource,
	type ProviderContext,
	deduplicateArray,
	secondsToMilliseconds,
} from 'grabit-engine';
import { PROVIDER } from './config';

const KEY = 'wyzie-6cc153c9149470f286ca7a2cb1334b39';

/**
 * Subtitle handler for Wyziesubs.
 *
 * Fetches subtitle data from the provider's API.
 */
export async function getSubtitles(
	requester: ScrapeRequester,
	ctx: ProviderContext,
): Promise<InternalSubtitleSource[]> {
	if (requester.media.type === 'channel') return [];

	// Sources available for subtitle in wyziesubs
	const subSources = ['subdl', 'subf2m', 'opensubtitles', 'podnapisi', 'animetosho', 'gestdown'];

	// URLs to search there is an one with tmdb and one with imdb
	// Default is tmdb
	let urls = deduplicateArray([
		PROVIDER.createResourceURL(requester),
		new URL(
			PROVIDER.createPatternString(
				requester.media.type === 'movie'
					? '/search?id={tmdb:string}&format=srt'
					: '/search?id={tmdb:string}&season={season:1}&episode={episode:1}&format=srt',
				requester.media,
			),
			PROVIDER.config.baseUrl,
		),
	]);

	// And now for each source, we will create a URL with the source as a query parameter
	urls = urls.flatMap((url) =>
		subSources.map((source) => {
			const newUrl = new URL(url.href);
			newUrl.searchParams.set('source', source);
			// Add the API key as a query parameter
			newUrl.searchParams.set('key', KEY);
			return newUrl;
		}),
	);

	// Loop through the URLs and try to fetch subtitles
	const subtitleResults: Subtitle[] = [];
	for (const [i, url] of urls.entries()) {
		ctx.log.info(`Attempting to fetch subtitles from URL ${i + 1}/${urls.length}: ${url.href}`);
		try {
			const subtitles = await ctx.xhr.fetchResponse<Subtitle[]>(
				url,
				{
					method: 'GET',
					attachUserAgent: true,
					timeout: secondsToMilliseconds(3),
				},
				requester,
			);
			if (subtitles && subtitles.length > 0) {
				ctx.log.info(`Successfully fetched ${subtitles.length} subtitles from URL ${url.href}`);
				subtitleResults.push(...subtitles);
			} else {
				ctx.log.warn(`No subtitles found at URL ${url.href}`);
			}

			// If we successfully fetched subtitles, we can break the loop
			if (subtitleResults.length > 0) break;
			// Otherwise, we will try the next URL
		} catch (error) {
			ctx.log.error(`Failed to fetch subtitles from URL ${url.href}: ${(error as Error).message}`);
			continue; // Try the next URL
		}
	}

	return subtitleResults.map((subtitle) => ({
		fileName: subtitle.fileName,
		url: subtitle.url,
		language: subtitle.language,
		format: subtitle.format,
		languageName: subtitle.display,
		xhr: {
			haveCorsPolicy: true,
			headers: {},
		},
	})) satisfies InternalSubtitleSource[];
}

type SubtitleFormat = 'srt';
type SubtitleEncoding = 'UTF-8' | 'CP1252';

interface Subtitle {
	id: string;
	url: string;
	flagUrl: string;
	format: SubtitleFormat;
	encoding: SubtitleEncoding;
	display: string;
	language: string;
	media: string;
	isHearingImpaired: boolean;
	source: 'subdl' | 'subf2m' | 'opensubtitles' | 'podnapisi' | 'animetosho' | 'gestdown';
	release: string;
	releases: string[];
	origin: 'BluRay' | 'WEB' | 'HDRip';
	fileName: string;
	downloadCount: number;
	matchedRelease: string | null;
	matchedFilter: string | null;
}
