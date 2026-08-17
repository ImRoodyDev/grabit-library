import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	type CheerioLoadRequest,
	type SerieMedia,
} from 'grabit-engine';
import { extractHubcloudStreams } from '../../../extractors/hubcloud';
import { resolveToHubcloud, detectQuality } from '../../../extractors/hubchain';
import { pickBestPost, titleTokens, getSeasonFromText } from '../../../extractors/postMatch';
import { PROVIDER } from './config';

// grabit's providerFetch/cheerioLoad attach requester.userAgent (and it wins), so we
// don't hardcode one. Kept as an extension point for any other default headers.
const HEADERS: Record<string, string> = {};

/** How many candidate download links we resolve per request. */
const MAX_CANDIDATES = 3;

type SearchPost = { title: string; link: string; image: string };
type Candidate = { quality: string; link: string; label: string };

/**
 * Stream handler for 4KHDHub.
 *
 * Flow: `/?s=` search -> best-match post -> parse HubCloud download buttons ->
 * resolve the hubdrive/redirect chain -> HubCloud extractor.
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const media = requester.media;

	const pageOpt: CheerioLoadRequest = {
		...requester,
		followRedirects: true,
		extraHeaders: { ...HEADERS },
	};

	// --- 1. Search ---------------------------------------------------------
	// `createResourceUrls` expands the `/?s={title:form-uri}` entry into the
	// deduplicated, prioritized list of original + localized-title search URLs.
	let posts: SearchPost[] = [];
	for (const url of PROVIDER.createResourceUrls(requester)) {
		posts = await searchPosts(url, ctx, pageOpt);
		if (posts.length > 0) break;
	}
	if (posts.length === 0) {
		ctx.log.warn('[4khdhub] No search results.');
		return [];
	}

	// --- 2. Best match -----------------------------------------------------
	const best = pickBestPost(posts, media);
	if (!best) {
		ctx.log.warn('[4khdhub] No post cleared the match threshold.');
		return [];
	}
	ctx.log.info(`[4khdhub] Best match: "${best.post.title}" (score ${best.score}) -> ${best.post.link}`);

	// --- 3. Parse the post page into candidate download links --------------
	const candidates = await getCandidateLinks(best.post.link, requester, ctx, pageOpt);
	if (candidates.length === 0) {
		ctx.log.warn('[4khdhub] No download candidates on the post page.');
		return [];
	}
	ctx.log.info(`[4khdhub] ${candidates.length} candidate link(s) before resolution.`);

	// --- 4. Resolve each candidate -> HubCloud -> sources ------------------
	const results: InternalMediaSource[] = [];
	for (const cand of candidates.slice(0, MAX_CANDIDATES)) {
		try {
			const hubcloudLink = await resolveToHubcloud(cand.link, requester, ctx, pageOpt);
			if (!hubcloudLink) {
				ctx.log.debug(`[4khdhub] Could not resolve candidate: ${cand.link}`);
				continue;
			}
			const sources = await extractHubcloudStreams(hubcloudLink, requester, ctx, {
				fileName: `${best.post.title} ${cand.label}`.trim(),
				quality: cand.quality,
				language: 'hi',
				matchTokens: titleTokens((media as any).title),
			});
			results.push(...sources);
		} catch (error) {
			ctx.log.error(`[4khdhub] Candidate resolution failed (${cand.link}): ${(error as Error).message}`);
		}
	}

	ctx.log.info(`[4khdhub] Returning ${results.length} source(s).`);
	return results;
}

// ─── Search ──────────────────────────────────────────────────────────────────

async function searchPosts(url: URL, ctx: ProviderContext, pageOpt: CheerioLoadRequest): Promise<SearchPost[]> {
	const baseUrl = PROVIDER.config.baseUrl;
	try {
		const { $ } = await ctx.cheerio.load(url, pageOpt, ctx.xhr);
		const posts: SearchPost[] = [];
		$('.card-grid')
			.children()
			.each((_: number, element: any) => {
				const title = $(element).find('.movie-card-title').text().trim();
				const link = $(element).attr('href');
				const image = $(element).find('img').attr('src') || '';
				if (title && link) {
					const postUrl = new URL(link, `${baseUrl}/`);
					posts.push({ title, link: `${postUrl.pathname}${postUrl.search}${postUrl.hash}`, image });
				}
			});
		ctx.log.debug(`[4khdhub] Search ${url.href} -> ${posts.length} hit(s).`);
		return posts;
	} catch (error) {
		ctx.log.warn(`[4khdhub] Search failed for ${url.href}: ${(error as Error).message}`);
		return [];
	}
}

// ─── Meta: candidate download links ──────────────────────────────────────────

async function getCandidateLinks(
	link: string,
	requester: ScrapeRequester,
	ctx: ProviderContext,
	pageOpt: CheerioLoadRequest,
): Promise<Candidate[]> {
	const url = new URL(link, `${PROVIDER.config.baseUrl}/`);
	const { $ } = await ctx.cheerio.load(url, pageOpt, ctx.xhr);
	const media = requester.media;
	const candidates: Candidate[] = [];

	const isSeries = $('.season-content').length > 0 || media.type === 'serie';

	if (isSeries && media.type === 'serie') {
		const wantSeason = Number((media as SerieMedia).season);
		const wantEpisode = Number((media as SerieMedia).episode);
		// `.season-item` groups a season+quality (e.g. "S05 1080p BluRay"); each holds a
		// list of `.episode-download-item` (one per episode, with a HubCloud link).
		$('.season-item').each((_: number, element: any) => {
			const seasonText = `${$(element).find('.episode-number').text()} ${$(element).find('.episode-title').text()}`;
			const season = getSeasonFromText(seasonText);
			if (season != null && season !== wantSeason) return; // wrong season group
			const groupQuality = detectQuality(seasonText);
			$(element)
				.find('.episode-download-item')
				.each((__: number, item: any) => {
					const fileTitle = $(item).find('.episode-file-title').text();
					const info = `${$(item).find('.episode-file-info').text()} ${fileTitle}`.replace(/\s+/g, ' ').trim();
					const epMatch =
						info.match(/episode[-\s]*(\d+)/i) || fileTitle.match(/s\d+\s*e\s*(\d+)/i);
					if (!epMatch || Number(epMatch[1]) !== wantEpisode) return;
					const href =
						$(item).find(".episode-links a:contains('HubCloud')").attr('href') ||
						$(item).find('.episode-links a').first().attr('href');
					if (href) {
						const q = detectQuality(info) !== 'Unknown' ? detectQuality(info) : groupQuality;
						candidates.push({ quality: q, link: href, label: `E${wantEpisode}` });
					}
				});
		});
	} else {
		// Movie: each `.download-item` groups a quality with its host links.
		$('.download-item').each((_: number, element: any) => {
			const info = $(element).find('.flex-1.text-left.font-semibold').text().trim();
			const href = $(element).find(".grid.grid-cols-2.gap-2 a:contains('HubCloud')").attr('href');
			if (href) candidates.push({ quality: detectQuality(info), link: href, label: detectQuality(info) });
		});
	}

	// Prefer higher quality, de-dupe by URL.
	const order: Record<string, number> = { '4k': 4, '2160p': 4, '1080p': 3, '720p': 2, '480p': 1, unknown: 0 };
	const seen = new Set<string>();
	return candidates
		.filter((c) => (c.link && !seen.has(c.link) ? (seen.add(c.link), true) : false))
		.sort((a, b) => (order[b.quality.toLowerCase()] || 0) - (order[a.quality.toLowerCase()] || 0));
}
