import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	type ChannelMedia,
	type MediaFormat,
	calculateMatchScore,
} from 'grabit-engine';
import { PROVIDER } from './config';

const norm = (s: string): string => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

function formatOf(url: string): MediaFormat {
	if (/\.mpd(\?|$)/i.test(url)) return 'dash';
	if (/\.(mp4|ts)(\?|$)/i.test(url)) return 'mp4';
	return 'm3u8';
}

/**
 * Stream handler for SupercamBR (live channels).
 *
 * The site offers a free nickname entry, but the list endpoints serve fine in
 * guest mode (a half-open session actually hides the menu), so we skip it.
 *   1. infopageandroid.php -> the curated getlistweb.php?l=… list URLs
 *   2. each list (cached) -> rows of `<greenyellow name>` + `videojs.php?url=<stream>`
 *   3. match by channel name, return the direct stream url(s)
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type !== 'channel') return [];
	const media = requester.media as ChannelMedia;
	const base = new URL(PROVIDER.config.baseUrl);

	// 1. Menu -> curated list proxies. Build under /scambr/ (a leading-slash
	// endpoint would resolve against the host root and 404).
	const menuUrl = new URL('infopageandroid.php', base);
	const menuHtml = await ctx.xhr
		.fetch(menuUrl, { method: 'GET', attachUserAgent: true, clean: true, cacheTTL: 10800000 }, requester)
		.then((r) => r.text())
		.catch(() => '');
	const listPaths = [...new Set((menuHtml.match(/getlistweb\.php\?l=[^'"]+/g) ?? []))]
		// Skip iptv-org (covered by its own provider) to cut redundant work.
		.filter((p) => !/iptv-org\.github\.io/.test(p));
	if (!listPaths.length) {
		ctx.log.warn('[supercambr] No lists found in the menu.');
		return [];
	}

	const wantName = media.channelName ?? '';
	const wantNorm = norm(wantName || media.channelId || '');
	const rowRe = /color=greenyellow>\s*(?:\d+\.)?([^<]+)<\/font>[\s\S]*?videojs\.php\?url=([^'"\s]+)/g;

	const seen = new Set<string>();
	const out: InternalMediaSource[] = [];
	for (const path of listPaths) {
		if (out.length >= 12) break;
		const listUrl = new URL('./' + path, base);
		const html = await ctx.xhr
			.fetch(listUrl, { method: 'GET', attachUserAgent: true, clean: true, cacheTTL: 10800000 }, requester)
			.then((r) => r.text())
			.catch(() => '');
		if (!html) continue;

		let m: RegExpExecArray | null;
		rowRe.lastIndex = 0;
		while ((m = rowRe.exec(html)) !== null) {
			const name = (m[1] ?? '').trim();
			const streamUrl = (m[2] ?? '').trim();
			if (!name || !streamUrl || seen.has(streamUrl)) continue;
			const nName = norm(name);
			const hit = nName === wantNorm || nName.includes(wantNorm) || calculateMatchScore({ title: name }, media) >= 80;
			if (!hit) continue;
			seen.add(streamUrl);
			out.push({
				fileName: name,
				playlist: streamUrl,
				language: 'pt',
				format: formatOf(streamUrl),
				xhr: { flags: ['CORS_BLOCKED'], headers: {} },
			} satisfies InternalMediaSource);
			if (out.length >= 12) break;
		}
	}
	ctx.log.info(`[supercambr] Resolved ${out.length} stream(s) for "${media.channelName}".`);
	return out;
}
