import type { ScrapeRequester, InternalMediaSource, ProviderContext, CheerioLoadRequest, SerieMedia } from 'grabit-engine';
import { extractHubcloudStreams } from '../../../extractors/hubcloud';
import { detectQuality } from '../../../extractors/hubchain';
import { pickBestPost } from '../../../extractors/postMatch';
import { PROVIDER } from './config';

type Post = { title: string; link: string; image: string };
type Candidate = { quality: string; link: string; label: string };
type Handle = Candidate & { title: string };
const HOST = /hubcloud|oxxfile/i;

export async function getLazyStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const pageOpt: CheerioLoadRequest = { ...requester, followRedirects: true, extraHeaders: {} };
	let posts: Post[] = [];
	const imdb = (requester.media as any).imdbId ? new URL(PROVIDER.createPatternString('/?s={imdb:string}', requester.media), PROVIDER.config.baseUrl) : undefined;
	for (const url of PROVIDER.createResourceUrls(requester, imdb)) { posts = await search(url, requester, ctx); if (posts.length) break; }
	const best = pickBestPost(posts, requester.media);
	if (!best) return [];
	const candidates = await getCandidates(best.post.link, requester, ctx, pageOpt);
	return candidates.slice(0, 3).map((candidate) => ({ fileName: `${best.post.title} ${candidate.label}`.trim(), language: 'hi', lazy: { id: encodeURIComponent(JSON.stringify({ ...candidate, title: best.post.title } satisfies Handle)), label: candidate.label }, xhr: { flags: [], headers: {} } }));
}
export async function resolveLazy(id: string, ctx: ProviderContext, requester: ScrapeRequester): Promise<InternalMediaSource | null> { let handle: Handle; try { handle = JSON.parse(decodeURIComponent(id)) as Handle; } catch { return null; } if (!handle?.title || !allowed(handle.link)) return null; try { const url = await resolveLink(handle.link, requester, ctx); if (!url) return null; const sources = await extractHubcloudStreams(url, requester, ctx, { fileName: `${handle.title} ${handle.label}`.trim(), quality: handle.quality, language: 'hi' }); return sources[0] ?? null; } catch { return null; } }
async function search(url: URL, requester: ScrapeRequester, ctx: ProviderContext): Promise<Post[]> { try { const { $ } = await ctx.cheerio.load(url, { ...requester, followRedirects: true, extraHeaders: {} }, ctx.xhr); const out: Post[] = []; $('article,.pstr_box,.result-item,.post,.item,.thumbnail,.movie-item,.ml-item').each((_: number, element: any) => { const href = $(element).find('a[href]').first().attr('href') || ''; const title = ($(element).find('.entry-title,.post-title,.title,h2,h3').first().text() || $(element).find('a').first().text()).trim(); if (href && title) out.push({ title, link: href, image: '' }); }); return out; } catch { return []; } }
async function getCandidates(link: string, requester: ScrapeRequester, ctx: ProviderContext, pageOpt: CheerioLoadRequest): Promise<Candidate[]> { const { $ } = await ctx.cheerio.load(new URL(link, PROVIDER.config.baseUrl), pageOpt, ctx.xhr); const out: Candidate[] = []; $('a').each((_: number, element: any) => { const href = $(element).attr('href') || ''; const text = `${$(element).text()} ${$(element).parent().text()}`; if (!allowed(href) || !/480|720|1080|2160|4k|drive/i.test(text)) return; if (requester.media.type === 'serie') { const ep = text.match(/episode\s*(\d+)/i); if (ep && Number(ep[1]) !== Number((requester.media as SerieMedia).episode)) return; } const quality = text.match(/\b(480p|720p|1080p|2160p|4k)\b/i)?.[0] || detectQuality(text); out.push({ quality, link: href, label: requester.media.type === 'serie' ? `E${(requester.media as SerieMedia).episode}` : quality }); }); return out.filter((item, index) => out.findIndex((other) => other.link === item.link) === index); }
async function resolveLink(link: string, requester: ScrapeRequester, ctx: ProviderContext): Promise<string | null> { if (/hubcloud|\/drive\//i.test(link)) return link; if (!/oxxfile/i.test(link)) return null; try { const url = new URL(link); const id = url.pathname.split('/').filter(Boolean).pop() || ''; const data = await ctx.xhr.fetchResponse<any>(new URL(`/api/s/${id}/hubcloud`, url.origin), { method: 'GET', attachUserAgent: true, clean: true, headers: {} }, requester); return data?.url || data?.hubcloud_link || null; } catch { return null; } }
function allowed(value: string): boolean { try { const url = new URL(value, PROVIDER.config.baseUrl); return url.protocol === 'https:' && HOST.test(url.hostname + url.pathname); } catch { return false; } }
