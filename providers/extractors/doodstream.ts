import { CheerioLoadRequest, ProviderContext, InternalMediaSource } from 'grabit-engine';

/** Characters used by makePlay() to generate the random suffix */
const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Regex to extract the `/pass_md5/<hash>/<token>` path from the embed page.
 *
 * Breakdown:
 *   \/pass_md5\/                — literal "/pass_md5/"
 *   ([\w-]+)                    — capture group 1: the hash
 *                                 (e.g. "235628169-83-81-1772321096-69cbdd78...")
 *   \/                          — literal "/"
 *   ([\w]+)                     — capture group 2: the token
 *                                 (e.g. "ci9n5fzx5bcetfnzzrkopox8")
 *
 * The hash contains digits, hyphens, and hex chars.
 * The token is purely alphanumeric.
 */
const PASS_MD5_REGEX = /\/pass_md5\/([\w-]+)\/([\w]+)/;

/**
 * Generates the `makePlay()` suffix that gets appended to the pass_md5 response.
 *
 * This replicates the client-side function exactly:
 *   1. Generate 10 random alphanumeric characters
 *   2. Append "?token=<token>&expiry=<unix_ms>"
 *
 * @param token - The video token extracted from the embed page
 * @returns The suffix string (e.g. "aB3xZ9kLmN?token=abc123&expiry=1709312345678")
 */
function makePlay(token: string): string {
	let randomStr = '';
	for (let i = 0; i < 10; i++) {
		randomStr += ALPHANUMERIC.charAt(Math.floor(Math.random() * ALPHANUMERIC.length));
	}
	return `${randomStr}?token=${token}&expiry=${Date.now()}`;
}

export async function extractDoodstreamStreams(
	embedURL: URL,
	requestOpts: CheerioLoadRequest,
	ctx: ProviderContext,
	meta: { fileName?: string; format?: string; language: string },
): Promise<InternalMediaSource | null> {
	const id = embedURL.pathname.split('/').filter(Boolean).pop();
	// Replace to the new Domain 'myvidplay.com' since 'doodstream.li' is now redirecting to it and the old domain is not working anymore
	embedURL.hostname = 'myvidplay.com';
	const resourceURL = new URL(`/e/${id}`, embedURL.origin); // Convert embed URL to resource URL
	ctx.log.debug(`[doodstream] Loading embed page: ${resourceURL.href}`);

	const opts: CheerioLoadRequest = {
		...requestOpts,
		extraHeaders: {
			...(requestOpts.extraHeaders ?? {}),
			Accept:
				'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
			'accept-language': 'en-US,en;q=0.9,es;q=0.8',
			'sec-fetch-dest': 'iframe',
			'sec-fetch-mode': 'navigate',
			'sec-fetch-site': 'cross-site',
			'sec-fetch-storage-access': 'active',
			'sec-fetch-user': '?1',
			'upgrade-insecure-requests': '1',
			cookie: undefined as any, // Ensure cookies are not sent with the request
			referer: requestOpts.extraHeaders?.referer ?? embedURL.origin, // Ensure referer is set for the initial page load
		},
	};
	const page = await ctx.cheerio.load(resourceURL, opts, ctx.xhr);
	ctx.log.debug(`[doodstream] Page loaded, searching for pass_md5 pattern...`);

	// Title from head
	const pageTitle = page.$('title').text().trim();

	const match = page.$.html()?.match(PASS_MD5_REGEX);
	if (!match) {
		ctx.log.warn('[doodstream] No pass_md5 pattern found in embed page.');
		return null;
	}

	const passMd5Path = match[0]; // e.g. "/pass_md5/235628...-69cbdd.../ci9n5fzx..."
	const hash = match[1]; // e.g. "235628169-83-81-1772321096-69cbdd..."
	const token = match[2]; // e.g. "ci9n5fzx5bcetfnzzrkopox8"
	ctx.log.debug(`[doodstream] Extracted hash: ${hash}, token: ${token}`);

	const md5URL = new URL(passMd5Path, resourceURL.origin); // Construct full URL for pass_md5 endpoint
	ctx.log.debug(`[doodstream] Fetching pass_md5 URL: ${md5URL.href}`);

	// Fetch the pass_md5 response
	const responseData = await ctx.xhr.fetchResponse<string>(
		md5URL,
		{
			attachUserAgent: true,
			method: 'GET',
			headers: {
				accept: '*/*',
				'accept-language': 'en-US,en;q=0.9,es;q=0.8',
				'cache-control': 'no-cache',
				pragma: 'no-cache',
				priority: 'u=1, i',
				'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
				'sec-ch-ua-mobile': '?0',
				'sec-ch-ua-platform': '"Windows"',
				'sec-fetch-dest': 'empty',
				'sec-fetch-mode': 'cors',
				'sec-fetch-site': 'same-origin',
				'x-requested-with': 'XMLHttpRequest',
				cookie: 'lang=1; dref_url=none',
				Referer: resourceURL.href,
			},
		},
		requestOpts,
	);
	if (!responseData) {
		ctx.log.warn('[doodstream] No response data received from pass_md5 endpoint.');
		return null;
	}

	const suffix = makePlay(token!);
	const videoUrl = responseData + suffix;
	ctx.log.debug(`[doodstream] Constructed video URL: ${videoUrl}`);

	return {
		fileName: `[Doodstream] ${meta.fileName ?? pageTitle ?? 'Video'}`,
		format: 'mp4',
		playlist: videoUrl,
		language: meta.language,
		xhr: {
			haveCorsPolicy: false,
			headers: {
				referer: resourceURL.origin + '/',
				origin: resourceURL.origin,
			},
		},
	} as InternalMediaSource;
}
