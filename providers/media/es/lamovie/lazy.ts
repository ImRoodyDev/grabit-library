import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
	type ProviderFetchOptions,
	calculateMatchScore,
	Media,
	SerieMedia,
	tldts,
} from 'grabit-engine';
import { PROVIDER } from './config';
import { extractGoodstreamStreams } from '../../../extractors/goodstream';
import { extractVimeosStreams } from '../../../extractors/vimeos';
import { extractFilemoonStreams } from '../../../extractors/filemoon';

type Result = { id: string; title: string; entry: string; year: string };
type Server = { lang: string | null; url: string; quality: string; serverName: string };
type Handle = Server & { title: string };

const API_HEADERS = { accept: 'application/json', 'accept-language': 'en-US,en;q=0.9', 'content-type': 'application/json' };

export async function getLazyStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const result = await findResult(requester, ctx);
	if (!result) return [];
	const mediaId = requester.media.type === 'serie' ? await getEpisodeId(result, requester, ctx) : result.id;
	if (!mediaId) return [];
	const servers = await getServers(mediaId, result, requester, ctx);
	return servers.filter((server) => isAllowedServer(server)).map((server) => ({
		fileName: `HLS ${server.quality}`,
		language: server.lang || 'es',
		lazy: { id: encodeURIComponent(JSON.stringify({ ...server, title: result.title })), label: `${server.serverName} ${server.quality}` },
		xhr: { flags: [], headers: {} },
	}));
}

export async function resolveLazy(id: string, ctx: ProviderContext, requester: ScrapeRequester): Promise<InternalMediaSource | null> {
	let handle: Handle;
	try { handle = JSON.parse(decodeURIComponent(id)) as Handle; } catch { return null; }
	if (!handle?.title || !isAllowedServer(handle)) return null;
	const metadata = { fileName: `HLS ${handle.quality}`, format: 'm3u8' as const, language: handle.lang || 'es' };
	try {
		if (handle.serverName === 'goodstream') return (await extractGoodstreamStreams(new URL(handle.url), requester, ctx, metadata))[0] ?? null;
		if (handle.serverName === 'vimeos') return (await extractVimeosStreams(new URL(handle.url), requester, ctx, metadata))[0] ?? null;
		if (handle.serverName === 'filemoon') return (await extractFilemoonStreams(new URL(handle.url), requester, ctx, metadata))[0] ?? null;
		return null;
	} catch { return null; }
}

async function findResult(requester: ScrapeRequester, ctx: ProviderContext): Promise<Result | null> {
	for (const search of PROVIDER.createResourceUrls(requester)) {
		try {
			const query = search.searchParams.get('q') || '';
			const url = createSearchURL(query, requester);
			const response = await ctx.xhr.fetchResponse<any>(url, { method: 'GET', attachUserAgent: true, clean: true, headers: { ...API_HEADERS, referer: url.origin + '/' } }, requester);
			const posts = response.data?.posts ?? [];
			const result = selectBest(posts, requester.media);
			if (result) return result;
		} catch {}
	}
	return null;
}

async function getEpisodeId(result: Result, requester: ScrapeRequester, ctx: ProviderContext): Promise<string | null> {
	const media = requester.media as SerieMedia;
	const url = new URL('/wp-api/v1/single/episodes/list', PROVIDER.config.baseUrl);
	url.search = new URLSearchParams({ _id: result.id, season: String(media.season), page: '0', postsPerPage: '15' }).toString();
	try {
		const data = await ctx.xhr.fetchResponse<any>(url, { method: 'GET', attachUserAgent: true, clean: true, headers: API_HEADERS }, requester);
		return data.data?.posts?.find((episode: any) => episode.episode_number === media.episode && episode.season_number === media.season)?._id ?? null;
	} catch { return null; }
}

async function getServers(mediaId: string, result: Result, requester: ScrapeRequester, ctx: ProviderContext): Promise<Server[]> {
	const url = new URL('/wp-api/v1/player', PROVIDER.config.baseUrl);
	url.search = new URLSearchParams({ postId: mediaId, demo: '0' }).toString();
	try {
		const data = await ctx.xhr.fetchResponse<any>(url, { method: 'GET', attachUserAgent: true, clean: true, headers: { ...API_HEADERS, Referer: result.entry } }, requester);
		return (data.data?.embeds ?? []).map((embed: any) => {
			const raw = String(embed.lang || '').toLowerCase().split('-')[0];
			const lang = raw === 'en' || raw === 'ingles' ? 'en' : 'es';
			return { lang, url: String(embed.url || ''), quality: String(embed.quality || ''), serverName: tldts.parse(String(embed.url || '')).domainWithoutSuffix || '' };
		}).sort((a: Server, b: Server) => (a.lang === 'es' ? 0 : 1) - (b.lang === 'es' ? 0 : 1));
	} catch { return []; }
}

function selectBest(posts: any[], media: Media): Result | null {
	return posts.map((post) => {
		const title = post.original_title || post.title;
		const year = new Date(post.release_date).getFullYear().toString();
		const type = post.type?.includes('movie') ? 'peliculas' : 'series';
		return { id: post._id, title, year, entry: new URL(PROVIDER.createPatternString('/{type:string}/{slug:string}/', media, { type, slug: post.slug }), PROVIDER.config.baseUrl).href, score: Math.max(calculateMatchScore({ title, year }, media), calculateMatchScore({ title: post.title, year }, media)) };
	}).filter((item) => item.score >= 100).sort((a, b) => b.score - a.score)[0] ?? null;
}

function isAllowedServer(server: Partial<Server>): boolean {
	try {
		const url = new URL(server.url || '');
		return url.protocol === 'https:' && ['goodstream', 'vimeos', 'filemoon'].includes(server.serverName || '') && new RegExp(server.serverName || 'x', 'i').test(url.hostname);
	} catch { return false; }
}
function createSearchURL(query: string, requester: ScrapeRequester): URL { return new URL(PROVIDER.createPatternString('/wp-api/v1/search?filter=%7B%7D&postType=any&q={keyify:form-uri}&postsPerPage=26', requester.media, { keyify: query.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/[^\p{L}\p{N} -]+/gu, '').replace(/\s+/g, '-').replace(/-+/g, '-').split('-').join(' ').substring(0, 16) }), PROVIDER.config.baseUrl); }
