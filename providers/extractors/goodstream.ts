import { CheerioLoadRequest, ProviderContext, InternalMediaSource, extractContructorJSONArguments } from 'grabit-engine';

export async function extractGoodstreamStreams(
	embedURL: URL,
	requestOpts: CheerioLoadRequest,
	ctx: ProviderContext,
	meta: { fileName?: string; format?: string; language: string },
): Promise<InternalMediaSource[] | null> {
	const id = embedURL.pathname.split('/').filter(Boolean).pop();
	if (!embedURL.pathname.includes('embed-')) embedURL.pathname = '/embed-' + id;
	ctx.log.info(`[goodstream] Loading embed page: ${embedURL.href}`);

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
	const page = await ctx.cheerio.load(embedURL, opts, ctx.xhr);
	ctx.log.debug(`[goodstream] Page loaded, searching for video source...`);

	// Select packed script
	const scriptContent = page.$('script:contains(".setup")').html();
	if (!scriptContent || scriptContent.trim() === '') {
		ctx.log.warn('[goodstream] No player config found on the page. ');
		return null;
	}
	ctx.log.debug(`[goodstream] Player config script: ${scriptContent.substring(0, 100)}...`);

	// Extract the JSON configuration passed to jwplayer setup
	const unpackedArgs = extractContructorJSONArguments(scriptContent.replace('jwplayer("vplayer").setup', 'new Setup')) as {
		sources: [{ file: string }];
	};
	// ctx.log.debug(`[goodstream] Extracted player config arguments: ${JSON.stringify(unpackedArgs)}`);

	if (!unpackedArgs || !unpackedArgs.sources || unpackedArgs.sources.length < 1) {
		ctx.log.warn('[goodstream] No sources found in jwplayer setup arguments.');
		return null;
	}

	ctx.log.debug(`[goodstream] Extracted sources: ${JSON.stringify(unpackedArgs.sources)}`);

	return unpackedArgs.sources.map(
		(source) =>
			({
				fileName: `[Goodstream] ${meta.fileName ?? 'Video'}`,
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
