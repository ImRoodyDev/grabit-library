import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	type SerieMedia,
	deduplicateArray,
} from 'grabit-engine';
import { PROVIDER } from './config';

type Handle = { embedId: string; watchUrl: string; fileName: string };

export async function getLazyStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const found = await findWatch(requester, ctx);
	if (!found) return [];
	const base = new URL(PROVIDER.config.baseUrl);
	const solved = await ctx.solveChallenge(base, requester, { waitForCookie: 'cf_clearance' });
	const headers = {
		Referer: base.origin + '/',
		...(solved.cookies ? { cookie: solved.cookies } : {}),
		...(solved.userAgent ? { 'User-Agent': solved.userAgent } : {}),
	};
	const watchUrl = new URL(found.videoUrl, base);
	const html = await ctx.xhr
		.fetch(watchUrl, { method: 'GET', attachUserAgent: true, clean: true, headers }, requester)
		.then((r) => r.text())
		.catch(() => '');
	const embedId = ctx.cheerio.$load(html)('[data-embed]').first().attr('data-embed');
	if (!embedId) return [];
	return [
		{
			fileName: found.name,
			language: 'en',
			lazy: {
				id: encodeURIComponent(
					JSON.stringify({ embedId, watchUrl: watchUrl.href, fileName: found.name } satisfies Handle),
				),
				label: 'Nepu',
			},
			xhr: { flags: [], headers: {} },
		},
	];
}

export async function resolveLazy(
	id: string,
	ctx: ProviderContext,
	requester: ScrapeRequester,
): Promise<InternalMediaSource | null> {
	let handle: Handle;
	try {
		handle = JSON.parse(decodeURIComponent(id)) as Handle;
	} catch {
		return null;
	}
	if (!handle?.embedId || !handle.watchUrl) return null;
	const base = new URL(PROVIDER.config.baseUrl);
	let watchUrl: URL;
	try {
		watchUrl = new URL(handle.watchUrl);
	} catch {
		return null;
	}
	if (watchUrl.origin !== base.origin) return null;
	const solved = await ctx.solveChallenge(base, requester, { waitForCookie: 'cf_clearance' });
	const headers = {
		Referer: base.origin + '/',
		...(solved.cookies ? { cookie: solved.cookies } : {}),
		...(solved.userAgent ? { 'User-Agent': solved.userAgent } : {}),
	};
	const html = await ctx.xhr
		.fetch(
			new URL('/ajax/embed', base),
			{
				method: 'POST',
				attachUserAgent: true,
				clean: true,
				useImpit: false,
				headers: {
					...headers,
					'x-requested-with': 'XMLHttpRequest',
					Origin: base.origin,
					accept: '*/*',
					'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
				},
				body: `id=${encodeURIComponent(handle.embedId)}`,
			},
			requester,
		)
		.then((r) => r.text())
		.catch(() => '');
	const manifest =
		html.match(/plainManifestUrl\s*=\s*"([^"]+)"/)?.[1] ?? html.match(/opaqueManifestUrl\s*=\s*"([^"]+)"/)?.[1];
	if (!manifest) return null;
	const playlist = new URL(manifest.replace(/\\u0026/g, '&'), base).href;
	return {
		fileName: handle.fileName,
		playlist,
		language: 'en',
		format: 'm3u8',
		xhr: { flags: ['CORS_BLOCKED', 'REFERER_LOCKED'], headers: { Origin: base.origin, Referer: watchUrl.href } },
	};
}

async function findWatch(
	requester: ScrapeRequester,
	ctx: ProviderContext,
): Promise<{ name: string; videoUrl: string } | null> {
	const media = requester.media;
	const base = new URL(PROVIDER.config.baseUrl);
	const titles = deduplicateArray(
		[(media as any).title, ...((media as any).localizedTitles ?? [])].filter(Boolean),
	) as string[];
	const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');
	const want = titles.map(norm);
	const solved = await ctx.solveChallenge(base, requester, { waitForCookie: 'cf_clearance' });
	const headers = { Referer: base.origin + '/', ...(solved.cookies ? { cookie: solved.cookies } : {}) };
	const paths = PROVIDER.createResourceUrls(requester).map((url) => url.pathname + url.search);
	const type = media.type === 'movie' ? 'Movie' : 'Shows';
	for (const path of paths) {
		const data = await ctx.xhr
			.fetchResponse<any>(
				new URL(path, base),
				{ method: 'GET', clean: true, headers: { ...headers, 'x-requested-with': 'XMLHttpRequest' } },
				requester,
			)
			.catch(() => null);
		const item = (data?.data || [])
			.filter((entry: any) => entry?.type === type)
			.find((entry: any) => want.includes(norm(entry.name)) || want.includes(norm(entry.second_name)));
		if (item)
			return {
				name: item.name,
				videoUrl:
					media.type === 'serie'
						? `${item.url}/season/${(media as SerieMedia).season}/episode/${(media as SerieMedia).episode}`
						: item.url,
			};
	}
	return null;
}
