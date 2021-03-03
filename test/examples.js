/*
 * Test conversion on example files.
 */

const fs = require('fs');
const path = require('path');

const JSONLD = require('jsonld');
const chai = require('chai');
const Ajv = require('ajv');

const phyx = require('../src');

const expect = chai.expect;

/*
 * Constants
 */
// If REPLACE_EXISTING is set to true, we replace the existing JSON-LD and N-Quads
// files rather than comparing them -- not a good way to test, but useful when
// the output has changed.
const REPLACE_EXISTING = false;

/**
 * Test whether conversion of Phyx files to an OWL ontology occurs predictably.
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

  describe('Test all correct example Phyx files', function () {
    const examples = fs.readdirSync(path.resolve(__dirname, './examples/correct'))
      .filter(filename => filename.endsWith('.json'));

    examples.forEach((example) => {
      const basename = path.resolve(__dirname, './examples/correct', path.parse(example).name);
      const jsonFilename = `${basename}.json`;
      const jsonldFilename = `${basename}.jsonld`;
      const nqFilename = `${basename}.nq`;

      let json;
      let jsonld;
      let nq;

      describe(`Test file '${example}'`, function () {
        it('should be loadable', function () {
          json = JSON.parse(fs.readFileSync(jsonFilename));
          expect(json).to.be.an('object');
        });

        it('should validate against our JSON schema', function () {
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
            .asOWLOntology('http://example.org/phyx.js/example#');
          if (REPLACE_EXISTING) {
            fs.writeFileSync(
              jsonldFilename,
              JSON.stringify(jsonld, null, 2)
            );
          }
          expect(jsonld).to.be.an('object');
        });

        it('should generate the same OWL ontology as it generated earlier', function () {
          const expectedJSONLD = JSON.parse(fs.readFileSync(jsonldFilename));
          expect(jsonld).to.deep.equal(expectedJSONLD);
        });

        it('should be convertible to n-quads', function () {
          this.timeout(10000);

          // JSON-LD readers don't usually handle relative @context easily, so
          // instead let's replace the entire @context with the local context file.
          jsonld['@context'] = JSON.parse(fs.readFileSync(
            path.resolve(__dirname, 'examples', 'correct', jsonld['@context'])
          ));

          return JSONLD.toRDF(jsonld, { format: 'application/n-quads' }).then((rdf) => {
            nq = rdf;
            if (REPLACE_EXISTING) fs.writeFileSync(nqFilename, nq);
            expect(nq).to.be.a('string');
          });
        });

        it('should generate the same n-quads ontology as it generated earlier', function () {
          const expectedNQ = fs.readFileSync(nqFilename).toString();
          expect(nq).to.deep.equal(expectedNQ);
        });
      });
    });
  });

  describe('Test incorrect example Phyx files that should fail validation', function () {
    const filesThatShouldFailValidation = [
      'examples/incorrect/no-context.json',
    ];

    filesThatShouldFailValidation.forEach((filename) => {
      describe(`Example file ${filename}`, function () {
        it('should not validate against our JSON schema', function () {
          const phyxContent = JSON.parse(
            fs.readFileSync(
              path.resolve(__dirname, filename)
            )
          );
          const valid = validator(phyxContent);
          expect(validator.errors).to.not.be.null;
          expect(valid).to.not.be.true;
        });
      });
    });
  });
});
