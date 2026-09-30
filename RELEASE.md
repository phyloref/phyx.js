# Releasing phyx.js

Steps to release a new version of phyx.js (e.g. `vX.Y.Z`).

## 1. Prepare a release PR

Create a branch named `release-phyx.js-vX.Y.Z` and open a PR against `master`.

In the PR:

1. **Update `CHANGELOG.md`** — move items from `[Unreleased]` into a new `[X.Y.Z] - YYYY-MM-DD` section.
2. **Bump the version in `package.json`** to the final release version `X.Y.Z` (not an alpha) before merging.
   The documentation footer takes its version from the release tag, not from here, so the published site
   won't show a missed bump.
3. **Update the PHYX_CONTEXT_JSON in `src/utils/owlterms.js`** if a new version of the context has been
   produced in this release.
4. **Check that the documentation still builds** — run `npm run docs`. Do not commit `site/`: it is generated output, and publishing the release triggers the workflow that regenerates and deploys it (see step 3 below).

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
Check first that the `github-pages` environment still lists a `v*` tag policy — the release run's ref is the
tag, a branch policy cannot match it, and a write to the Pages settings can silently replace the policies
with a branch-only default:

```bash
# must include "tag  v*", or this release will publish nothing
gh api repos/phyloref/phyx.js/environments/github-pages/deployment-branch-policies \
  --jq '.branch_policies[] | "\(.type)\t\(.name)"'
```

Once the release is published, check that the docs actually went out. A failed deploy leaves the previous
version's site up, which the daily site canary will not notice, and the canary only runs at 06:17 UTC, so
run it now rather than waiting for it:

```bash
gh run list --workflow=docs.yml -L 1   # the release's deploy: must be "completed success"
gh workflow run site-canary.yml       # then `gh run watch` and pick it once it appears; must pass
# the footer must read "phyx.js vX.Y.Z" -- anything else is an older build
curl -sL https://www.phyloref.org/phyx.js/ | grep -oE 'phyx\.js v[^ <]+'
```

See [docs/Documentation.md](docs/Documentation.md#publishing) if the docs don't refresh.

## 4. Confirm the Zenodo deposit

The GitHub release triggers an automatic Zenodo deposit. Check that a new versioned DOI has been minted at https://zenodo.org (search for "phyx.js").

## 5. Update `CITATION.cff`

Once the Zenodo DOI is available, update `CITATION.cff`:

- `version`: `vX.Y.Z`
- `date-released`: the release date (YYYY-MM-DD)
- The versioned DOI identifier (`identifiers[1].value`): the new Zenodo DOI
- Leave the concept DOI (`10.5281/zenodo.5576556`) unchanged — it always resolves to the latest version.

Commit and push this change directly to `master` (or as a follow-up PR).
