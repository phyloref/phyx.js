/*
 * Test generation of RDF without a base IRI.
 */

const fs = require('fs');
const path = require('path');

const chai = require('chai');
const phyx = require('../src');

const expect = chai.expect;

/**
 * Test whether conversion of Phyx files to an OWL ontology in RDF works even without a baseIRI.
 * This was an issue in https://github.com/phyloref/phyx.js/issues/113
 */

describe('PhyxWrapper', function () {
  describe('toRDF() without baseIRI', function () {
    const examples = fs.readdirSync(path.resolve(__dirname, './examples/correct'))
      .filter(filename => filename.endsWith('.json'));

    examples.forEach((example) => {
      const basename = path.resolve(__dirname, './examples/correct', path.parse(example).name);
      const jsonFilename = `${basename}.json`;

      let json;

      describe(`Test file '${example}'`, function () {
        it('should be loadable', function () {
          json = JSON.parse(fs.readFileSync(jsonFilename));
          expect(json).to.be.an('object');
        });

        it('should be convertible to n-Quads without a baseIRI', function () {
          this.timeout(10000);
          return new phyx.PhyxWrapper(json).toRDF('', path.resolve(__dirname, 'examples', 'correct'))
            .then((nquads) => {
              expect(nquads).to.not.be.empty;
              expect(nquads).to.contain('http://ontology.phyloref.org/phyloref.owl#Phyloreference');
              expect(nquads).to.contain('http://ontology.phyloref.org/phyloref.owl#newick_expression');
            });
        });
      });
    });
  });
});
