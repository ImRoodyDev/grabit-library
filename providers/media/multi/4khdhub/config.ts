import { type ProviderConfig, Provider } from 'grabit-engine';

/**
 * Provider configuration for 4KHDHub.
 * Parent: https://4khdhub.one  (domain rotates — see vega urls.json "4khdhub")
 *
 * Dual-audio (Hindi + English) movie & series scraper. Search is the site's own
 * `/?s=` query; download links resolve through the HubCloud chain (see
 * extractors/hubchain.ts + extractors/hubcloud.ts).
 */
export const config: ProviderConfig = {
	scheme: '4khdhub',
	name: '4KHDHub',
	language: ['hi', 'en'],
	baseUrl: 'https://4khdhub.one',
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
