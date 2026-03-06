import { defineProviderModule } from 'grabit-engine';
import type { ProviderModuleManifest } from 'grabit-engine';
import manifest from '../../../../manifest.json';
import { PROVIDER } from './config';
import { getStreams } from './stream';

export default defineProviderModule(PROVIDER, manifest.providers['lamovie'] as ProviderModuleManifest, {
	getStreams,
});
