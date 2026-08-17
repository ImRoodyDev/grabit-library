import {
	type ScrapeRequester,
	type ProviderContext,
	type CheerioLoadRequest,
} from 'grabit-engine';

/**
 * Shared HubCloud "link chain" resolver used by the hdhub4u-family sites
 * (hdhub4u, 4khdhub, moviesmod, …). These sites hide the real HubCloud drive URL
 * behind one of three intermediates:
 *
 *  1. a direct `hubcloud` / `/drive/` link — returned as-is;
 *  2. a `hubdrive` page — the success button holds the HubCloud URL;
 *  3. an obfuscated `s('o', '…', 180)` blob — decoded (base64×2 → ROT13 → base64
 *     → JSON), then a `_wp_http_*` token dance yields a blog redirect that lists
 *     the HubCloud drive link.
 *
 * The resolved URL is meant to be handed straight to `extractHubcloudStreams`.
 */

// No User-Agent: grabit's providerFetch/cheerioLoad attach requester.userAgent (and it wins).
const CHAIN_HEADERS: Record<string, string> = {
	cookie: 'xla=s4t',
	Referer: 'https://google.com',
};

/** Max seconds we honour the site's artificial redirect delay (keeps us under the scrape timeout). */
const MAX_REDIRECT_WAIT_S = 12;

/** Maps noisy link text to a coarse quality label. */
export function detectQuality(text: string): string {
	const t = text.toLowerCase();
	if (t.includes('2160p') || t.includes('4k')) return '4k';
	if (t.includes('1080p')) return '1080p';
	if (t.includes('720p')) return '720p';
	if (t.includes('480p')) return '480p';
	return 'Unknown';
}

/** Resolves a candidate download link into a HubCloud drive URL (or null). */
export async function resolveToHubcloud(
	link: string,
	requester: ScrapeRequester,
	ctx: ProviderContext,
	pageOpt: CheerioLoadRequest,
): Promise<string | null> {
	// Already a HubCloud / drive URL — hand straight to the extractor.
	if (link.includes('hubcloud') || link.includes('/drive/')) return link;

	// hubdrive intermediate page.
	if (link.includes('hubdrive')) {
		const { $ } = await ctx.cheerio.load(new URL(link), pageOpt, ctx.xhr);
		return (
			$('.btn.btn-primary.btn-user.btn-success1.m-1').attr('href') ||
			$('.btn.btn-primary.btn-user.btn-success1').attr('href') ||
			link
		);
	}

	// Obfuscated intermediate ("s('o','...',180)") -> wp_http redirect dance.
	try {
		const text = await getText(new URL(link), requester, ctx);
		const encrypted = text.split("s('o','")?.[1]?.split("',180")?.[0];
		const decoded: any = decodeString(encrypted);
		const decodedLink = safeAtob(decoded?.o) || link;

		const blogLink = await getRedirectLink(decodedLink, requester, ctx);

		// The blog page may already be a HubCloud/drive URL.
		if (blogLink.includes('hubcloud') || blogLink.includes('/drive/')) return blogLink;

		const blogText = await getText(new URL(blogLink), requester, ctx);
		const $ = ctx.cheerio.$load(blogText);

		// Prefer explicit hubcloud drive anchors, sorted by quality.
		const driveLinks: { quality: string; link: string }[] = [];
		$('a[href*="hubcloud"][href*="/drive/"]').each((_: number, el: any) => {
			const href = $(el).attr('href');
			if (!href) return;
			const t = ($(el).text() + $(el).parent().text()).toLowerCase();
			driveLinks.push({ quality: detectQuality(t), link: href });
		});
		const order: Record<string, number> = { '4k': 4, '1080p': 3, '720p': 2, '480p': 1, unknown: 0 };
		driveLinks.sort((a, b) => (order[b.quality.toLowerCase()] || 0) - (order[a.quality.toLowerCase()] || 0));

		let hubdriveLink =
			driveLinks[0]?.link ||
			$('h3:contains("1080p")').find('a').attr('href') ||
			blogText.match(/href="(https:\/\/hubcloud\.[^/]+\/drive\/[^"]+)"/)?.[1] ||
			'';

		if (hubdriveLink.includes('hubdrive')) {
			const { $: $$ } = await ctx.cheerio.load(new URL(hubdriveLink), pageOpt, ctx.xhr);
			hubdriveLink =
				$$('.btn.btn-primary.btn-user.btn-success1.m-1').attr('href') ||
				$$('.btn.btn-primary.btn-user.btn-success1').attr('href') ||
				hubdriveLink;
		}
		if (!hubdriveLink) return null;

		// hubdrive pages sometimes META-refresh straight to the real HubCloud URL.
		try {
			const finalText = await getText(new URL(hubdriveLink), requester, ctx);
			const refresh = finalText.match(/<META HTTP-EQUIV="refresh" content="0; url=([^"]+)">/i)?.[1];
			return refresh || hubdriveLink;
		} catch {
			return hubdriveLink;
		}
	} catch (error) {
		ctx.log.debug(`[hubchain] Obfuscated resolution failed: ${(error as Error).message}`);
		return null;
	}
}

/**
 * Ports vega's `getRedirectLinks`: reconstructs the `_wp_http_*` token split
 * across the page, decodes it, waits the mandated (capped) delay, and returns
 * the blog redirect URL that lists the HubCloud drive links.
 */
async function getRedirectLink(link: string, requester: ScrapeRequester, ctx: ProviderContext): Promise<string> {
	try {
		const resText = await getText(new URL(link), requester, ctx);
		const regex = /ck\('_wp_http_\d+','([^']+)'/g;
		let combined = '';
		let match: RegExpExecArray | null;
		while ((match = regex.exec(resText)) !== null) combined += match[1];
		if (!combined) return link;

		const decodedString = decode(pen(decode(decode(combined))));
		const data = JSON.parse(decodedString);
		const token = encode(data?.data);
		const blogLink = `${data?.wp_http1}?re=${token}`;

		const waitS = Math.min(Number(data?.total_time || 0) + 1, MAX_REDIRECT_WAIT_S);
		if (waitS > 0) await sleep(waitS * 1000);
		return blogLink || link;
	} catch (error) {
		ctx.log.debug(`[hubchain] getRedirectLink failed: ${(error as Error).message}`);
		return link;
	}
}

// ─── Low-level helpers ───────────────────────────────────────────────────────

async function getText(url: URL, requester: ScrapeRequester, ctx: ProviderContext): Promise<string> {
	const res = await ctx.xhr.fetch(
		url,
		{ method: 'GET', attachUserAgent: true, clean: true, headers: { ...CHAIN_HEADERS } },
		requester,
	);
	return res.text();
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const encode = (value: string) => btoa(String(value));
const decode = (value: string) => (value === undefined ? '' : atob(String(value)));

/** ROT13 over letters (vega's `pen`). */
function pen(value: string): string {
	return value.replace(/[a-zA-Z]/g, (c) => {
		const code = c.charCodeAt(0) + 13;
		const cap = c <= 'Z' ? 90 : 122;
		return String.fromCharCode(cap >= code ? code : code - 26);
	});
}

function rot13(str: string): string {
	return str.replace(/[a-zA-Z]/g, (char) => {
		const code = char.charCodeAt(0);
		const base = char <= 'Z' ? 65 : 97;
		return String.fromCharCode(((code - base + 13) % 26) + base);
	});
}

function safeAtob(str: string | undefined): string | null {
	if (!str) return null;
	try {
		return atob(str);
	} catch {
		return null;
	}
}

/** Layered decode used by these sites' movie links: base64 x2 -> rot13 -> base64 -> JSON. */
function decodeString(encryptedString: string | undefined): any {
	if (!encryptedString) return null;
	try {
		let decoded = atob(encryptedString);
		decoded = atob(decoded);
		decoded = rot13(decoded);
		decoded = atob(decoded);
		return JSON.parse(decoded);
	} catch {
		return null;
	}
}
