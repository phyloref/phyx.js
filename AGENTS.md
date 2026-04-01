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
- **Docs**: ESDoc, outputs to `docs/`
- **CI**: GitHub Actions, Node 22/24/25, runs `npm test` (includes lint)
