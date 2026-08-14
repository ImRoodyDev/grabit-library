import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	type CheerioLoadRequest,
	type SerieMedia,
} from 'grabit-engine';
import { extractHubcloudStreams } from '../../../extractors/hubcloud';
import { detectQuality } from '../../../extractors/hubchain';
import { pickBestPost, getSeasonFromText } from '../../../extractors/postMatch';
import { PROVIDER } from './config';

// No User-Agent: grabit's providerFetch/cheerioLoad attach requester.userAgent (and it wins).
const VEGA_HEADERS: Record<string, string> = {
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
	'Accept-Language': 'en-US,en;q=0.9',
	cookie: 'xla=s4t',
};

const MAX_CANDIDATES = 3;

type SearchPost = { title: string; link: string; image: string };
type Candidate = { quality: string; link: string; label: string };

/**
 * Stream handler for VMovies (vegamovies).
 *
 * Flow: `/search.php?q=` (JSON) -> best-match post -> download buttons (nexdrive
 * dotlinks; for series drill episodes) -> extract vcloud link -> HubCloud extractor.
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const media = requester.media;

	const pageOpt: CheerioLoadRequest = {
		...requester,
		followRedirects: true,
		extraHeaders: { ...VEGA_HEADERS },
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
		ctx.log.warn('[vega] No search results.');
		return [];
	}

	// --- 2. Best match -----------------------------------------------------
	const best = pickBestPost(posts, media);
	if (!best) {
		ctx.log.warn('[vega] No post cleared the match threshold.');
		return [];
	}
	ctx.log.info(`[vega] Best match: "${best.post.title}" (score ${best.score}) -> ${best.post.link}`);

	// --- 3. Candidate download links ---------------------------------------
	const candidates = await getCandidateLinks(best.post.link, requester, ctx, pageOpt);
	if (candidates.length === 0) {
		ctx.log.warn('[vega] No download candidates on the post page.');
		return [];
	}
	ctx.log.info(`[vega] ${candidates.length} candidate link(s) before resolution.`);

	// --- 4. Resolve each candidate -> vcloud -> HubCloud -> sources ---------
	const results: InternalMediaSource[] = [];
	for (const cand of candidates.slice(0, MAX_CANDIDATES)) {
		try {
			const cloudLink = await resolveVegaLink(cand.link, requester, ctx);
			if (!cloudLink) {
				ctx.log.debug(`[vega] Could not resolve candidate to a cloud link: ${cand.link}`);
				continue;
			}
			const sources = await extractHubcloudStreams(cloudLink, requester, ctx, {
				fileName: `${best.post.title} ${cand.label}`.trim(),
				quality: cand.quality,
				language: 'hi',
			});
			results.push(...sources);
		} catch (error) {
			ctx.log.error(`[vega] Candidate resolution failed (${cand.link}): ${(error as Error).message}`);
		}
	}

	ctx.log.info(`[vega] Returning ${results.length} source(s).`);
	return results;
}

// ─── Search ──────────────────────────────────────────────────────────────────

async function searchPosts(url: URL, requester: ScrapeRequester, ctx: ProviderContext): Promise<SearchPost[]> {
	const baseUrl = PROVIDER.config.baseUrl;
	try {
		const json = await ctx.xhr.fetchResponse<{ hits?: Array<{ document?: any }> }>(
			url,
			{ method: 'GET', attachUserAgent: true, clean: true, headers: { ...VEGA_HEADERS, Referer: baseUrl + '/' } },
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
		ctx.log.debug(`[vega] Search ${url.href} -> ${posts.length} hit(s).`);
		return posts;
	} catch (error) {
		ctx.log.warn(`[vega] Search failed for ${url.href}: ${(error as Error).message}`);
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

	if (media.type === 'serie') {
		const wantSeason = Number((media as SerieMedia).season);
		const wantEpisode = Number((media as SerieMedia).episode);

		// Series posts are headed by `<h3>Season N … 480p/720p/1080p</h3>`, each
		// followed by an "Episode Links" button (nexdrive) and a "Batch/Zip" button.
		// Walk each heading of the wanted season and grab its Episode-Links URL.
		const episodePages: { quality: string; href: string }[] = [];
		$('h3').each((_: number, h: any) => {
			const heading = $(h).text();
			if (getSeasonFromText(heading) !== wantSeason) return;
			const quality = detectQuality(heading);
			let node = $(h).next();
			let guard = 0;
			while (node.length && !node.is('h3') && guard++ < 8) {
				const link = node
					.find('a')
					.filter((__: number, a: any) => /episode/i.test($(a).text()))
					.first()
					.attr('href');
				if (link) {
					episodePages.push({ quality, href: link });
					break;
				}
				node = node.next();
			}
		});

		for (const page of dedupeBy(episodePages, (p) => p.href).slice(0, 3)) {
			const eps = await getEpisodeList(page.href, requester, ctx, pageOpt);
			const ep = eps.find((e) => episodeNumberOf(e.title) === wantEpisode);
			if (ep) candidates.push({ quality: page.quality, link: ep.link, label: `E${wantEpisode}` });
		}
	} else {
		// Movie: each `.dwd-button` anchor is a quality download (nexdrive dotlink).
		for (const a of $('a:has(.dwd-button)').toArray()) {
			const href = $(a).attr('href');
			if (!href) continue;
			const label = `${$(a).closest('p').prevAll('h3,h4,h5,p').first().text()} ${$(a).text()}`;
			candidates.push({ quality: detectQuality(label), link: href, label: detectQuality(label) });
		}
	}

	const order: Record<string, number> = { '4k': 4, '2160p': 4, '1080p': 3, '720p': 2, '480p': 1, unknown: 0 };
	return dedupeBy(candidates, (c) => c.link).sort(
		(a, b) => (order[b.quality.toLowerCase()] || 0) - (order[a.quality.toLowerCase()] || 0),
	);
}

/** Fetches a vega "episodes" page and lists its per-episode dotlinks. */
async function getEpisodeList(
	episodesLink: string,
	requester: ScrapeRequester,
	ctx: ProviderContext,
	pageOpt: CheerioLoadRequest,
): Promise<{ title: string; link: string }[]> {
	try {
		let target = episodesLink;
		if (target.includes('url=')) {
			const decoded = safeAtob(target.split('url=')[1]);
			if (decoded) target = decoded;
		}
		const { $ } = await ctx.cheerio.load(new URL(target, `${PROVIDER.config.baseUrl}/`), pageOpt, ctx.xhr);
		const container = $('.entry-content,.entry-inner').length ? $('.entry-content,.entry-inner') : $('body');
		const episodes: { title: string; link: string }[] = [];
		container.find('h3,h4').each((_: number, el: any) => {
			const title = $(el).text().replace(/\s+/g, ' ').trim();
			if (!/episode/i.test(title)) return;
			// Each episode heading is followed by several host buttons (G-Direct/fastdl,
			// V-Cloud, DropGalaxy). Prefer the vcloud/hubcloud one the extractor handles.
			const hrefs = $(el)
				.nextUntil('h3,h4')
				.find('a')
				.map((__: number, a: any) => $(a).attr('href'))
				.get()
				.filter((h: string) => h && h !== '#');
			const href =
				hrefs.find((h: string) => /vcloud|hubcloud|v-cloud|\/drive\/|hubdrive|cloud\./i.test(h)) ||
				hrefs.find((h: string) => /nexdrive/i.test(h)) ||
				hrefs[0];
			if (title && href) episodes.push({ title, link: href });
		});
		return episodes;
	} catch (error) {
		ctx.log.debug(`[vega] Episode list failed for ${episodesLink}: ${(error as Error).message}`);
		return [];
	}
}

// ─── Resolution: dotlink -> vcloud link ──────────────────────────────────────

async function resolveVegaLink(link: string, requester: ScrapeRequester, ctx: ProviderContext): Promise<string | null> {
	if (!link) return null;
	// Already a cloud (vcloud / hubcloud / drive) URL — hand straight to the extractor.
	if (/(?:hubcloud|vcloud|v-cloud|\/drive\/|hubdrive|cloud\.)/i.test(link)) return link;

	// nexdrive-style dotlink page exposes an `<a href="…cloud…">`.
	try {
		const res = await ctx.xhr.fetch(
			new URL(link),
			{ method: 'GET', attachUserAgent: true, clean: true, headers: { ...VEGA_HEADERS } },
			requester,
		);
		const text = await res.text();
		const m =
			text.match(/<a\s+href="([^"]*cloud\.[^"]*)"/i) ||
			text.match(/href="(https?:\/\/[^"]*(?:vcloud|hubcloud|hubdrive)[^"]*)"/i);
		return m?.[1] || null;
	} catch (error) {
		ctx.log.debug(`[vega] Dotlink resolution failed for ${link}: ${(error as Error).message}`);
		return null;
	}
}

// ─── Small helpers ───────────────────────────────────────────────────────────

function episodeNumberOf(title: string): number | null {
	const m =
		title.match(/episodes?\s*:?\s*(\d+)/i) || // "Episode 1", "-:Episodes: 1:-"
		title.match(/\be\s*p?\s*(\d+)\b/i) || // "E1", "Ep 1"
		title.match(/\be(\d+)\b/i);
	return m ? Number(m[1]) : null;
}

function dedupeBy<T>(arr: T[], key: (t: T) => string): T[] {
	const seen = new Set<string>();
	return arr.filter((item) => {
		const k = key(item);
		if (!k || seen.has(k)) return false;
		seen.add(k);
		return true;
	});
}

function safeAtob(str: string | undefined): string | null {
	if (!str) return null;
	try {
		return atob(str);
	} catch {
		return null;
	}
}
