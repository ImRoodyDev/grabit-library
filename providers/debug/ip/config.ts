import { type ProviderConfig, type TProviderSelectors, Provider } from 'grabit-engine';

/**
 * Provider configuration for Ip.
 */
export const config: ProviderConfig = {
	scheme: 'ip',
	name: 'Ipadress Checker',
	language: 'en',
	baseUrl: 'https://api.ipify.org',
	entries: {
		movie: {
			endpoint: '?format=json',
		},
		serie: {
			endpoint: '?format=json',
		},
		channel: {
			endpoint: '?format=json',
		},
	},
	mediaIds: ['tmdb', 'imdb'],
	contentAreCORSProtected: false,
};

export const locators: TProviderSelectors = {
	$results: '.search-page > .result-item',
	$result_entry: 'article a',
	$result_title: 'article .details .title',
	$result_year: 'article .details .year',
	$result_date: 'article .details .date',
	$result_duration: 'article .details .duration',
} as const;

export const PROVIDER = Provider.create(config);
