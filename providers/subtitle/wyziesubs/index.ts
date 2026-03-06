import { defineProviderModule } from 'grabit-engine';
import type { ProviderModuleManifest } from 'grabit-engine';
import manifest from '../../../manifest.json';
import { PROVIDER } from './config';
import { getSubtitles } from './subtitle';

export default defineProviderModule(PROVIDER, manifest.providers['wyziesubs'] as ProviderModuleManifest, {
	getSubtitles,
});
