import type { ScrapeRequester, InternalMediaSource, ProviderContext } from 'grabit-engine';
import { PROVIDER } from './config';

/**
 * Stream handler for Ip.
 *
 * Fetches and parses media streams from the provider's endpoint.
 */
export async function getStreams(requester: ScrapeRequester, ctx: ProviderContext): Promise<InternalMediaSource[]> {
	// Create the search URL based on the requester's media information
	const resourceURL = PROVIDER.createResourceURL(requester);
	ctx.log.debug(`Created resource URL: ${resourceURL}`);

	const resultsPage = await ctx.xhr.fetchResponse(
		resourceURL,
		{
			method: 'GET',
			headers: {
				Accept: 'application/json',
			},
		},
		requester,
	);

	ctx.log.debug(`Parsed JSON: ${JSON.stringify(resultsPage)}`);

	return [];
}
