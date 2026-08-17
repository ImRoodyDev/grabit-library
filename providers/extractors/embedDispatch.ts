import { type CheerioLoadRequest, type ProviderContext, type InternalMediaSource } from 'grabit-engine';
import { extractStreamwishStreams } from './streamwish';
import { extractDoodstreamStreams } from './doodstream';
import { extractFilemoonStreams } from './filemoon';
import { extractMixdropStream } from './mixdrop';
import { extractSupervideoStreams } from './supervideo';
import { extractDroploadStreams } from './dropload';
import { extractFastreamStreams } from './fastream';

/**
 * Routes a video-host embed URL to the matching grabit extractor and normalises
 * the result to an array. Shared by the embed-based providers (Spanish and
 * others) that scrape a page for a set of mirror links. Unknown hosts (voe, waaw,
 * …) are skipped rather than throwing.
 */
export async function dispatchEmbed(
	embed: string | URL,
	opts: CheerioLoadRequest,
	ctx: ProviderContext,
	language: string,
): Promise<InternalMediaSource[]> {
	let url: URL;
	try {
		url = typeof embed === 'string' ? new URL(embed) : embed;
	} catch {
		return [];
	}
	const host = url.host.toLowerCase();
	const meta = { language };

	let out: InternalMediaSource[] | InternalMediaSource | null = null;
	try {
		if (/streamwish|vidhide|filelions|lions|swish|wish|strwish/.test(host)) {
			out = await extractStreamwishStreams(url, opts, ctx, meta);
		} else if (/dood|d0o0d|ds2play|ds2video|dsvplay/.test(host)) {
			out = await extractDoodstreamStreams(url, opts, ctx, meta);
		} else if (/filemoon|moon/.test(host)) {
			out = await extractFilemoonStreams(url, opts, ctx, meta);
		} else if (/mixdrop|mdrop|mxdrop/.test(host)) {
			out = await extractMixdropStream(url, opts, ctx, meta);
		} else if (/supervideo|svideo/.test(host)) {
			out = await extractSupervideoStreams(url, opts, ctx, meta);
		} else if (/dropload|dr0p|drop(load|stream)/.test(host)) {
			out = await extractDroploadStreams(url, opts, ctx, meta);
		} else if (/fastream|fstream/.test(host)) {
			out = await extractFastreamStreams(url, opts, ctx, meta);
		} else {
			ctx.log.debug(`[dispatch] No extractor for host ${host}, skipping.`);
			return [];
		}
	} catch (error) {
		ctx.log.debug(`[dispatch] Extractor threw for ${host}: ${(error as Error).message}`);
		return [];
	}

	if (!out) return [];
	return Array.isArray(out) ? out : [out];
}
