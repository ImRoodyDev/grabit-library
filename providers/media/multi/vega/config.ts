import { type ProviderConfig, Provider } from 'grabit-engine';

/**
 * Provider configuration for VMovies (vegamovies).
 * Parent: https://vegamovies.catering  (domain rotates — see vega urls.json "Vega")
 *
 * Dual-audio (Hindi + English) movie & series scraper. Search is the site's own
 * `/search.php?q=` Typesense endpoint (JSON). Download buttons point at a
 * `nexdrive`-style dotlink page that exposes a vcloud link, which the HubCloud
 * extractor then resolves (see extractors/hubcloud.ts).
 */
export const config: ProviderConfig = {
	scheme: 'vega',
	name: 'VMovies',
	language: ['hi', 'en'],
	baseUrl: 'https://vegamovies.catering',
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
