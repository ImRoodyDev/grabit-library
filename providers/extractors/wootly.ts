import { type CheerioLoadRequest, type InternalMediaSource, type ProviderContext } from 'grabit-engine';
import { createCookiesFromSet, joinCookies } from 'grabit-engine';

export async function extractWootlyStream(
	embedURL: URL,
	requestOpts: CheerioLoadRequest,
	ctx: ProviderContext,
	meta: { fileName?: string; language: string },
): Promise<InternalMediaSource | null> {
	const landing = await ctx.xhr.fetch(
		embedURL,
		{
			method: 'GET',
			attachUserAgent: true,
			clean: true,
			useImpit: false,
			headers: { Referer: requestOpts.extraHeaders?.Referer ?? embedURL.origin + '/' },
		},
		requestOpts,
	);
	const landingHtml = await landing.text();
	const landingCookies = createCookiesFromSet(landing.headers as any) || '';
	const landing$ = ctx.cheerio.$load(landingHtml);
	const iframeSrc = landing$('iframe').attr('src');
	if (!iframeSrc) return null;

	const iframeURL = new URL(iframeSrc, embedURL);
	const iframeResponse = await ctx.xhr.fetch(
		iframeURL,
		{
			method: 'GET',
			attachUserAgent: true,
			clean: true,
			useImpit: false,
			headers: { cookie: landingCookies, Referer: embedURL.href },
		},
		requestOpts,
	);
	const iframeCookies = joinCookies(landingCookies, createCookiesFromSet(iframeResponse.headers as any) || '');
	const iframeHtml = await iframeResponse.text();
	const postResponse = await ctx.xhr.fetch(
		iframeURL,
		{
			method: 'POST',
			attachUserAgent: true,
			clean: true,
			useImpit: false,
			headers: {
				cookie: iframeCookies,
				Referer: iframeURL.href,
				Origin: iframeURL.origin,
				'content-type': 'application/x-www-form-urlencoded',
			},
			body: 'qdfx=1',
		},
		requestOpts,
	);
	const postHtml = await postResponse.text();
	const scriptText = `${iframeHtml}\n${postHtml}`;
	const token = extractValue(scriptText, 'tk');
	const videoId = extractValue(scriptText, 'vd');
	if (!token || !videoId) {
		ctx.log.warn(`[wootly] Token or video id missing from ${iframeURL.href}`);
		return null;
	}

	for (const endpoint of ['/grabd', '/grabm']) {
		const resolveURL = new URL(endpoint, iframeURL.origin);
		resolveURL.search = new URLSearchParams({ t: token, id: videoId }).toString();
		const response = await ctx.xhr.fetch(
			resolveURL,
			{
				method: 'GET',
				attachUserAgent: true,
				clean: true,
				useImpit: false,
				headers: { cookie: iframeCookies, Referer: iframeURL.href, Origin: iframeURL.origin },
				redirect: 'manual',
			},
			requestOpts,
		);
		const url = response.headers.get('location') || (await response.text()).trim();
		const match = url.match(/https?:\/\/[^\s"'<>]+/i)?.[0];
		if (match) {
			return {
				fileName: `[Wootly] ${meta.fileName ?? 'Video'}`,
				playlist: match,
				format: 'mp4',
				language: meta.language,
				xhr: { flags: ['IP_LOCKED'], headers: { Referer: iframeURL.origin + '/' } },
			};
		}
	}
	return null;
}

function extractValue(script: string, name: string): string | null {
	const match = script.match(new RegExp(`(?:var\\s+)?${name}\\s*=\\s*["']?([^;,'"\\s]+)`, 'i'));
	return match?.[1] ?? null;
}
