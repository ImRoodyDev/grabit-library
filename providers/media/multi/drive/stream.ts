import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	type CheerioLoadRequest,
	type SerieMedia,
} from 'grabit-engine';
import { extractHubcloudStreams } from '../../../extractors/hubcloud';
import { extractGdflixStreams } from '../../../extractors/gdflix';
import { detectQuality } from '../../../extractors/hubchain';
import { pickBestPost, titleTokens, getSeasonFromText } from '../../../extractors/postMatch';
import { PROVIDER } from './config';

const MAX_CANDIDATES = 3;

type SearchPost = { title: string; link: string; image: string };
type Candidate = { quality: string; link: string; label: string };

/**
 * Stream handler for MoviesDrive.
 *
 * Flow: `search.php?q=` (JSON) -> best-match post -> quality download links ->
 * resolve the MoviesDrive links page to a HubCloud / GDFlix URL -> extractor.
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const media = requester.media;

	const pageOpt: CheerioLoadRequest = {
		...requester,
		followRedirects: true,
		extraHeaders: { 'accept-language': 'en-US,en;q=0.9,es;q=0.8' },
	};

	// --- 1. Search ---------------------------------------------------------
	// `createResourceUrls` expands the `/search.php?q={title:form-uri}` entry into
	// the deduplicated, prioritized list of original + localized-title search URLs.
	let posts: SearchPost[] = [];
	for (const url of PROVIDER.createResourceUrls(requester)) {
		posts = await searchPosts(url, requester, ctx);
		if (posts.length > 0) break;
	}
	if (posts.length === 0) {
		ctx.log.warn('[drive] No search results.');
		return [];
	}

	// --- 2. Best match -----------------------------------------------------
	const best = pickBestPost(posts, media);
	if (!best) {
		ctx.log.warn('[drive] No post cleared the match threshold.');
		return [];
	}
	ctx.log.info(`[drive] Best match: "${best.post.title}" (score ${best.score}) -> ${best.post.link}`);

	// --- 3. Candidate download links ---------------------------------------
	const candidates = await getCandidateLinks(best.post.link, requester, ctx, pageOpt);
	if (candidates.length === 0) {
		ctx.log.warn('[drive] No download candidates on the post page.');
		return [];
	}
	ctx.log.info(`[drive] ${candidates.length} candidate link(s) before resolution.`);

	// --- 4. Resolve -> HubCloud / GDFlix -> sources ------------------------
	const results: InternalMediaSource[] = [];
	const tokens = titleTokens((media as any).title);
	for (const cand of candidates.slice(0, MAX_CANDIDATES)) {
		try {
			const resolved = await resolveDriveLink(cand.link, requester, ctx, pageOpt);
			if (!resolved) {
				ctx.log.debug(`[drive] Could not resolve candidate: ${cand.link}`);
				continue;
			}
			const meta = { fileName: `${best.post.title} ${cand.label}`.trim(), quality: cand.quality, language: 'hi' };
			const sources =
				resolved.kind === 'gdflix'
					? await extractGdflixStreams(resolved.url, requester, ctx, meta)
					: await extractHubcloudStreams(resolved.url, requester, ctx, { ...meta, matchTokens: tokens });
			results.push(...sources);
		} catch (error) {
			ctx.log.error(`[drive] Candidate resolution failed (${cand.link}): ${(error as Error).message}`);
		}
	}

	ctx.log.info(`[drive] Returning ${results.length} source(s).`);
	return results;
}

// ─── Search ──────────────────────────────────────────────────────────────────

async function searchPosts(url: URL, requester: ScrapeRequester, ctx: ProviderContext): Promise<SearchPost[]> {
	const baseUrl = PROVIDER.config.baseUrl;
	try {
		const json = await ctx.xhr.fetchResponse<{ hits?: Array<{ document?: any }> }>(
			url,
			{ method: 'GET', attachUserAgent: true, clean: true, headers: { Referer: baseUrl + '/' } },
			requester,
		);
		const hits = Array.isArray(json?.hits) ? json.hits : [];
		const posts: SearchPost[] = [];
		for (const hit of hits) {
			const doc = hit?.document || {};
			const title = String(doc.post_title || '')
				.replace(/Download/gi, '')
				.trim();
			const permalink = String(doc.permalink || '');
			if (!title || !permalink) continue;
			const postUrl = new URL(permalink, `${baseUrl}/`);
			posts.push({
				title,
				link: `${postUrl.pathname}${postUrl.search}${postUrl.hash}`,
				image: String(doc.post_thumbnail || ''),
			});
		}
		ctx.log.debug(`[drive] Search ${url.href} -> ${posts.length} hit(s).`);
		return posts;
	} catch (error) {
		ctx.log.warn(`[drive] Search failed for ${url.href}: ${(error as Error).message}`);
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

	// Quality-labelled download anchors (skip Batch/Zip bundles). MoviesDrive puts
	// these in `<h5><a …></a></h5>`; only real download hosts count — category / tag /
	// search nav links also carry quality text and must be excluded.
	const isDownloadHost = (h: string) =>
		/hubcloud|gdflix|hubdrive|search-recover|\/archives\//i.test(h) && !/\/(category|genre|tag)\/|[?&]s=/i.test(h);

	$('h5 a, a').each((_: number, el: any) => {
		const text = $(el).text();
		if (!/\b(480p|720p|1080p|2160p|4k)\b/i.test(text) || /zip/i.test(text)) return;
		const href = $(el).attr('href');
		if (!href || !isDownloadHost(href)) return;
		// The section heading (in a preceding element) carries the season for series.
		const headingText = $(el).parent('h5').prev().text() || $(el).closest('h5,h4,p').prev().text() || text;
		const quality = text.match(/\b(480p|720p|1080p|2160p|4k)\b/i)?.[0] || detectQuality(text);

		if (media.type === 'serie') {
			const season = getSeasonFromText(headingText) ?? getSeasonFromText(text);
			if (season != null && season !== Number((media as SerieMedia).season)) return;
		}
		candidates.push({ quality, link: href, label: quality });
	});

	const order: Record<string, number> = { '4k': 4, '2160p': 4, '1080p': 3, '720p': 2, '480p': 1, unknown: 0 };
	const seen = new Set<string>();
	return candidates
		.filter((c) => (c.link && !seen.has(c.link) ? (seen.add(c.link), true) : false))
		.sort((a, b) => (order[b.quality.toLowerCase()] || 0) - (order[a.quality.toLowerCase()] || 0));
}

// ─── Resolution: MoviesDrive links page -> HubCloud / GDFlix ──────────────────

async function resolveDriveLink(
	link: string,
	requester: ScrapeRequester,
	ctx: ProviderContext,
	pageOpt: CheerioLoadRequest,
): Promise<{ kind: 'hubcloud' | 'gdflix'; url: string } | null> {
	let url = new URL(link, `${PROVIDER.config.baseUrl}/`).href;

	// The links page usually exposes a "HubCloud" (or GDFlix) button.
	try {
		const { $ } = await ctx.cheerio.load(new URL(url), pageOpt, ctx.xhr);
		const host = $('a:contains("HubCloud")').attr('href') || $('a:contains("GDFlix"),a:contains("GDFLIX")').attr('href');
		if (host) url = new URL(host, url).href;
	} catch {
		/* fall through with the original url */
	}

	if (/gdflix/i.test(url)) return { kind: 'gdflix', url };
	if (/hubcloud/i.test(url)) return { kind: 'hubcloud', url };

	// Otherwise follow a meta-refresh / archives redirect to the real host.
	try {
		const text = await getText(new URL(url), requester, ctx);
		let redirectUrl =
			text.match(/<meta\s+http-equiv="refresh"\s+content="[^"]*?;\s*url=([^"]+)"\s*\/?>/i)?.[1] || '';
		if (url.includes('/archives/')) {
			redirectUrl = text.match(/<a\s+[^>]*href="(https:\/\/hubcloud\.[^/]+\/[^"]+)"/i)?.[1] || redirectUrl;
		}
		if (!redirectUrl) return null;
		if (/gdflix/i.test(redirectUrl)) return { kind: 'gdflix', url: redirectUrl };
		if (/hubcloud/i.test(redirectUrl)) return { kind: 'hubcloud', url: redirectUrl };

		// One more hop: the redirect page's download icon points at HubCloud.
		const { $ } = await ctx.cheerio.load(new URL(redirectUrl), pageOpt, ctx.xhr);
		const hubcloudLink = $('.fa-file-download').parent().attr('href') || '';
		const finalUrl = /hubcloud/i.test(hubcloudLink) ? hubcloudLink : redirectUrl;
		return { kind: /gdflix/i.test(finalUrl) ? 'gdflix' : 'hubcloud', url: finalUrl };
	} catch (error) {
		ctx.log.debug(`[drive] resolveDriveLink failed: ${(error as Error).message}`);
		return null;
	}
}

async function getText(url: URL, requester: ScrapeRequester, ctx: ProviderContext): Promise<string> {
	const res = await ctx.xhr.fetch(
		url,
		{ method: 'GET', attachUserAgent: true, clean: true, headers: { 'accept-language': 'en-US,en;q=0.9' } },
		requester,
	);
	return res.text();
}
