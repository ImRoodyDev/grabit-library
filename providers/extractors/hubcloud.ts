import {
	type InternalMediaSource,
	type ProviderContext,
	type ScrapeRequester,
	type MediaSource,
} from 'grabit-engine';

/**
 * Metadata carried through the HubCloud resolution so the resulting sources are
 * labelled consistently by the calling provider.
 */
export interface HubcloudMeta {
	/** Base label for the resolved file (e.g. "Movie Title 1080p"). */
	fileName?: string;
	/** ISO language code applied to every resolved source. */
	language: string;
	/** Optional quality hint folded into the file name. */
	quality?: string;
	/**
	 * Lower-cased title tokens used to guard the `search-recover.php` flow, whose
	 * fuzzy file recovery can otherwise return an unrelated title. A recovered hit
	 * is only accepted if its filename contains at least one of these tokens.
	 */
	matchTokens?: string[];
}

/** Desktop UA HubCloud / vcloud mirrors expect. */
/** Reads the vcloud/download URL out of the obfuscated inline script HubCloud ships. */
function extractUrlFromScript(html: string): string {
	const doubleAtobMatch = html.match(/(?:var|let|const)\s+\w+\s*=\s*atob\(atob\(['"]([^'"]+)['"]\)\)/);
	if (doubleAtobMatch?.[1]) {
		try {
			return atob(atob(doubleAtobMatch[1]));
		} catch {
			/* fall through */
		}
	}
	const plainMatch = html.match(/var\s+url\s*=\s*['"]([^'"]+)['"]/);
	const rSegment = plainMatch?.[1]?.split('r=')?.[1];
	if (rSegment) {
		try {
			return atob(rSegment);
		} catch {
			/* fall through */
		}
	}
	return plainMatch?.[1] || '';
}

/** Pulls a redirected PixelDrain URL out of any of the HTML sources we already hold. */
function getRedirectedPixelDrainUrl(...htmlSources: Array<string | undefined>): string {
	for (const html of htmlSources) {
		if (!html) continue;
		const match = html.match(/var\s+pxl\s*=\s*['"]([^'"]+)['"];?/i);
		if (match?.[1]) return match[1];
	}
	return '';
}

type RawHubcloudLink = { server: string; url: string };

/**
 * Fetches a page as text, transparently falling back to a real browser session
 * (puppeteer) when the origin answers with a Cloudflare 403 challenge. Any
 * `cf_clearance` cookie the browser earns is written back into `cookieJar` so the
 * following hops on the same origin reuse it.
 */
async function fetchTextWithCloudflareFallback(
	target: URL,
	headers: Record<string, string>,
	requester: ScrapeRequester,
	ctx: ProviderContext,
	cookieJar: { cookie: string },
): Promise<string | null> {
	const requestHeaders = { ...headers };
	if (cookieJar.cookie) requestHeaders.cookie = cookieJar.cookie;

	try {
		const response = await ctx.xhr.fetch(
			target,
			{ method: 'GET', attachUserAgent: true, clean: true, headers: requestHeaders },
			requester,
		);
		if (response.status !== 403 && response.ok) {
			return await response.text();
		}
		if (response.status !== 403) {
			ctx.log.warn(`[hubcloud] ${target.href} -> HTTP ${response.status}`);
			// Still try to read the body; some mirrors send usable HTML with a non-OK status.
			return await response.text().catch(() => null);
		}
		ctx.log.warn(`[hubcloud] Cloudflare 403 for ${target.href}, falling back to browser session.`);
	} catch (error) {
		ctx.log.warn(`[hubcloud] xhr fetch failed for ${target.href} (${(error as Error).message}), trying browser session.`);
	}

	// --- Puppeteer (Cloudflare) fallback ---
	let session: Awaited<ReturnType<ProviderContext['puppeteer']['launch']>> | null = null;
	try {
		session = await ctx.puppeteer.launch(target, {
			requester,
			browsingOptions: { ignoreError: true, loadCriteria: 'networkidle0' },
		});
		const html = await session.page.content();
		// Persist any cf_clearance cookie for subsequent same-origin hops.
		try {
			const cookies = await session.page.cookies();
			const cookieStr = cookies.map((c: any) => `${c.name}=${c.value}`).join('; ');
			if (cookieStr) cookieJar.cookie = cookieStr;
		} catch {
			/* cookies are best-effort */
		}
		return html;
	} catch (error) {
		ctx.log.error(`[hubcloud] Browser fallback failed for ${target.href}: ${(error as Error).message}`);
		return null;
	} finally {
		await session?.page.close().catch(() => null);
	}
}

/**
 * Resolves a HubCloud (a.k.a. vcloud / hubdrive) file page into one or more
 * playable download URLs.
 *
 * Ported from vega-providers `extractors/hubcloud.ts`. HubCloud pages embed an
 * obfuscated vcloud link; that vcloud page then exposes a set of mirror buttons
 * (PixelDrain, Cloudflare workers, FastDL, direct `.mkv`, nested HubCloud, ...).
 * Each recognised mirror becomes an {@link InternalMediaSource}.
 */
export async function extractHubcloudStreams(
	link: string | URL,
	requester: ScrapeRequester,
	ctx: ProviderContext,
	meta: HubcloudMeta,
): Promise<InternalMediaSource[]> {
	const startURL = typeof link === 'string' ? new URL(link) : link;
	ctx.log.debug(`[hubcloud] Resolving: ${startURL.href}`);

	// No User-Agent here: grabit's providerFetch attaches requester.userAgent and it
	// always wins (spread last), so hardcoding one is dead weight.
	const headers: Record<string, string> = {
		Referer: startURL.origin + '/',
	};
	const cookieJar = { cookie: 'ext_name=ojplmecpdpgccookcobabopnaifgidhf; xla=s4t' };

	// `search-recover.php` is a JSON file-search endpoint (used by series posts),
	// not a normal drive page. Handle it separately, guarding its fuzzy results.
	if (startURL.pathname.includes('search-recover.php')) {
		return handleSearchRecover(startURL, headers, cookieJar, requester, ctx, meta);
	}

	return resolveDrivePage(startURL, headers, cookieJar, requester, ctx, meta);
}

/**
 * Calls the `search-recover.php` JSON API, discards fuzzy hits that don't match
 * the expected title (via `meta.matchTokens`), and resolves each surviving hit's
 * `/drive/<id>` URL through the normal drive flow.
 */
async function handleSearchRecover(
	recoverURL: URL,
	headers: Record<string, string>,
	cookieJar: { cookie: string },
	requester: ScrapeRequester,
	ctx: ProviderContext,
	meta: HubcloudMeta,
): Promise<InternalMediaSource[]> {
	// Old HubCloud domains (hubcloud.foo, …) 302-redirect to the current one, and the
	// redirect DROPS the `api=search` param — so we must resolve the final URL first,
	// then attach `api=search` to that live host.
	let resolvedURL = recoverURL;
	try {
		const probe = await ctx.xhr.fetch(
			recoverURL,
			{ method: 'GET', attachUserAgent: true, clean: true, headers: { ...headers }, redirect: 'follow' },
			requester,
		);
		if (probe.url && /search-recover\.php/i.test(probe.url)) resolvedURL = new URL(probe.url);
	} catch {
		/* fall back to the original URL */
	}

	const apiURL = new URL(resolvedURL.href);
	apiURL.searchParams.set('api', 'search');
	apiURL.searchParams.set('page', '1');

	let hits: Array<{ file_name?: string; url?: string }> = [];
	try {
		const json = await ctx.xhr.fetchResponse<{ hits?: Array<{ file_name?: string; url?: string }> }>(
			apiURL,
			{ method: 'GET', attachUserAgent: true, clean: true, headers: { ...headers, Accept: 'application/json' } },
			requester,
		);
		hits = Array.isArray(json?.hits) ? json.hits : [];
	} catch (error) {
		ctx.log.warn(`[hubcloud] search-recover API failed: ${(error as Error).message}`);
		return [];
	}

	const tokens = (meta.matchTokens ?? []).map((t) => t.toLowerCase()).filter((t) => t.length >= 3);
	const accepted = hits.filter((hit) => {
		if (!hit.url) return false;
		if (tokens.length === 0) return true; // no guard available
		const name = (hit.file_name ?? '').toLowerCase();
		return tokens.some((t) => name.includes(t));
	});
	ctx.log.info(
		`[hubcloud] search-recover: ${hits.length} hit(s), ${accepted.length} passed the title guard (tokens: ${tokens.join(',') || 'none'}).`,
	);
	if (accepted.length === 0 && hits.length > 0) {
		ctx.log.warn('[hubcloud] All recovered hits looked unrelated to the requested title; skipping.');
	}

	const results: InternalMediaSource[] = [];
	for (const hit of accepted.slice(0, 3)) {
		try {
			const sources = await resolveDrivePage(new URL(hit.url!), headers, cookieJar, requester, ctx, {
				...meta,
				fileName: hit.file_name ?? meta.fileName,
			});
			results.push(...sources);
		} catch (error) {
			ctx.log.debug(`[hubcloud] Failed resolving recovered hit ${hit.url}: ${(error as Error).message}`);
		}
	}
	return results;
}

/** Resolves a normal HubCloud `/drive/<id>` page (via its vcloud mirror) into sources. */
async function resolveDrivePage(
	startURL: URL,
	headers: Record<string, string>,
	cookieJar: { cookie: string },
	requester: ScrapeRequester,
	ctx: ProviderContext,
	meta: HubcloudMeta,
): Promise<InternalMediaSource[]> {
	const baseUrl = startURL.origin;

	// --- Hop 1: the HubCloud page itself -> the vcloud link ---
	const vLinkText = await fetchTextWithCloudflareFallback(startURL, headers, requester, ctx, cookieJar);
	if (!vLinkText) {
		ctx.log.warn('[hubcloud] Could not load the initial HubCloud page.');
		return [];
	}

	const $vLink = ctx.cheerio.$load(vLinkText);
	let vcloudLink =
		extractUrlFromScript(vLinkText) || $vLink('.fa-file-download.fa-lg').parent().attr('href') || startURL.href;
	if (vcloudLink.startsWith('/')) vcloudLink = `${baseUrl}${vcloudLink}`;
	ctx.log.debug(`[hubcloud] vcloud link: ${vcloudLink}`);

	// --- Hop 2: the vcloud page -> the mirror buttons ---
	const vcloudURL = new URL(vcloudLink);
	const vcloudText = await fetchTextWithCloudflareFallback(vcloudURL, headers, requester, ctx, cookieJar);
	if (!vcloudText) {
		ctx.log.warn('[hubcloud] Could not load the vcloud page.');
		return [];
	}

	const $ = ctx.cheerio.$load(vcloudText);
	const rawLinks: RawHubcloudLink[] = [];

	const buttons = $('.btn-success.btn-lg.h6,.btn-danger,.btn-secondary').toArray();
	for (const element of buttons) {
		let href = $(element).attr('href') || '';
		if (!href) continue;

		if (href.includes('pixeld')) {
			if (!href.includes('api')) {
				const redirected = getRedirectedPixelDrainUrl(vLinkText, vcloudText);
				if (redirected) href = redirected;
				const token = href.split('/').pop()?.split('?')[0];
				const pxlBase = href.split('/').slice(0, -2).join('/');
				href = `${pxlBase}/api/file/${token}?download`;
			}
			rawLinks.push({ server: 'Pixeldrain', url: href });
		} else if (href.includes('.dev') && !href.includes('/?id=')) {
			rawLinks.push({ server: 'Cf-Worker', url: href });
		} else if (href.includes('hubcloud') || href.includes('/?id=')) {
			const resolved = await resolveNestedHubcloud(href, headers, cookieJar, requester, ctx);
			if (resolved) rawLinks.push({ server: 'HubCloud', url: resolved });
		} else if (href.includes('cloudflarestorage')) {
			rawLinks.push({ server: 'CfStorage', url: href });
		} else if (href.includes('fastdl') || href.includes('fsl.')) {
			rawLinks.push({ server: 'FastDl', url: href });
		} else if (href.includes('hubcdn') && !href.includes('/?id=')) {
			rawLinks.push({ server: 'HubCdn', url: href });
		} else if (href.includes('.mkv') || href.includes('?token=')) {
			const serverName =
				href.match(/^(?:https?:\/\/)?(?:www\.)?([^/]+)/i)?.[1]?.replace(/\./g, ' ') || 'Direct';
			rawLinks.push({ server: serverName, url: href });
		}
	}

	ctx.log.info(`[hubcloud] Resolved ${rawLinks.length} mirror link(s).`);

	const label = [meta.fileName, meta.quality].filter(Boolean).join(' ').trim() || 'HubCloud';
	return rawLinks.map((raw) => {
		const format = guessFormat(raw.url);
		return {
			fileName: `[${raw.server}] ${label}`.trim(),
			playlist: raw.url,
			language: meta.language,
			...(format ? { format } : {}),
			xhr: {
				flags: ['CORS_BLOCKED'],
				headers: {},
			},
		} satisfies InternalMediaSource;
	});
}

/** Follows the HEAD redirect chain a nested HubCloud button points at. */
async function resolveNestedHubcloud(
	href: string,
	headers: Record<string, string>,
	cookieJar: { cookie: string },
	requester: ScrapeRequester,
	ctx: ProviderContext,
): Promise<string | null> {
	try {
		const headHeaders = { ...headers, ...(cookieJar.cookie ? { cookie: cookieJar.cookie } : {}) };
		const first = await ctx.xhr.fetch(
			new URL(href),
			{ method: 'HEAD', attachUserAgent: true, clean: true, headers: headHeaders, redirect: 'manual' },
			requester,
		);
		let newLink = first.headers.get('location') || (first.url && first.url !== href ? first.url : href);

		if (newLink.includes('googleusercontent')) {
			return newLink.split('?link=')[1] || newLink;
		}

		const second = await ctx.xhr.fetch(
			new URL(newLink),
			{ method: 'HEAD', attachUserAgent: true, clean: true, headers: headHeaders, redirect: 'manual' },
			requester,
		);
		const secondLoc = second.headers.get('location');
		if (secondLoc) return secondLoc.split('?link=')[1] || secondLoc;
		if (second.url && second.url !== newLink) return second.url.split('?link=')[1] || second.url;
		return newLink;
	} catch (error) {
		ctx.log.debug(`[hubcloud] Nested resolution failed for ${href}: ${(error as Error).message}`);
		return href;
	}
}

/** Best-effort container detection from the URL so the engine gets a `format` hint. */
function guessFormat(url: string): MediaSource['format'] | undefined {
	const lower = url.toLowerCase();
	if (lower.includes('.m3u8')) return 'm3u8';
	if (lower.includes('.mkv')) return 'mkv';
	if (lower.includes('.mp4')) return 'mp4';
	if (lower.includes('.webm')) return 'webm';
	return undefined;
}
