import { CheerioLoadRequest, ProviderContext, InternalMediaSource, unpackV2, extractContructorJSONArguments } from 'grabit-engine';

export async function extractSupervideoStreams(
	embedURL: URL,
	requestOpts: CheerioLoadRequest,
	ctx: ProviderContext,
	meta: { fileName?: string; format?: string; language: string },
): Promise<InternalMediaSource[] | null> {
	ctx.log.debug(`[supervideo] Loading embed page: ${embedURL.href}`);

	const opts: CheerioLoadRequest = {
		...requestOpts,
		followRedirects: true,
		extraHeaders: {
			...(requestOpts.extraHeaders || {}),
			Accept: `text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8`,
			'Accept-Language': 'en-US,en;q=0.9',
			'Accept-Encoding': 'gzip, deflate, br, zstd',
			Connection: 'keep-alive',
			'Upgrade-Insecure-Requests': '1',
			'Sec-Fetch-Dest': 'document',
			'Sec-Fetch-Mode': 'navigate',
			'Sec-Fetch-Site': 'none',
			Priority: 'u=0, i',
			Pragma: 'no-cache',
			'Cache-Control': 'no-cache',
			cookie: undefined as any, // Ensure cookies are not sent with the request
		},
	};

	const page = await ctx.cheerio.load(embedURL, opts, ctx.xhr);
	ctx.log.debug(`[supervideo] Page loaded, searching for video source...`);

	// Select packed script
	const scriptContent = page.$('script:contains("eval")').html();
	if (!scriptContent || scriptContent.trim() === '') {
		ctx.log.warn('[supervideo] No eval-packed script found on the page.');
		return null;
	}
	ctx.log.debug(`[supervideo] Eval-packed script: ${scriptContent.substring(0, 100)}...`);

	// Extract and unpack the eval-obfuscated code (Dean Edwards packer)
	const unpackedCode = unpackV2(scriptContent);
	if (!unpackedCode) {
		ctx.log.warn('[supervideo] No eval-packed code found in script.');
		return null;
	}
	// ctx.log.debug(`[supervideo] Unpacked code: ${unpackedCode}`);

	// Extract the JSON configuration passed to jwplayer setup
	const unpackedArgs = extractContructorJSONArguments(unpackedCode.replace('jwplayer("vplayer").setup', 'new Setup')) as {
		sources: [{ file: string }];
	};

	if (!unpackedArgs || !unpackedArgs.sources || unpackedArgs.sources.length < 1) {
		ctx.log.warn('[supervideo] No sources found in jwplayer setup arguments.');
		return null;
	}

	ctx.log.debug(`[supervideo] Extracted sources`);

	return unpackedArgs.sources.map(
		(source) =>
			({
				fileName: `[Supervideo] ${meta.fileName ?? 'Video'}`,
				format: (meta.format as any) || 'm3u8',
				playlist: source.file,
				language: meta.language,
				xhr: {
					haveCorsPolicy: true,
					headers: {
						host: new URL(source.file).host,
						referer: embedURL.origin + '/',
						origin: embedURL.origin,
					},
				},
			}) satisfies InternalMediaSource,
	);
}
