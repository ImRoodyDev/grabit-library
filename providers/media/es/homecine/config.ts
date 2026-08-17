import { type ProviderConfig, Provider } from 'grabit-engine';

/**
 * Provider configuration for HomeCine.
 * https://www3.homecine.to/  (Spanish: Latino / Castellano)
 * @link https://github.com/webstreamr/webstreamr/blob/main/src/source/HomeCine.ts
 */
export const config: ProviderConfig = {
	scheme: 'homecine',
	name: 'HomeCine',
	language: 'es',
	baseUrl: 'https://www3.homecine.to',
	entries: {
		search_movie: {
			endpoint: '/?s={title:form-uri}',
		},
		search_serie: {
			endpoint: '/?s={title:form-uri}',
		},
	},
	mediaIds: ['tmdb', 'imdb'],
};

export const PROVIDER = Provider.create(config);
