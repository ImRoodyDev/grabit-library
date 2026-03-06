import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	extractYearFromText,
	createCookiesFromSet,
	ProviderFetchOptions,
	Crypto,
	ProcessError,
	ISO6391,
} from 'grabit-engine';
import { PROVIDER } from './config';

/**
 * Stream handler for AutoEmbed.
 *
 * Fetches and parses media streams from the provider's endpoint.
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	// Create the search URL based on the requester's media information
	const resourceURL = PROVIDER.createResourceURL(requester);
	ctx.log.debug(`Created resource URL: ${resourceURL}`);

	// Page Extra headers
	const pageRequestOpt = {
		...requester,
		extraHeaders: {
			accept:
				'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
			'accept-language': 'en-US,en;q=0.9,es;q=0.8',
			'cache-control': 'no-cache',
			pragma: 'no-cache',
			priority: 'u=0, i',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"Windows"',
			'sec-fetch-dest': 'document',
			'sec-fetch-mode': 'navigate',
			'sec-fetch-site': 'same-origin',
			'sec-fetch-user': '?1',
			'upgrade-insecure-requests': '1',
			'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
			Referer: resourceURL.origin + '/',
			cookie: createCookies(),
		},
	};
	ctx.log.debug(`Page request options: ${JSON.stringify(pageRequestOpt)}`);

	const resultsPage = await ctx.cheerio.load(resourceURL, pageRequestOpt, ctx.xhr);
	// ctx.log.info(`Page HTML: ${resultsPage.$.html()}`);

	// Extract title and year from the page's title tag
	const htmlTitle = resultsPage.$('head > title').text();
	const title = htmlTitle.split('(')[0]?.trim() ?? (requester.media as any).title;
	const year = extractYearFromText(htmlTitle);
	ctx.log.info(`Extracted title: ${title}, year: ${year}`);

	// Extract servers from the page
	const servers = siteServers()
		.filter((s) => ISO6391.getCode(s.language) === requester.targetLanguageISO)
		.splice(0, 2); // Limit to top 2 servers
	ctx.log.info(`Filtered servers based on media language (${requester.targetLanguageISO}): ${JSON.stringify(servers)}`);

	// Fetch the servers streams
	const results: InternalMediaSource[] = [];
	const apiURL = new URL('api/server', resourceURL.origin);
	const apiOpts = {
		clean: true,
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
			cookie: pageRequestOpt.extraHeaders.cookie!,
			Referer: resourceURL.origin + '/',
		},
	} satisfies ProviderFetchOptions;

	for (const server of servers) {
		try {
			const params = new URLSearchParams({
				...(requester.media.type === 'movie'
					? {
							id: requester.media.tmdbId,
							sr: '2', // this is server index
							args: `${title}*${year}*${requester.media.imdbId}`,
						}
					: {}),
				...(requester.media.type === 'serie'
					? {
							id: requester.media.tmdbId,
							sr: '2', // this is server index
							args: `${title}*${year}*${requester.media.imdbId}`,
							ep: `${requester.media.season}`,
							ss: `${requester.media.episode}`,
						}
					: {}),
			});
			apiURL.search = params.toString();
			ctx.log.info(`API URL: ${apiURL.toString()}`);
			const apiResponse = await ctx.xhr.fetchResponse<{ data: string }>(apiURL, apiOpts, requester);
			ctx.log.debug(`API Response: ${JSON.stringify(apiResponse)}`);

			// Decrypt the API response
			const decryptedData = await decryptData(apiResponse.data);
			ctx.log.debug(`Decrypted API data: ${JSON.stringify(decryptedData)}`);
			results.push({
				fileName: `${server.name} Server - ${title} (${year})`,
				playlist: decryptedData.url,
				language: ISO6391.getCode(server.language) ?? 'en',
				xhr: {
					// I have notice that cf url is not cors blocked
					haveCorsPolicy: false,
					headers: decryptedData.headers,
				},
			} satisfies InternalMediaSource);
		} catch (error) {
			ctx.log.error(`Error processing server ${server.name}: ${(error as Error).message}`);
		}
	}

	return results;
}

function siteServers() {
	// HARDCODED
	const server = [
		{
			flag: 'US',
			name: 'Crown',
			audioLanguage: 'English audio',
			language: 'English',
		},
		{
			flag: 'VN',
			name: 'Viet',
			audioLanguage: 'English audio',
			language: 'English',
		},
		{
			flag: 'US',
			name: 'Wink',
			audioLanguage: 'English audio',
			language: 'English',
		},
		{
			flag: 'AU',
			name: 'Orion',
			audioLanguage: 'English audio',
			language: 'English',
		},
		{
			flag: 'US',
			name: 'Cine',
			audioLanguage: 'English audio',
			language: 'English',
		},
		{
			flag: 'US',
			name: 'Beta',
			audioLanguage: 'English audio',
			language: 'English',
		},
		{
			flag: 'US',
			name: 'Nexon',
			audioLanguage: 'English audio',
			language: 'English',
		},
		{
			flag: 'GB',
			name: 'Gork',
			audioLanguage: 'English audio',
			language: 'English',
		},
		{
			flag: 'US',
			name: 'Vox',
			audioLanguage: 'English audio',
			language: 'English',
		},
		{
			flag: 'US',
			name: 'Minecloud',
			audioLanguage: 'English audio',
			language: 'English',
		},
		{
			flag: 'US',
			name: 'Joker',
			audioLanguage: 'English audio',
			language: 'English',
		},
		{
			flag: 'GB',
			name: 'Leo',
			audioLanguage: 'Original audio',
			language: 'English',
		},
		{
			flag: '4K',
			name: '4K',
			audioLanguage: 'Original audio',
			language: 'English',
		},
		{
			flag: 'IN',
			name: 'Hindi',
			audioLanguage: 'Hindi audio',
			language: 'Hindi',
		},
		{
			flag: 'IN',
			name: 'Indus',
			audioLanguage: 'Hindi audio',
			language: 'Hindi',
		},
		{
			flag: 'IN',
			name: 'Delta',
			audioLanguage: 'Bengali audio',
			language: 'Bengali',
		},
		{
			flag: 'IN',
			name: 'Ben',
			audioLanguage: 'Bengali audio',
			language: 'Bengali',
		},
		{
			flag: 'IN',
			name: 'Pearl',
			audioLanguage: 'Tamil audio',
			language: 'Tamil',
		},
		{
			flag: 'IN',
			name: 'Tamil',
			audioLanguage: 'Tamil audio',
			language: 'Tamil',
		},
		{
			flag: 'IN',
			name: 'Ruby',
			audioLanguage: 'Telugu audio',
			language: 'Telugu',
		},
		{
			flag: 'IN',
			name: 'Tel',
			audioLanguage: 'Telugu audio',
			language: 'Telugu',
		},
		{
			flag: 'IN',
			name: 'Mal',
			audioLanguage: 'Malayalam audio',
			language: 'Malayalam',
		},
		{
			flag: 'IN',
			name: 'Kan',
			audioLanguage: 'Kannada audio',
			language: 'Kannada',
		},
		{
			flag: 'FR',
			name: 'Lava',
			audioLanguage: 'French audio',
			language: 'French',
		},
	];

	return server.map((s, index) => ({ ...s, id: index + 1 }));
}

function createCookies() {
	return createCookiesFromSet({
		setCookie: [
			'cf_clearance=iTDt9G3tSANGCfJMRHzEz_MlFJZwOAq6iKVF3AR8CdA-1772285363-1.2.1.1-v_FD2wJTlmh6SUOH58FG4j62K29B.t7I47whnCvkoyDmfrWowHE39ThbdvGJRpjtbsQ5LfkGoSMwVbaFLrvaCVoSAL_Kchr8WPqHFV56qJxu3YGjRc8ozYOu7XAq0AHGXNUCtzUGzsgjrKv_cwV3qxQEXfvisjaNQBKzQcchbMu6hSsnKRUToLr55XW9CHmNu_p9qeW96rGClMDKkLps8tu9FF2qM2L9aFN6CfgqLCs',
		],
	});
}

async function decryptData(data: string) {
	const vAtob = atob(data);
	const p250 = JSON.parse(vAtob);

	const salt = Buffer.from(p250.salt, 'hex');
	const iv = Buffer.from(p250.iv, 'hex');
	const encrypted = Buffer.from(p250.encryptedData, 'base64'); // crypto-js usually outputs Base64

	// Derive key using PBKDF2 with SHA256
	const key = Crypto.pbkdf2Sync(
		p250.key,
		salt,
		p250.iterations,
		32, // 256-bit key = 32 bytes
		'sha256',
	);

	// AES-CBC decryption
	const decipher = Crypto.createDecipheriv('aes-256-cbc', key, iv);
	decipher.setAutoPadding(true); // PKCS7 padding

	let decrypted = decipher.update(encrypted, undefined, 'utf8');
	decrypted += decipher.final('utf8');

	if (!decrypted) {
		throw new ProcessError({
			code: 'DECRYPTION_FAILED',
			message: 'Failed to decrypt data from provider',
			details: { data },
		});
	}

	return JSON.parse(decrypted) as {
		url: string;
		headers: Record<string, string>;
		tracks: any[];
		cachedAt: string;
	};
}
