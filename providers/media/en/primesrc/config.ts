import { type ProviderConfig, Provider, TProviderSelectors } from 'grabit-engine';

/**
 * Provider configuration for Primesrc.
 * https://primesrc.me/
 */
export const config: ProviderConfig = {
	scheme: 'primesrc',
	name: 'Primesrc',
	language: 'en',
	baseUrl: 'https://primesrc.me/',
	entries: {
		// The servers API (JSON). Each server carries a `key` resolved via /api/v1/l.
		movie: {
			endpoint: '/api/v1/s?imdb={imdb:string}&type=movie',
		},
		serie: {
			endpoint: '/api/v1/s?imdb={imdb:string}&type=tv&season={season:1}&episode={episode:1}',
		},
	},
	mediaIds: ['imdb', 'tmdb'],
	contentAreCORSProtected: true,
};

export const PROVIDER = Provider.create(config);
