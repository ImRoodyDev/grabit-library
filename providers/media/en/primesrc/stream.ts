import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	type CheerioLoadRequest,
} from 'grabit-engine';
import { dispatchEmbed } from '../../../extractors/embedDispatch';
import { PROVIDER } from './config';

/** Hosts grabit's embedDispatch can resolve — we prefer these when picking servers. */
const SUPPORTED = /filemoon|moon|streamwish|filelions|lions|swish|wish|mixdrop|dood|supervideo|dropload/i;
/** How many distinct embeds we resolve + extract per request. */
const MAX_EMBEDS = 5;

/**
 * Stream handler for PrimeSrc.
 *
 * PrimeSrc exposes a clean JSON API: `/api/v1/s?imdb=…&type=…` lists servers (each
 * with a `key`), and `/api/v1/l?key=…` resolves a key to its embed URL. Both sit
 * behind Cloudflare, so the API calls run inside a puppeteer-solved browser context;
 * the resolved embed hosts (Filemoon / Streamwish / Mixdrop / Dood / …) are then
 * dispatched to grabit's extractors.
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const media = requester.media;
	const base = new URL(PROVIDER.config.baseUrl);
	// The servers-API path built from the `entries` pattern (imdb + type [+ s/e]).
	const apiPath = (() => {
		const u = PROVIDER.createResourceURL(requester);
		return u.pathname + u.search;
	})();

	let session: Awaited<ReturnType<ProviderContext['puppeteer']['launch']>> | null = null;
	try {
		session = await ctx.puppeteer.launch(base, {
			requester,
			browsingOptions: { ignoreError: true, loadCriteria: 'networkidle2' },
		});
		const page = session.page;

		// Resolve the server keys to embed URLs inside the CF-solved context.
		const resolved = (await page.evaluate(
			async (apiPath: string, supportedSrc: string, maxEmbeds: number) => {
				const SUPPORTED = new RegExp(supportedSrc, 'i');
				const findUrl = (v: any): string | null => {
					if (typeof v === 'string') return /^https?:\/\//.test(v) ? v : null;
					if (v && typeof v === 'object') for (const k of Object.keys(v)) {
						const u = findUrl(v[k]);
						if (u) return u;
					}
					return null;
				};
				// 1. Server list.
				const sRes = await fetch(apiPath, { headers: { 'x-requested-with': 'XMLHttpRequest' } });
				if (!sRes.ok) return { error: `servers ${sRes.status}` };
				const data = await sRes.json();
				const servers: any[] = Array.isArray(data?.servers) ? data.servers : [];
				// Prefer supported hosts; one key per host is enough.
				const seenHost = new Set<string>();
				const picks = servers.filter((s) => {
					if (!s?.key || !SUPPORTED.test(s.name || '')) return false;
					const h = (s.name || '').toLowerCase();
					if (seenHost.has(h)) return false;
					seenHost.add(h);
					return true;
				});

				// 2. Resolve each key -> embed URL.
				const embeds: { name: string; url: string }[] = [];
				let lastStatus = 0;
				for (const s of picks.slice(0, maxEmbeds)) {
					try {
						const lRes = await fetch(`/api/v1/l?key=${encodeURIComponent(s.key)}`, {
							headers: { 'x-requested-with': 'XMLHttpRequest' },
						});
						lastStatus = lRes.status;
						if (!lRes.ok) continue;
						const link = findUrl(await lRes.json());
						if (link) embeds.push({ name: s.name, url: link });
					} catch {
						/* skip */
					}
				}
				return { embeds, serverCount: servers.length, lastStatus };
			},
			apiPath,
			SUPPORTED.source,
			MAX_EMBEDS,
		)) as { error?: string; embeds?: { name: string; url: string }[]; serverCount?: number; lastStatus?: number };

		if (resolved.error) {
			ctx.log.warn(`[primesrc] Server list failed: ${resolved.error}`);
			return [];
		}
		if (!resolved.embeds?.length) {
			ctx.log.warn(
				`[primesrc] ${resolved.serverCount ?? 0} server(s) but no embed resolved (last /api/v1/l status ${resolved.lastStatus}).`,
			);
			return [];
		}
		ctx.log.info(
			`[primesrc] Resolved ${resolved.embeds.length} embed(s): ${resolved.embeds.map((e) => e.name).join(', ')}`,
		);

		// 3. Dispatch each embed host to its extractor (node-side).
		const results: InternalMediaSource[] = [];
		const opts: CheerioLoadRequest = { ...requester, extraHeaders: { Referer: base.origin + '/' } };
		for (const embed of resolved.embeds) {
			try {
				const sources = await dispatchEmbed(embed.url, opts, ctx, 'en');
				if (sources.length) results.push(...sources);
			} catch (error) {
				ctx.log.debug(`[primesrc] Extractor failed for ${embed.url}: ${(error as Error).message}`);
			}
		}

		ctx.log.info(`[primesrc] Returning ${results.length} source(s).`);
		return results;
	} catch (error) {
		ctx.log.error(`[primesrc] Browser flow failed: ${(error as Error).message}`);
		return [];
	} finally {
		await session?.page.close().catch(() => null);
	}
}
