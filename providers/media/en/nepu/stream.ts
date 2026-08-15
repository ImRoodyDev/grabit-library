import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	type SerieMedia,
	deduplicateArray,
} from 'grabit-engine';
import { PROVIDER } from './config';

/**
 * Stream handler for Nepu.
 *
 * Ported from Ciarands/mw-providers `sources/nepu`, adapted for the site's current
 * Cloudflare protection. Flow: `/ajax/posts?q=` JSON search (run inside a
 * CF-solved browser) -> match by type + title -> open the watch/episode page ->
 * let the site's own JS load the player -> capture the `.m3u8` from the network.
 *
 * (The old `POST /ajax/embed` shortcut now returns a 403 even in-browser, so we
 * drive the real player instead of replaying it.)
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const media = requester.media;
	const base = new URL(PROVIDER.config.baseUrl);
	const referer = base.origin + '/';

	const searchPaths = PROVIDER.createResourceUrls(requester).map((u) => u.pathname + u.search);
	const titles = deduplicateArray(
		[(media as any).title, ...((media as any).localizedTitles ?? [])].filter(Boolean),
	) as string[];
	const wantType = media.type === 'movie' ? 'Movie' : 'Serie';
	const seasonEp =
		media.type === 'serie'
			? { season: (media as SerieMedia).season, episode: (media as SerieMedia).episode }
			: null;

	let session: Awaited<ReturnType<ProviderContext['puppeteer']['launch']>> | null = null;
	try {
		session = await ctx.puppeteer.launch(base, {
			requester,
			browsingOptions: { ignoreError: true, loadCriteria: 'networkidle2' },
		});
		const page = session.page;

		// 1. Search inside the CF-solved context -> resolve the watch/episode URL.
		const found = (await page.evaluate(
			async (searchPaths: string[], titles: string[], wantType: string, seasonEp: any) => {
				const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
				const want = titles.map(norm);
				for (const path of searchPaths) {
					try {
						const txt = await (await fetch(path, { headers: { 'x-requested-with': 'XMLHttpRequest' } })).text();
						let data: any;
						try {
							data = JSON.parse(txt);
						} catch {
							continue;
						}
						const items = (data?.data || []).filter((i: any) => i && i.type === wantType);
						const show = items.find((i: any) => want.includes(norm(i.name))) || items[0] || null;
						if (show) {
							const videoUrl = seasonEp
								? `${show.url}/season/${seasonEp.season}/episode/${seasonEp.episode}`
								: show.url;
							return { name: show.name as string, videoUrl: videoUrl as string };
						}
					} catch {
						/* next path */
					}
				}
				return { error: 'no-match' as const };
			},
			searchPaths,
			titles,
			wantType,
			seasonEp,
		)) as { name?: string; videoUrl?: string; error?: string };

		if (!found.videoUrl) {
			ctx.log.warn('[nepu] No matching item found.');
			return [];
		}
		ctx.log.info(`[nepu] Best match: "${found.name}" -> ${found.videoUrl}`);

		// 2. Open the watch page and capture the HLS playlist from the player traffic.
		const watchHref = new URL(found.videoUrl, base).href;
		const m3u8Promise = page
			.waitForResponse((r: any) => /\.m3u8(\?|$)/i.test(r.url()), { timeout: 25000 })
			.catch(() => null);

		await page.goto(watchHref, { waitUntil: 'domcontentloaded' }).catch(() => null);
		// Nudge the first embed to load its player (some skins require the click).
		await page.evaluate(() => (document.querySelector('a[data-embed]') as HTMLElement | null)?.click()).catch(() => null);

		const resp: any = await m3u8Promise;
		if (!resp) {
			ctx.log.warn('[nepu] No HLS playlist observed on the watch page.');
			return [];
		}
		const playlist = resp.url();
		const reqHeaders = (resp.request && resp.request().headers && resp.request().headers()) || {};
		const embedReferer = reqHeaders.referer || referer;
		const embedOrigin = reqHeaders.origin || new URL(playlist).origin;
		ctx.log.info(`[nepu] Captured HLS: ${playlist}`);

		return [
			{
				fileName: found.name ?? (media as any).title,
				playlist,
				language: 'en',
				format: 'm3u8',
				xhr: { flags: ['cors-blocked'], headers: { Origin: embedOrigin, Referer: embedReferer } },
			} satisfies InternalMediaSource,
		];
	} catch (error) {
		ctx.log.error(`[nepu] Browser flow failed: ${(error as Error).message}`);
		return [];
	} finally {
		await session?.page.close().catch(() => null);
	}
}
