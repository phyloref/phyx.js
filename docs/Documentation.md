# Building the documentation site

The site at <https://www.phyloref.org/phyx.js/> is generated with [JSDoc] 4 and
[clean-jsdoc-theme] v5 from the doc comments in `src/`, plus the Markdown pages listed in
`tutorials/build.mjs`.

```bash
npm run docs   # predocs + jsdoc + postdocs
```

## The three steps

1. `predocs` runs `tutorials/build.mjs`, which stages the Markdown pages we publish into
   `tutorials/build/` (gitignored). `tutorials/build/tutorials/` holds tutorials and feeds
   `opts.tutorials`; `tutorials/build/docs/` holds prose pages such as the changelog and feeds
   `opts.docs`, which gives them their own sidebar section.
2. `jsdoc --configure jsdoc.config.js` builds the site into `site/`, emptying it first. The
   config is a CommonJS module rather than JSON so it can read `version` out of `package.json`
   and put it in the footer — see the note on versioning under [Publishing](#publishing).
3. `postdocs` copies `context/` into `site/context/` — the published JSON-LD contexts and JSON
   Schemas are served from the documentation site.

There is deliberately no `.nojekyll`. Nothing Jekyll-related runs under the Actions Pages source
(see [Publishing](#publishing)), which serves the uploaded artifact as it is; GitHub's own
static-site starter workflow ships without one too. `postdocs` used to write it into `site/`, which
is gitignored, so it could only ever have mattered to the old workflow that pushed the contents of
`site/` to a branch — under a branch source today Jekyll would build the repository root, where
`site/` does not appear at all. **If the theme's `_assets/` or `_islands/` directories start
404ing after a deploy, this is the assumption that broke**, and writing the file back in `postdocs`
is the fix.

`context/README.md` is published at `/context/` as a prose page, so that URL keeps working: under
the old branch source it was served by `jekyll-readme-index`, which GitHub Pages enabled by
default. `postdocs` copies the context files in beside it, and the README's relative links resolve
to them.

## Publishing

**Never commit the generated site.** `site/` is gitignored and `.github/workflows/docs.yml`
publishes it when a release is published, or on demand:

```bash
gh workflow run docs.yml
```

Note that merging to `master` publishes nothing — **the site only refreshes on a release or a
manual run.** Test docs changes with `npm run docs` locally.

Every page's footer carries the version being documented, derived from `git describe --tags` in
`jsdoc.config.js`. One expression covers both ways the site is published, because a release run
checks out the tag: it reads `v1.2.1` for a release and `v1.2.1-138-g2cbb006` for a manual run from
`master`, so a between-releases build says how far past the release it is rather than claiming to
be it. This is why `docs.yml` checks out with `fetch-depth: 0` — a shallow clone has no tags, and
describe falls back to `package.json` without failing the build.

Both paths run through the `github-pages` environment, whose deployment branch policies decide
which refs may deploy. A run whose ref matches none of them is rejected in seconds, before it
checks out. **Both of these have to exist**:

- `master` (branch) — for `workflow_dispatch`, so a manual refresh runs from `master`.
- `v*` (tag) — for `release: published`, where `github.ref` is `refs/tags/vX.Y.Z`. No *branch* rule
  can ever match a tag, so without this one the release path is silently dead while manual runs
  keep working. That is the state this repository was in.

They live in repository settings, so they survive no review and no test:

```bash
gh api repos/phyloref/phyx.js/environments/github-pages/deployment-branch-policies \
  --jq '.branch_policies[] | "\(.type)\t\(.name)"'
```

To publish from some other branch — to repair the live site from a PR, say — add a temporary branch
rule for it, run `gh workflow run docs.yml --ref <branch>`, then delete the rule.

**Writing any Pages setting re-creates that policy.** A `PUT` to `/repos/{owner}/{repo}/pages`
re-provisions the environment with a fresh default-branch-only rule — even when the call changes
only the `source` field that `build_type: workflow` ignores. Whatever was there is replaced, so the
`v*` rule disappears without a word and releases stop publishing. That has already happened once
here. **Re-check the policies after touching anything in the Pages settings**, and note that the
protection rule's `id` changes when it is re-created, which is how you tell a re-provisioned policy
from the one you left there.

**The test suite depends on this site being up.** `test/examples/correct/normalization/brochu_2003_normalization.json`
and `test/examples/incorrect/otl-resolution-errors.json` reference their `@context` by its
published URL rather than a relative path, so a broken deploy fails `npm test` on every Node
version. Publishing is not only a docs concern, and CI cannot catch a regression here before the
deploy has actually run.

The repository's Pages source is **GitHub Actions**, not a branch, so the site is whatever
`actions/deploy-pages` last uploaded. Two consequences worth remembering:

- Pushing to a `gh-pages` branch deploys nothing, and the branch itself — left over from the
  esdoc era — has been deleted.
- GitHub's own `pages-build-deployment` runs are not this workflow. Under a branch source it
  Jekyll-builds the configured folder and reports success even when the result has no
  `index.html` — which is exactly how the site 404'd after the esdoc output was removed from
  `docs/`.
- The Pages settings still record a `source`, because the API has no "no source" value to set it
  to. It is inert while `build_type` is `workflow`, and it now reads `{branch: master, path: /}`.
  That only matters if someone switches the source back to a branch, and it is deliberately aimed
  at the least bad landing: a Jekyll build of `master:/` serves `README.md` as the index (Pages
  enables `jekyll-readme-index` by default) and still serves `context/` out of the repository, so
  the published context IRIs — and the tests that dereference them — would survive. It used to
  point at `/docs`, which holds prose and no `index.html`, and would have 404'd the whole site.

Pages serves the uploaded artifact at the repository sub-path, `/phyx.js`. That is what makes
`postdocs` enough to keep <https://www.phyloref.org/phyx.js/context/v1.1.0/phyx.json> resolving —
the IRI `src/utils/owlterms.js` hardcodes, and the one every published Phyx file dereferences. Any
change to `basePath`, to the uploaded `path`, or to the Pages source has to preserve that URL
exactly. The workflow checks `site/index.html` and that context file exist before it deploys,
deriving the context path from `PHYX_CONTEXT_JSON` so that bumping the constant moves the check
with it.

## Adding a page

Add an entry to `TUTORIALS` (a tutorial) or `DOCS` (any other prose page) in `tutorials/build.mjs`,
giving its name, title and source path. The build fails if a listed source file is missing, so a
renamed file can't silently drop a page.

Source files keep their own level-one heading — the theme renders a heading for API pages but not
for tutorials or prose pages, which take theirs from the Markdown. Only the pandoc frontmatter is
stripped, since it exists for the PDF build.

`tutorials/Introduction.md` is generated from `Introduction.ipynb` by `tutorials/Makefile`. **Edit
the notebook, not the Markdown**, or the change will be overwritten.

## Validating the docs

`test/docs.mjs` runs as part of `npm test` and enforces the mechanical half of the gotchas below,
so a regression fails a test instead of waiting to be noticed on the published site. It checks:

- **Prose** — every relative link and heading anchor in our tracked Markdown resolves, and every
  reference-style definition is used. These files cross-link each other (`AGENTS.md` and
  `RELEASE.md` both point into [Publishing](#publishing)), and renaming a heading is the easy way
  to break that silently.
- **Configuration** — `opts.basePath` matches the sub-path in `PHYX_CONTEXT_JSON`. Checked against
  the config rather than the built pages, because a wrong `basePath` makes a link check inspect
  nothing and pass.
- **The generated site** — no page publishes an element id twice, every internal link and asset
  resolves, and every class in `src/` has a page that the sidebar links to.

The site checks need `site/` to exist. They skip when it doesn't, so a plain `npm test` stays fast;
run `npm run docs` first to include them. In CI they fail rather than skip, so the build step in
`tests.yml` cannot go missing without the test run saying so — which is also why that step now runs
*before* `npm test` rather than after it.

What this deliberately does not cover is external URLs, and whether the site is actually up.
`.github/workflows/site-canary.yml` handles the second: it fetches the site and the published
context daily and fails if either is unreachable, which GitHub emails to whoever last touched the
cron. Nothing in CI can catch that, because the deploy that breaks the site happens long after the
pull request that caused it went green. `gh run list --workflow=site-canary.yml` shows its
history.

Note that a new workflow cannot be test-fired from the branch that adds it: GitHub resolves
`workflow_dispatch` against the **default branch**, so `gh workflow run <file> --ref <branch>`
answers `404: not found on the default branch` until the file is on `master`. Run its steps
locally to check them, and dispatch it once for real after merging.

## Gotchas

Most of these are silent — the build still succeeds, the page just comes out wrong. The ones marked
*(enforced)* now fail a test:

- **jsdoc exits 0 when it finds no input.** *(enforced)* If `source` matches nothing it prints "There are no
  input files to process" and stops — without emptying `site/`, so a stale build sits there looking
  like a fresh one. `source.include` names a directory, which needs `opts.recurse`; drop that and
  the whole site quietly stops being rebuilt. The CI step checks a page exists, not just that the
  command succeeded. **Delete `site/` before checking a docs change**, or you may be reading the
  previous build.
- **Categories sort alphabetically; don't add to the one exception.** `@category Wrappers` needs no
  ordering of its own. `PhyxWrapper` carries `order=1` deliberately, because wrapping a whole
  document is where someone new to the library should start, and that should stay the only one:
  once a second class has a number, every new class needs one, and a forgotten one lands wherever
  the tool decides.
- **A class without `@category` disappears from the sidebar.** *(enforced)* `sectionOrder` lists our categories
  (Wrappers, Matchers, Utilities) instead of `Classes`, so an uncategorised class is published but
  unreachable from the navigation. `strict` does not catch this.
- **A class's doc comment must sit immediately above the class**, below the imports. *(enforced)* A file-header
  comment above the imports is close enough for jsdoc to give the class a page but not to treat the
  comment as the class's own, so tags on it (like `@category`) never reach the class. Both
  `CitationWrapper` and `PhylogenyWrapper` were broken this way.
- **Don't put `/** */` on a top-level `require`.** jsdoc attaches a doc comment to the next code
  construct, so it documents the import as a global. Use `//` for notes about imports.
- **Document the getter, `@private` the setter.** *(enforced)* jsdoc has no notion of accessor pairs, so
  documenting both publishes the property twice, with two elements sharing one HTML id. **`@ignore`
  does not work here**, though it reads as if it should: jsdoc 4 and clean-jsdoc-theme v5 accept the
  tag and publish the member regardless. Every setter in the library carried `@ignore`, and eleven
  duplicate ids were live on the published site until this check caught them.
- **`opts.basePath` must match the sub-path the site is deployed under** (`/phyx.js`). *(enforced)* Pages are
  served from clean URLs and links are root-relative, so a wrong `basePath` 404s every link and
  asset.
- **`plugins/markdown` is required** — jsdoc uses it to render Markdown in doc comments before the
  theme sees them, and the theme refuses to build without it.
- **The build empties its destination, so never put source files in `site/`.** Anything already
  there is deleted at the start of every build. The output directory is deliberately *not* called
  `docs/`: clean-jsdoc-theme's own documentation uses `"docs": "./docs"` as the example path for
  hand-written prose pages, so pointing `opts.docs` at a directory called `docs/` the conventional
  way would have silently deleted those files on the next build.
- **Theme options live directly under `opts`**, not `opts.theme_opts` as in theme v4. `opts.strict`
  is on, so an unrecognized option fails the build instead of being ignored.

  [JSDoc]: https://jsdoc.app/
  [clean-jsdoc-theme]: https://github.com/ankitskvmdam/clean-jsdoc-theme
