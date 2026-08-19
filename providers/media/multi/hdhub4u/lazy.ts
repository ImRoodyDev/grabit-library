import type {
	ScrapeRequester,
	InternalMediaSource,
	ProviderContext,
	CheerioLoadRequest,
	SerieMedia,
} from 'grabit-engine';
import { extractHubcloudStreams } from '../../../extractors/hubcloud';
import { resolveToHubcloud, detectQuality } from '../../../extractors/hubchain';
import { pickBestPost, titleTokens } from '../../../extractors/postMatch';
import { PROVIDER } from './config';

const HEADERS = { cookie: 'xla=s4t', Referer: 'https://google.com' };
type Post = { title: string; link: string; image: string };
type Candidate = { quality: string; link: string; label: string };
type Handle = Candidate & { title: string };

export async function getLazyStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const pageOpt: CheerioLoadRequest = { ...requester, followRedirects: true, extraHeaders: HEADERS };
	let posts: Post[] = [];
	for (const url of PROVIDER.createResourceUrls(requester)) {
		posts = await search(url, requester, ctx);
		if (posts.length) break;
	}
	const best = pickBestPost(posts, requester.media);
	if (!best) return [];
	const candidates = await candidatesFor(best.post.link, requester, ctx, pageOpt);
	return candidates
		.slice(0, 3)
		.map((candidate) => ({
			fileName: `${best.post.title} ${candidate.label}`.trim(),
			language: 'hi',
			lazy: {
				id: encodeURIComponent(JSON.stringify({ ...candidate, title: best.post.title } satisfies Handle)),
				label: candidate.label,
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
	if (!handle?.title || !allowed(handle.link)) return null;
	try {
		const pageOpt: CheerioLoadRequest = { ...requester, followRedirects: true, extraHeaders: HEADERS };
		const link = await resolveToHubcloud(handle.link, requester, ctx, pageOpt);
		if (!link) return null;
		const sources = await extractHubcloudStreams(link, requester, ctx, {
			fileName: `${handle.title} ${handle.label}`.trim(),
			quality: handle.quality,
			language: 'hi',
			matchTokens: titleTokens((requester.media as any).title),
		});
		return sources[0] ?? null;
	} catch {
		return null;
	}
}
async function search(url: URL, requester: ScrapeRequester, ctx: ProviderContext): Promise<Post[]> {
	try {
		const json = await ctx.xhr.fetchResponse<any>(
			url,
			{
				method: 'GET',
				attachUserAgent: true,
				clean: true,
				headers: { ...HEADERS, Referer: PROVIDER.config.baseUrl + '/', Accept: 'application/json, text/plain, */*' },
			},
			requester,
		);
		return (json?.hits || [])
			.map((hit: any) => hit.document || {})
			.map((doc: any) => ({
				title: String(doc.post_title || '')
					.replace(/Download/gi, '')
					.trim(),
				link: String(doc.permalink || ''),
				image: String(doc.post_thumbnail || ''),
			}))
			.filter((post: Post) => post.title && post.link);
	} catch {
		return [];
	}
}
async function candidatesFor(
	link: string,
	requester: ScrapeRequester,
	ctx: ProviderContext,
	pageOpt: CheerioLoadRequest,
): Promise<Candidate[]> {
	const { $ } = await ctx.cheerio.load(new URL(link, PROVIDER.config.baseUrl), pageOpt, ctx.xhr);
	const out: Candidate[] = [];
	$('a').each((_: number, element: any) => {
		const href = $(element).attr('href') || '';
		const text = `${$(element).text()} ${$(element).parent().text()}`;
		if (!allowed(href) || !/480|720|1080|2160|4k|drive/i.test(text)) return;
		if (requester.media.type === 'serie') {
			const ep = text.match(/episode\s*(\d+)/i);
			if (ep && Number(ep[1]) !== Number((requester.media as SerieMedia).episode)) return;
		}
		const quality = text.match(/\b(480p|720p|1080p|2160p|4k)\b/i)?.[0] || detectQuality(text);
		out.push({
			quality,
			link: href,
			label: requester.media.type === 'serie' ? `E${(requester.media as SerieMedia).episode}` : quality,
		});
	});
	return out.filter((item, index) => out.findIndex((other) => other.link === item.link) === index);
}
function allowed(value: string): boolean {
	try {
		const url = new URL(value, PROVIDER.config.baseUrl);
		return (
			url.protocol === 'https:' &&
			/hubcloud|hubdrive|gdflix|search-recover|\/archives\//i.test(url.hostname + url.pathname)
		);
	} catch {
		return false;
	}
}
