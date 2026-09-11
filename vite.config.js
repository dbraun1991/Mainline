import { defineConfig } from 'vite';

// GitHub Pages serves a project site (not a username.github.io repo) from a
// /<repo-name>/ subpath, not the domain root — without this, the built
// index.html's asset URLs resolve to /assets/... and 404 once deployed
// there. Vite's dev server and `vite preview` both already handle this base
// path transparently, so nothing else needs to change for local dev.
// Matches the actual GitHub repo name, `Mainline` (ADR-0016) — update this
// if the repo is ever renamed.
export default defineConfig({
  base: '/Mainline/',
});
