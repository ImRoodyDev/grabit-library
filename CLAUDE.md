# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A **provider library** for [grabit-engine](https://github.com/ImRoodyDev/grabit-engine). Each provider is a small scraper that extracts streaming sources (movies, series, live TV) or subtitles from a specific website. Providers are bundled into standalone single-file JS modules that the engine fetches (e.g. from GitHub) and evaluates at runtime with `new Function` — they must be fully self-contained with no runtime npm imports.

License is **CC-BY-NC-4.0** (non-commercial). This is for educational/personal use.

## Commands

The CLIs below are provided by the `grabit-engine` dependency (`node_modules/.bin/`). Read their doc headers in `node_modules/grabit-engine/scripts/*.js` for the full flag list.

```bash
# Bundle all providers into dist/<scheme>/index.js (the `build` npm script)
npx bundle-provider
npx bundle-provider primewire        # one provider
npx bundle-provider --clean          # remove bundled outputs
npx bundle-provider --dry-run        # preview without writing

# Scaffold a new provider (also patches manifest.json)
npx create-provider <scheme>
npx create-provider media/en/<scheme>   # nested group folder

# Test a provider against real media (dev-only; auto-bundles unless --no-bundle)
npx test-provider --scheme primewire --type movie --tmdb 27205
npx test-provider --scheme wyziesubs --media-file ./test/inception.json --mode subtitles
npx test-provider --scheme primewire --type serie --tmdb 1396 --season 1 --episode 1
```

`--mode` is `streams` (default), `subtitles`, or `both`. Minimal invocations let TMDB fill in missing fields; the `test/*.json` files are ready-made media fixtures. There is **no** `npm test` (the script is a stub) and no lint step — verify changes by running `test-provider`.

## Architecture

### Provider layout

Every provider lives in a folder under `providers/` and is split into up to four files:

- **`config.ts`** — the `ProviderConfig` (scheme, baseUrl, per-media-type `entries` endpoints, `mediaIds`, CORS flag), optional `TProviderSelectors` (`locators` — CSS selectors named `$results`, `$result_title`, etc.), and `export const PROVIDER = Provider.create(config)`.
- **`stream.ts`** — `export async function getStreams(requester, ctx): Promise<InternalMediaSource[]>`.
- **`subtitle.ts`** — `export async function getSubtitles(requester, ctx): Promise<InternalSubtitleSource[]>`.
- **`index.ts`** — the entry point; wires everything together with `defineProviderModule(PROVIDER, manifest.providers['<scheme>'], { getStreams, getSubtitles })`. This is the module the bundler builds and the engine loads.

Providers are grouped by intent, and the folder path is the scheme's group prefix:

- `providers/media/{en,es,multi,...}/<scheme>/` — movie & series scrapers grouped by language
- `providers/subtitle/<scheme>/` — subtitle providers
- `providers/debug/<scheme>/` — dev-only test providers (e.g. `ip`, an IP-address checker with `active: false`)
- `providers/extractors/*.ts` — **not** providers. Shared helpers that resolve a video-host embed URL (Mixdrop, Filemoon, DoodStream, Supervideo, Dropload, Vimeos, Goodstream, Cherryupns) into a playable source. Imported by `stream.ts` files (e.g. `extractMixdropStream`). These get inlined into each bundle that uses them.

### manifest.json (the source of truth)

Root `manifest.json` registers every provider by scheme with metadata: `name`, `version`, `active`, `language` (a string, array, or `"*"`), `type` (`media` | `subtitle`), `supportedMediaTypes`, `priority`, and `dir` (the group folder). `index.ts` files import this and pass the matching entry into `defineProviderModule`. **When adding a provider, its manifest entry must exist** — `create-provider` adds it automatically; keep it in sync manually otherwise. `dist/manifest.json` is a generated copy.

### The engine contract

Everything a provider needs is imported from `grabit-engine` — never from other npm packages, or the bundle breaks at runtime. Key pieces:

- **`ctx` (`ProviderContext`)** — the scraping toolkit: `ctx.xhr` (HTTP with proxy/UA/Cloudflare handling — `fetch`, `fetchResponse<T>`), `ctx.cheerio.load()` (HTML parsing), `ctx.puppeteer.launch()` (real-browser fallback for JS-heavy pages), and `ctx.log` (`.debug/.info/.warn/.error`).
- **`requester` (`ScrapeRequester`)** — the target: `requester.media` (`.type` is `movie`/`serie`/`channel`, plus title, ids, `season`/`episode` for series, `localizedTitles`), and `extraHeaders`.
- **`PROVIDER` helpers** — `createResourceURL(requester, localizedIndex?)`, `createPatternString(pattern, media, extra?)` (endpoints use `{imdb:string}`, `{season:1}` placeholder syntax), `useTranslation(media)`.
- **Utilities** — `calculateMatchScore` + `extractYearFromText` for fuzzy result matching, `deduplicateArray`, `encodeURI`, cookie helpers (`createCookiesFromSet`, `joinCookies`), `Crypto`, and packer/obfuscation helpers used by extractors (`extractEvalCode`, `unpackV2`, `extractVariableValue`).

Return `[]` for unsupported media types (e.g. `if (requester.media.type === 'channel') return []`) rather than throwing. Typical `getStreams` flow: build candidate search URLs (id-based first, then localized title variants) → load results → `selectBestResult` by score threshold → drill to the episode/server page → dispatch each host to its extractor.

### Bundling constraints

`bundle-provider` uses esbuild to inline all local imports into one file, then runs a **narrow set of Babel plugins** to lower class syntax and async arrows so React Native's Hermes engine can evaluate the bundle at runtime (Hermes rejects raw `class` and async arrows; esbuild can't lower classes itself). This is why `@babel/*` and `esbuild` are devDependencies. Keep provider code within what the bundler supports and avoid pulling in new npm runtime deps.
