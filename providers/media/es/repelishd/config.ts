import { type ProviderConfig, type TProviderSelectors, Provider } from 'grabit-engine';

/**
 * Provider configuration for Repelishd.
 */
export const config: ProviderConfig = {
	scheme: 'repelishd',
	name: 'Repelishd',
	language: ['es', 'en', 'fr'],
	baseUrl: 'https://repelishd.run',
	entries: {
		movie: {
			endpoint: '?story={id:string}&do=search&subaction=search',
		},
		serie: {
			endpoint: '?story={id:string}&do=search&subaction=search',
		},
	},
	mediaIds: ['imdb', 'tmdb'],
	contentAreCORSProtected: false,
};

export const locators: TProviderSelectors = {
	$results: '.items > article.item',
	$result_entry: 'a',
	$result_title: '.data h3 a',
	$result_year: '.data span',
} as const;

export const PROVIDER = Provider.create(config);
