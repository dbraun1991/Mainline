# ADR-0016: GitHub repo name — `Mainline`, not `storylane-local`

- Status: Accepted
- Date: 2026-09-11

## Context

ADR-0001 and ADR-0006 set `vite.config.js`'s `base` to `/storylane-local/`,
matching this project's folder name at the time, as a placeholder for
whatever the eventual GitHub repo would be named — both ADRs flagged this
as a risk to revisit once that repo existed. It now does: the project is
hosted as `dbraun1991/Mainline` on GitHub, matching the app's current name
(the app was renamed from Storylane early on; see the README's note),
not `storylane-local`. Left unchanged, the deployed GitHub Pages site's
asset paths would resolve under the wrong subpath and 404.

## Decision

- Set `vite.config.js`'s `base` to `/Mainline/`, matching the actual
  GitHub repo name.
- Update the dev-server URL and deployment notes in `README.md` and
  `agents.md` to match.

This supersedes only the base-path assumption from ADR-0001/ADR-0006;
those ADRs' broader decisions (Vite tooling, GitHub Pages hosting) stand
unchanged.

## Consequences

**Positive**

- Built asset paths resolve correctly once deployed, so the GitHub Actions
  workflow from ADR-0006 now produces a working site instead of one with
  broken asset URLs.

**Negative / risks**

- The same assumption still exists, just now pointed at the correct
  value: if the repo is ever renamed again, `base` needs to be updated
  again to match.

## Alternatives considered

- **A relative `base: './'`** instead of an absolute repo-scoped path.
  Would sidestep hardcoding the repo name entirely, but changes how the
  built SPA resolves its own assets and wasn't the pattern ADR-0001/0006
  already established — not worth switching approaches over a naming fix.
