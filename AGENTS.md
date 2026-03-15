# Agent Notes for phyx.js

## Development Workflow

### Before running tests, run lint first

```bash
npm run lint   # biome check — must pass before npm test
npm test       # mocha (unit tests) + lint (posttest)
```

`npm test` runs lint again via `posttest`, but lint failures produce confusing output when mixed with test results. Run lint first to catch formatting/style issues early.

Biome also lints JSON files (including `jsdoc.json`). Use `npx biome format --write <file>` to auto-fix formatting.

## Docs

Generated with JSDoc 4 + clean-jsdoc-theme:

```bash
npm run docs   # predocs + jsdoc + postdocs (copies context/ into docs/)
touch docs/.nojekyll  # required for GitHub Pages
```

Config: `jsdoc.json`. Theme options live under `opts.theme_opts` (not `templates`).

**Do not commit generated `docs/` files** (HTML, CSS, JS, fonts, etc.) to the branch. The GitHub Actions workflow publishes them to `gh-pages` automatically. Only `docs/.nojekyll` should be committed if it doesn't already exist.
