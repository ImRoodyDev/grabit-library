import {
	type CheerioLoadRequest,
	type ProviderContext,
	type InternalMediaSource,
	unpackV2,
} from 'grabit-engine';

export interface StreamwishMeta {
	fileName?: string;
	format?: string;
	language: string;
}

/**
 * Extractor for the StreamWish / FileLions family of hosts (a Dean-Edwards-packed
 * jwplayer embed): streamwish, vidhide (vidhidepro), filelions, and the
 * many mirror domains they rotate through. The packed script unpacks to a jwplayer
 * setup whose `sources[].file` (or a bare `file:"…"`) is the HLS playlist.
 *
 * Ported to grabit from the pattern webstreamr uses for FileLions, but returns the
 * direct m3u8 (grabit plays it itself) instead of routing through a proxy.
 */
export async function extractStreamwishStreams(
	embedURL: URL,
	requestOpts: CheerioLoadRequest,
	ctx: ProviderContext,
	meta: StreamwishMeta,
): Promise<InternalMediaSource[] | null> {
	// Normalise to the `/e/<id>` embed form these hosts serve the player from.
	const id = embedURL.pathname
		.split('/')
		.filter(Boolean)
		.pop()
		?.replace('embed-', '');
	if (id) embedURL.pathname = `/e/${id}`;
	ctx.log.debug(`[streamwish] Loading embed page: ${embedURL.href}`);

	const opts: CheerioLoadRequest = {
		...requestOpts,
		followRedirects: true,
		extraHeaders: {
			...(requestOpts.extraHeaders || {}),
			accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			'accept-language': 'es-ES,es;q=0.9,en;q=0.8',
			'sec-fetch-dest': 'iframe',
			'sec-fetch-mode': 'navigate',
			'sec-fetch-site': 'cross-site',
			'upgrade-insecure-requests': '1',
			cookie: undefined as any,
		},
	};

	const page = await ctx.cheerio.load(embedURL, opts, ctx.xhr);

	// The player config lives inside a Dean-Edwards-packed `eval(function(p,a,c,k,e,d)…)`.
	let scriptContent = page.$('script:contains("eval")').first().html() || '';
	if (!scriptContent) {
		// Some mirrors ship several scripts; grab the first packed one.
		page.$('script').each((_: number, el: any) => {
			const html = page.$(el).html() || '';
			if (!scriptContent && html.includes('eval(function(p,a,c,k,e,d)')) scriptContent = html;
		});
	}
	if (!scriptContent) {
		ctx.log.warn('[streamwish] No eval-packed script found on the page.');
		return null;
	}

	let unpacked = '';
	try {
		unpacked = unpackV2(scriptContent) || '';
	} catch (error) {
		ctx.log.warn(`[streamwish] Failed to unpack script: ${(error as Error).message}`);
		return null;
	}
	if (!unpacked) {
		ctx.log.warn('[streamwish] Unpacked script was empty.');
		return null;
	}

	// The HLS URL appears as `file:"…m3u8…"` (jwplayer sources) or `"hls2":"…"`.
	const fileUrl =
		unpacked.match(/file\s*:\s*"([^"]+\.m3u8[^"]*)"/i)?.[1] ||
		unpacked.match(/sources\s*:\s*\[\s*\{\s*file\s*:\s*"([^"]+)"/i)?.[1] ||
		unpacked.match(/"hls[24]"\s*:\s*"([^"]+)"/i)?.[1] ||
		unpacked.match(/file\s*:\s*"([^"]+)"/i)?.[1];

	if (!fileUrl) {
		ctx.log.warn('[streamwish] No playlist URL found in unpacked script.');
		return null;
	}
	ctx.log.info(`[streamwish] Resolved playlist: ${fileUrl}`);

	return [
		{
			fileName: `[StreamWish] ${meta.fileName ?? 'Video'}`,
			format: (meta.format as any) || 'm3u8',
			playlist: fileUrl,
			language: meta.language,
			xhr: {
				flags: ['CORS_BLOCKED'],
				headers: {
					referer: embedURL.origin + '/',
					origin: embedURL.origin,
				},
			},
		} satisfies InternalMediaSource,
	];
}
