# ADR-0001: Frontend build tooling — npm + Vite

- Status: Accepted
- Date: 2026-09-07

## Context

Frontend tooling generally falls into two camps: no build step at all,
plain `<script>` tags from a CDN, or npm + Vite, the latter usually
adopted once a dependency list stops being a good fit for CDN-only
consumption. Mainline's own brief explicitly asks for "Vite and
github-pages," so this
project starts with the build-tooling side of that split already decided,
independent of how heavy its actual dependency list ends up being (see
ADR-0005 — it stays effectively empty).

## Decision

Use **npm** and **Vite** as Mainline's dev server/bundler, rather than a
CDN-only, no-build setup.

- `npm run dev` for local development, `npm run build` for a static
  production build to `dist/`, `npm run preview` to serve that build
  locally.
- `vite.config.js` sets `base: '/storylane-local/'` to match the GitHub
  Pages project-site subpath (ADR-0006), the standard pattern for a
  project site keyed to its own repo name.
- Static assets that must be fetched at runtime rather than bundled (the
  example project JSON) live under `public/`, which Vite serves as-is in
  dev and copies verbatim into `dist/`.

## Consequences

**Positive**

- Matches the explicit tooling request, and gives a real production build
  and dev server out of the box.
- `public/` + relative `fetch()` calls means loading example/project data
  needs no special-casing between `npm run dev` and the deployed build.

**Negative / risks**

- Breaks the zero-setup "clone and open `index.html`" simplicity of a
  no-build setup — Mainline needs `npm install` before anything runs.
- One more thing to keep in sync: `vite.config.js`'s `base` must match
  whatever the GitHub repo actually ends up named, if it differs from this
  folder's name (`storylane-local`).

## Alternatives considered

- **No build step, CDN script tags.** Rejected: explicitly ruled out by
  the brief, which asks for Vite by name.
