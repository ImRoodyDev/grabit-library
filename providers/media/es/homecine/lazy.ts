import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	type SerieMedia,
	calculateMatchScore,
} from 'grabit-engine';
import { dispatchEmbed } from '../../../extractors/embedDispatch';
import { PROVIDER } from './config';

type Handle = { embed: string; watchUrl: string; fileName: string };
const EMBED_HOSTS = /fastream|goodstream|filemoon|supervideo|mixdrop|dood|dropload|vimeos|streamwish|filelions/i;

export async function getLazyStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const found = await findPlayerPage(requester, ctx);
	if (!found) return [];
	const embeds = listEmbeds(found.html, ctx);
	return embeds.map((embed) => ({
		fileName: (requester.media as any).title,
		language: 'es',
		lazy: {
			id: encodeURIComponent(
				JSON.stringify({
					embed,
					watchUrl: found.pageUrl.href,
					fileName: (requester.media as any).title,
				} satisfies Handle),
			),
			label: 'Spanish',
		},
		xhr: { flags: [], headers: {} },
	}));
}

export async function resolveLazy(
	id: string,
	ctx: ProviderContext,
	requester: ScrapeRequester,
): Promise<InternalMediaSource | null> {
	let handle: Handle;
	try {
		handle = JSON.parse(decodeURIComponent(id)) as Handle;
	} catch {
		return null;
	}
	if (!handle?.embed || !isAllowedEmbed(handle.embed)) return null;
	const sources = await dispatchEmbed(
		handle.embed,
		{ ...requester, extraHeaders: { Referer: handle.watchUrl } },
		ctx,
		'es',
	).catch(() => []);
	return sources[0] ?? null;
}

async function findPlayerPage(
	requester: ScrapeRequester,
	ctx: ProviderContext,
): Promise<{ pageUrl: URL; html: string } | null> {
	const base = new URL(PROVIDER.config.baseUrl);
	const headers = {
		accept: 'text/html,application/xhtml+xml',
		'accept-language': 'es-ES,es;q=0.9,en;q=0.8',
		Referer: base.origin + '/',
	};
	for (const url of PROVIDER.createResourceUrls(requester)) {
		const search = await ctx.xhr
			.fetch(url, { method: 'GET', attachUserAgent: true, clean: true, headers }, requester)
			.then((r) => r.text())
			.catch(() => '');
		const $ = ctx.cheerio.$load(search);
		let match: string | null = null;
		$('a[oldtitle]').each((_: number, element: any) => {
			const href = $(element).attr('href') || '';
			const title = $(element).attr('oldtitle') || '';
			if ((requester.media.type === 'serie') !== href.includes('/series/')) return;
			if (calculateMatchScore({ title }, requester.media) >= 80 && !match) match = href;
		});
		if (!match) continue;
		let pageUrl = new URL(match, base);
		let html = await ctx.xhr
			.fetch(pageUrl, { method: 'GET', attachUserAgent: true, clean: true, headers }, requester)
			.then((r) => r.text())
			.catch(() => '');
		if (requester.media.type === 'serie') {
			const media = requester.media as SerieMedia;
			const suffix = `-temporada-${media.season}-capitulo-${media.episode}`;
			const episode = ctx.cheerio
				.$load(html)('#seasons a')
				.toArray()
				.map((element: any) => ctx.cheerio.$load(html)(element).attr('href') || '')
				.find((href: string) => href.endsWith(suffix));
			if (!episode) continue;
			pageUrl = new URL(episode, base);
			html = await ctx.xhr
				.fetch(pageUrl, { method: 'GET', attachUserAgent: true, clean: true, headers }, requester)
				.then((r) => r.text())
				.catch(() => '');
		}
		return { pageUrl, html };
	}
	return null;
}
function listEmbeds(html: string, ctx: ProviderContext): string[] {
	const $ = ctx.cheerio.$load(html);
	const embeds: string[] = [];
	$('.les-content a').each((_: number, element: any) => {
		const label = $(element).text().toLowerCase();
		if (!label.includes('latino') && !label.includes('castellano')) return;
		const tab = $(element).attr('href');
		const src = tab?.startsWith('#') ? $(`${tab} iframe`).attr('src') : '';
		if (src && isAllowedEmbed(src)) embeds.push(src);
	});
	return [...new Set(embeds)];
}
function isAllowedEmbed(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === 'https:' && EMBED_HOSTS.test(url.hostname);
	} catch {
		return false;
	}
}
