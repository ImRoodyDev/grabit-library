import type { ScrapeRequester, InternalMediaSource, ProviderContext, CheerioLoadRequest } from 'grabit-engine';
import { dispatchEmbed } from '../../../extractors/embedDispatch';
import { PROVIDER } from './config';
import { primeApi, getServerList, resolveEmbed, SUPPORTED } from './api';

type LazyHandle = { name: string; url: string };

export async function getLazyStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const { base, apiUrl, headers, jar } = await primeApi(requester, ctx);

	const picks = await getServerList(apiUrl, headers, requester, ctx);
	const handles: LazyHandle[] = [];
	for (const server of picks) {
		try {
			const url = await resolveEmbed(server.key, base, headers, jar, requester, ctx);
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
