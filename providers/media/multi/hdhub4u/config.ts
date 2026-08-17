import { type ProviderConfig, Provider } from 'grabit-engine';

/**
 * Provider configuration for HdHub4u.
 * Parent: https://hdhub4u.af  (domain rotates — see vega urls.json "hdhub")
 *
 * Dual-audio (Hindi + English) movie & series scraper. Search runs through the
 * site's Typesense-backed API (search.pingora.fyi); download links resolve through
 * the HubCloud / hubdrive chain (see extractors/hubcloud.ts).
 */
export const config: ProviderConfig = {
	scheme: 'hdhub4u',
	name: 'HdHub4u',
	language: ['hi', 'en'],
	baseUrl: 'https://new1.hdhub4u.af',
	entries: {
		// Search is the site's Typesense API on a different host; an absolute-URL
		// endpoint passes straight through `new URL(...)`. Static Typesense params go
		// in `queries` (URL-encoded like the original URLSearchParams), `{title:form-uri}`
		// carries the query term. `baseUrl` is still used to resolve result permalinks.
		movie: {
			endpoint: 'https://search.pingora.fyi/collections/post/documents/search?q={title:form-uri}',
			queries: {
				query_by: 'post_title,category,stars,director,imdb_id',
				query_by_weights: '4,2,2,2,4',
				sort_by: 'sort_by_date:desc',
				limit: 15,
				highlight_fields: 'none',
				use_cache: true,
				page: 1,
			},
		},
		serie: {
			endpoint: 'https://search.pingora.fyi/collections/post/documents/search?q={title:form-uri}',
			queries: {
				query_by: 'post_title,category,stars,director,imdb_id',
				query_by_weights: '4,2,2,2,4',
				sort_by: 'sort_by_date:desc',
				limit: 15,
				highlight_fields: 'none',
				use_cache: true,
				page: 1,
			},
		},
	},
	mediaIds: ['imdb', 'tmdb'],
	contentAreCORSProtected: true,
};

export const PROVIDER = Provider.create(config);
