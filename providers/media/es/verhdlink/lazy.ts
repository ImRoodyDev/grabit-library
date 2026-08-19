import { type ScrapeRequester, type InternalMediaSource, type ProviderContext, type CheerioLoadRequest } from 'grabit-engine';
import { dispatchEmbed } from '../../../extractors/embedDispatch';
import { PROVIDER } from './config';

const MAX_EMBEDS = 8;
type Handle = { embed: string; sourcePage: string };
const EMBED_HOSTS = /fastream|goodstream|filemoon|supervideo|mixdrop|dood|dropload|vimeos|streamwish|filelions/i;

export async function getLazyStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type !== 'movie') return [];
	const pageUrl = PROVIDER.createResourceURL(requester);
	const embeds = await getEmbeds(pageUrl, requester, ctx);
	return embeds.slice(0, MAX_EMBEDS).map((embed) => ({ fileName: (requester.media as any).title, language: 'es', lazy: { id: encodeURIComponent(JSON.stringify({ embed, sourcePage: pageUrl.href } satisfies Handle)), label: 'Spanish' }, xhr: { flags: [], headers: {} } }));
}

export async function resolveLazy(id: string, ctx: ProviderContext, requester: ScrapeRequester): Promise<InternalMediaSource | null> {
	let handle: Handle;
	try { handle = JSON.parse(decodeURIComponent(id)) as Handle; } catch { return null; }
	if (!handle?.embed || !isAllowedEmbed(handle.embed)) return null;
	const sources = await dispatchEmbed(handle.embed, { ...requester, extraHeaders: { Referer: PROVIDER.config.baseUrl + '/' } }, ctx, 'es').catch(() => []);
	return sources[0] ?? null;
}

async function getEmbeds(pageUrl: URL, requester: ScrapeRequester, ctx: ProviderContext): Promise<string[]> {
	const pageOpt: CheerioLoadRequest = { ...requester, followRedirects: true, extraHeaders: { accept: 'text/html,application/xhtml+xml', 'accept-language': 'es-ES,es;q=0.9,en;q=0.8', Referer: PROVIDER.config.baseUrl + '/' } };
	try {
		const { $ } = await ctx.cheerio.load(pageUrl, pageOpt, ctx.xhr);
		const embeds: string[] = [];
		$('._player-mirrors [data-link], [data-link]').each((_: number, element: any) => { const raw = $(element).attr('data-link') || ''; const url = raw.replace(/^(https:)?\/\//, 'https://'); if (isAllowedEmbed(url)) embeds.push(url); });
		return [...new Set(embeds)];
	} catch { return []; }
}
function isAllowedEmbed(value: string): boolean { try { const url = new URL(value); return url.protocol === 'https:' && EMBED_HOSTS.test(url.hostname); } catch { return false; } }
