import { type ProviderConfig, Provider } from 'grabit-engine';

/**
 * Provider configuration for SupercamBR.
 * A session-free aggregator of curated public M3U lists. The menu page lists
 * getlistweb.php proxies, each of which renders a list's channels as
 * `videojs.php?url=<direct stream>` links.
 * @link http://listas.supercambr.com.br/scambr/web.php
 */
export const config: ProviderConfig = {
	scheme: 'supercambr',
	name: 'SupercamBR',
	language: '*',
	baseUrl: 'http://listas.supercambr.com.br/scambr/',
	entries: {
		channel: {
			endpoint: '/infopageandroid.php',
		},
	},
};

export const PROVIDER = Provider.create(config);
