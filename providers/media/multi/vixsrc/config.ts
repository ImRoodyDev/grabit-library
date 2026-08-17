import { type ProviderConfig, Provider } from 'grabit-engine';

/**
 * Provider configuration for VixSrc.
 * https://vixsrc.to/  (TMDB-id based, multi-audio HLS)
 * @link https://github.com/webstreamr/webstreamr/blob/main/src/source/VixSrc.ts
 */
export const config: ProviderConfig = {
	scheme: 'vixsrc',
	name: 'VixSrc',
	language: ['en', 'it'],
	baseUrl: 'https://vixsrc.to/',
	entries: {
		movie: {
			endpoint: '/api/movie/{id:string}',
		},
		serie: {
			endpoint: '/api/tv/{id:string}/{season:1}/{episode:1}',
		},
	},
	mediaIds: ['tmdb'],
};

export const PROVIDER = Provider.create(config);
