import {
	CheerioLoadRequest,
	ProviderContext,
	InternalMediaSource,
	unpackV2,
	extractContructorJSONArguments,
	extractEvalCode,
	extractContructorJSONArgumentsByName,
} from 'grabit-engine';

export async function extractVimeosStreams(
	embedURL: URL,
	requestOpts: CheerioLoadRequest,
	ctx: ProviderContext,
	meta: { fileName?: string; format?: string; language: string },
): Promise<InternalMediaSource[] | null> {
	const id = embedURL.pathname.split('/').filter(Boolean).pop();
	if (!embedURL.pathname.includes('embed-')) embedURL.pathname = '/embed-' + id;
	ctx.log.debug(`[vimeos] Loading embed page: ${embedURL.href}`);

	// Build iframe-style headers (clear parent cookies for cross-site request)
	const iframeHeaders: Record<string, string> = {
		...(requestOpts.extraHeaders ?? {}),
		accept:
			'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
		'accept-language': 'en-US,en;q=0.9,es;q=0.8',
		'sec-fetch-dest': 'iframe',
		'sec-fetch-mode': 'navigate',
		'sec-fetch-site': 'cross-site',
		'sec-fetch-storage-access': 'active',
		'sec-fetch-user': '?1',
		'upgrade-insecure-requests': '1',
		cookie: undefined as any, // Ensure cookies are not sent with the request
	};

	const iframeOpts: CheerioLoadRequest = {
		...requestOpts,
		followRedirects: true,
		extraHeaders: iframeHeaders,
	};

	// Load the embed page
	const vimeoPage = await ctx.cheerio.load(embedURL, iframeOpts, ctx.xhr);

	// Find the script containing the MDCore player initialization
	const scriptContent = vimeoPage.$('script:contains("eval")')?.html();
	if (!scriptContent || scriptContent.trim() === '') {
		ctx.log.warn('[vimeos] No eval script found on the page.');
		return null;
	}

	// Extract and unpack the eval-obfuscated code (Dean Edwards packer)
	const packedCode = extractEvalCode(scriptContent);
	if (!packedCode) {
		ctx.log.warn('[vimeos] No eval-packed code found in script.');
		return null;
	}

	const unpackedCode = unpackV2(packedCode);
	ctx.log.info(`[vimeos] Unpacked code (${unpackedCode.length} chars)`);
	// ctx.log.debug(`[vimeos] Unpacked code: ${unpackedCode.substring(0, 100)}...`); // Log the beginning of the unpacked code for debugging

	// Extract the JSON configuration passed to jwplayer setup
	const unpackedArgs = extractContructorJSONArgumentsByName(
		unpackedCode.replace('jwplayer("vplayer").setup', 'new Setup'),
		'new Setup',
	) as {
		sources: [{ file: string }];
	};
	// ctx.log.debug(`[vimeos] Extracted player config arguments: ${JSON.stringify(unpackedArgs)}`);

	if (!unpackedArgs || !unpackedArgs.sources || unpackedArgs.sources.length < 1) {
		ctx.log.warn('[vimeos] No sources found in jwplayer setup arguments.');
		return null;
	}

	ctx.log.debug(`[vimeos] Extracted sources: ${JSON.stringify(unpackedArgs.sources)}`);

	return unpackedArgs.sources.map(
		(source) =>
			({
				fileName: `[Vimeos] ${meta.fileName ?? 'Video'}`,
				format: (meta.format as any) || 'm3u8',
				playlist: source.file,
				language: meta.language,
				xhr: {
					haveCorsPolicy: false,
					headers: {
						'content-cache': 'no-cache',
						host: new URL(source.file).host,
						referer: embedURL.origin + '/',
						origin: embedURL.origin,
					},
				},
			}) satisfies InternalMediaSource,
	);
}
