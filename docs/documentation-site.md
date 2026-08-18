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
   Schemas are served from the documentation site — and creates `site/.nojekyll`.

Nothing Jekyll-related runs under the Actions Pages source (see [Publishing](#publishing)), so
`.nojekyll` is inert today. It stays because under a branch source Jekyll would ignore the theme's
`_assets/` and `_islands/` directories.

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

That is deliberate, and it is why every page's footer carries the version: the site documents a
released version, not the tip of `master`, so it has to say which one. The footer is built from
`package.json`'s `version` at build time, so it describes the tree the build ran on — accurate for
a release run, which checks out the tag, and equally accurate (if less useful) for a manual run
from `master`, which will read as the version last bumped. If the site is ever switched to publish
on every push to `master`, this footer becomes misleading and needs to grow a "development build"
marker.

Both paths run through the `github-pages` environment, whose deployment branch policies decide
which refs may deploy. A run whose ref matches none of them is rejected in seconds, before it even
checks out. **Both of these policies have to exist**:

- `master` (branch) — for `workflow_dispatch`, which is why a manual run has to be on `master` and
  dispatching from a topic branch fails immediately.
- `v*` (tag) — for `release: published`, where `github.ref` is `refs/tags/vX.Y.Z` and no branch
  policy can ever match. Without it the release path is silently dead.

They live in repository settings, not in this repo, so they survive no review and no test. Check
them with `gh api repos/phyloref/phyx.js/environments/github-pages/deployment-branch-policies`.

To publish from a branch other than `master` — to repair the live site from a PR, say — add a
temporary branch rule for it, dispatch with `gh workflow run docs.yml --ref <branch>`, then delete
the rule. That is how the site was restored while the fix was still under review.

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
- The Pages settings still record `source: {branch: master, path: /docs}` from the esdoc era, and
  there is no way to clear it: the API has no "no source" value, and the field is simply ignored
  while `build_type` is `workflow`. It is a loaded gun rather than a live problem — switching the
  source back to a branch would resume Jekyll-building `master:/docs`, which holds prose files and
  no `index.html`, and would 404 exactly as before. Don't switch the source without changing that
  path too.

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

## Gotchas

Most of these are silent — the build still succeeds, the page just comes out wrong:

- **jsdoc exits 0 when it finds no input.** If `source` matches nothing it prints "There are no
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
- **A class without `@category` disappears from the sidebar.** `sectionOrder` lists our categories
  (Wrappers, Matchers, Utilities) instead of `Classes`, so an uncategorised class is published but
  unreachable from the navigation. `strict` does not catch this.
- **A class's doc comment must sit immediately above the class**, below the imports. A file-header
  comment above the imports is close enough for jsdoc to give the class a page but not to treat the
  comment as the class's own, so tags on it (like `@category`) never reach the class. Both
  `CitationWrapper` and `PhylogenyWrapper` were broken this way.
- **Don't put `/** */` on a top-level `require`.** jsdoc attaches a doc comment to the next code
  construct, so it documents the import as a global. Use `//` for notes about imports.
- **Document the getter, `@ignore` the setter.** jsdoc has no notion of accessor pairs, so
  documenting both publishes the property twice with duplicate HTML ids.
- **`opts.basePath` must match the sub-path the site is deployed under** (`/phyx.js`). Pages are
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
