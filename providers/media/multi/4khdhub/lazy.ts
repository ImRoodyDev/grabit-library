import type { ScrapeRequester, InternalMediaSource, ProviderContext, CheerioLoadRequest, SerieMedia } from 'grabit-engine';
import { extractHubcloudStreams } from '../../../extractors/hubcloud';
import { resolveToHubcloud, detectQuality } from '../../../extractors/hubchain';
import { pickBestPost, titleTokens, getSeasonFromText } from '../../../extractors/postMatch';
import { PROVIDER } from './config';

const MAX_CANDIDATES = 3;
type SearchPost = { title: string; link: string; image: string };
type Candidate = { quality: string; link: string; label: string };
type LazyHandle = Candidate & { title: string };

export async function getLazyStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const pageOpt: CheerioLoadRequest = { ...requester, followRedirects: true, extraHeaders: {} };
	let posts: SearchPost[] = [];
	for (const url of PROVIDER.createResourceUrls(requester)) {
		posts = await searchPosts(url, ctx, pageOpt);
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

export async function resolveLazy(id: string, ctx: ProviderContext, requester: ScrapeRequester): Promise<InternalMediaSource | null> {
	let handle: LazyHandle;
	try {
		handle = JSON.parse(decodeURIComponent(id)) as LazyHandle;
	} catch {
		return null;
	}
	if (!handle?.title || !handle.link || !isAllowedCandidate(handle.link)) return null;
	const pageOpt: CheerioLoadRequest = { ...requester, followRedirects: true, extraHeaders: {} };
	try {
		const hubcloudLink = await resolveToHubcloud(handle.link, requester, ctx, pageOpt);
		if (!hubcloudLink) return null;
		const sources = await extractHubcloudStreams(hubcloudLink, requester, ctx, {
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

async function searchPosts(url: URL, ctx: ProviderContext, pageOpt: CheerioLoadRequest): Promise<SearchPost[]> {
	try {
		const { $ } = await ctx.cheerio.load(url, pageOpt, ctx.xhr);
		const posts: SearchPost[] = [];
		$('.card-grid').children().each((_: number, element: any) => {
			const title = $(element).find('.movie-card-title').text().trim();
			const link = $(element).attr('href');
			if (title && link) {
				const postUrl = new URL(link, `${PROVIDER.config.baseUrl}/`);
				posts.push({ title, link: `${postUrl.pathname}${postUrl.search}${postUrl.hash}`, image: $(element).find('img').attr('src') || '' });
			}
		});
		return posts;
	} catch {
		return [];
	}
}

async function getCandidateLinks(link: string, requester: ScrapeRequester, ctx: ProviderContext, pageOpt: CheerioLoadRequest): Promise<Candidate[]> {
	const { $ } = await ctx.cheerio.load(new URL(link, `${PROVIDER.config.baseUrl}/`), pageOpt, ctx.xhr);
	const media = requester.media;
	const candidates: Candidate[] = [];
	const isSeries = $('.season-content').length > 0 || media.type === 'serie';
	if (isSeries && media.type === 'serie') {
		const wantSeason = Number((media as SerieMedia).season);
		const wantEpisode = Number((media as SerieMedia).episode);
		$('.season-item').each((_: number, element: any) => {
			const seasonText = `${$(element).find('.episode-number').text()} ${$(element).find('.episode-title').text()}`;
			const season = getSeasonFromText(seasonText);
			if (season != null && season !== wantSeason) return;
			const groupQuality = detectQuality(seasonText);
			$(element).find('.episode-download-item').each((__: number, item: any) => {
				const fileTitle = $(item).find('.episode-file-title').text();
				const info = `${$(item).find('.episode-file-info').text()} ${fileTitle}`.replace(/\s+/g, ' ').trim();
				const epMatch = info.match(/episode[-\s]*(\d+)/i) || fileTitle.match(/s\d+\s*e\s*(\d+)/i);
				if (!epMatch || Number(epMatch[1]) !== wantEpisode) return;
				const href = $(item).find(".episode-links a:contains('HubCloud')").attr('href') || $(item).find('.episode-links a').first().attr('href');
				if (href && isAllowedCandidate(href)) candidates.push({ quality: detectQuality(info) !== 'Unknown' ? detectQuality(info) : groupQuality, link: href, label: `E${wantEpisode}` });
			});
		});
	} else {
		$('.download-item').each((_: number, element: any) => {
			const info = $(element).find('.flex-1.text-left.font-semibold').text().trim();
			const href = $(element).find(".grid.grid-cols-2.gap-2 a:contains('HubCloud')").attr('href');
			if (href && isAllowedCandidate(href)) candidates.push({ quality: detectQuality(info), link: href, label: detectQuality(info) });
		});
	}
	const seen = new Set<string>();
	return candidates.filter((candidate) => !seen.has(candidate.link) && seen.add(candidate.link));
}

function isAllowedCandidate(value: string): boolean {
	try {
		const url = new URL(value, PROVIDER.config.baseUrl);
		return url.protocol === 'https:' && /hubcloud|hubdrive|gdflix|search-recover|\/archives\//i.test(url.hostname + url.pathname);
	} catch {
		return false;
	}
}
