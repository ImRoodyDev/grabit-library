import {
	type CheerioLoadRequest,
	type InternalMediaSource,
	type ProviderContext,
	type ScrapeRequester,
	type SerieMedia,
} from 'grabit-engine';
import { dispatchEmbed } from '../../../extractors/embedDispatch';
import { PROVIDER } from './config';

type Handle = { embed: string; fileName: string; language: string };
type Result = { title: string; year: string; slug: string };

const SUPPORTED_HOSTS = /wootly|dood|d0o0d|ds2play|ds2video|dsvplay|filemoon|moon|mixdrop|mdrop|mxdrop|supervideo|svideo|dropload|dr0p|dropstream|streamwish|vidhide|filelions|lions|fastream|fstream/i;

export async function getLazyStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const found = await findEmbeds(requester, ctx);
	return found.map((embed) => ({
		fileName: embed.fileName,
		language: embed.language,
		lazy: { id: encodeURIComponent(JSON.stringify(embed satisfies Handle)), label: new URL(embed.embed).hostname },
		xhr: { flags: [], headers: {} },
	}));
}

export async function resolveLazy(id: string, ctx: ProviderContext, requester: ScrapeRequester): Promise<InternalMediaSource | null> {
	let handle: Handle;
	try {
		handle = JSON.parse(decodeURIComponent(id)) as Handle;
	} catch {
		return null;
	}
	if (!handle?.embed || !isAllowedEmbed(handle.embed)) return null;
	const opts: CheerioLoadRequest = { ...requester, extraHeaders: { Referer: new URL(PROVIDER.config.baseUrl).origin + '/' } };
	const sources = await dispatchEmbed(handle.embed, opts, ctx, handle.language).catch(() => []);
	return sources[0] ?? null;
}

async function findEmbeds(requester: ScrapeRequester, ctx: ProviderContext): Promise<Handle[]> {
	const media = requester.media;
	const base = new URL(PROVIDER.config.baseUrl);
	const title = String((media as any).title || '');
	const wantType = media.type === 'movie' ? 'movie' : 'show';
	const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');
	const solved = await ctx.solveChallenge(base, requester, { waitForCookie: 'cf_clearance' });
	const pageCookie = solved.html.match(/_3chk\(['"]([^'"]+)['"],['"]([^'"]+)['"]\)/);
	const solvedCookie = pageCookie ? `${pageCookie[1]}=${pageCookie[2]}` : '';
	const headers: Record<string, string> = {
		Referer: base.origin + '/',
		Origin: base.origin,
		accept: '*/*',
		...(solved.cookies || solvedCookie ? { cookie: [solved.cookies, solvedCookie].filter(Boolean).join('; ') } : {}),
		...(solved.userAgent ? { 'User-Agent': solved.userAgent } : {}),
	};
	const searchUrl = new URL('/xmre.php', base);
	const searchHtml = await searchGoojara(searchUrl, solved.html, title, headers, requester, ctx);
	if (!searchHtml) return [];
	const results = parseResults(searchHtml, wantType, title, media as any, ctx);
	const match = selectResult(results, title, String((media as any).releaseYear ?? ''));
	if (!match) return [];

	let id = match.slug;
	if (media.type === 'serie') {
		const series = media as SerieMedia;
		const showHtml = await ctx.xhr.fetch(new URL(`/${match.slug}?s=${series.season}`, base), { method: 'GET', attachUserAgent: true, clean: true, headers }, requester).then((response) => response.text()).catch(() => '');
		const $ = ctx.cheerio.$load(showHtml);
		id = '';
		$('.seho').each((_: number, element: any) => {
			if (id) return;
			const number = $(element).find('.seep .sea').first().text().trim();
			const href = $(element).find('.snfo h1 a').first().attr('href') || '';
			if (Number(number) === series.episode) id = href.match(/\/([a-zA-Z0-9]+)$/)?.[1] || '';
		});
		if (!id) return [];
	}

	const pageResponse = await ctx.xhr.fetch(new URL(`/${id}`, base), { method: 'GET', attachUserAgent: true, clean: true, headers }, requester).catch(() => null);
	if (!pageResponse) return [];
	const pageHtml = await pageResponse.text();
	const pageCookies = pageResponse.headers.get('set-cookie');
	if (pageCookies) headers.cookie = [headers.cookie, pageCookies].filter(Boolean).join('; ');
	const $ = ctx.cheerio.$load(pageHtml);
	const goLinks = [...new Set(
		$('a').toArray().map((element: any) => $(element).attr('href') || '').filter((href: string) => href.includes('/go.php')),
	)];
	const handles: Handle[] = [];
	for (const go of goLinks.slice(0, 8)) {
		try {
			const response = await ctx.xhr.fetch(new URL(go, base), { method: 'GET', attachUserAgent: true, clean: true, useImpit: false, redirect: 'follow', headers }, requester);
			const finalUrl = response.url || '';
			if (isAllowedEmbed(finalUrl)) handles.push({ embed: finalUrl, fileName: String((media as any).title || match.title), language: 'en' });
		} catch {
			// A mirror can be unavailable without affecting the other handles.
		}
	}
	return handles.filter((handle, index) => handles.findIndex((other) => other.embed === handle.embed) === index);
}

async function searchGoojara(url: URL, homepageHtml: string, title: string, headers: Record<string, string>, requester: ScrapeRequester, ctx: ProviderContext): Promise<string> {
	const token = ctx.cheerio.$load(homepageHtml)('#res').attr('data-ins') || '';
	const options = { method: 'POST' as const, attachUserAgent: true, clean: true, useImpit: false, headers: { ...headers, 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', 'x-requested-with': 'XMLHttpRequest' }, body: `z=${encodeURIComponent(token)}&x=2278024220&q=${encodeURIComponent(title)}` };
	let response = await ctx.xhr.fetch(url, options, requester);
	let html = await response.text();
	if (response.status === 403 || /<title>\s*just a moment|__cf_chl_opt|cf-mitigated/i.test(html)) {
		const solved = await ctx.solveChallenge(url, requester, { waitForCookie: 'cf_clearance' });
		response = await ctx.xhr.fetch(url, { ...options, headers: { ...headers, ...(solved.cookies ? { cookie: solved.cookies } : {}), ...(solved.userAgent ? { 'User-Agent': solved.userAgent } : {}) } }, requester);
		html = await response.text();
	}
	return /<title>\s*just a moment|__cf_chl_opt|cf-mitigated/i.test(html) ? '' : html;
}

function parseResults(html: string, wantType: string, title: string, media: { releaseYear?: number }, ctx: ProviderContext): Result[] {
	const $ = ctx.cheerio.$load(html);
	const results: Result[] = [];
	$('.mfeed > li').each((_: number, element: any) => {
		const item = $(element);
		const typeClass = item.find('div').first().attr('class');
		const type = typeClass === 'it' ? 'show' : typeClass === 'im' ? 'movie' : '';
		const href = item.find('a').first().attr('href') || '';
		const slug = href.split('/').filter(Boolean).pop();
		const itemTitle = item.find('strong').first().text();
		const year = item.text().match(/\b(19\d{2}|20\d{2})\b/)?.[1] || '';
		if (slug && type === wantType) results.push({ title: itemTitle, year, slug });
	});
	return results;
}

function selectResult(results: Result[], title: string, year: string): Result | null {
	const matches = results.filter((result) => normalize(result.title) === normalize(title));
	return matches.find((result) => result.year === year) || matches.sort((a, b) => Math.abs(Number(a.year) - Number(year)) - Math.abs(Number(b.year) - Number(year)))[0] || results[0] || null;
}
function normalize(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]+/g, ''); }
function isAllowedEmbed(value: string): boolean { try { const url = new URL(value); return url.protocol === 'https:' && SUPPORTED_HOSTS.test(url.hostname); } catch { return false; } }
