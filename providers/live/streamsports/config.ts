import { type ProviderConfig, Provider } from 'grabit-engine';

/**
 * Provider configuration for StreamSports99.
 * NOTE: active:false. The site is a React SPA backed by api.cdnlivetv.is, whose
 * endpoints are auth-gated (401 / redirect to /login) and serve transient sports
 * *events* rather than persistent channels. Kept as a stub pending an anon-token
 * flow. See analysis/live-channels.md.
 * @link https://streamsports99.su/live-tv
 */
export const config: ProviderConfig = {
	scheme: 'streamsports',
	name: 'StreamSports99',
	language: '*',
	baseUrl: 'https://api.cdnlivetv.is/',
	entries: {
		channel: {
			endpoint: '/api/channels',
		},
	},
};

export const PROVIDER = Provider.create(config);
