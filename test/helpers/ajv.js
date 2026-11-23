/*
 * The Ajv setup shared by the tests that use our JSON Schemas, so that test/context.js checks each
 * schema with the same options test/examples.js validates the example files with.
 *
 * This isn't a test file, but `mocha --recursive` loads it as one; it defines no tests, so that is
 * harmless.
 */

const Ajv = require('ajv');
const addFormats = require('ajv-formats');

/**
 * Create an Ajv instance for validating against a Phyx JSON Schema.
 * @param {object} [options] - Extra Ajv options, merged over the shared ones.
 * @returns {Ajv} An Ajv instance with the formats from ajv-formats added.
 */
function makeAjv(options = {}) {
  const ajv = new Ajv({
    allErrors: true, // Display all error messages, not just the first.
    ...options,
  });
  addFormats(ajv);
  return ajv;
}

module.exports = { makeAjv };
