import { type ProviderConfig, Provider } from 'grabit-engine';

/**
 * Provider configuration for VerHdLink.
 * Parent: https://verhdlink.cam
 *
 * Spanish / Latino movie source. Keyed directly by IMDb id (`/movie/<imdbId>`);
 * the page statically lists mirror embeds grouped Latino / Castellano, which are
 * dispatched to their host extractors (Dropload, Supervideo, Mixdrop, DoodStream, …).
 * Movie-only (the site has no series).
 */
export const config: ProviderConfig = {
	scheme: 'verhdlink',
	name: 'VerHdLink',
	language: ['es'],
	baseUrl: 'https://verhdlink.cam',
	entries: {
		movie: {
			endpoint: '/movie/{imdb:string}',
		},
	},
	mediaIds: ['imdb'],
	contentAreCORSProtected: true,
};

export const PROVIDER = Provider.create(config);
