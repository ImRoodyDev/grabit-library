import { defineProviderModule } from 'grabit-engine';
import type { ProviderModuleManifest } from 'grabit-engine';
import manifest from '../../../../manifest.json';
import { PROVIDER } from './config';
import { getStreams } from './stream';
import { getLazyStreams, resolveLazy } from './lazy';

export default defineProviderModule(PROVIDER, manifest.providers['homecine'] as ProviderModuleManifest, {
	getStreams,
	getLazyStreams,
	resolveLazy,
});
