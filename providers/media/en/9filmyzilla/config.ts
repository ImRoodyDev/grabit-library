import { type ProviderConfig, Provider, TProviderSelectors } from 'grabit-engine';

/**
 * Provider configuration for 9filmyzilla.
 */
export const config: ProviderConfig = {
	scheme: '9filmyzilla',
	name: '9filmyzilla',
	language: ['en', 'es'],
	baseUrl: 'https://9filmyzilla.rest/',
	entries: {
		search_movie: {
			endpoint: '?s={title:form-uri}',
		},
		search_serie: {
			endpoint: '?s={title:form-uri}',
		},
	},
	mediaIds: ['tmdb', 'imdb'],
	contentAreCORSProtected: false,
	useSearchAlgorithm: {
		enabled: true,
		minimumMatchScore: 175,
	},
} as const;

export const locators: TProviderSelectors = {
	$results: '.search-page > .result-item',
	$result_entry: 'article a',
	$result_title: 'article .details .title',
	$result_year: 'article .details .year',
} as const;

export const PROVIDER = Provider.create(config);
