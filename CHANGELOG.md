# Changelog
All notable changes to this library will be documented in this file.

The format is based on [Keep a Changelog] and this project adheres to [Semantic Versioning].

## [Unreleased]

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

  [Unreleased]: https://github.com/phyloref/phyx.js/compare/v0.2.0...master
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
