# ADR-0006: Static hosting — GitHub Pages via GitHub Actions

- Status: Accepted
- Date: 2026-09-07
- Note: the repo-name assumption behind `vite.config.js`'s `base` was
  corrected in [ADR-0016](0016-github-repo-name-mainline.md).

## Context

Mainline is a fully client-side app (ADR-0004) with a Vite production
build (ADR-0001). The brief explicitly asks for GitHub Pages as the host.
Git itself isn't set up for this repo yet ("git wird erst später folgen" —
git will follow later), so this ADR records the intended deployment shape
ahead of that.

## Decision

- Host the production build on **GitHub Pages** as a project site.
- `.github/workflows/deploy-pages.yml` builds (`npm ci && npm run build`)
  and deploys `dist/` on every push to `main`, via
  `actions/{configure-pages,upload-pages-artifact,deploy-pages}` — no
  manual publish step.
- `vite.config.js`'s `base: '/storylane-local/'` (ADR-0001) assumes the
  GitHub repo is named `storylane-local`, matching this folder. If the
  repo ends up with a different name, `base` needs to change to match
  before the deployed site's asset paths will resolve correctly.

## Consequences

**Positive**

- Zero-cost static hosting with automatic deploys once a `main` branch and
  remote exist, no server to run or pay for (consistent with ADR-0004's
  no-backend decision).

**Negative / risks**

- Nothing to deploy yet — this workflow only activates once git is
  initialized, a `main` branch exists, and a GitHub remote is configured
  with Pages enabled (Settings → Pages → Source: GitHub Actions). Until
  then this ADR documents intent, not a live deployment.
- The `base` path in `vite.config.js` is a manual assumption (repo name =
  folder name) that needs to be revisited if that assumption turns out
  wrong.

## Alternatives considered

- **A different static host** (Netlify, Vercel, etc.). Rejected: not
  requested, and GitHub Pages needs no extra account/service beyond the
  GitHub repo this project will eventually live in.
