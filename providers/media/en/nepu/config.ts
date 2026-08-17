import { type ProviderConfig, Provider, TProviderSelectors } from 'grabit-engine';

/**
 * Provider configuration for Nepu.
 * https://nepu.to/
 * @link https://github.com/Ciarands/mw-providers/tree/dev/src/providers/sources/nepu
 */
export const config: ProviderConfig = {
	scheme: 'nepu',
	name: 'Nepu',
	language: 'en',
	baseUrl: 'https://nepu.to/',
	entries: {
		movie: {
			endpoint: '/ajax/posts?q={title:form-uri}',
		},
		serie: {
			endpoint: '/ajax/posts?q={title:form-uri}',
		},
	},
	contentAreCORSProtected: true,
};

export const PROVIDER = Provider.create(config);
