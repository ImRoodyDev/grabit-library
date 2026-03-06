import { Provider, type ProviderConfig } from 'grabit-engine';

/**
 * Provider configuration for Ekola405gmt.
 * Parent : https://vegamovies.ad/
 */
export const config: ProviderConfig = {
	scheme: 'ekola405gmt',
	name: 'Ekola405gmt',
	language: 'en',
	baseUrl: 'https://ekola405gmt.com',
	entries: {
		movie: {
			endpoint: '/play/{imdb:string}',
		},
		serie: {
			endpoint: '/play/{imdb:string}',
		},
	},
	mediaIds: ['imdb'],
	contentAreCORSProtected: false,
};

export const PROVIDER = Provider.create(config);
