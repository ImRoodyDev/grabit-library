import { type ProviderConfig, Provider, TProviderSelectors } from 'grabit-engine';

/**
 * Provider configuration for Primewire.
 * https://primewire.nexus/
 */
export const config: ProviderConfig = {
	scheme: 'primewire',
	name: 'Primewire',
	language: 'en',
	baseUrl: 'https://primewire.si/',
	entries: {
		movie: {
			endpoint: '/filter?s={imdb:string}',
		},
		serie: {
			endpoint: '/filter?s={imdb:string}',
		},
	},
	mediaIds: ['imdb', 'tmdb'],
	contentAreCORSProtected: true,
};

export const locators: TProviderSelectors = {
	$results: '.index_container > .index_item.index_item_ie',
	$result_entry: 'a',
	$result_title: 'h2 .title-cutoff',
	$result_year: 'h2',
} as const;

export const PROVIDER = Provider.create(config);
