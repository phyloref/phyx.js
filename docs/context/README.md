# JSON-LD Context and JSON Schema for Phyx

This directory stores all published versions of the publicly accessible
JSON-LD Context file and JSON Schema files for the Phyx format.

The development version of these files should be stored in the `development/`
directory. The test suite in Phyx.js uses these [JSON-LD Context] and
[JSON Schema] files to test the example phyloreferences. These are not intended
for use except by the test suite, and should not be used outside of this
repository.

Instead, users should use the most recent published version number, which are
stored in separate subdirectories named after a version number using
[semantic versioning]. These can be published by copying the development version
into a new directory. Note that previously published versions should not be
deleted so that Phyx files that refer to them can continue to be used.

| Version     | Date published      | JSON-LD context          | JSON Schema          |
|-------------|---------------------|--------------------------|----------------------|
| development | Not for publication | [JSON-LD context]        | [JSON Schema]        |
| [v0.1.0]    | February 6, 2019    | [v0.1.0 JSON-LD context] | None                 |
| [v0.2.0]    | July 22, 2019       | [v0.2.0 JSON-LD context] | None                 |
| [v1.0.0]    | March 19, 2021      | [v1.0.0 JSON-LD context] | [v1.0.0 JSON Schema] |
| [v1.1.0]    | May 11, 2023        | [v1.1.0 JSON-LD context] | [v1.1.0 JSON Schema] |

  [JSON-LD Context]: ./development/phyx.json
  [JSON Schema]: ./development/schema.json
  [semantic versioning]: https://semver.org/
  [development]: ./development/phyx.json
  [v0.1.0]: https://github.com/phyloref/phyx.js/releases/tag/v0.1.0
  [v0.1.0 JSON-LD context]: ./v0.1.0/phyx.json
  [v0.2.0]: https://github.com/phyloref/phyx.js/releases/tag/v0.2.0
  [v0.2.0 JSON-LD context]: ./v0.2.0/phyx.json
  [v1.0.0]: https://github.com/phyloref/phyx.js/releases/tag/v1.0.0
  [v1.0.0 JSON-LD context]: ./v1.0.0/phyx.json
  [v1.0.0 JSON Schema]: ./v1.0.0/schema.json
  [v1.1.0]: https://github.com/phyloref/phyx.js/releases/tag/v1.1.0
  [v1.1.0 JSON-LD context]: ./v1.1.0/phyx.json
  [v1.1.0 JSON Schema]: ./v1.1.0/schema.json
