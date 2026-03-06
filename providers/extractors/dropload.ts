import { CheerioLoadRequest, ProviderContext, InternalMediaSource, unpackV2, extractContructorJSONArguments } from 'grabit-engine';

export async function extractDroploadStreams(
	embedURL: URL,
	requestOpts: CheerioLoadRequest,
	ctx: ProviderContext,
	meta: { fileName?: string; format?: string; language: string },
): Promise<InternalMediaSource[] | null> {
	const id = embedURL.pathname.split('/').filter(Boolean).pop()?.replace('embed-', '');
	const resourceURL = new URL(`/embed-${id}`, embedURL.origin); // Convert embed URL to resource URL
	ctx.log.debug(`[dropload] Loading embed page: ${resourceURL.href}`);

	const opts: CheerioLoadRequest = {
		...requestOpts,
		followRedirects: true,
		extraHeaders: {
			...(requestOpts.extraHeaders || {}),
			accept:
				'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
			'accept-language': 'en-US,en;q=0.9,es;q=0.8',
			'cache-control': 'no-cache',
			pragma: 'no-cache',
			priority: 'u=0, i',
			'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"Windows"',
			'sec-fetch-dest': 'iframe',
			'sec-fetch-mode': 'navigate',
			'sec-fetch-site': 'cross-site',
			'sec-fetch-storage-access': 'active',
			'upgrade-insecure-requests': '1',
			cookie: undefined as any, // Ensure cookies are not sent with the request
		},
	};
	const page = await ctx.cheerio.load(resourceURL, opts, ctx.xhr);
	ctx.log.debug(`[dropload] Page loaded, searching for video source...`);

	// Select packed script
	const scriptContent = page.$('script:contains("eval")').html();
	if (!scriptContent || scriptContent.trim() === '') {
		ctx.log.warn('[dropload] No eval-packed script found on the page.');
		return null;
	}
	ctx.log.debug(`[dropload] Eval-packed script: ${scriptContent.substring(0, 100)}...`);

	// Extract and unpack the eval-obfuscated code (Dean Edwards packer)
	const unpackedCode = unpackV2(scriptContent);
	if (!unpackedCode) {
		ctx.log.warn('[dropload] No eval-packed code found in script.');
		return null;
	}

	// Extract the JSON configuration passed to jwplayer setup
	const unpackedArgs = extractContructorJSONArguments(unpackedCode.replace('jwplayer("vplayer").setup', 'new Setup')) as {
		sources: [{ file: string }];
	};

	if (!unpackedArgs || !unpackedArgs.sources || unpackedArgs.sources.length < 1) {
		ctx.log.warn('[dropload] No sources found in jwplayer setup arguments.');
		return null;
	}

	ctx.log.debug(`[dropload] Extracted sources`);

	return unpackedArgs.sources.map(
		(source) =>
			({
				fileName: `[Dropload] ${meta.fileName ?? 'Video'}`,
				format: (meta.format as any) || 'm3u8',
				playlist: source.file,
				language: meta.language,
				xhr: {
					haveCorsPolicy: true,
					headers: {
						host: new URL(source.file).host,
						referer: resourceURL.origin + '/',
						origin: resourceURL.origin,
					},
				},
			}) satisfies InternalMediaSource,
	);
}
