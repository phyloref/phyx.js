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
- Some tests need network access. `test/examples/incorrect/otl-resolution-errors.json` and
  `test/examples/correct/normalization/brochu_2003_normalization.json` use a remote `@context`
  URL rather than a relative path, so anything converting them fetches it.
- **That remote `@context` is our own published docs site**, so the test suite depends on the
  docs deploy: while <https://www.phyloref.org/phyx.js/> was 404ing, `npm test` failed on every
  Node version. If that test fails, `curl` the URL in the error before looking anywhere else —
  see [docs/documentation-site.md](docs/documentation-site.md#publishing).
- **One `bin/phyx2owl.mjs` test fails on Node 26**, from a bundled-undici conflict in `jsonld`. CI
  runs Node 22, 24 and 25 and is green. Don't chase it or count it as a regression — see
  [issue #180](https://github.com/phyloref/phyx.js/issues/180). It breaks *every* `fetch` with
  `invalid onError method`, so it surfaces as a failure to resolve the remote `@context` and looks
  exactly like the site being down. The `curl` above is what tells the two apart.

### Working in this repository

- **Check a failing test against an unmodified checkout before assuming you caused it.**
  `git stash -u`, re-run, `git stash pop`. See the known failure above.
- **Don't `git add -A`.** A generated directory ignored on one branch may not be ignored on
  another — `tutorials/build/`, `site/` and the editor files now in `.gitignore` have all been
  swept into a commit this way. Stage explicit paths.
- **Run `npm ci` after switching branches** if their dependency sets differ; a stale
  `node_modules` shows up as confusing lint and build failures rather than as an obvious
  version mismatch.

### Tooling

- **Linter/formatter**: [Biomejs](https://biomejs.dev/) (`biome.json`) — enforces single quotes and other style rules, with overrides that disable formatting/linting for test files. `includes` also lists `**/*.md`, but Biome doesn't process Markdown yet and reports it as ignored, so prose is unchecked.
- **CI**: GitHub Actions, Node 22/24/25, runs `npm test` (includes lint)

## Docs

Generated with JSDoc 4 and clean-jsdoc-theme v5 into `site/`, and published to
<https://www.phyloref.org/phyx.js/> by `.github/workflows/docs.yml`, which uploads `site/` as the
Pages artifact. `npm run docs` builds it. The Pages source is GitHub Actions, not a branch —
pushing to `gh-pages` deploys nothing, and that branch has been deleted.

**Never commit `site/`** — it is generated output, and the build empties it.

Read [docs/documentation-site.md](docs/documentation-site.md) before changing anything about the
docs build: how the three build steps fit together, how to add a page, what has to stay true for
the published context IRIs to keep resolving, and the ways a page can come out wrong while the
build still reports success.
