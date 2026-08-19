import { type ScrapeRequester, type InternalMediaSource, type ProviderContext, createCookiesFromSet } from 'grabit-engine';
import { PROVIDER } from './config';

type SourceEntry = { name?: string; url?: string };
type Handle = { embedUrl: string; sourceIndex: number; name: string };

export async function getLazyStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const embedUrl = PROVIDER.createResourceURL(requester);
	const session = await getSession(embedUrl, requester, ctx);
	if (!session) return [];
	const entries = await getEntries(session.dataUrl, session.headers, requester, ctx);
	return entries.slice(0, 8).map((entry, index) => ({
		fileName: entry.name || `Xpass ${index + 1}`,
		language: 'en',
		lazy: { id: encodeURIComponent(JSON.stringify({ embedUrl: embedUrl.href, sourceIndex: index, name: entry.name || `Xpass ${index + 1}` } satisfies Handle)), label: entry.name || `Source ${index + 1}` },
		xhr: { flags: [], headers: {} },
	}));
}

export async function resolveLazy(id: string, ctx: ProviderContext, requester: ScrapeRequester): Promise<InternalMediaSource | null> {
	let handle: Handle;
	try { handle = JSON.parse(decodeURIComponent(id)) as Handle; } catch { return null; }
	if (!handle?.embedUrl || !Number.isInteger(handle.sourceIndex) || handle.sourceIndex < 0 || !handle.name) return null;
	const base = new URL(PROVIDER.config.baseUrl);
	let embedUrl: URL;
	try { embedUrl = new URL(handle.embedUrl); } catch { return null; }
	if (embedUrl.origin !== base.origin || embedUrl.protocol !== 'https:') return null;
	const session = await getSession(embedUrl, requester, ctx);
	if (!session) return null;
	const entries = await getEntries(session.dataUrl, session.headers, requester, ctx);
	const entry = entries[handle.sourceIndex];
	if (!entry?.url || !isLocalUrl(entry.url, base)) return null;
	try {
		const response = await ctx.xhr.fetch(new URL(entry.url, base), { method: 'GET', attachUserAgent: true, clean: true, headers: session.headers }, requester);
		const files: { file: string; label?: string }[] = [];
		findFiles(JSON.parse(await response.text()), files);
		const file = files[0]?.file;
		if (!file) return null;
		return { fileName: handle.name, playlist: file, language: 'en', format: 'm3u8', xhr: { flags: ['CORS_BLOCKED'], headers: { Referer: base.origin + '/', Origin: base.origin } } };
	} catch { return null; }
}

async function getSession(embedUrl: URL, requester: ScrapeRequester, ctx: ProviderContext): Promise<{ dataUrl: string; headers: Record<string, string> } | null> {
	const base = new URL(PROVIDER.config.baseUrl);
	try {
		const response = await ctx.xhr.fetch(embedUrl, { method: 'GET', attachUserAgent: true, clean: true, headers: { Referer: base.origin + '/', 'accept-language': 'en-US,en;q=0.9' } }, requester);
		const html = await response.text();
		const dataUrl = html.match(/var\s+dataUrl\s*=\s*["']([^"']+)["']/)?.[1];
		if (response.status === 403 || isCloudflare(html) || !dataUrl || !isLocalUrl(dataUrl, base)) return null;
		return { dataUrl, headers: { Referer: embedUrl.href, 'accept-language': 'en-US,en;q=0.9', 'x-requested-with': 'XMLHttpRequest', ...(createCookiesFromSet(response.headers as any) ? { cookie: createCookiesFromSet(response.headers as any) } : {}) } };
	} catch {
		try {
			const solved = await ctx.solveChallenge(embedUrl, requester, { waitForCookie: 'cf_clearance' });
			const dataUrl = solved.html.match(/var\s+dataUrl\s*=\s*["']([^"']+)["']/)?.[1];
			if (!dataUrl || !isLocalUrl(dataUrl, base)) return null;
			return { dataUrl, headers: { Referer: embedUrl.href, 'accept-language': 'en-US,en;q=0.9', 'x-requested-with': 'XMLHttpRequest', ...(solved.cookies ? { cookie: solved.cookies } : {}), ...(solved.userAgent ? { 'User-Agent': solved.userAgent } : {}) } };
		} catch { return null; }
	}
}

async function getEntries(dataUrl: string, headers: Record<string, string>, requester: ScrapeRequester, ctx: ProviderContext): Promise<SourceEntry[]> {
	try {
		const base = new URL(PROVIDER.config.baseUrl);
		const response = await ctx.xhr.fetch(new URL(dataUrl, base), { method: 'GET', attachUserAgent: true, clean: true, headers }, requester);
		const entries = JSON.parse(await response.text());
		return Array.isArray(entries) ? entries.filter((entry) => entry?.url && isLocalUrl(entry.url, base)) : [];
	} catch { return []; }
}

function isLocalUrl(value: string, base: URL): boolean { try { return new URL(value, base).origin === base.origin; } catch { return false; } }
function isCloudflare(html: string): boolean { return /<title>\s*just a moment|__cf_chl_(?:f_)?tk|cf-browser-verification|cf_chl_opt/i.test(html); }
function findFiles(value: any, out: { file: string; label?: string }[]): void { if (Array.isArray(value)) return value.forEach((item) => findFiles(item, out)); if (value && typeof value === 'object') { if (typeof value.file === 'string' && /^https?:\/\//.test(value.file)) out.push({ file: value.file, label: value.label }); for (const key of Object.keys(value)) if (key !== 'file') findFiles(value[key], out); } }
