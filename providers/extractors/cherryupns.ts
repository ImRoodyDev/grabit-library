import { type InternalMediaSource, type ProviderContext, type ProviderFetchOptions, type ScrapeRequester, Crypto } from 'grabit-engine';

const CHERRY_UPNS_KEY = Buffer.from('kiemtienmua911ca', 'utf-8');
const CHERRY_UPNS_IV = Buffer.from('1234567890oiuytr', 'utf-8');

type CherryUpnsDecrypted = { source: string; cf?: string; title: string };

export interface CherryUpnsSourceMeta {
	language?: string;
}

/**
 * Decrypts a hex-encoded AES-128-CBC ciphertext returned by the cherry.upns API.
 * Returns the parsed JSON containing source URL(s) and title.
 */
export function decryptCherryUpnsResponse(hexCiphertext: string): CherryUpnsDecrypted {
	const ciphertext = Buffer.from(hexCiphertext, 'hex');
	const decipher = Crypto.createDecipheriv('aes-128-cbc', CHERRY_UPNS_KEY, CHERRY_UPNS_IV);
	decipher.setAutoPadding(true);
	const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
	return JSON.parse(decrypted.toString('utf-8')) as CherryUpnsDecrypted;
}

/**
 * Extracts video streams from a cherry.upns.online embed URL.
 * Fetches the encrypted API response, decrypts it, and returns normalised sources.
 */
export async function extractCherryUpnsStream(
	embedURL: URL,
	ctx: ProviderContext,
	requester: ScrapeRequester,
	meta: CherryUpnsSourceMeta = {},
): Promise<InternalMediaSource[]> {
	// Build the API URL from the embed hash
	const downloadURL = new URL('https://cherry.upns.online/api/v1/video');
	downloadURL.searchParams.set('id', embedURL.hash.substring(1));
	downloadURL.searchParams.set('w', '1920');
	downloadURL.searchParams.set('h', '1080');
	downloadURL.searchParams.set('r', 'cherry.upns.online');
	ctx.log.info(`[cherryupns] Fetching video API: ${downloadURL.href}`);

	const fetchOpts: ProviderFetchOptions = {
		method: 'GET',
		clean: true,
		attachUserAgent: true,
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
			cookie: makeYmCookies(),
			Referer: downloadURL.origin + '/',
			Origin: downloadURL.origin,
		},
	};

	const encryptedResponse = await ctx.xhr.fetchResponse<string>(downloadURL, fetchOpts, requester);
	const decrypted = decryptCherryUpnsResponse(encryptedResponse);

	// Collect non-null source URLs
	const sourceUrls = [decrypted.source, decrypted.cf].filter(Boolean) as string[];
	ctx.log.info(`[cherryupns] Resolved ${sourceUrls.length} stream(s):\n${sourceUrls.join('\n')}`);

	return sourceUrls.map(
		(url, index) =>
			({
				fileName: `${decrypted.title} ${index + 1}`,
				format: 'm3u8',
				playlist: url,
				language: meta.language || 'en',
				xhr: {
					// cf URL is typically not CORS-blocked
					haveCorsPolicy: !!decrypted.cf && decrypted.cf.includes(url),
					headers: { ...(fetchOpts.headers as Record<string, string>) },
				},
			}) satisfies InternalMediaSource,
	);
}

// Generates fake Yandex.Metrika cookies expected by the cherry.upns.online server
function makeYmCookies(): string {
	const now = Math.floor(Date.now() / 1000);
	const uid = `${now}${Math.floor(Math.random() * 1_000_000_000)
		.toString()
		.padStart(9, '0')}`;
	return `_ym_uid=${uid}; _ym_d=${now}; _ym_isad=2`;
}
