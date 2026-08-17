import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	type CheerioLoadRequest,
	type SerieMedia,
} from 'grabit-engine';
import { extractHubcloudStreams } from '../../../extractors/hubcloud';
import { resolveToHubcloud, detectQuality } from '../../../extractors/hubchain';
import { pickBestPost, titleTokens } from '../../../extractors/postMatch';
import { PROVIDER } from './config';

// No User-Agent: grabit's providerFetch/cheerioLoad attach requester.userAgent (and it wins).
const HDB_HEADERS: Record<string, string> = {
	cookie: 'xla=s4t',
	Referer: 'https://google.com',
};

/** Max seconds we honour the site's artificial redirect delay (keeps us under the scrape timeout). */
const MAX_REDIRECT_WAIT_S = 12;
/** How many candidate download links we resolve per request. */
const MAX_CANDIDATES = 3;

type Candidate = { quality: string; link: string; label: string };

/**
 * Stream handler for HdHub4u.
 *
 * Flow: search (Typesense API) -> best-match post -> parse download buttons ->
 * resolve the hubdrive/redirect chain into a HubCloud page -> HubCloud extractor.
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const media = requester.media;

	const pageOpt: CheerioLoadRequest = {
		...requester,
		followRedirects: true,
		extraHeaders: { ...HDB_HEADERS },
	};

	// --- 1. Search ---------------------------------------------------------
	// `createResourceUrls` expands the pingora Typesense entry into the deduplicated,
	// prioritized list of original + localized-title search URLs.
	let posts: SearchPost[] = [];
	for (const url of PROVIDER.createResourceUrls(requester)) {
		posts = await searchPosts(url, requester, ctx);
		if (posts.length > 0) break;
	}
	if (posts.length === 0) {
		ctx.log.warn('[hdhub4u] No search results.');
		return [];
	}

	// --- 2. Best match -----------------------------------------------------
	const best = pickBestPost(posts, media);
	if (!best) {
		ctx.log.warn('[hdhub4u] No post cleared the match threshold.');
		return [];
	}
	ctx.log.info(`[hdhub4u] Best match: "${best.post.title}" (score ${best.score}) -> ${best.post.link}`);

	// --- 3. Parse the post page into candidate download links --------------
	const candidates = await getCandidateLinks(best.post.link, requester, ctx, pageOpt);
	if (candidates.length === 0) {
		ctx.log.warn('[hdhub4u] No download candidates on the post page.');
		return [];
	}
	ctx.log.info(`[hdhub4u] ${candidates.length} candidate link(s) before resolution.`);

	// --- 4. Resolve each candidate -> HubCloud -> sources ------------------
	const results: InternalMediaSource[] = [];
	const language = 'hi';
	for (const cand of candidates.slice(0, MAX_CANDIDATES)) {
		try {
			const hubcloudLink = await resolveToHubcloud(cand.link, requester, ctx, pageOpt);
			if (!hubcloudLink) {
				ctx.log.debug(`[hdhub4u] Could not resolve candidate to HubCloud: ${cand.link}`);
				continue;
			}
			const sources = await extractHubcloudStreams(hubcloudLink, requester, ctx, {
				fileName: `${best.post.title} ${cand.label}`.trim(),
				quality: cand.quality,
				language,
				matchTokens: titleTokens((media as any).title),
			});
			results.push(...sources);
		} catch (error) {
			ctx.log.error(`[hdhub4u] Candidate resolution failed (${cand.link}): ${(error as Error).message}`);
		}
	}

	ctx.log.info(`[hdhub4u] Returning ${results.length} source(s).`);
	return results;
}

// ─── Search ──────────────────────────────────────────────────────────────────

type SearchPost = { title: string; link: string; image: string };

async function searchPosts(url: URL, requester: ScrapeRequester, ctx: ProviderContext): Promise<SearchPost[]> {
	const baseUrl = PROVIDER.config.baseUrl;
	try {
		const json = await ctx.xhr.fetchResponse<any>(
			url,
			{
				method: 'GET',
				attachUserAgent: true,
				clean: true,
				headers: { ...HDB_HEADERS, Referer: baseUrl + '/', Accept: 'application/json, text/plain, */*' },
			},
			requester,
		);
		const hits: any[] = Array.isArray(json?.hits) ? json.hits : [];
		const out: SearchPost[] = [];
		for (const hit of hits) {
			const doc = hit?.document || {};
			const title = String(doc.post_title || '')
				.replace(/Download/gi, '')
				.trim();
			const permalink = String(doc.permalink || '');
			if (!title || !permalink) continue;
			const postUrl = new URL(permalink, `${baseUrl}/`);
			out.push({
				title,
				link: `${postUrl.pathname}${postUrl.search}${postUrl.hash}`,
				image: String(doc.post_thumbnail || ''),
			});
		}
		ctx.log.debug(`[hdhub4u] Search ${url.href} -> ${out.length} hit(s).`);
		return out;
	} catch (error) {
		ctx.log.warn(`[hdhub4u] Search API failed for ${url.href}: ${(error as Error).message}`);
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
	const container = $('.page-body').length ? $('.page-body') : $('body');
	const media = requester.media;

	const candidates: Candidate[] = [];
	const push = (quality: string, href: string | undefined, label: string) => {
		if (href) candidates.push({ quality, link: href, label });
	};

	if (media.type === 'serie') {
		const serie = media as SerieMedia;
		const wantEpisode = Number(serie.episode);

		// Pattern A: "Episode N" strong tags followed by drive links.
		container.find('strong').each((_: number, el: any) => {
			const epText = $(el).text().trim();
			const epMatch = epText.match(/^episode\s*(\d+)$/i);
			if (!epMatch || Number(epMatch[1]) !== wantEpisode) return;
			const heading = $(el).closest('h1,h2,h3,h4,h5,h6,p,div');
			for (const sibling of heading.nextAll().toArray()) {
				const $sib = $(sibling);
				if (/^episode\s*\d+$/i.test($sib.text().trim())) break;
				$sib.find('a[href*="hubdrive"],a[href*="hubcloud"],a:contains("Drive")').each((__: number, a: any) => {
					const href = $(a).attr('href');
					const ctxText = ($(a).text() + ' ' + $(a).parent().text()).toLowerCase();
					push(detectQuality(ctxText), href, `E${wantEpisode}`);
				});
			}
		});

		// Pattern B: anchors literally containing "EPiSODE".
		if (candidates.length === 0) {
			container.find('a:contains("EPiSODE"),a:contains("Episode")').each((_: number, el: any) => {
				const epText = $(el).text();
				const epMatch = epText.match(/episode\s*(\d+)/i);
				if (epMatch && Number(epMatch[1]) === wantEpisode) {
					push(detectQuality(epText), $(el).attr('href'), `E${wantEpisode}`);
				}
			});
		}
	}

	// Movies only: quality-labelled download anchors. We deliberately do NOT use
	// this as a series fallback — for series it grabs arbitrary episodes (wrong-episode
	// links), so an empty result is preferable to a misleading one.
	if (candidates.length === 0 && media.type === 'movie') {
		container
			.find('a:contains("480"),a:contains("720"),a:contains("1080"),a:contains("2160"),a:contains("4K")')
			.each((_: number, el: any) => {
				const text = $(el).text();
				const href = $(el).attr('href');
				const quality = text.match(/\b(480p|720p|1080p|2160p|4k)\b/i)?.[0] || detectQuality(text);
				push(quality, href, quality);
			});
	}

	// Prefer higher quality first, de-dupe by URL.
	const order: Record<string, number> = { '4k': 4, '2160p': 4, '1080p': 3, '720p': 2, '480p': 1, Unknown: 0 };
	const seen = new Set<string>();
	return candidates
		.filter((c) => (c.link && !seen.has(c.link) ? (seen.add(c.link), true) : false))
		.sort((a, b) => (order[b.quality.toLowerCase()] || 0) - (order[a.quality.toLowerCase()] || 0));
}
