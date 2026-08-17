# Live-TV (channel) providers

First channel providers in the repo, all under `providers/live/`. Channels use the
`ChannelMedia` contract: the requester supplies `channelId` + `channelName`; the
provider matches and returns the stream(s). `type: "media"`,
`supportedMediaTypes: ["channel"]`, `language: "*"`. Test with
`test-provider --type channel --channel-id <id> --channel-name "<name>"`.

## IPTV-org — `providers/live/iptvorg` — active, HTTP-first

Consumes the iptv-org public API `https://iptv-org.github.io/api/streams.json`
(~16.5k streams) at runtime, cached 6h. Matches by channel id first
(`stream.channel`, e.g. `"CNN.us"`), then fuzzily by `title` vs `channelName`
(`calculateMatchScore >= 80`). Forwards each stream's `user_agent`/`referrer`
(→ `REFERER_LOCKED`). We fetch the API, not the 325 bundled `.m3u` files (those
would be huge and stale). **Tested:** by id (`00sReplay.us`) and by name
(`Aathavan TV`). Note: iptv-org drops geo/DMCA'd channels (e.g. CNN.us isn't
currently present) and many community links rot — inherent to the source.

## Public IPTV — `providers/live/publiciptv` — active, HTTP-first

publiciptv.com channel pages `/channels/<slug>` server-render the channel's HLS
sources in a "Choose Stream Source" block. The slug is `norm(name)+countryCode`
(e.g. `abcnewsliveus`). Its search/list JSON API is auth-gated (401), so we don't
use it. We try ordered candidate slugs — `norm(channelId)` first, then
`norm(name)+cc` (cc taken from an iptv-org-style id suffix), `norm(name)+"us"`,
`norm(name)` — and scrape the first page that yields sources (m3u8s are HTML-entity
decoded and deduped). **Tested:** by name (`ABC News Live`) and by id
(`cbsnews247us`) → real Pluto/Tubi/Akamai HLS. channelId = the publiciptv slug is
the reliable key; pure-name matching only works when the display name matches
publiciptv's naming (e.g. "Fox News" → `foxnewsus` 500s).

## SupercamBR — `providers/live/supercambr` — active, HTTP-first

`listas.supercambr.com.br/scambr` is a **session-free aggregator of curated public
M3U lists**. `infopageandroid.php` lists ~24 `getlistweb.php?l=<m3u url>` proxies;
each renders a list's channels as rows of `<font color=greenyellow>Name</font>` +
`videojs.php?url=<direct stream>`. We fetch the menu, iterate the lists (cached 3h,
iptv-org list skipped since it has its own provider), parse rows, match by name,
and return the direct stream urls (capped 12). **Tested:** `Globo` → 11 regional
Globo HLS feeds.

Notes:
- The site shows a "choose nickname" entry (sets `scambr11`/`scambr22` cookies),
  but the list endpoints serve fine in guest mode — and a *half-open* session
  actually hides the menu — so we deliberately skip the nickname step.
- A leading-slash `entries.channel` endpoint resolves against the host root and
  drops the `/scambr/` path, so URLs are built directly against the base.

## StreamSports99 — `providers/live/streamsports` — **active: false (blocked)**

React SPA backed by `api.cdnlivetv.is`. **Blocker with evidence:** the API is
auth-gated — `GET /api/channels` → 401, `/`, `/channels`, `/live` → 302 to
`/login`. Content is also transient sports *events*, a poor fit for the persistent
channel (id/name) model. Logic queries the documented endpoint and returns `[]`
gracefully (warns "auth-gated"); manifest entry is `active:false`. Re-enable if an
anonymous token flow is found in the site's JS bundle.
