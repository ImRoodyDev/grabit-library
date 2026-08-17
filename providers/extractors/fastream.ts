import { CheerioLoadRequest, ProviderContext, InternalMediaSource, unpackV2, extractContructorJSONArguments } from 'grabit-engine';

/**
 * Extracts the HLS source from a Fastream embed page.
 * The jwplayer setup lives in a Dean Edwards packed <script>; unpack it and read
 * sources[].file. The m3u8 is token/IP-bound and needs a fastream.to Referer.
 */
export async function extractFastreamStreams(
	embedURL: URL,
	requestOpts: CheerioLoadRequest,
	ctx: ProviderContext,
	meta: { fileName?: string; format?: string; language: string },
): Promise<InternalMediaSource[] | null> {
	// Normalise any /e/ or /d/ variant to the /embed- form.
	const normalized = new URL(embedURL.href.replace('/e/', '/embed-').replace('/d/', '/embed-'));
	ctx.log.debug(`[fastream] Loading embed page: ${normalized.href}`);

	const opts: CheerioLoadRequest = {
		...requestOpts,
		followRedirects: true,
		extraHeaders: {
			...(requestOpts.extraHeaders || {}),
			Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
			Referer: 'https://fastream.to/',
			'Upgrade-Insecure-Requests': '1',
		},
	};

	const page = await ctx.cheerio.load(normalized, opts, ctx.xhr);

	const scriptContent = page.$('script:contains("eval")').html();
	if (!scriptContent || scriptContent.trim() === '') {
		ctx.log.warn('[fastream] No eval-packed script found on the page.');
		return null;
	}

	const unpackedCode = unpackV2(scriptContent);
	if (!unpackedCode) {
		ctx.log.warn('[fastream] Failed to unpack the player script.');
		return null;
	}

	const unpackedArgs = extractContructorJSONArguments(unpackedCode.replace('jwplayer("vplayer").setup', 'new Setup')) as {
		sources?: { file: string }[];
	};
	if (!unpackedArgs?.sources?.length) {
		ctx.log.warn('[fastream] No sources in jwplayer setup.');
		return null;
	}

	return unpackedArgs.sources
		.filter((s) => s.file)
		.map(
			(source) =>
				({
					fileName: `[Fastream] ${meta.fileName ?? 'Video'}`,
					format: (meta.format as any) || 'm3u8',
					playlist: source.file,
					language: meta.language,
					xhr: {
						flags: ['CORS_BLOCKED', 'REFERER_LOCKED', 'IP_LOCKED'],
						headers: { Referer: 'https://fastream.to/' },
					},
				}) satisfies InternalMediaSource,
		);
}
