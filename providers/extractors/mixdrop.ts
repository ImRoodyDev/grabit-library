import {
	type InternalMediaSource,
	type ProviderContext,
	type CheerioLoadRequest,
	extractEvalCode,
	unpackV2,
	extractVariableValue,
	MediaSource,
} from 'grabit-engine';

export interface MixdropSourceMeta {
	fileName?: string;
	format?: MediaSource['format'];
	language: string;
}

/**
 * Extracts the direct video URL from a Mixdrop embed page.
 * Loads the page, unpacks the obfuscated MDCore script, and returns the resolved source.
 */
export async function extractMixdropStream(
	embedURL: URL,
	requestOpts: CheerioLoadRequest,
	ctx: ProviderContext,
	meta: MixdropSourceMeta,
): Promise<InternalMediaSource | null> {
	const id = embedURL.pathname.split('/').filter(Boolean).pop();
	embedURL.pathname = `/e/${id}`; // Ensure we're on the correct embed path
	ctx.log.debug(`[mixdrop] Loading embed page: ${embedURL.href}`);

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
	const mixdropPage = await ctx.cheerio.load(embedURL, iframeOpts, ctx.xhr);

	// Select title from the head
	const pageTitle = mixdropPage.$('.title a').text().trim();
	ctx.log.debug(`[mixdrop] Page title: ${pageTitle}`);

	// Find the script containing the MDCore player initialization
	const scriptContent = mixdropPage.$('script:contains("MDCore")')?.html();
	if (!scriptContent || scriptContent.trim() === '') {
		ctx.log.warn('[mixdrop] No MDCore script found on the page.');
		return null;
	}

	// Extract and unpack the eval-obfuscated code (Dean Edwards packer)
	const packedCode = extractEvalCode(scriptContent);
	if (!packedCode) {
		ctx.log.warn('[mixdrop] No eval-packed code found in MDCore script.');
		return null;
	}

	const unpackedCode = unpackV2(packedCode);
	ctx.log.info(`[mixdrop] Unpacked code (${unpackedCode.length} chars)`);

	// Extract the video delivery URL from MDCore.wurl
	let videoSource = extractVariableValue(unpackedCode, 'MDCore.wurl');
	if (!videoSource) {
		ctx.log.warn('[mixdrop] MDCore.wurl not found in unpacked code.');
		return null;
	}
	ctx.log.info(`[mixdrop] Resolved video URL: ${videoSource}`);

	return {
		fileName: `[Mixdrop] ${meta.fileName ?? pageTitle ?? 'Video'}`,
		playlist: videoSource,
		language: meta.language,
		xhr: {
			haveCorsPolicy: true,
			headers: iframeHeaders,
		},
	} satisfies InternalMediaSource;
}
