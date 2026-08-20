import { type ProviderConfig, Provider, TProviderSelectors } from 'grabit-engine';

/**
 * Provider configuration for Goojara.
 * https://ww1.goojara.to/
 * @link https://github.com/Ciarands/mw-providers/tree/dev/src/providers/sources/goojara
 * @link wootly extractor https://github.com/Ciarands/mw-providers/blob/dev/src/providers/embeds/wootly.ts
 */
export const config: ProviderConfig = {
	scheme: 'goojara',
	name: 'Goojara',
	language: 'en',
	baseUrl: 'https://ww1.goojara.to/',
	entries: {
		// The servers API (JSON). Each server carries a `key` resolved via /api/v1/l.
		movie: {
			endpoint: '',
		},
		serie: {
			endpoint: '',
		},
	},
	contentAreCORSProtected: true,
};

export const PROVIDER = Provider.create(config);
