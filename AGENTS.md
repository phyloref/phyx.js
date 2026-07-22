# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Commands

```bash
# Run all tests (linting runs automatically as posttest)
npm test

# Run linting only
npm run lint

# Run a specific test file
npx mocha test/phylorefs.js

# Run tests matching a description pattern
npx mocha test/phylorefs.js --grep "PhylorefWrapper"

# Generate API documentation
npm run docs
```

## Architecture

**phyx.js** is a JavaScript library for reading, manipulating, and converting [Phyloreference Exchange (Phyx)](https://doi.org/10.7717/peerj.12618) files — a JSON-LD format for digitized clade definitions (phyloreferences) with annotated phylogenies. This repository also includes the JSON Schema and JSON-LD files for Phyx, providing a definitive source of the format.

### Core concepts

- **Phyloreferences**: Clade definitions specifying which organisms belong to a clade, using internal/external specifiers
- **Specifiers**: Taxonomic units (taxa or specimens) or apomorphies used to define a clade (internal = inside clade, external = outside)
- **Taxonomic Units**: Represent organisms, either as taxon concepts or specimens
- **Phylogenies**: Newick-format trees providing resolution context for phyloreferences

### Module structure (`src/`)

All classes are exported from `src/index.js`. Each wraps a corresponding JSON object from a PHYX file:

| Wrapper | Purpose |
|---|---|
| `PhyxWrapper` | Top-level Phyx document; converts to JSON-LD, N-Quads, or normalized form |
| `PhylorefWrapper` | Individual phyloreference; manages specifiers, status, OWL restrictions |
| `PhylogenyWrapper` | Phylogeny tree; parses Newick strings, extracts taxonomic units from node labels |
| `TaxonomicUnitWrapper` | Base for specimens and taxon concepts; extracts units from arbitrary strings |
| `TaxonConceptWrapper` | Taxon concept with nomenclatural code, taxonomic name and name components, and an optional citation |
| `TaxonNameWrapper` | Parses scientific names (uninomial/binomial/trinomial) by nomenclatural code |
| `SpecimenWrapper` | Specimen with occurrenceID, collection, and catalog number |
| `CitationWrapper` | Bibliographic citation with authors and publication details |
| `TaxonomicUnitMatcher` | (`src/matchers/`) Provides an algorithm for matching two taxonomic units. |
| `PhyxCacheManager` | (`src/utils/`) Caches computed values across the library |

**Key utility:** `src/utils/owlterms.js` — canonical IRIs for OWL/RDF/CDAO/TDWG ontology terms used throughout.

### Data flow

```
PHYX JSON file
  └─▶ PhyxWrapper.asJSONLD() / toRDF() / PhyxWrapper.normalize(phyxDocument)
        ├─▶ PhylorefWrapper  (per phyloreference)
        │     └─▶ TaxonomicUnitWrapper → TaxonConceptWrapper | SpecimenWrapper
        └─▶ PhylogenyWrapper (per phylogeny)
              └─▶ Newick parser → node TaxonomicUnitWrappers
```

### CLI tools (`bin/`)

- `bin/phyx2owl.mjs` — converts PHYX files to OWL ontologies (N-Quads)
- `bin/resolve.mjs` — resolves phyloreferences against Open Tree of Life

### Testing

- Test files in `test/` mirror source modules (`phylorefs.js`, `phylogenies.js`, etc.)
- `test/examples/correct/` contains fixture PHYX files with expected outputs used by `test/examples.js`
- `test/jphyloref.js` requires the JPhyloRef JAR; may be skipped if Java is unavailable

### Tooling

- **Linter/formatter**: [Biomejs](https://biomejs.dev/) (`biome.json`) — enforces single quotes and other style rules on `**/*.js`, `**/*.json`, and `**/*.md` (excluding `docs/`), with overrides that disable formatting/linting for test files
- **CI**: GitHub Actions, Node 22/24/25, runs `npm test` (includes lint)

## Docs

Generated with JSDoc 4 + [clean-jsdoc-theme] v5, and published to <https://www.phyloref.org/phyx.js/>.

```bash
npm run docs   # predocs + jsdoc + postdocs
```

The three steps are:

1. `predocs` runs `tutorials/build.mjs`, which stages the Markdown pages we publish into `tutorials/build/` (gitignored). `tutorials/build/tutorials/` holds tutorials and feeds `opts.tutorials`; `tutorials/build/docs/` holds prose pages such as the changelog and feeds `opts.docs`, which gives them their own sidebar section.
2. `jsdoc --configure jsdoc.json` builds the site into `docs/`, emptying it first.
3. `postdocs` copies `context/` into `docs/context/` — the published JSON-LD contexts and JSON Schemas are served from the documentation site — and creates `docs/.nojekyll`, without which GitHub Pages would ignore the theme's `_assets/` and `_islands/` directories.

**Never commit generated `docs/` files.** `docs/` is gitignored and `.github/workflows/docs.yml` publishes it to the `gh-pages` branch when a release is published.

### Adding a page

Add an entry to `TUTORIALS` (a tutorial) or `DOCS` (any other prose page) in `tutorials/build.mjs`, giving its name, title and source path. The build fails if a listed source file is missing, so a renamed file can't silently drop a page.

Source files keep their own level-one heading — the theme renders a heading for API pages but not for tutorials or prose pages, which take theirs from the Markdown. Only the pandoc frontmatter is stripped, since it exists for the PDF build.

`tutorials/Introduction.md` is generated from `Introduction.ipynb` by `tutorials/Makefile`. **Edit the notebook, not the Markdown**, or the change will be overwritten.

### Gotchas

Most of these are silent — the build still succeeds, the page just comes out wrong:

- **A class without `@category` disappears from the sidebar.** `sectionOrder` lists our categories (Wrappers, Matchers, Utilities) instead of `Classes`, so an uncategorised class is published but unreachable from the navigation. `strict` does not catch this.
- **A class's doc comment must sit immediately above the class**, below the imports. A file-header comment above the imports is close enough for jsdoc to give the class a page but not to treat the comment as the class's own, so tags on it (like `@category`) never reach the class. Both `CitationWrapper` and `PhylogenyWrapper` were broken this way.
- **Don't put `/** */` on a top-level `require`.** jsdoc attaches a doc comment to the next code construct, so it documents the import as a global. Use `//` for notes about imports.
- **Document the getter, `@ignore` the setter.** jsdoc has no notion of accessor pairs, so documenting both publishes the property twice with duplicate HTML ids.
- **`opts.basePath` must match the sub-path the site is deployed under** (`/phyx.js`). Pages are served from clean URLs and links are root-relative, so a wrong `basePath` 404s every link and asset.
- **`plugins/markdown` is required** — jsdoc uses it to render Markdown in doc comments before the theme sees them, and the theme refuses to build without it.
- **Theme options live directly under `opts`**, not `opts.theme_opts` as in theme v4. `opts.strict` is on, so an unrecognized option fails the build instead of being ignored.

  [clean-jsdoc-theme]: https://github.com/ankitskvmdam/clean-jsdoc-theme
