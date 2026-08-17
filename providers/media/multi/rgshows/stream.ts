import type { ScrapeRequester, InternalMediaSource, ProviderContext } from 'grabit-engine';
import { PROVIDER } from './config';

/**
 * Stream handler for RgShows.
 *
 * TMDB-id JSON API: GET /main/{movie|tv}/... -> { stream: { url } } (direct m3u8/mp4).
 * The api.rgshows.ru host no longer resolves (rebranded to 1tube.org); kept as the
 * documented contract, provider is active:false until a live host is confirmed.
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const media = requester.media;
	const apiUrl = PROVIDER.createResourceURL(requester);
	const headers = { Referer: 'https://www.rgshows.ru/', Origin: 'https://www.rgshows.ru' };

	const text = await ctx.xhr
		.fetch(apiUrl, { method: 'GET', attachUserAgent: true, clean: true, headers }, requester)
		.then((r) => r.text())
		.catch(() => '');

	let streamUrl = '';
	try {
		streamUrl = (JSON.parse(text) as { stream?: { url?: string } }).stream?.url ?? '';
	} catch {
		ctx.log.warn('[rgshows] API did not return JSON (host likely offline).');
		return [];
	}
	if (!streamUrl) return [];

	const isMp4 = streamUrl.includes('mp4');
	const format = isMp4 ? 'mp4' : 'm3u8';
	ctx.log.info(`[rgshows] Resolved ${format}: ${streamUrl}`);

	return [
		{
			fileName: (media as any).title,
			playlist: streamUrl,
			language: 'en',
			format,
			xhr: { flags: ['CORS_BLOCKED', 'REFERER_LOCKED'], headers },
		} satisfies InternalMediaSource,
	];
}
