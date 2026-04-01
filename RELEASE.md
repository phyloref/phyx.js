# Releasing phyx.js

Steps to release a new version of phyx.js (e.g. `vX.Y.Z`).

## 1. Prepare a release PR

Create a branch named `release-phyx.js-vX.Y.Z` and open a PR against `master`.

In the PR:

1. **Update `CHANGELOG.md`** — move items from `[Unreleased]` into a new `[X.Y.Z] - YYYY-MM-DD` section.
2. **Bump the version in `package.json`** to `X.Y.Z`.
3. **Regenerate documentation** — run `npm run docs` and commit the updated `docs/` tree.
4. Set the version in `package.json` to the final version (not an alpha) before merging.

Get the PR reviewed and approved, then merge it.

## 2. Publish to npm

```bash
npm publish --access public
```

Verify the new version appears at https://www.npmjs.com/package/@phyloref/phyx.

## 3. Tag and release on GitHub

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

Then create a GitHub release for the tag (via the GitHub UI or `gh release create vX.Y.Z`).

Publishing the release triggers the `docs.yml` workflow, which regenerates and deploys docs to GitHub Pages.

## 4. Confirm the Zenodo deposit

The GitHub release triggers an automatic Zenodo deposit. Check that a new versioned DOI has been minted at https://zenodo.org (search for "phyx.js").

## 5. Update `CITATION.cff`

Once the Zenodo DOI is available, update `CITATION.cff`:

- `version`: `vX.Y.Z`
- `date-released`: the release date (YYYY-MM-DD)
- The versioned DOI identifier (`identifiers[1].value`): the new Zenodo DOI
- Leave the concept DOI (`10.5281/zenodo.5576556`) unchanged — it always resolves to the latest version.

Commit and push this change directly to `master` (or as a follow-up PR).
