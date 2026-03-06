import { type ProviderConfig, type TProviderSelectors, Provider } from 'grabit-engine';

/**
 * Provider configuration for AutoEmbed.
 */
export const config: ProviderConfig = {
	scheme: 'autoembed',
	name: 'AutoEmbed',
	language: ['en', 'fr', 'es'],
	baseUrl: 'https://test.autoembed.cc',
	entries: {
		movie: {
			endpoint: 'embed/movie/{id:string}',
		},
		serie: {
			endpoint: 'embed/tv/{id:string}/{season:1}/{episode:1}',
		},
	},
	mediaIds: ['tmdb', 'imdb'],
	contentAreCORSProtected: false,
};

export const PROVIDER = Provider.create(config);
