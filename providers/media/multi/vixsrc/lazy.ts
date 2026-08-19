import type { ScrapeRequester, InternalMediaSource, ProviderContext } from 'grabit-engine';
import { PROVIDER } from './config';

export async function getLazyStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];

	const base = new URL(PROVIDER.config.baseUrl);
	const apiUrl = PROVIDER.createResourceURL(requester);
	const headers = { Referer: base.origin + '/' };
	const apiText = await ctx.xhr
		.fetch(apiUrl, { method: 'GET', attachUserAgent: true, clean: true, headers }, requester)
		.then((response) => response.text())
		.catch(() => '');

	let src = '';
	try {
		src = (JSON.parse(apiText) as { src?: string }).src ?? '';
	} catch {
		return [];
	}
	if (!src) return [];

	const embedUrl = new URL(src, base);
	if (embedUrl.origin !== base.origin) return [];

	return [
		{
			fileName: (requester.media as any).title,
			language: 'en',
			lazy: { id: encodeURIComponent(embedUrl.href), label: 'VixSrc' },
			xhr: { flags: [], headers: {} },
		},
	];
}

export async function resolveLazy(
	id: string,
	ctx: ProviderContext,
	requester: ScrapeRequester,
): Promise<InternalMediaSource | null> {
	const base = new URL(PROVIDER.config.baseUrl);
	let embedUrl: URL;
	try {
		embedUrl = new URL(decodeURIComponent(id));
	} catch {
		return null;
	}
	if (embedUrl.origin !== base.origin) return null;

	const headers = { Referer: base.origin + '/' };
	const embedHtml = await ctx.xhr
		.fetch(embedUrl, { method: 'GET', attachUserAgent: true, clean: true, headers }, requester)
		.then((response) => response.text())
		.catch(() => '');

	const token = embedHtml.match(/["']token["']\s*:\s*["']([^"']+)["']/)?.[1];
	const expires = embedHtml.match(/["']expires["']\s*:\s*["']([^"']+)["']/)?.[1];
	const urlMatch = embedHtml.match(/url\s*:\s*["']([^"']+)["']/)?.[1];
	if (!token || !expires || !urlMatch) return null;

	let playlistUrl: URL;
	try {
		playlistUrl = new URL(urlMatch, embedUrl);
	} catch {
		return null;
	}
	playlistUrl.searchParams.set('token', token);
	playlistUrl.searchParams.set('expires', expires);
	playlistUrl.searchParams.set('h', '1');

	return {
		fileName: (requester.media as any).title,
		playlist: playlistUrl.href,
		language: 'en',
		format: 'm3u8',
		xhr: { flags: ['CORS_BLOCKED'], headers: {} },
	};
}
