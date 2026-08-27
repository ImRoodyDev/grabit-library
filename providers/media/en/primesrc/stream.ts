import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	type CheerioLoadRequest,
} from 'grabit-engine';
import { dispatchEmbed } from '../../../extractors/embedDispatch';
import { PROVIDER } from './config';
import { primeApi, getServerList, resolveEmbed } from './api';

/**
 * Stream handler for PrimeSrc.
 *
 * PrimeSrc exposes a JSON API: `/api/v1/s?imdb=…&type=…` lists servers (each with a `key`),
 * and `/api/v1/l?key=…` resolves a key to its embed URL. Both sit behind a Cloudflare managed
 * challenge, so `/api/v1/l` answers 403 with the "Just a moment" HTML even with cf_clearance.
 * We solve once for the list, and resolve each key by OPENING its URL (a top-level navigation
 * auto-clears the managed challenge — see api.ts). Resolved hosts are dispatched to grabit's
 * extractors. Stays `env: "universal"` (solveChallenge only, no direct puppeteer).
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const { base, apiUrl, headers, jar } = await primeApi(requester, ctx);

	// 1. Server list.
	const picks = await getServerList(apiUrl, headers, requester, ctx);
	if (!picks.length) return [];

	// 2. Resolve each key -> embed URL.
	ctx.log.info(`[primesrc] Resolving ${picks.length} embed key(s): ${picks.map((s) => s.name).join(', ')}`);
	const embeds: { name: string; url: string }[] = [];
	for (const s of picks) {
		try {
			const url = await resolveEmbed(s.key, base, headers, jar, requester, ctx);
			if (url) embeds.push({ name: s.name, url });
			ctx.log.debug(`[primesrc] Resolved embed for ${s.name}: ${url ?? 'null'}`);
		} catch {
			/* skip a bad key */
		}
	}

	if (!embeds.length) {
		ctx.log.warn(`[primesrc] ${picks.length} server(s) but no embed resolved.`);
		return [];
	}
	ctx.log.info(`[primesrc] Resolved ${embeds.length} embed(s): ${embeds.map((e) => e.name).join(', ')}`);

	// 3. Dispatch each embed host to its extractor.
	const results: InternalMediaSource[] = [];
	const opts: CheerioLoadRequest = { ...requester, extraHeaders: { Referer: base.origin + '/' } };
	for (const embed of embeds) {
		try {
			const sources = await dispatchEmbed(embed.url, opts, ctx, 'en');
			if (sources.length) results.push(...sources);
		} catch (error) {
			ctx.log.debug(`[primesrc] Extractor failed for ${embed.url}: ${(error as Error).message}`);
		}
	}

	ctx.log.info(`[primesrc] Returning ${results.length} source(s).`);
	return results;
}
