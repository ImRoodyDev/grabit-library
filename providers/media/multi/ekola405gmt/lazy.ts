import { type ScrapeRequester, type InternalMediaSource, type ProviderContext, attachExtension, pathJoin, ISO6391, MediaSource, extractContructorJSONArguments, extractVariableByJSONKey } from 'grabit-engine';
import { PROVIDER } from './config';

type Config = { file: string; key: string };
type Source = { id: string; file: string; end_tag: string | null; title: string; language: string };
type Handle = { iframeUrl: string; playerFile: string; playerKey: string; source: Source };
const HEADERS = { 'accept-language': 'en-US,en;q=0.9,es;q=0.8', 'cache-control': 'no-cache', pragma: 'no-cache' };

export async function getLazyStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const iframeUrl = PROVIDER.createResourceURL(requester);
	const cookies = makeCookies();
	const config = await getConfig(iframeUrl, cookies, requester, ctx);
	if (!config) return [];
	const sources = await getSources(iframeUrl, config, cookies, requester, ctx);
	return sources.map((source) => ({ fileName: source.title, language: source.language, lazy: { id: encodeURIComponent(JSON.stringify({ iframeUrl: iframeUrl.href, playerFile: config.file, playerKey: config.key, source } satisfies Handle)), label: source.title }, xhr: { flags: [], headers: {} } }));
}

export async function resolveLazy(id: string, ctx: ProviderContext, requester: ScrapeRequester): Promise<InternalMediaSource | null> {
	let handle: Handle; try { handle = JSON.parse(decodeURIComponent(id)) as Handle; } catch { return null; }
	if (!handle?.iframeUrl || !handle.playerFile || !handle.playerKey || !handle.source?.file) return null;
	const iframe = new URL(handle.iframeUrl); const base = new URL(PROVIDER.config.baseUrl);
	if (iframe.origin !== base.origin) return null;
	const cookies = makeCookies();
	const fileUrl = new URL(handle.playerFile, iframe.origin);
	const dir = fileUrl.pathname.split('/').slice(0, -1).join('/');
	const extension = fileUrl.pathname.split('.').pop() || '';
	const postHeaders = { ...HEADERS, 'content-type': 'application/x-www-form-urlencoded', 'x-csrf-token': handle.playerKey, cookie: cookies, Referer: iframe.href, Origin: iframe.origin };
	const target = new URL(attachExtension(handle.source.end_tag || extension, pathJoin(dir, handle.source.file.startsWith('~') ? handle.source.file.slice(1) : handle.source.file)), iframe.origin);
	try {
		const raw = await ctx.xhr.fetch(target, { method: 'POST', clean: true, attachUserAgent: true, headers: postHeaders }, requester).then((response) => response.text());
		const playlist = await ctx.xhr.fetch(raw, { method: 'GET', clean: true, attachUserAgent: true, headers: { ...HEADERS, Referer: iframe.origin + '/', Origin: iframe.origin } }, requester);
		const finalUrl = playlist.headers.get('Location') || playlist.headers.get('location') || raw;
		return { fileName: handle.source.title, playlist: finalUrl, format: (finalUrl.split('.').pop() as MediaSource['format']) || 'm3u8', language: handle.source.language, xhr: { flags: [], headers: { Referer: iframe.origin + '/', Origin: iframe.origin } } };
	} catch { return null; }
}

async function getConfig(url: URL, cookies: string, requester: ScrapeRequester, ctx: ProviderContext): Promise<Config | null> { try { const page = await ctx.cheerio.load(url, { ...requester, extraHeaders: { ...HEADERS, cookie: cookies, Referer: 'https://vegamovies.ad/' } }, ctx.xhr); const script = page.$('script:contains("HDVBPlayer")').html() || ''; return (script.includes('HDVBPlayer({') ? extractContructorJSONArguments(script) : extractVariableByJSONKey(script, ['file', 'key', 'href'])) as Config | null; } catch { return null; } }
async function getSources(url: URL, config: Config, cookies: string, requester: ScrapeRequester, ctx: ProviderContext): Promise<Source[]> { try { const response = await ctx.xhr.fetch(new URL(config.file, url.origin), { method: 'POST', clean: true, attachUserAgent: true, headers: { ...HEADERS, 'content-type': 'application/x-www-form-urlencoded', 'x-csrf-token': config.key, cookie: cookies, Referer: url.href, Origin: url.origin } }, requester); const data = await response.json().then((value) => Array.isArray(value) ? value.flat() : []); const sources: any[] = requester.media.type === 'movie' ? data : []; if (requester.media.type === 'serie') { const id = `${(requester.media as any).season}-${(requester.media as any).episode}`; const season = data.find((item: any) => item.folder?.some((episode: any) => episode.id?.trim() === id)); const episode = season?.folder?.find((item: any) => item.id?.trim() === id); sources.push(...(episode?.folder || []).flat()); } return sources.filter((source: any) => source?.file).map((source: any) => ({ id: source.id, file: source.file, end_tag: source.end_tag || null, title: source.title, language: ISO6391.getCode(String(source.title).split(' ').shift() || '') || 'unknown' })); } catch { return []; } }
function makeCookies(): string { const now = Math.floor(Date.now() / 1000); return `_ym_uid=${now}${Math.floor(Math.random() * 1e9).toString().padStart(9, '0')}; _ym_d=${now}; _ym_isad=2`; }
