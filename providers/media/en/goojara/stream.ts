import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	type CheerioLoadRequest,
	type SerieMedia,
} from 'grabit-engine';
import { dispatchEmbed } from '../../../extractors/embedDispatch';
import { PROVIDER } from './config';

/**
 * Stream handler for Goojara.
 *
 * Ported from Ciarands/mw-providers `sources/goojara`. Flow: `POST /xhrr.php` search
 * -> `.mfeed` result match -> resolve the media/episode id -> read the `/id` page
 * -> follow each `go.php` redirect to its embed host -> dispatch to the extractor.
 *
 * ⚠️ Currently `active: false`. Goojara moved behind Cloudflare and its `/xhrr.php`
 * search POST returns 403 **even inside a CF-solved browser session** (verified), so
 * the chain cannot start today. The logic is ported and driven via `ctx.solveChallenge`
 * + `ctx.xhr` (universal) so it resumes working if/when the site is scrapable again. The
 * `wootly` embed host is not yet ported (its own cookie/token dance) — mixdrop/dood/upstream
 * that go through `embedDispatch` are covered.
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const media = requester.media;
	const base = new URL(PROVIDER.config.baseUrl);
	const wantType = media.type === 'movie' ? 'movie' : 'show';
	const title = (media as any).title as string;
	const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

	// The site is Cloudflare-gated; solve once, then run the whole chain over ctx.xhr.
	const solved = await ctx.solveChallenge(base, requester, { waitForCookie: 'cf_clearance' });
	const headers: Record<string, string> = {
		Referer: base.origin + '/',
		...(solved.cookies ? { cookie: solved.cookies } : {}),
		...(solved.userAgent ? { 'User-Agent': solved.userAgent } : {}),
	};

	// 1. Search POST /xhrr.php.
	const searchHtml = await ctx.xhr
		.fetch(
			new URL('/xhrr.php', base),
			{
				method: 'POST',
				attachUserAgent: true,
				clean: true,
				headers: { ...headers, 'content-type': 'application/x-www-form-urlencoded', 'x-requested-with': 'XMLHttpRequest' },
				body: 'q=' + encodeURIComponent(title),
			},
			requester,
		)
		.then((r) => r.text())
		.catch(() => '');
	if (!searchHtml || /just a moment/i.test(searchHtml)) {
		ctx.log.warn('[goojara] Search blocked (CF-hardened site, see module header).');
		return [];
	}

	// 2. Match a result.
	const $s = ctx.cheerio.$load(searchHtml);
	const results: { title: string; slug: string }[] = [];
	$s('.mfeed > li').each((_: number, li: any) => {
		const el = $s(li);
		const t = el.find('strong').first().text() || '';
		const typeClass = el.find('div').first().attr('class');
		const type = typeClass === 'it' ? 'show' : typeClass === 'im' ? 'movie' : '';
		const slug = el.find('a').first().attr('href')?.split('/')[3];
		if (slug && type === wantType) results.push({ title: t, slug });
	});
	const match = results.find((r) => norm(r.title) === norm(title)) || results[0];
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
			const res = await ctx.xhr.fetch(
				new URL(go, base),
				{ method: 'GET', attachUserAgent: true, clean: true, headers, redirect: 'follow' },
				requester,
			);
			const finalUrl = res.url;
			if (finalUrl && !/goojara/i.test(finalUrl)) embedUrls.push(finalUrl);
		} catch {
			/* skip a bad redirect */
		}
	}

	// 6. Dispatch each embed host (mixdrop / dood / … via embedDispatch; wootly TODO).
	const sources: InternalMediaSource[] = [];
	const opts: CheerioLoadRequest = { ...requester, extraHeaders: { Referer: base.origin + '/' } };
	for (const embed of embedUrls) {
		if (/wootly/i.test(embed)) {
			ctx.log.debug(`[goojara] wootly embed not yet supported: ${embed}`);
			continue;
		}
		try {
			const found = await dispatchEmbed(embed, opts, ctx, 'en');
			if (found.length) sources.push(...found);
		} catch (error) {
			ctx.log.debug(`[goojara] Extractor failed for ${embed}: ${(error as Error).message}`);
		}
	}

	ctx.log.info(`[goojara] Returning ${sources.length} source(s).`);
	return sources;
}
