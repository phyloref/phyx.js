/*
 * Test a particular error seen in files with expected resolution information.
 */

const fs = require('fs');
const path = require('path');

const chai = require('chai');
const Ajv = require('ajv');

const phyx = require('../src');

const expect = chai.expect;

/**
 * Test whether an error we see with expected resolution in an example file still occurs.
 */

describe('PhyxWrapper', function () {
  const ajv = new Ajv({
    allErrors: true, // Display all error messages, not just the first.
  });
  const validator = ajv.compile(
    JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, '../docs/context/development/schema.json')
      )
    )
  );

  describe('Test the file demonstrating the expected resolution error', function () {
    const jsonFilename = path.resolve(__dirname, './examples/correct/expected_resolution_error.json');

    let json;
    let jsonld;

    it('should be loadable', function () {
      json = JSON.parse(fs.readFileSync(jsonFilename));
      expect(json).to.be.an('object');
    });

    it.skip('should validate against our JSON schema', function () {
      const valid = validator(json);
      expect(
        validator.errors,
        `The following validation errors were generated: ${JSON.stringify(validator.errors, null, 2)}`
      ).to.be.null;
      expect(valid).to.be.true;
    });

    it('should be able to convertible to an OWL Ontology', function () {
      this.timeout(10000);
      jsonld = new phyx.PhyxWrapper(json)
        .asJSONLD('http://example.org/phyx.js/example#');
      expect(jsonld).to.be.an('object');
    });
  });
});
