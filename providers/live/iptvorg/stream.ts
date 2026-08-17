import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	type ChannelMedia,
	type MediaFormat,
	calculateMatchScore,
} from 'grabit-engine';
import { PROVIDER } from './config';

interface IptvStream {
	channel: string | null;
	feed: string | null;
	title: string;
	url: string;
	quality: string | null;
	user_agent: string | null;
	referrer: string | null;
}

const norm = (s: string): string => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

function formatOf(url: string): MediaFormat {
	if (/\.mpd(\?|$)/i.test(url)) return 'dash';
	if (/\.mp4(\?|$)/i.test(url)) return 'mp4';
	return 'm3u8';
}

/**
 * Stream handler for IPTV-org (live channels).
 *
 * Fetches the iptv-org streams catalog (cached) and matches the requested channel
 * by id (channel field, e.g. "CNN.us") first, then fuzzily by title vs channelName.
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type !== 'channel') return [];
	const media = requester.media as ChannelMedia;
	const url = PROVIDER.createResourceURL(requester);

	const text = await ctx.xhr
		.fetch(url, { method: 'GET', attachUserAgent: true, clean: true, cacheTTL: 21600000 }, requester)
		.then((r) => r.text())
		.catch(() => '');
	let streams: IptvStream[] = [];
	try {
		streams = JSON.parse(text) as IptvStream[];
	} catch {
		ctx.log.warn('[iptvorg] Failed to fetch/parse the streams catalog.');
		return [];
	}

	const wantId = norm(media.channelId ?? '');
	const wantName = media.channelName ?? '';

	// 1. Exact channel-id match (iptv-org ids look like "CNN.us").
	let matches = wantId ? streams.filter((s) => s.channel && norm(s.channel) === wantId) : [];

	// 2. Fall back to a fuzzy title match against the channel name.
	if (!matches.length && wantName) {
		const wantNorm = norm(wantName);
		matches = streams.filter((s) => {
			if (!s.title) return false;
			if (norm(s.title) === wantNorm) return true;
			return calculateMatchScore({ title: s.title }, media) >= 80;
		});
	}
	if (!matches.length) {
		ctx.log.warn(`[iptvorg] No stream for channel "${media.channelName}" (${media.channelId}).`);
		return [];
	}

	// Dedupe by url and cap the count for popular channels.
	const seen = new Set<string>();
	const out: InternalMediaSource[] = [];
	for (const s of matches) {
		if (!s.url || seen.has(s.url)) continue;
		seen.add(s.url);
		const flags: InternalMediaSource['xhr']['flags'] = ['CORS_BLOCKED'];
		const headers: Record<string, string> = {};
		if (s.referrer) {
			headers.Referer = s.referrer;
			flags.push('REFERER_LOCKED');
		}
		if (s.user_agent) headers['User-Agent'] = s.user_agent;

		const label = [s.title, s.feed, s.quality].filter(Boolean).join(' ');
		out.push({
			fileName: label || s.title,
			playlist: s.url,
			language: 'en',
			format: formatOf(s.url),
			xhr: { flags, headers },
		} satisfies InternalMediaSource);
		if (out.length >= 10) break;
	}
	ctx.log.info(`[iptvorg] Resolved ${out.length} stream(s) for "${media.channelName}".`);
	return out;
}
