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
 * the chain cannot start today. The logic is ported and driven through puppeteer so
 * it resumes working if/when the site is scrapable again. The `wootly` embed host is
 * not yet ported (its own cookie/token dance) — mixdrop/dood/upstream that go through
 * `embedDispatch` are covered.
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const media = requester.media;
	const base = new URL(PROVIDER.config.baseUrl);
	const wantType = media.type === 'movie' ? 'movie' : 'show';

	let session: Awaited<ReturnType<ProviderContext['puppeteer']['launch']>> | null = null;
	try {
		session = await ctx.puppeteer.launch(base, {
			requester,
			browsingOptions: { ignoreError: true, loadCriteria: 'networkidle2' },
		});
		const page = session.page;

		// 1. Search (POST /xhrr.php) + 2. resolve the id, inside the CF-solved context.
		const resolved = (await page.evaluate(
			async (title: string, wantType: string, seasonEp: any) => {
				const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
				// --- search ---
				const searchHtml = await (
					await fetch('/xhrr.php', {
						method: 'POST',
						headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-requested-with': 'XMLHttpRequest' },
						body: 'q=' + encodeURIComponent(title),
					})
				).text();
				if (/just a moment/i.test(searchHtml)) return { error: 'cf-blocked' };
				const doc = new DOMParser().parseFromString(searchHtml, 'text/html');
				const results: any[] = [];
				doc.querySelectorAll('.mfeed > li').forEach((li) => {
					const t = li.querySelector('strong')?.textContent || '';
					const yearM = (li.textContent || '').match(/\((\d{4})\)/);
					const typeDiv = li.querySelector('div')?.getAttribute('class');
					const type = typeDiv === 'it' ? 'show' : typeDiv === 'im' ? 'movie' : '';
					const slug = li.querySelector('a')?.getAttribute('href')?.split('/')[3];
					if (slug && type === wantType) results.push({ title: t, year: yearM ? yearM[1] : '', slug });
				});
				const match = results.find((r) => norm(r.title) === norm(title)) || results[0];
				if (!match) return { error: 'no-match' };

				// --- id (movie = slug; show = episode id from /slug?s=season) ---
				let id = match.slug;
				if (seasonEp) {
					const showHtml = await (await fetch(`/${match.slug}?s=${seasonEp.season}`)).text();
					const sdoc = new DOMParser().parseFromString(showHtml, 'text/html');
					id = '';
					sdoc.querySelectorAll('.seho').forEach((el) => {
						const epNum = el.querySelector('.seep .sea')?.textContent?.trim();
						if (epNum && parseInt(epNum, 10) === seasonEp.episode) {
							const href = el.querySelector('.snfo h1 a')?.getAttribute('href') || '';
							const m = href.match(/\/([a-zA-Z0-9]+)$/);
							if (m) id = m[1];
						}
					});
					if (!id) return { error: 'no-episode' };
				}

				// --- /id page -> collect go.php embed-redirect links ---
				const idHtml = await (await fetch(`/${id}`, { headers: { Referer: location.origin } })).text();
				const idoc = new DOMParser().parseFromString(idHtml, 'text/html');
				const goLinks = Array.from(idoc.querySelectorAll('a'))
					.map((a) => a.getAttribute('href') || '')
					.filter((h) => h.includes('/go.php'));
				return { name: match.title as string, goLinks: Array.from(new Set(goLinks)) };
			},
			(media as any).title,
			wantType,
			media.type === 'serie'
				? { season: (media as SerieMedia).season, episode: (media as SerieMedia).episode }
				: null,
		)) as { error?: string; name?: string; goLinks?: string[] };

		if (resolved.error || !resolved.goLinks?.length) {
			ctx.log.warn(`[goojara] Stopped: ${resolved.error ?? 'no embeds'} (CF-hardened site — see module header).`);
			return [];
		}
		ctx.log.info(`[goojara] "${resolved.name}" -> ${resolved.goLinks.length} embed redirect(s).`);

		// 3. Resolve each go.php redirect to its real embed host via a browser tab.
		const embedUrls: string[] = [];
		for (const go of resolved.goLinks.slice(0, 5)) {
			const tab = await session.browser.newPage().catch(() => null);
			if (!tab) continue;
			try {
				await tab.goto(new URL(go, base).href, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null);
				const finalUrl = tab.url();
				if (finalUrl && !finalUrl.includes('goojara')) embedUrls.push(finalUrl);
			} finally {
				await tab.close().catch(() => null);
			}
		}

		// 4. Dispatch each embed host (mixdrop / dood / … via embedDispatch; wootly TODO).
		const results: InternalMediaSource[] = [];
		const opts: CheerioLoadRequest = { ...requester, extraHeaders: { Referer: base.origin + '/' } };
		for (const embed of embedUrls) {
			if (/wootly/i.test(embed)) {
				ctx.log.debug(`[goojara] wootly embed not yet supported: ${embed}`);
				continue;
			}
			try {
				const sources = await dispatchEmbed(embed, opts, ctx, 'en');
				if (sources.length) results.push(...sources);
			} catch (error) {
				ctx.log.debug(`[goojara] Extractor failed for ${embed}: ${(error as Error).message}`);
			}
		}

		ctx.log.info(`[goojara] Returning ${results.length} source(s).`);
		return results;
	} catch (error) {
		ctx.log.error(`[goojara] Browser flow failed: ${(error as Error).message}`);
		return [];
	} finally {
		await session?.page.close().catch(() => null);
	}
}
