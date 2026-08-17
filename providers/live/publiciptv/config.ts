import { type ProviderConfig, Provider } from 'grabit-engine';

/**
 * Provider configuration for Public IPTV (publiciptv.com).
 * Channel pages at /channels/<slug> server-render the channel's HLS sources.
 * The slug is the normalized name + country code (e.g. "abcnewsliveus").
 * @link https://publiciptv.com/
 */
export const config: ProviderConfig = {
	scheme: 'publiciptv',
	name: 'Public IPTV',
	language: '*',
	baseUrl: 'https://publiciptv.com/',
	entries: {
		channel: {
			endpoint: '/channels/{id:string}',
		},
	},
};

export const PROVIDER = Provider.create(config);
