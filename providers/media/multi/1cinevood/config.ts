import { type ProviderConfig, Provider } from 'grabit-engine';

/**
 * Provider configuration for Cinewood (1cinevood).
 * Parent: https://cinevood.cl  (domain rotates — see vega urls.json "1cinevood")
 *
 * Dual-audio (Hindi + English) movie & series scraper. Search is the site's `/?s=`
 * query. Download links are either HubCloud URLs or `oxxfile` links (resolved to
 * HubCloud via `/api/s/<id>/hubcloud`); series episodes come from `/api/packs/<id>`.
 */
export const config: ProviderConfig = {
	scheme: '1cinevood',
	name: 'Cinewood',
	language: ['hi', 'en'],
	baseUrl: 'https://cinevood.cl',
	entries: {
		movie: {
			endpoint: '/?s={title:form-uri}',
		},
		serie: {
			endpoint: '/?s={title:form-uri}',
		},
	},
	mediaIds: ['imdb', 'tmdb'],
	contentAreCORSProtected: true,
};

export const PROVIDER = Provider.create(config);
