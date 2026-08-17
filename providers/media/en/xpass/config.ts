import { type ProviderConfig, Provider, TProviderSelectors } from 'grabit-engine';

/**
 * Provider configuration for Xpass.
 * https://play.xpass.top/
 */
export const config: ProviderConfig = {
	scheme: 'xpass',
	name: 'Xpass',
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
