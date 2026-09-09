import { defineConfig } from 'vite';

// GitHub Pages serves a project site (not a username.github.io repo) from a
// /<repo-name>/ subpath, not the domain root — without this, the built
// index.html's asset URLs resolve to /assets/... and 404 once deployed
// there. Vite's dev server and `vite preview` both already handle this base
// path transparently, so nothing else needs to change for local dev.
// Assumes the GitHub repo will be named "storylane-local" to match this
// folder (ADR-0006) — update this if the repo ends up named differently.
export default defineConfig({
  base: '/storylane-local/',
});
