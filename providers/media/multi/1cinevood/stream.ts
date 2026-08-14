import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	type CheerioLoadRequest,
	type SerieMedia,
	delay,
	PuppeteerLoadRequest,
} from 'grabit-engine';
import { extractHubcloudStreams } from '../../../extractors/hubcloud';
import { detectQuality } from '../../../extractors/hubchain';
import { pickBestPost, getSeasonFromText } from '../../../extractors/postMatch';
import { PROVIDER } from './config';

// grabit's providerFetch/cheerioLoad attach requester.userAgent (and it wins), so we
// don't hardcode one. Kept as an extension point for any other default headers.
const HEADERS: Record<string, string> = {};

const MAX_CANDIDATES = 3;

type SearchPost = { title: string; link: string; image: string };
type Candidate = { quality: string; link: string; label: string };

/** Post-card selectors 1cinevood (HDMovie2 theme) has used over time. */
const POST_SELECTORS = [
	'.pstr_box',
	'article',
	'.result-item',
	'.post',
	'.item',
	'.thumbnail',
	'.latest-movies',
	'.movie-item',
	'.ml-item',
	'.cv-post',
].join(',');

type Cheerio$ = ReturnType<ProviderContext['cheerio']['$load']>;

/**
 * Loads a page as Cheerio, falling back to a real browser session when Cloudflare
 * serves its "Just a moment" JS challenge (cinevood.cl is CF-protected).
 */
async function loadPageWithCF(
	url: URL,
	requester: ScrapeRequester,
	ctx: ProviderContext,
	pageOpt: CheerioLoadRequest,
	loadCriteria: NonNullable<PuppeteerLoadRequest['browsingOptions']>['loadCriteria'] = 'networkidle0',
): Promise<Cheerio$> {
	try {
		const { $ } = await ctx.cheerio.load(url, pageOpt, ctx.xhr);
		const title = $('title').text();
		const challenged = /just a moment|attention required|checking your browser|cf-browser-verification/i.test(title);
		if (!challenged && $('body').text().trim().length > 200) return $;
		ctx.log.warn(`[1cinevood] Cloudflare challenge on ${url.href}, using browser session.`);
	} catch (error) {
		ctx.log.warn(`[1cinevood] Direct load failed for ${url.href} (${(error as Error).message}), using browser.`);
	}

	const CHALLENGE_RE = /just a moment|attention required|checking your browser|cf-browser-verification/i;
	let session: Awaited<ReturnType<ProviderContext['puppeteer']['launch']>> | null = null;
	try {
		session = await ctx.puppeteer.launch(url, {
			requester,
			browsingOptions: { ignoreError: true, loadCriteria: loadCriteria },
		});
		// The engine can return while Cloudflare's interstitial is still showing.
		// Wait for the challenge to actually clear (title stops being "Just a moment")
		// before reading the DOM, otherwise we parse the challenge page and get 0 hits.
		await session.page
			.waitForFunction(
				() => !/just a moment|attention required|checking your browser|cf-browser-verification/i.test(document.title || ''),
				{ timeout: 20000, polling: 500 },
			)
			.catch(() => null);
		await delay(1200); // let the real page's markup render after the redirect
		const html = await session.page.content();
		const $ = ctx.cheerio.$load(html);
		if (CHALLENGE_RE.test($('title').text())) {
			ctx.log.warn(`[1cinevood] Cloudflare still challenging ${url.href} after wait; may yield no results.`);
		}
		return $;
	} finally {
		await session?.page.close().catch(() => null);
	}
}

/**
 * Stream handler for Cinewood (1cinevood).
 *
 * Flow: `/?s=` search -> best-match post -> parse quality blocks for HubCloud /
 * oxxfile links (series: resolve the pack API to per-episode HubCloud links) ->
 * HubCloud extractor.
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
	// IMDb id first: cinevood indexes it, so `?s=<imdb>` is an exact match — more
	// reliable than the noisy title. Built from the `{imdb:string}` pattern and passed
	// as the leading URL; `createResourceUrls` then appends the title / localized-title
	// `/?s={title:form-uri}` variants.
	const imdbUrl = (media as any).imdbId
		? new URL(PROVIDER.createPatternString('/?s={imdb:string}', media), `${PROVIDER.config.baseUrl}/`)
		: undefined;

	let posts: SearchPost[] = [];
	for (const url of PROVIDER.createResourceUrls(requester, imdbUrl)) {
		posts = await searchPosts(url, requester, ctx, pageOpt);
		if (posts.length > 0) break;
	}
	if (posts.length === 0) {
		ctx.log.warn('[1cinevood] No search results.');
		return [];
	}

	// --- 2. Best match -----------------------------------------------------
	const best = pickBestPost(posts, media);
	if (!best) {
		ctx.log.warn('[1cinevood] No post cleared the match threshold.');
		return [];
	}
	ctx.log.info(`[1cinevood] Best match: "${best.post.title}" (score ${best.score}) -> ${best.post.link}`);

	// --- 3. Candidate HubCloud links ---------------------------------------
	const candidates = await getCandidateLinks(best.post.link, requester, ctx, pageOpt);
	if (candidates.length === 0) {
		ctx.log.warn('[1cinevood] No download candidates on the post page.');
		return [];
	}
	ctx.log.info(`[1cinevood] ${candidates.length} candidate link(s) before resolution.`);

	// --- 4. Resolve -> HubCloud -> sources ---------------------------------
	const results: InternalMediaSource[] = [];
	for (const cand of candidates.slice(0, MAX_CANDIDATES)) {
		try {
			const hubcloudLink = await resolveCinevoodLink(cand.link, requester, ctx);
			if (!hubcloudLink) {
				ctx.log.debug(`[1cinevood] Could not resolve candidate: ${cand.link}`);
				continue;
			}
			const sources = await extractHubcloudStreams(hubcloudLink, requester, ctx, {
				fileName: `${best.post.title} ${cand.label}`.trim(),
				quality: cand.quality,
				language: 'hi',
			});
			results.push(...sources);
		} catch (error) {
			ctx.log.error(`[1cinevood] Candidate resolution failed (${cand.link}): ${(error as Error).message}`);
		}
	}

	ctx.log.info(`[1cinevood] Returning ${results.length} source(s).`);
	return results;
}

// ─── Search ──────────────────────────────────────────────────────────────────

async function searchPosts(
	url: URL,
	requester: ScrapeRequester,
	ctx: ProviderContext,
	pageOpt: CheerioLoadRequest,
): Promise<SearchPost[]> {
	const baseUrl = PROVIDER.config.baseUrl;
	try {
		const $ = await loadPageWithCF(url, requester, ctx, pageOpt);

		let posts = parseCards($, baseUrl);
		if (posts.length === 0) posts = parseAnchorFallback($, baseUrl);

		if (posts.length === 0) {
			// Diagnostics: if this still logs, the numbers/snippet reveal the real markup.
			const t = $('title').text().trim().slice(0, 60);
			const bodyLen = $('body').text().trim().length;
			ctx.log.warn(
				`[1cinevood] 0 posts for ${url.href}. title="${t}" bodyLen=${bodyLen} | ` +
					`article=${$('article').length} .result-item=${$('.result-item').length} ` +
					`.post=${$('.post').length} .ml-item=${$('.ml-item').length} .pstr_box=${$('.pstr_box').length} ` +
					`h2a=${$('h2 a').length} h3a=${$('h3 a').length} entry-title=${$('.entry-title').length}`,
			);
			ctx.log.debug(`[1cinevood] body snippet: ${$('body').text().replace(/\s+/g, ' ').trim().slice(0, 300)}`);
		}
		ctx.log.debug(`[1cinevood] Search ${url.href} -> ${posts.length} hit(s).`);
		return posts;
	} catch (error) {
		ctx.log.warn(`[1cinevood] Search failed for ${url.href}: ${(error as Error).message}`);
		return [];
	}
}

const isInternalPostLink = (path: string) =>
	path.startsWith('/') &&
	!/^\/(?:$|page\/|category\/|genre\/|tag\/|wp-|feed|search|author\/|\?)/i.test(path) &&
	path.length > 1;

/** Primary parse: theme post-cards. Title falls back through several elements/anchor text. */
function parseCards($: Cheerio$, baseUrl: string): SearchPost[] {
	const posts: SearchPost[] = [];
	const seen = new Set<string>();
	$(POST_SELECTORS).each((_: number, el: any) => {
		const card = $(el);
		const href = card.find('a[href]').first().attr('href');
		if (!href) return;
		const postUrl = new URL(href, `${baseUrl}/`);
		const link = `${postUrl.pathname}${postUrl.search}${postUrl.hash}`;
		if (!isInternalPostLink(postUrl.pathname) || seen.has(link)) return;
		let title =
			card.find('.cv-movie-title, .entry-title, .post-title, .title').first().text().trim() ||
			card.find('h2, h3').first().text().trim() ||
			card.find('a[title]').first().attr('title')?.trim() ||
			card.find('img[alt]').first().attr('alt')?.trim() ||
			card.find('a').first().text().trim() ||
			'';
		title = cleanCardTitle(title);
		if (!title) return;
		seen.add(link);
		posts.push({
			title,
			link,
			image: card.find('img').first().attr('src') || card.find('img').first().attr('data-src') || '',
		});
	});
	return posts;
}

/** Fallback parse: any heading/anchor that points at an internal post permalink. */
function parseAnchorFallback($: Cheerio$, baseUrl: string): SearchPost[] {
	const posts: SearchPost[] = [];
	const seen = new Set<string>();
	$('h2 a[href], h3 a[href], .entry-title a[href], .title a[href], .result-item a[href]').each(
		(_: number, el: any) => {
			const a = $(el);
			const href = a.attr('href');
			if (!href) return;
			let postUrl: URL;
			try {
				postUrl = new URL(href, `${baseUrl}/`);
			} catch {
				return;
			}
			if (postUrl.host !== new URL(baseUrl).host || !isInternalPostLink(postUrl.pathname)) return;
			const link = `${postUrl.pathname}${postUrl.search}`;
			if (seen.has(link)) return;
			const title = cleanCardTitle(a.text().trim() || a.attr('title')?.trim() || '');
			if (!title) return;
			seen.add(link);
			posts.push({ title, link, image: '' });
		},
	);
	return posts;
}

function cleanCardTitle(raw: string): string {
	return raw
		.replace(/\[.*?\]/g, '')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

// ─── Meta: candidate download links ──────────────────────────────────────────

async function getCandidateLinks(
	link: string,
	requester: ScrapeRequester,
	ctx: ProviderContext,
	pageOpt: CheerioLoadRequest,
): Promise<Candidate[]> {
	const url = new URL(link, `${PROVIDER.config.baseUrl}/`);
	const $ = await loadPageWithCF(url, requester, ctx, pageOpt, 'networkidle2');
	const container = $('.entry-content, .post-inner').first().length
		? $('.entry-content, .post-inner').first()
		: $('body');
	const media = requester.media;
	const candidates: Candidate[] = [];
	const isLinkHost = (h: string) => /(?:oxxfile|hubcloud)/i.test(h);

	// Download sections are `<h5>`/`<h6>` quality headers followed by host links.
	const blocks = container
		.find('h5,h6')
		.filter((_: number, el: any) => {
			const t = $(el).text();
			return !/watch online/i.test(t) && /\d{3,4}p|2160p|4k|s\d{1,2}|e\d{1,3}/i.test(t);
		})
		.toArray();

	if (media.type === 'serie') {
		const wantSeason = Number((media as SerieMedia).season);
		const wantEpisode = Number((media as SerieMedia).episode);
		for (const el of blocks) {
			const heading = $(el).text();
			const season = getSeasonFromText(heading);
			if (season != null && season !== wantSeason) continue;
			const packLink = $(el)
				.nextUntil('h5,h6,hr')
				.find('a')
				.filter((_: number, a: any) => isLinkHost($(a).attr('href') || ''))
				.first()
				.attr('href');
			if (!packLink) continue;
			const eps = await getEpisodesFromApi(packLink, requester, ctx);
			const ep = eps.find((e) => episodeNumberOf(e.title) === wantEpisode);
			if (ep) candidates.push({ quality: detectQuality(heading), link: ep.link, label: `E${wantEpisode}` });
		}
	} else {
		for (const el of blocks) {
			const heading = $(el).text();
			const quality = heading.match(/\d{3,4}p/)?.[0] || detectQuality(heading);
			$(el)
				.nextUntil('h5,h6,hr')
				.find('a')
				.each((_: number, a: any) => {
					const href = $(a).attr('href');
					if (href && isLinkHost(href)) candidates.push({ quality, link: href, label: quality });
				});
		}
		// Fallback: any host link in the content.
		if (candidates.length === 0) {
			container.find('a[href*="oxxfile"],a[href*="hubcloud"]').each((_: number, a: any) => {
				const href = $(a).attr('href');
				if (href) candidates.push({ quality: 'Unknown', link: href, label: 'Movie' });
			});
		}
	}

	const order: Record<string, number> = { '4k': 4, '2160p': 4, '1080p': 3, '720p': 2, '480p': 1, unknown: 0 };
	const seen = new Set<string>();
	return candidates
		.filter((c) => (c.link && !seen.has(c.link) ? (seen.add(c.link), true) : false))
		.sort((a, b) => (order[b.quality.toLowerCase()] || 0) - (order[a.quality.toLowerCase()] || 0));
}

/** Series: resolve an oxxfile "pack" into its per-episode HubCloud links via the JSON API. */
async function getEpisodesFromApi(
	packLink: string,
	requester: ScrapeRequester,
	ctx: ProviderContext,
): Promise<{ title: string; link: string }[]> {
	try {
		const u = new URL(packLink);
		const id = u.pathname.split('/').filter(Boolean).pop() || '';
		const apiUrl = new URL(`/api/packs/${id}`, u.origin);
		const json = await ctx.xhr.fetchResponse<{ pack?: { items?: any[] } }>(
			apiUrl,
			{ method: 'GET', attachUserAgent: true, clean: true, headers: { ...HEADERS } },
			requester,
		);
		const items = json?.pack?.items || [];
		return items
			.filter((i) => i?.file_name && i?.hubcloud_link)
			.map((i) => ({ title: String(i.file_name), link: String(i.hubcloud_link) }));
	} catch (error) {
		ctx.log.debug(`[1cinevood] Pack API failed for ${packLink}: ${(error as Error).message}`);
		return [];
	}
}

// ─── Resolution: oxxfile -> HubCloud ─────────────────────────────────────────

async function resolveCinevoodLink(
	link: string,
	requester: ScrapeRequester,
	ctx: ProviderContext,
): Promise<string | null> {
	if (/hubcloud|\/drive\//i.test(link)) return link;
	if (/oxxfile/i.test(link)) {
		try {
			const u = new URL(link);
			const id = u.pathname.split('/').filter(Boolean).pop() || '';
			const apiUrl = new URL(`/api/s/${id}/hubcloud`, u.origin);
			const res = await ctx.xhr.fetch(
				apiUrl,
				{ method: 'GET', attachUserAgent: true, clean: true, headers: { ...HEADERS }, redirect: 'follow' } as any,
				requester,
			);
			if (res.url && /hubcloud/i.test(res.url)) return res.url;
			// Some responses carry the URL in the body instead of a redirect.
			const text = await res.text().catch(() => '');
			const m = text.match(/https?:\/\/[^"'\s]*hubcloud[^"'\s]*/i);
			return m?.[0] || null;
		} catch (error) {
			ctx.log.debug(`[1cinevood] oxxfile resolution failed for ${link}: ${(error as Error).message}`);
			return null;
		}
	}
	return null;
}

function episodeNumberOf(title: string): number | null {
	const m =
		title.match(/s\d{1,2}\s*e\s*(\d{1,3})/i) || title.match(/episodes?\s*:?\s*(\d+)/i) || title.match(/\be(\d+)\b/i);
	return m ? Number(m[1]) : null;
}
