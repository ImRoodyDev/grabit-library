import type { ScrapeRequester, InternalMediaSource, ProviderContext, CheerioLoadRequest } from 'grabit-engine';
import { dispatchEmbed } from '../../../extractors/embedDispatch';
import { PROVIDER } from './config';

const SUPPORTED = /filemoon|moon|streamwish|filelions|lions|swish|wish|mixdrop|dood|supervideo|dropload/i;
const MAX_EMBEDS = 5;

type LazyHandle = { name: string; url: string };

export async function getLazyStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const base = new URL(PROVIDER.config.baseUrl);
	const apiUrl = PROVIDER.createResourceURL(requester);
	const solved = await ctx.solveChallenge(base, requester, { waitForCookie: 'cf_clearance' });
	const apiHeaders: Record<string, string> = {
		Referer: base.origin + '/',
		'x-requested-with': 'XMLHttpRequest',
		...(solved.cookies ? { cookie: solved.cookies } : {}),
		...(solved.userAgent ? { 'User-Agent': solved.userAgent } : {}),
	};
	const data = await ctx.xhr
		.fetchResponse<any>(apiUrl, { method: 'GET', clean: true, headers: apiHeaders }, requester)
		.catch(() => null);
	const servers: any[] = Array.isArray(data?.servers) ? data.servers : [];
	const seenHost = new Set<string>();
	const picks = servers.filter((server) => {
		if (!server?.key || !SUPPORTED.test(server.name || '')) return false;
		const host = String(server.name).toLowerCase();
		if (seenHost.has(host)) return false;
		seenHost.add(host);
		return true;
	});

	const handles: LazyHandle[] = [];
	for (const server of picks.slice(0, MAX_EMBEDS)) {
		try {
			const resolved = await ctx.xhr.fetchResponse<any>(
				new URL(`/api/v1/l?key=${encodeURIComponent(server.key)}`, base),
				{ method: 'GET', clean: true, headers: apiHeaders },
				requester,
			);
			const url = findUrl(resolved);
			if (url && isSupportedEmbed(url)) handles.push({ name: server.name, url });
		} catch {
			// Skip a server whose key no longer resolves.
		}
	}

	return handles.map((handle) => ({
		fileName: `${handle.name} Server`,
		language: 'en',
		lazy: { id: encodeURIComponent(JSON.stringify(handle)), label: handle.name },
		xhr: { flags: [], headers: {} },
	}));
}

export async function resolveLazy(
	id: string,
	ctx: ProviderContext,
	requester: ScrapeRequester,
): Promise<InternalMediaSource | null> {
	let handle: LazyHandle;
	try {
		handle = JSON.parse(decodeURIComponent(id)) as LazyHandle;
	} catch {
		return null;
	}
	if (!handle?.name || !isSupportedEmbed(handle.url)) return null;
	const opts: CheerioLoadRequest = {
		...requester,
		extraHeaders: { Referer: new URL(PROVIDER.config.baseUrl).origin + '/' },
	};
	const sources = await dispatchEmbed(handle.url, opts, ctx, 'en').catch(() => []);
	return sources[0] ?? null;
}

function isSupportedEmbed(url: string): boolean {
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'https:' && SUPPORTED.test(parsed.hostname);
	} catch {
		return false;
	}
}

function findUrl(value: any): string | null {
	if (typeof value === 'string') return /^https?:\/\//.test(value) ? value : null;
	if (value && typeof value === 'object') {
		for (const key of Object.keys(value)) {
			const url = findUrl(value[key]);
			if (url) return url;
		}
	}
	return null;
}
