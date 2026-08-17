import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	type ChannelMedia,
	type MediaFormat,
} from 'grabit-engine';
import { PROVIDER } from './config';

const norm = (s: string): string => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

function formatOf(url: string): MediaFormat {
	if (/\.mpd(\?|$)/i.test(url)) return 'dash';
	if (/\.mp4(\?|$)/i.test(url)) return 'mp4';
	return 'm3u8';
}

/** Builds ordered, deduped candidate slugs for /channels/<slug>. */
function candidateSlugs(media: ChannelMedia): string[] {
	const id = media.channelId ?? '';
	const name = media.channelName ?? '';
	// Country from an iptv-org-style id ("CNN.us") if present.
	const cc = id.includes('.') ? norm(id.split('.').pop() ?? '') : '';
	const nName = norm(name);
	const out = [norm(id), cc ? nName + cc : '', nName + 'us', nName].filter(Boolean);
	return [...new Set(out)];
}

/** Pulls the channel's HLS sources from the "Choose Stream Source" block. */
function extractSources(html: string): string[] {
	const marker = html.indexOf('Choose Stream Source');
	const scope = marker >= 0 ? html.slice(marker, marker + 8000) : html;
	const urls = scope.match(/https?:\/\/[^"'\\\s<]+\.(?:m3u8|mpd|mp4)[^"'\\\s<]*/gi) ?? [];
	const clean = urls.map((u) => u.replace(/&amp;/g, '&').replace(/\\+$/, ''));
	return [...new Set(clean)];
}

/**
 * Stream handler for Public IPTV (live channels).
 *
 * Tries candidate /channels/<slug> pages (channelId first, then name+country
 * fallbacks) and scrapes the server-rendered HLS sources from the first hit.
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type !== 'channel') return [];
	const media = requester.media as ChannelMedia;
	const base = new URL(PROVIDER.config.baseUrl);

	let sources: string[] = [];
	for (const slug of candidateSlugs(media)) {
		const url = new URL(`channels/${slug}`, base);
		const res = await ctx.xhr
			.fetch(url, { method: 'GET', attachUserAgent: true, clean: true, cacheTTL: 3600000 }, requester)
			.catch(() => null);
		if (!res || res.status !== 200) continue;
		const html = await res.text().catch(() => '');
		sources = extractSources(html);
		if (sources.length) {
			ctx.log.info(`[publiciptv] Matched /channels/${slug} (${sources.length} source(s)).`);
			break;
		}
	}
	if (!sources.length) {
		ctx.log.warn(`[publiciptv] No channel page/sources for "${media.channelName}" (${media.channelId}).`);
		return [];
	}

	return sources.slice(0, 12).map(
		(url) =>
			({
				fileName: media.channelName || 'Channel',
				playlist: url,
				language: 'en',
				format: formatOf(url),
				xhr: { flags: ['CORS_BLOCKED'], headers: {} },
			}) satisfies InternalMediaSource,
	);
}
