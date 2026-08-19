import type { ScrapeRequester, InternalMediaSource, ProviderContext, CheerioLoadRequest, SerieMedia } from 'grabit-engine';
import { extractHubcloudStreams } from '../../../extractors/hubcloud';
import { extractGdflixStreams } from '../../../extractors/gdflix';
import { detectQuality } from '../../../extractors/hubchain';
import { pickBestPost, titleTokens, getSeasonFromText } from '../../../extractors/postMatch';
import { PROVIDER } from './config';

type SearchPost = { title: string; link: string; image: string };
type Candidate = { quality: string; link: string; label: string };
type LazyHandle = Candidate & { title: string };

export async function getLazyStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const pageOpt: CheerioLoadRequest = { ...requester, followRedirects: true, extraHeaders: { 'accept-language': 'en-US,en;q=0.9' } };
	let posts: SearchPost[] = [];
	for (const url of PROVIDER.createResourceUrls(requester)) {
		posts = await searchPosts(url, requester, ctx);
		if (posts.length) break;
	}
	const best = pickBestPost(posts, requester.media);
	if (!best) return [];
	const candidates = await getCandidateLinks(best.post.link, requester, ctx, pageOpt);
	return candidates.map((candidate) => ({
		fileName: `${best.post.title} ${candidate.label}`.trim(),
		language: 'hi',
		lazy: { id: encodeURIComponent(JSON.stringify({ ...candidate, title: best.post.title })), label: candidate.label },
		xhr: { flags: [], headers: {} },
	}));
}

export async function resolveLazy(id: string, ctx: ProviderContext, requester: ScrapeRequester): Promise<InternalMediaSource | null> {
	let handle: LazyHandle;
	try {
		handle = JSON.parse(decodeURIComponent(id)) as LazyHandle;
	} catch {
		return null;
	}
	if (!handle?.title || !handle.link || !isAllowedLink(handle.link)) return null;
	const pageOpt: CheerioLoadRequest = { ...requester, followRedirects: true, extraHeaders: { 'accept-language': 'en-US,en;q=0.9' } };
	try {
		const resolved = await resolveDriveLink(handle.link, requester, ctx, pageOpt);
		if (!resolved) return null;
		const meta = { fileName: `${handle.title} ${handle.label}`.trim(), quality: handle.quality, language: 'hi' };
		const sources = resolved.kind === 'gdflix'
			? await extractGdflixStreams(resolved.url, requester, ctx, meta)
			: await extractHubcloudStreams(resolved.url, requester, ctx, { ...meta, matchTokens: titleTokens((requester.media as any).title) });
		return sources[0] ?? null;
	} catch {
		return null;
	}
}

async function searchPosts(url: URL, requester: ScrapeRequester, ctx: ProviderContext): Promise<SearchPost[]> {
	try {
		const json = await ctx.xhr.fetchResponse<{ hits?: Array<{ document?: any }> }>(url, { method: 'GET', attachUserAgent: true, clean: true, headers: { Referer: PROVIDER.config.baseUrl + '/' } }, requester);
		return (Array.isArray(json?.hits) ? json.hits : []).map((hit) => hit.document || {}).map((doc) => ({
			title: String(doc.post_title || '').replace(/Download/gi, '').trim(),
			link: String(doc.permalink || ''),
			image: String(doc.post_thumbnail || ''),
		})).filter((post) => post.title && post.link);
	} catch {
		return [];
	}
}

async function getCandidateLinks(link: string, requester: ScrapeRequester, ctx: ProviderContext, pageOpt: CheerioLoadRequest): Promise<Candidate[]> {
	const { $ } = await ctx.cheerio.load(new URL(link, `${PROVIDER.config.baseUrl}/`), pageOpt, ctx.xhr);
	const media = requester.media;
	const candidates: Candidate[] = [];
	$('h5 a, a').each((_: number, element: any) => {
		const text = $(element).text();
		if (!/\b(480p|720p|1080p|2160p|4k)\b/i.test(text) || /zip/i.test(text)) return;
		const href = $(element).attr('href') || '';
		if (!isAllowedLink(href)) return;
		const headingText = $(element).parent('h5').prev().text() || $(element).closest('h5,h4,p').prev().text() || text;
		if (media.type === 'serie') {
			const season = getSeasonFromText(headingText) ?? getSeasonFromText(text);
			if (season != null && season !== Number((media as SerieMedia).season)) return;
		}
		const quality = text.match(/\b(480p|720p|1080p|2160p|4k)\b/i)?.[0] || detectQuality(text);
		candidates.push({ quality, link: href, label: quality });
	});
	const seen = new Set<string>();
	return candidates.filter((candidate) => !seen.has(candidate.link) && seen.add(candidate.link));
}

async function resolveDriveLink(link: string, requester: ScrapeRequester, ctx: ProviderContext, pageOpt: CheerioLoadRequest): Promise<{ kind: 'hubcloud' | 'gdflix'; url: string } | null> {
	if (!isAllowedLink(link)) return null;
	let url = new URL(link, `${PROVIDER.config.baseUrl}/`).href;
	try {
		const { $ } = await ctx.cheerio.load(new URL(url), pageOpt, ctx.xhr);
		const host = $('a:contains("HubCloud")').attr('href') || $('a:contains("GDFlix"),a:contains("GDFLIX")').attr('href');
		if (host && isAllowedLink(host)) url = new URL(host, url).href;
	} catch {}
	if (/gdflix/i.test(url)) return { kind: 'gdflix', url };
	if (/hubcloud/i.test(url)) return { kind: 'hubcloud', url };
	return null;
}

function isAllowedLink(value: string): boolean {
	try {
		const url = new URL(value, PROVIDER.config.baseUrl);
		return url.protocol === 'https:' && /hubcloud|hubdrive|gdflix|search-recover|\/archives\//i.test(url.hostname + url.pathname);
	} catch {
		return false;
	}
}
