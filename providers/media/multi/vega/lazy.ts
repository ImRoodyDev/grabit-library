import type {
	ScrapeRequester,
	InternalMediaSource,
	ProviderContext,
	CheerioLoadRequest,
	SerieMedia,
} from 'grabit-engine';
import { extractHubcloudStreams } from '../../../extractors/hubcloud';
import { detectQuality } from '../../../extractors/hubchain';
import { pickBestPost, getSeasonFromText } from '../../../extractors/postMatch';
import { PROVIDER } from './config';

const HEADERS = { Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9', cookie: 'xla=s4t' };
const MAX_CANDIDATES = 3;
type SearchPost = { title: string; link: string; image: string };
type Candidate = { quality: string; link: string; label: string };
type LazyHandle = Candidate & { title: string };

export async function getLazyStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const pageOpt: CheerioLoadRequest = { ...requester, followRedirects: true, extraHeaders: { ...HEADERS } };
	let posts: SearchPost[] = [];
	for (const url of PROVIDER.createResourceUrls(requester)) {
		posts = await searchPosts(url, requester, ctx);
		if (posts.length) break;
	}
	const best = pickBestPost(posts, requester.media);
	if (!best) return [];
	const candidates = await getCandidateLinks(best.post.link, requester, ctx, pageOpt);
	return candidates.slice(0, MAX_CANDIDATES).map((candidate) => ({
		fileName: `${best.post.title} ${candidate.label}`.trim(),
		language: 'hi',
		lazy: { id: encodeURIComponent(JSON.stringify({ ...candidate, title: best.post.title })), label: candidate.label },
		xhr: { flags: [], headers: {} },
	}));
}

export async function resolveLazy(
	id: string,
	ctx: ProviderContext,
	requester: ScrapeRequester,
): Promise<InternalMediaSource | null> {
	let handle: LazyHandle;
	try {
		handle = JSON.parse(decodeURIComponent(id)) as LazyHandle;
	} catch {
		return null;
	}
	if (!handle?.title || !isAllowedVegaLink(handle.link)) return null;
	try {
		const cloudLink = await resolveVegaLink(handle.link, requester, ctx);
		if (!cloudLink) return null;
		const sources = await extractHubcloudStreams(cloudLink, requester, ctx, {
			fileName: `${handle.title} ${handle.label}`.trim(),
			quality: handle.quality,
			language: 'hi',
		});
		return sources[0] ?? null;
	} catch {
		return null;
	}
}

async function searchPosts(url: URL, requester: ScrapeRequester, ctx: ProviderContext): Promise<SearchPost[]> {
	try {
		const json = await ctx.xhr.fetchResponse<{ hits?: Array<{ document?: any }> }>(
			url,
			{
				method: 'GET',
				attachUserAgent: true,
				clean: true,
				headers: { ...HEADERS, Referer: PROVIDER.config.baseUrl + '/' },
			},
			requester,
		);
		return (Array.isArray(json?.hits) ? json.hits : [])
			.map((hit) => hit.document || {})
			.map((doc) => {
				const postUrl = new URL(String(doc.permalink || ''), `${PROVIDER.config.baseUrl}/`);
				return {
					title: String(doc.post_title || '')
						.replace(/Download/gi, '')
						.trim(),
					link: `${postUrl.pathname}${postUrl.search}${postUrl.hash}`,
					image: String(doc.post_thumbnail || ''),
				};
			})
			.filter((post) => post.title && post.link);
	} catch {
		return [];
	}
}

async function getCandidateLinks(
	link: string,
	requester: ScrapeRequester,
	ctx: ProviderContext,
	pageOpt: CheerioLoadRequest,
): Promise<Candidate[]> {
	const { $ } = await ctx.cheerio.load(new URL(link, `${PROVIDER.config.baseUrl}/`), pageOpt, ctx.xhr);
	const candidates: Candidate[] = [];
	if (requester.media.type === 'serie') {
		const media = requester.media as SerieMedia;
		const episodePages: { quality: string; href: string }[] = [];
		$('h3').each((_: number, heading: any) => {
			if (getSeasonFromText($(heading).text()) !== Number(media.season)) return;
			let node = $(heading).next();
			let guard = 0;
			while (node.length && !node.is('h3') && guard++ < 8) {
				const href = node
					.find('a')
					.filter((__: number, anchor: any) => /episode/i.test($(anchor).text()))
					.first()
					.attr('href');
				if (href && isAllowedVegaLink(href)) {
					episodePages.push({ quality: detectQuality($(heading).text()), href });
					break;
				}
				node = node.next();
			}
		});
		for (const page of unique(episodePages.map((item) => item.href))
			.slice(0, 3)
			.map((href) => episodePages.find((item) => item.href === href)!)) {
			const episodePage = await getEpisodeList(page.href, requester, ctx, pageOpt);
			const episode = episodePage.find((item) => episodeNumberOf(item.title) === Number(media.episode));
			if (episode && isAllowedVegaLink(episode.link))
				candidates.push({ quality: page.quality, link: episode.link, label: `E${media.episode}` });
		}
	} else {
		$('a:has(.dwd-button)').each((_: number, anchor: any) => {
			const href = $(anchor).attr('href');
			if (!href || !isAllowedVegaLink(href)) return;
			const label = `${$(anchor).closest('p').prevAll('h3,h4,h5,p').first().text()} ${$(anchor).text()}`;
			candidates.push({ quality: detectQuality(label), link: href, label: detectQuality(label) });
		});
	}
	return uniqueCandidates(candidates).sort((a, b) => qualityRank(b.quality) - qualityRank(a.quality));
}

async function getEpisodeList(
	link: string,
	requester: ScrapeRequester,
	ctx: ProviderContext,
	pageOpt: CheerioLoadRequest,
): Promise<{ title: string; link: string }[]> {
	try {
		let target = link;
		if (target.includes('url=')) {
			try {
				target = atob(target.split('url=')[1]!);
			} catch {
				return [];
			}
		}
		if (!isAllowedVegaLink(target)) return [];
		const { $ } = await ctx.cheerio.load(new URL(target, `${PROVIDER.config.baseUrl}/`), pageOpt, ctx.xhr);
		const container = $('.entry-content,.entry-inner').length ? $('.entry-content,.entry-inner') : $('body');
		const episodes: { title: string; link: string }[] = [];
		container.find('h3,h4').each((_: number, element: any) => {
			const title = $(element).text().replace(/\s+/g, ' ').trim();
			if (!/episode/i.test(title)) return;
			const hrefs = $(element)
				.nextUntil('h3,h4')
				.find('a')
				.map((__: number, anchor: any) => $(anchor).attr('href'))
				.get()
				.filter((href: string) => href && href !== '#');
			const href =
				hrefs.find((value: string) => /vcloud|hubcloud|v-cloud|\/drive\/|hubdrive|cloud\./i.test(value)) ||
				hrefs.find((value: string) => /nexdrive/i.test(value)) ||
				hrefs[0];
			if (href && isAllowedVegaLink(href)) episodes.push({ title, link: href });
		});
		return episodes;
	} catch {
		return [];
	}
}

async function resolveVegaLink(link: string, requester: ScrapeRequester, ctx: ProviderContext): Promise<string | null> {
	if (!isAllowedVegaLink(link)) return null;
	if (/(?:hubcloud|vcloud|v-cloud|\/drive\/|hubdrive|cloud\.)/i.test(link)) return link;
	try {
		const response = await ctx.xhr.fetch(
			new URL(link, PROVIDER.config.baseUrl),
			{ method: 'GET', attachUserAgent: true, clean: true, headers: { ...HEADERS } },
			requester,
		);
		const text = await response.text();
		return (
			text.match(/<a\s+href="([^"]*cloud\.[^"]*)"/i)?.[1] ||
			text.match(/href="(https?:\/\/[^\"]*(?:vcloud|hubcloud|hubdrive)[^\"]*)"/i)?.[1] ||
			null
		);
	} catch {
		return null;
	}
}

function isAllowedVegaLink(value: string): boolean {
	try {
		const url = new URL(value, PROVIDER.config.baseUrl);
		if (url.protocol !== 'https:') return false;
		return (
			url.origin === new URL(PROVIDER.config.baseUrl).origin ||
			/nexdrive|hubcloud|vcloud|hubdrive|cloud\./i.test(url.hostname + url.pathname)
		);
	} catch {
		return false;
	}
}
function episodeNumberOf(title: string): number | null {
	const match =
		title.match(/episodes?\s*:?\s*(\d+)/i) || title.match(/\be\s*p?\s*(\d+)\b/i) || title.match(/\be(\d+)\b/i);
	return match ? Number(match[1]) : null;
}
function unique<T>(items: T[]): T[] {
	return [...new Set(items)];
}
function uniqueCandidates(items: Candidate[]): Candidate[] {
	return items.filter((item, index) => items.findIndex((other) => other.link === item.link) === index);
}
function qualityRank(value: string): number {
	return (
		({ '4k': 4, '2160p': 4, '1080p': 3, '720p': 2, '480p': 1 } as Record<string, number>)[value.toLowerCase()] || 0
	);
}
