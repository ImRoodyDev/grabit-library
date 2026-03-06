import { type ProviderConfig, type TProviderSelectors, Provider } from 'grabit-engine';

/**
 * Provider configuration for Lamovie.
 */
export const config: ProviderConfig = {
	scheme: 'lamovie',
	name: 'Lamovie',
	language: 'es',
	baseUrl: 'https://la.movie',
	entries: {
		search_movie: {
			// endpoint: '/search/{title:form-uri}/',
			endpoint: '/wp-api/v1/search?filter=%7B%7D&postType=any&q={title:form-uri}&postsPerPage=26',
		},
		search_serie: {
			endpoint: '/wp-api/v1/search?filter=%7B%7D&postType=any&q={title:form-uri}&postsPerPage=26',
		},
	},
	mediaIds: ['tmdb', 'imdb'],
	contentAreCORSProtected: false,
};

export const locators: TProviderSelectors & {
	$result_es_title: string;
} = {
	$results: '.mlist .row > div',
	$result_entry: '.play a',
	$result_title: '.popular-card__title p',
	$result_year: '.rates .year',
	$result_es_title: '.popular-card__title span',
} as const;

export const PROVIDER = Provider.create(config);
