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
2. `jsdoc --configure jsdoc.json` builds the site into `site/`, emptying it first.
3. `postdocs` copies `context/` into `site/context/` — the published JSON-LD contexts and JSON
   Schemas are served from the documentation site — and creates `site/.nojekyll`, without which
   GitHub Pages would ignore the theme's `_assets/` and `_islands/` directories.

`context/README.md` is published at `/context/` as a prose page, so that URL keeps working: it used
to be served by `jekyll-readme-index`, which GitHub Pages enables by default, but `.nojekyll` turns
Jekyll off entirely. `postdocs` copies the context files in beside it, and the README's relative
links resolve to them.

## Publishing

**Never commit the generated site.** `site/` is gitignored and `.github/workflows/docs.yml`
publishes it to the `gh-pages` branch when a release is published, or on demand via
`workflow_dispatch`.

GitHub Pages serves that `gh-pages` branch from its root, under `/phyx.js`. That is what makes
`postdocs` enough to keep <https://www.phyloref.org/phyx.js/context/v1.1.0/phyx.json> resolving —
the IRI `src/utils/owlterms.js` hardcodes, and the one every published Phyx file dereferences. Any
change to `basePath`, to `publish_dir`, or to the Pages source has to preserve that URL exactly.

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
