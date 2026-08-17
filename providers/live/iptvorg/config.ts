import { type ProviderConfig, Provider } from 'grabit-engine';

/**
 * Provider configuration for IPTV-org.
 * Public community live-TV catalog. We match a requested channel against the
 * iptv-org streams API and return its playable HLS url(s).
 * @link https://github.com/iptv-org/iptv  (API: https://iptv-org.github.io/api/)
 */
export const config: ProviderConfig = {
	scheme: 'iptvorg',
	name: 'IPTV-org',
	language: '*',
	baseUrl: 'https://iptv-org.github.io/',
	entries: {
		channel: {
			endpoint: '/api/streams.json',
		},
	},
};

export const PROVIDER = Provider.create(config);
