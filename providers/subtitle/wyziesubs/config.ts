import { type ProviderConfig, type TProviderSelectors, Provider } from 'grabit-engine';

/**
 * Provider configuration for Wyziesubs.
 */
export const config: ProviderConfig = {
	scheme: 'wyziesubs',
	name: 'Wyziesubs',
	language: '*',
	baseUrl: 'https://sub.wyzie.ru',
	entries: {
		movie: {
			endpoint: '/search?id={id:string}&format=srt',
		},
		serie: {
			endpoint: '/search?id={id:string}&season={season:1}&episode={episode:1}&format=srt',
		},
	},
	mediaIds: ['imdb', 'tmdb'],
	contentAreCORSProtected: true,
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
