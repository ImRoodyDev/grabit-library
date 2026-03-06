import type { ScrapeRequester, InternalSubtitleSource, ProviderContext } from 'grabit-engine';
import { PROVIDER } from './config';

/**
 * Subtitle handler for Ip.
 *
 * Fetches subtitle data from the provider's API.
 */
export async function getSubtitles(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalSubtitleSource[]> {
	const url = PROVIDER.createResourceURL(requester);

	const subtitleUrl = new URL(`${url.origin}/api/subtitles?id=${url.searchParams.get('tmdb')}`);
	const response = await ctx.xhr.fetch(subtitleUrl, {}, requester);
	const data = (await response.json()) as { language: string; languageName: string; url: string }[];

	if (!Array.isArray(data) || data.length === 0) return [];

	return [
		{
			fileName: 'subtitles.srt',
			format: 'srt',
			sources: data.map((sub) => ({
				language: sub.language,
				languageName: sub.languageName,
				url: sub.url,
			})),
			xhr: { haveCorsPolicy: false, headers: {} },
		},
	];
}
