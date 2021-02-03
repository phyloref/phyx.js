/*
 * Test conversion on example files.
 */

const fs = require('fs');
const path = require('path');

const jsonld = require('jsonld');
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
  let brochu2003owl;
  describe('convert brochu_2003.json to an OWL ontology', function () {
    const jsonFilename = path.resolve(__dirname, './examples/correct/brochu_2003.json');
    const jsonldFilename = path.resolve(__dirname, './examples/correct/brochu_2003.jsonld');

    let brochu2003;

    it('should be able to load brochu_2003.json', function () {
      brochu2003 = JSON.parse(fs.readFileSync(jsonFilename));
      expect(brochu2003).to.be.an('object');
    });

    it('should be able to convert brochu_2003.json to an OWL Ontology', function () {
      this.timeout(10000);
      brochu2003owl = new phyx.PhyxWrapper(brochu2003).asOWLOntology('http://example.org/brochu_2003.json#');
      if (REPLACE_EXISTING) {
        fs.writeFileSync(
          jsonldFilename,
          JSON.stringify(brochu2003owl, null, 2)
        );
      }
      expect(brochu2003owl).to.be.an('object');
    });

    it('should generate the same OWL ontology as it generated earlier', function () {
      const expectedBrochu2003 = JSON.parse(fs.readFileSync(jsonldFilename));
      expect(brochu2003owl).to.be.deep.equal(expectedBrochu2003);
    });
  });
  describe('convert brochu_2003.jsonld to n-quads', function () {
    const nqFilename = path.resolve(__dirname, './examples/correct/brochu_2003.nq');

    let brochu2003nq;
    it('should be able to convert brochu_2003.json via JSON-LD to n-quads', function () {
      this.timeout(10000);

      // JSON-LD readers don't usually handle relative @context easily, so
      // instead let's replace the entire @context with the local context file.
      brochu2003owl['@context'] = JSON.parse(fs.readFileSync(
        path.resolve(__dirname, path.join('examples', 'correct', brochu2003owl['@context']))
      ));

      return jsonld.toRDF(brochu2003owl, { format: 'application/n-quads' }).then((rdf) => {
        brochu2003nq = rdf;
        if (REPLACE_EXISTING) fs.writeFileSync(nqFilename, brochu2003nq);
        expect(brochu2003nq).to.be.a('string');
      });
    });

    it('should generate the same n-quads ontology as it generated earlier', function () {
      const expectedBrochu2003nq = fs.readFileSync(nqFilename).toString();
      expect(brochu2003nq).to.be.deep.equal(expectedBrochu2003nq);
    });
  });

  describe('Test all example Phyx files', function () {
    const examples = fs.readdirSync(path.resolve(__dirname, './examples'));
    const jsonlds = examples.filter(filename => filename.toLowerCase().endsWith('.json'));
    const ajv = new Ajv();
    const validator = ajv.compile(
      JSON.parse(
        fs.readFileSync(
          path.resolve(__dirname, '../docs/context/development/schema.json')
        )
      )
    );

    jsonlds.forEach((filename) => {
      describe(`Example file ${filename}`, function () {
        it('should validate against our JSON schema', function () {
          const phyxContent = JSON.parse(
            fs.readFileSync(
              path.resolve(__dirname, `./examples/correct/${filename}`)
            )
          );
          const valid = validator(phyxContent);
          expect(validator.errors).to.be.null;
          expect(valid).to.be.true;
        });
      });
    });
  });
});
