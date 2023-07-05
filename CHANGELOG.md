# Changelog
All notable changes to this library will be documented in this file.

The format is based on [Keep a Changelog] and this project adheres to [Semantic Versioning].

## [Unreleased]

## [1.1.0] - 2023-05-11
- PR #129: Added curator notes to phylorefs and phylogenies.
- PR #128: Added citation to README and a CITATION.CFF file.
- PR #125: Added curator information as contributors to Phyx file.

## [1.0.1] - 2021-10-15
- Created a tutorial for using phyx.js, including:
  - PR #99: Add tutorial.
  - PR #103: Improve integration of the tutorial.
  - PR #109: Add resolve.js instructions to Introduction tutorial.
- Improvements to README files, including:
  - PR #108: Added links to published JSON-LD contexts and JSON schemas.
  - PR #110: Added note that Binder cannot be used.
  - PR #111: Changes link to tutorials to directory.
- PR #106: Fixed typo in resolve.js.
- Updated timeout to 60s as 20s was timing out on GitHub Actions.
- Updated NPM packages and resorted packages in package.json.

## [1.0.0] - 2021-03-16
- Many changes across the entire library.
- Two new scripts: `bin/phyx2owl.js` for converting a Phyx file into OWL/JSON-LD
  and `bin/resolve.js` to resolve a Phyx file on the Open Tree of Life.
- Incorporation of JPhyloRef into testing.
- Fixed a bug in which phyloref and phylogeny `@id` values were being overwritten when generating JSON-LD.
- Added scripts to generate every possible topology from n=2 to n=6 with expected resolution and to test them with JPhyloRef.

## [0.2.1] - 2019-08-15
- Updated all NPM packages to their latest version.
- Fixed a bug in which node's types were not being correctly set to obo:CDAO\_0000140.

## [0.2.0] - 2019-07-18
### Changed
- The single index.js has been split into multiple files, one per class, with documentation using ESdocs (#21).
- Added support for generating "model 2.0" ontologies, which can be reasoned over in an OWL 2 EL reasoner such as Elk (#4). As part of this change, specifiers have been changed so that they are taxonomic units, rather than containing taxonomic units and a new Phyx context file has been created (#19).
- Taxonomic units have been cleaned up, are clearly typed, and taxonomic names now include nomenclatural codes (#18) and support trinomial names (#22).

## [0.1.2] - 2019-02-08
### Added
- Moved Phyx context file for JSON-LD into this repository from the Curation Tool and changed URI to point to it.

## [0.1.1] - 2019-02-06
### Added
- A replacement for the Phylotree.js Newick parser.

## [0.1.0] - 2019-01-27
### Added
- Transfered initial code from the [Phyloreference Curation Tool]. The initial
release of this package was based on [commit 14d2c3d5d1] in that repository.

### Changed
- Replaced references to the [phylotree] library with the [newick-js] library.
- Made other changes to the initial code as needed to work as an independent NPM package.

  [Unreleased]: https://github.com/phyloref/phyx.js/compare/v1.1.0...master
  [1.1.0]: https://github.com/phyloref/phyx.js/compare/v1.0.1...v1.1.0
  [1.0.1]: https://github.com/phyloref/phyx.js/compare/v1.0.0...v1.0.1
  [1.0.0]: https://github.com/phyloref/phyx.js/compare/v0.2.1...v1.0.0
  [0.2.1]: https://github.com/phyloref/phyx.js/compare/v0.2.0...v0.2.1
  [0.2.0]: https://github.com/phyloref/phyx.js/compare/v0.1.2...v0.2.0
  [0.1.2]: https://github.com/phyloref/phyx.js/compare/v0.1.1...v0.1.2
  [0.1.1]: https://github.com/phyloref/phyx.js/compare/v0.1.0...v0.1.1
  [0.1.0]: https://github.com/phyloref/phyx.js/releases/tag/v0.1.0
  [Keep a Changelog]: https://keepachangelog.com/en/1.0.0/
  [Semantic Versioning]: https://semver.org/spec/v2.0.0.html
  [Phyloreference Curation Tool]: http://github.com/phyloref/curation-tool
  [commit 14d2c3d5d1]: https://github.com/phyloref/curation-tool/commit/14d2c3d5d12ee4e925e29961bd46587aabfb8cd4
  [phylotree]: https://www.npmjs.com/package/phylotree
  [newick-js]: https://www.npmjs.com/package/newick-js
