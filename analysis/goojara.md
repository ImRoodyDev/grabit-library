# Goojara diagnosis

The provider's old `/xhrr.php` search endpoint is retired. The current homepage search script sends:

- `POST /xmre.php`
- `z=<#res data-ins>` from the homepage
- `x=2278024220`
- `q=<title>`

The provider now follows that live contract and solves the endpoint challenge when needed. The
reported fixture reaches a `200` search fragment and parses the current short result IDs such as
`/mN9B6m`, including year-aware matching.

Wootly playback is now supported by a dedicated HTTP extractor. The chain is:

1. Goojara `go.php` resolves to `https://www.wootly.ch/?v=...`.
2. Wootly HTML provides a `web.wootly.ch/e/...` iframe and sets `wootsses`.
3. The iframe sets `wooz`; POST `qdfx=1` returns `tk` and `vd` variables.
4. `/grabd` or `/grabm` returns the signed source URL.

The source is marked `IP_LOCKED` and uses the Wootly referer. Browser inspection also found that
the old click-driven path can produce a malformed `https://undefined/...` request, so the extractor
uses the response-body iframe and token chain instead of browser clicks.

Earlier browser inspection of a Dood link raised:

`TypeError: Cannot read properties of null (reading 'classList')`

The exact Wrecking Crew fixture now returns one playable Wootly MP4 source. The provider remains
`active: false` because other current mirrors such as Luluvdo and Playmogo are not yet supported.
