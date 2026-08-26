import { type ProviderConfig, type TProviderSelectors, Provider } from 'grabit-engine';

/**
 * Provider configuration for Wyziesubs.
 */
export const config: ProviderConfig = {
	scheme: 'wyziesubs',
	name: 'Wyziesubs',
	language: '*',
	baseUrl: 'https://sub.wyzie.ru',
	entries: {
		movie: {
			endpoint: '/search?id={id:string}&format=srt',
		},
		serie: {
			endpoint: '/search?id={id:string}&season={season:1}&episode={episode:1}&format=srt',
		},
	},
	mediaIds: ['imdb', 'tmdb'],
	contentAreCORSProtected: true,
};

export const locators: TProviderSelectors = {
	$results: '.search-page > .result-item',
	$result_entry: 'article a',
	$result_title: 'article .details .title',
	$result_year: 'article .details .year',
	$result_date: 'article .details .date',
	$result_duration: 'article .details .duration',
} as const;

export const PROVIDER = Provider.create(config);

// Read keys lazily. In RN the bundle is eval'd outside Metro so process.env is
// empty; the host app supplies keys via setupGrabitGlobals({ env }) -> __grabitEnv.
// process.env is the Node fallback (test-provider loads .env).
function readKeys(): string[] {
	const g = globalThis as { __grabitEnv?: Record<string, string | undefined> };
	const raw =
		g.__grabitEnv?.WYZIE_SUBS_KEYS ?? (typeof process !== 'undefined' ? process.env?.WYZIE_SUBS_KEYS : undefined);
	return (
		raw
			?.split(',')
			.map((k) => k.trim())
			.filter(Boolean) ?? ['']
	);
}

export function getKey(): string {
	const keys = readKeys();
	return (keys[Math.floor(Math.random() * keys.length)] || keys[0]) as string;
}
