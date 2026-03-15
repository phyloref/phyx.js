# Release Process for phyx.js

## 1. Prepare a release PR

Create a branch named `release-phyx.js-vX.Y.Z` and open a PR against `master`.

In the PR, make the following changes:

- **`CHANGELOG.md`** — move all items from `[Unreleased]` into a new versioned section `[X.Y.Z] - YYYY-MM-DD`.
- **`package.json`** — update `"version"` to `"X.Y.Z"`.

Run `npm run lint && npm test` to confirm everything passes, then merge the PR.

> Do **not** commit generated `docs/` files. The GitHub Actions workflow (`.github/workflows/docs.yml`) builds and publishes them to `gh-pages` automatically when the release is published in step 4.

## 2. Publish to npm

```bash
npm publish --access public
```

Verify the release appeared at https://www.npmjs.com/package/@phyloref/phyx.

## 3. Create and push the git tag

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

## 4. Publish a GitHub release

```bash
gh release create vX.Y.Z --title "vX.Y.Z" --notes "See CHANGELOG.md for details."
```

Or do it via the GitHub UI: Releases → Draft a new release → choose the tag → publish.

Publishing the release triggers the `docs.yml` workflow, which regenerates and deploys docs to GitHub Pages.

## 5. Update CITATION.cff

Zenodo automatically archives the release and mints a new versioned DOI. Wait for the Zenodo webhook to fire (usually a few minutes after the GitHub release is published), then find the new DOI at https://zenodo.org/doi/10.5281/zenodo.5576556 (the concept DOI always resolves to the latest version).

Update `CITATION.cff`:

```yaml
identifiers:
  - type: doi
    value: 10.5281/zenodo.5576556       # concept DOI — leave unchanged
    description: >-
      This DOI will always resolve to the latest version of phyx.js.
  - type: doi
    value: 10.5281/zenodo.XXXXXXX       # ← replace with new versioned DOI
    description: The versioned DOI for version X.Y.Z of phyx.js.
version: vX.Y.Z
date-released: 'YYYY-MM-DD'
```

Commit directly to `master`:

```bash
git commit -m "Updated CITATION.cff with the latest version, release date and DOI."
```
