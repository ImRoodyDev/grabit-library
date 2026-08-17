import {
	type ScrapeRequester,
	type InternalMediaSource,
	type ProviderContext,
} from 'grabit-engine';
import { PROVIDER } from './config';

/** How many source entries we resolve into playable HLS URLs. */
const MAX_SOURCES = 8;

/**
 * Stream handler for Xpass (play.xpass.top).
 *
 * The embed page (`/e/movie/{imdb}` or `/e/tv/{imdb}/{s}/{e}`) runs a player that
 * calls `/data/<type>/<tmdb>?…&sig=…` for a signed source list, each pointing at a
 * `playlist.json` that exposes a direct **HLS** `file`. The page is behind a
 * Cloudflare JS-challenge, so we load it in a puppeteer-solved context and read the
 * signed list + playlists from inside the page (the signature is generated there).
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	if (requester.media.type === 'channel') return [];
	const base = new URL(PROVIDER.config.baseUrl);
	const embedUrl = PROVIDER.createResourceURL(requester); // built from the entries pattern
	const referer = base.origin + '/';

	let session: Awaited<ReturnType<ProviderContext['puppeteer']['launch']>> | null = null;
	try {
		session = await ctx.puppeteer.launch(embedUrl, {
			requester,
			browsingOptions: { ignoreError: true, loadCriteria: 'networkidle2' },
		});
		const page = session.page;

		const resolved = (await page.evaluate(async (maxSources: number) => {
			const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

			// The player fetches /data/<type>/<tmdb>?…&sig=… on load — grab that signed
			// URL from the resource timeline (polling in case it hasn't fired yet).
			let dataUrl = '';
			for (let i = 0; i < 12 && !dataUrl; i++) {
				dataUrl =
					performance
						.getEntriesByType('resource')
						.map((e: any) => e.name as string)
						.find((u) => /\/data\/(movie|tv)\//i.test(u)) || '';
				if (!dataUrl) await sleep(1000);
			}
			if (!dataUrl) return { error: 'no-data-url' };

			const list = await (await fetch(dataUrl)).json();
			const sources: any[] = Array.isArray(list) ? list : [];

			// Each source -> its playlist.json -> the HLS `file`(s).
			const findFiles = (v: any, out: { file: string; label?: string }[]) => {
				if (Array.isArray(v)) return v.forEach((x) => findFiles(x, out));
				if (v && typeof v === 'object') {
					if (typeof v.file === 'string' && /^https?:\/\//.test(v.file)) out.push({ file: v.file, label: v.label });
					for (const k of Object.keys(v)) if (k !== 'file') findFiles(v[k], out);
				}
			};

			const streams: { name: string; file: string }[] = [];
			const seen = new Set<string>();
			for (const s of sources.slice(0, maxSources)) {
				if (!s?.url) continue;
				try {
					const pj = await (await fetch(s.url)).json();
					const files: { file: string; label?: string }[] = [];
					findFiles(pj, files);
					for (const f of files) {
						if (seen.has(f.file)) continue;
						seen.add(f.file);
						streams.push({ name: (f.label || s.name || 'Xpass') as string, file: f.file });
					}
				} catch {
					/* skip bad source */
				}
			}
			return { streams, sourceCount: sources.length };
		}, MAX_SOURCES)) as { error?: string; streams?: { name: string; file: string }[]; sourceCount?: number };

		if (resolved.error || !resolved.streams?.length) {
			ctx.log.warn(`[xpass] No playable stream (${resolved.error ?? `${resolved.sourceCount ?? 0} sources, none resolved`}).`);
			return [];
		}
		ctx.log.info(`[xpass] Resolved ${resolved.streams.length} HLS stream(s) from ${resolved.sourceCount} source(s).`);

		return resolved.streams.map(
			(s) =>
				({
					fileName: `${s.name}`,
					playlist: s.file,
					language: 'en',
					format: 'm3u8',
					xhr: { flags: ['CORS_BLOCKED'], headers: { Referer: referer, Origin: base.origin } },
				}) satisfies InternalMediaSource,
		);
	} catch (error) {
		ctx.log.error(`[xpass] Browser flow failed: ${(error as Error).message}`);
		return [];
	} finally {
		await session?.page.close().catch(() => null);
	}
}
