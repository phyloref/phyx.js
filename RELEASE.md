# Releasing phyx.js

Steps to release a new version of phyx.js (e.g. `vX.Y.Z`).

## 1. Prepare a release PR

Create a branch named `release-phyx.js-vX.Y.Z` and open a PR against `master`.

In the PR:

1. **Update `CHANGELOG.md`** — move items from `[Unreleased]` into a new `[X.Y.Z] - YYYY-MM-DD` section.
2. **Bump the version in `package.json`** to the final release version `X.Y.Z` (not an alpha) before merging.
3. **Regenerate documentation** — run `npm run docs` and commit the updated `docs/` tree.


Get the PR reviewed and approved, but do NOT merge it until after successfully publishing it to NPM.

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

## 4. Confirm the Zenodo deposit

The GitHub release triggers an automatic Zenodo deposit. Check that a new versioned DOI has been minted at https://zenodo.org (search for "phyx.js").

## 5. Update `CITATION.cff`

Once the Zenodo DOI is available, update `CITATION.cff`:

- `version`: `vX.Y.Z`
- `date-released`: the release date (YYYY-MM-DD)
- The versioned DOI identifier (`identifiers[1].value`): the new Zenodo DOI
- Leave the concept DOI (`10.5281/zenodo.5576556`) unchanged — it always resolves to the latest version.

## 6. Merge PR

Once all of the above steps have been successfully carried out, merge the release PR.
