import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	type CheerioLoadRequest,
	type SerieMedia,
	createCookiesFromSet,
	joinCookies,
} from 'grabit-engine';
import { dispatchEmbed } from '../../../extractors/embedDispatch';
import { PROVIDER } from './config';

/**
 * Stream handler for Goojara.
 *
 * Ported from Ciarands/mw-providers `sources/goojara`. Flow: `POST /xmre.php` search
 * -> `.mfeed` result match -> resolve the media/episode id -> read the `/id` page
 * -> follow each `go.php` redirect to its embed host -> dispatch to the extractor.
 *
 * Goojara's search and Wootly embed are HTTP-first; Cloudflare cookies are solved once
 * and forwarded through the search and redirect hops.
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const media = requester.media;
	const base = new URL(PROVIDER.config.baseUrl);
	const wantType = media.type === 'movie' ? 'movie' : 'show';
	const title = (media as any).title as string;
	const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

	// The search endpoint has its own managed challenge, so solve that URL directly if needed.
	const solved = await ctx.solveChallenge(base, requester, { waitForCookie: 'cf_clearance' });
	const pageCookie = solved.html.match(/_3chk\(['"]([^'"]+)['"],['"]([^'"]+)['"]\)/);
	const solvedCookie = pageCookie ? `${pageCookie[1]}=${pageCookie[2]}` : '';
	const headers: Record<string, string> = {
		Referer: base.origin + '/',
		Origin: base.origin,
		accept: '*/*',
		...(solved.cookies || solvedCookie ? { cookie: [solved.cookies, solvedCookie].filter(Boolean).join('; ') } : {}),
		...(solved.userAgent ? { 'User-Agent': solved.userAgent } : {}),
	};

	// 1. Search POST /xmre.php with the token rendered into #res by the homepage.
	const searchUrl = new URL('/xmre.php', base);
	const searchToken = ctx.cheerio.$load(solved.html)('#res').attr('data-ins') || '';
	const searchBody = `z=${encodeURIComponent(searchToken)}&x=2278024220&q=${encodeURIComponent(title)}`;
	const searchOptions = {
		method: 'POST' as const,
		attachUserAgent: true,
		clean: true,
		useImpit: false,
		headers: { ...headers, 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', 'x-requested-with': 'XMLHttpRequest' },
		body: searchBody,
	};
	let searchResponse = await ctx.xhr.fetch(searchUrl, searchOptions, requester);
	let searchHtml = await searchResponse.text();
	if (searchResponse.status === 403 || /<title>\s*just a moment|__cf_chl_opt|cf-mitigated/i.test(searchHtml)) {
		const endpointSolved = await ctx.solveChallenge(searchUrl, requester, { waitForCookie: 'cf_clearance' });
		const endpointHeaders = {
			...headers,
			...(endpointSolved.cookies ? { cookie: endpointSolved.cookies } : {}),
			...(endpointSolved.userAgent ? { 'User-Agent': endpointSolved.userAgent } : {}),
		};
		searchResponse = await ctx.xhr.fetch(
			searchUrl,
			{ ...searchOptions, headers: { ...endpointHeaders, Referer: base.origin + '/' } },
			requester,
		);
		searchHtml = await searchResponse.text();
	}
	if (!searchHtml || /<title>\s*just a moment|__cf_chl_opt|cf-mitigated/i.test(searchHtml)) {
		ctx.log.warn(`[goojara] Search blocked after endpoint challenge solve (${searchResponse.status}).`);
		return [];
	}

	// 2. Match a result.
	const $s = ctx.cheerio.$load(searchHtml);
	const results: { title: string; year: string; slug: string }[] = [];
	$s('.mfeed > li').each((_: number, li: any) => {
		const el = $s(li);
		const t = el.find('strong').first().text() || '';
		const typeClass = el.find('div').first().attr('class');
		const type = typeClass === 'it' ? 'show' : typeClass === 'im' ? 'movie' : '';
		const href = el.find('a').first().attr('href') || '';
		const slug = href.split('/').filter(Boolean).pop();
		const year = el.text().match(/\b(19\d{2}|20\d{2})\b/)?.[1] || '';
		if (slug && type === wantType) results.push({ title: t, year, slug });
	});
	const mediaYear = String((media as any).releaseYear ?? (media as any).year ?? '');
	const titleMatches = results.filter((r) => norm(r.title) === norm(title));
	const match = titleMatches.find((r) => r.year === mediaYear) || titleMatches.sort((a, b) => Math.abs(Number(a.year) - Number(mediaYear)) - Math.abs(Number(b.year) - Number(mediaYear)))[0] || results[0];
	if (!match) {
		ctx.log.warn('[goojara] No matching result.');
		return [];
	}

	// 3. Resolve the id (movie = slug; show = episode id from /slug?s=season).
	let id = match.slug;
	if (media.type === 'serie') {
		const s = media as SerieMedia;
		const showHtml = await ctx.xhr
			.fetch(new URL(`/${match.slug}?s=${s.season}`, base), { method: 'GET', attachUserAgent: true, clean: true, headers }, requester)
			.then((r) => r.text())
			.catch(() => '');
		const $e = ctx.cheerio.$load(showHtml);
		id = '';
		$e('.seho').each((_: number, el: any) => {
			if (id) return;
			const epNum = $e(el).find('.seep .sea').first().text().trim();
			if (epNum && parseInt(epNum, 10) === s.episode) {
				const href = $e(el).find('.snfo h1 a').first().attr('href') || '';
				const cap = href.match(/\/([a-zA-Z0-9]+)$/)?.[1];
				if (cap) id = cap;
			}
		});
		if (!id) {
			ctx.log.warn('[goojara] Requested episode not found.');
			return [];
		}
	}

	// 4. /id page -> go.php embed-redirect links.
	const idHtml = await ctx.xhr
		.fetch(new URL(`/${id}`, base), { method: 'GET', attachUserAgent: true, clean: true, headers }, requester)
		.then((r) => r.text())
		.catch(() => '');
	const $i = ctx.cheerio.$load(idHtml);
	const goLinks = Array.from(
		new Set(
			$i('a')
				.toArray()
				.map((a: any) => $i(a).attr('href') || '')
				.filter((h: string) => h.includes('/go.php')),
		),
	);
	if (!goLinks.length) {
		ctx.log.warn(`[goojara] No embeds for "${match.title}".`);
		return [];
	}
	ctx.log.info(`[goojara] "${match.title}" -> ${goLinks.length} embed redirect(s).`);

	// 5. Follow each go.php redirect to its real embed host (ctx.xhr follows the redirect).
	const embedUrls: string[] = [];
	for (const go of goLinks.slice(0, 5)) {
		try {
			const goUrl = new URL(go, base);
			ctx.log.debug(`[goojara] Fetching redirect ${goUrl.href}`);
			const res = await ctx.xhr.fetch(
				goUrl,
				{ method: 'GET', attachUserAgent: true, clean: true, useImpit: false, headers, redirect: 'follow' },
				requester,
			);
			const finalUrl = res.url || res.headers.get('location') || res.headers.get('Location') || '';
			ctx.log.debug(`[goojara] Redirect ${go} -> ${finalUrl} (status ${res.status})`);
			if (finalUrl && !/goojara/i.test(finalUrl)) embedUrls.push(finalUrl);
		} catch (error) {
			ctx.log.debug(`[goojara] Redirect failed for ${go}: ${(error as Error).message}`);
		}
	}
	// 6. Dispatch each embed host, including Wootly's HTTP extractor.
	const sources: InternalMediaSource[] = [];
	const opts: CheerioLoadRequest = { ...requester, extraHeaders: { Referer: base.origin + '/' } };
	for (const embed of embedUrls) {
		if (/\.(?:mp4|m3u8)(?:\?|$)/i.test(embed)) {
			sources.push({ fileName: (media as any).title, playlist: embed, language: 'en', format: embed.includes('.m3u8') ? 'm3u8' : 'mp4', xhr: { flags: ['CORS_BLOCKED'], headers: { Referer: 'https://web.wootly.ch/' } } });
			continue;
		}
		try {
			const found = await dispatchEmbed(embed, opts, ctx, 'en');
			ctx.log.debug(`[goojara] Extractor returned ${found.length} source(s) for ${embed}`);
			if (found.length) sources.push(...found);
		} catch (error) {
			ctx.log.debug(`[goojara] Extractor failed for ${embed}: ${(error as Error).message}`);
		}
	}

	ctx.log.info(`[goojara] Returning ${sources.length} source(s).`);
	return sources;
}
