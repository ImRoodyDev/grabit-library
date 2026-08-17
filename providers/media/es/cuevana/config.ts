import { type ProviderConfig, Provider } from 'grabit-engine';

/**
 * Provider configuration for Cuevana (cuevana3).
 * Parent: https://www3.cuevana3.is  (domain rotates: ww1 -> www3, followRedirects handles it)
 *
 * Major Spanish / Latino source. Search by (Spanish) title, drill to the watch page,
 * read the language submenus (Latino / Castellano / Subtitulado) for embed URLs, and
 * dispatch each embed host to its extractor (StreamWish/VidHide, DoodStream, Filemoon, …).
 */
export const config: ProviderConfig = {
	scheme: 'cuevana',
	name: 'Cuevana',
	language: ['es'],
	baseUrl: 'https://www3.cuevana3.is',
	entries: {
		movie: {
			endpoint: '/search/{title:uri}/',
		},
		serie: {
			endpoint: '/search/{title:uri}/',
		},
	},
	mediaIds: ['tmdb', 'imdb'],
	contentAreCORSProtected: true,
};

export const PROVIDER = Provider.create(config);
