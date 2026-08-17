import { type ProviderConfig, Provider } from 'grabit-engine';

/**
 * Provider configuration for Xpass2 (play.xpass.top).
 *
 * Same source as `xpass`, but this variant resolves streams over plain HTTP
 * (`ctx.xhr`) and only falls back to `ctx.solveChallenge` when the page is Cloudflare-gated,
 * so it stays universal. It works because the signed `/data/<type>/<tmdb>?…&sig=…` URL is
 * server-rendered into the embed HTML (`var dataUrl="…"`), so no client-side JS is required.
 */
export const config: ProviderConfig = {
	scheme: 'xpass2',
	name: 'Xpass2',
	language: 'en',
	baseUrl: 'https://play.xpass.top',
	entries: {
		movie: {
			endpoint: '/e/movie/{id:string}',
		},
		serie: {
			endpoint: '/e/tv/{id:string}/{season:1}/{episode:1}',
		},
	},
	mediaIds: ['imdb', 'tmdb'],
	contentAreCORSProtected: true,
};

export const PROVIDER = Provider.create(config);
