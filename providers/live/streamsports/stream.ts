import { type ScrapeRequester, type InternalMediaSource, type ProviderContext, type ChannelMedia } from 'grabit-engine';
import { PROVIDER } from './config';

/**
 * Stream handler for StreamSports99 (BLOCKED, active:false).
 *
 * The channel/stream API (api.cdnlivetv.is) is auth-gated: unauthenticated
 * requests 401 or redirect to /login. Until an anonymous token flow is found,
 * this queries the documented endpoint and returns [] gracefully.
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type !== 'channel') return [];
	const media = requester.media as ChannelMedia;
	const base = new URL(PROVIDER.config.baseUrl);
	const url = new URL('api/channels', base);

	const res = await ctx.xhr
		.fetch(
			url,
			{ method: 'GET', attachUserAgent: true, clean: true, headers: { Origin: 'https://streamsports99.su', Referer: 'https://streamsports99.su/' } },
			requester,
		)
		.catch(() => null);
	if (!res || res.status === 401 || res.status === 302 || res.status === 403) {
		ctx.log.warn(`[streamsports] API is auth-gated (status ${res?.status ?? 'network error'}); no anonymous access.`);
		return [];
	}
	// If the API ever serves anonymously, matching by media.channelName would go here.
	ctx.log.warn(`[streamsports] Unexpected open response for "${media.channelName}"; matching not implemented.`);
	return [];
}
