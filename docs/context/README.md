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

  [JSON-LD Context]: ./development/phyx.json
  [JSON Schema]: ./development/schema.json
  [semantic versioning]: https://semver.org/
