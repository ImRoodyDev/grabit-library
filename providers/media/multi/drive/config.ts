import { type ProviderConfig, Provider } from 'grabit-engine';

/**
 * Provider configuration for MoviesDrive.
 * Parent: https://new2.moviesdrive.christmas  (domain rotates — see vega urls.json "drive")
 *
 * Dual-audio (Hindi + English) movie & series scraper. Search via `search.php?q=`
 * (JSON). Download links resolve to HubCloud or GDFlix (extractors/hubcloud.ts,
 * extractors/gdflix.ts).
 */
export const config: ProviderConfig = {
	scheme: 'drive',
	name: 'MoviesDrive',
	language: ['hi', 'en'],
	baseUrl: 'https://new2.moviesdrive.christmas',
	entries: {
		movie: {
			endpoint: '/search.php?q={title:form-uri}&page=1',
		},
		serie: {
			endpoint: '/search.php?q={title:form-uri}&page=1',
		},
	},
	mediaIds: ['imdb', 'tmdb'],
	contentAreCORSProtected: true,
};

export const PROVIDER = Provider.create(config);
