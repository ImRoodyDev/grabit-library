import type { ScrapeRequester, InternalMediaSource, ProviderContext } from 'grabit-engine';
import { PROVIDER } from './config';

/**
 * Stream handler for VixSrc.
 *
 * HTTP-only chain (no browser, TMDB-id based):
 *   1. GET /api/{movie|tv}/... -> JSON { src: "/embed/<id>?token=…&expires=…" }
 *   2. GET that /embed page -> window.masterPlaylist holds token, expires, url
 *   3. playlist = <url>&token=…&expires=…&h=1  (token-signed, multi-audio HLS)
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const media = requester.media;
	const base = new URL(PROVIDER.config.baseUrl);
	const apiUrl = PROVIDER.createResourceURL(requester);
	const headers = { Referer: base.origin + '/' };

	// 1. Resolve the embed src.
	const apiRes = await ctx.xhr
		.fetch(apiUrl, { method: 'GET', attachUserAgent: true, clean: true, headers }, requester)
		.catch(() => null);
	const apiText = (await apiRes?.text().catch(() => '')) ?? '';
	let src = '';
	try {
		src = (JSON.parse(apiText) as { src?: string }).src ?? '';
	} catch {
		ctx.log.warn('[vixsrc] /api did not return JSON (maybe unavailable title).');
		return [];
	}
	if (!src) return [];

	// 2. Fetch the embed page holding window.masterPlaylist.
	const embedUrl = new URL(src, base);
	const embedHtml = await ctx.xhr
		.fetch(embedUrl, { method: 'GET', attachUserAgent: true, clean: true, headers }, requester)
		.then((r) => r.text())
		.catch(() => '');

	const token = embedHtml.match(/['"]token['"]\s*:\s*['"]([^'"]+)['"]/)?.[1];
	const expires = embedHtml.match(/['"]expires['"]\s*:\s*['"]([^'"]+)['"]/)?.[1];
	const urlMatch = embedHtml.match(/url\s*:\s*['"]([^'"]+)['"]/)?.[1];
	if (!token || !expires || !urlMatch) {
		ctx.log.warn('[vixsrc] masterPlaylist token/expires/url not found on embed page.');
		return [];
	}

	// 3. Build the signed master playlist URL.
	const playlistUrl = new URL(urlMatch);
	playlistUrl.searchParams.set('token', token);
	playlistUrl.searchParams.set('expires', expires);
	playlistUrl.searchParams.set('h', '1');
	ctx.log.info(`[vixsrc] Resolved HLS: ${playlistUrl.href}`);

	return [
		{
			fileName: (media as any).title,
			playlist: playlistUrl.href,
			language: 'en',
			format: 'm3u8',
			xhr: { flags: ['CORS_BLOCKED'], headers: {} },
		} satisfies InternalMediaSource,
	];
}
