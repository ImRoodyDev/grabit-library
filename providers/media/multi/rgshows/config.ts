import { type ProviderConfig, Provider } from 'grabit-engine';

/**
 * Provider configuration for RgShows.
 * TMDB-id based JSON API. NOTE: the api.rgshows.ru host is currently dead
 * (service rebranded to 1tube.org); provider ships active:false. See analysis/homecine-vixsrc-rgshows.md.
 * @link https://github.com/webstreamr/webstreamr/blob/main/src/source/RgShows.ts
 */
export const config: ProviderConfig = {
	scheme: 'rgshows',
	name: 'RgShows',
	language: 'en',
	baseUrl: 'https://api.rgshows.ru/',
	entries: {
		movie: {
			endpoint: '/main/movie/{id:string}',
		},
		serie: {
			endpoint: '/main/tv/{id:string}/{season:1}/{episode:1}',
		},
	},
	mediaIds: ['tmdb'],
};

export const PROVIDER = Provider.create(config);
