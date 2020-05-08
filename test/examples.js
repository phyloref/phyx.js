/*
 * Test conversion on example files.
 */

const fs = require('fs');
const path = require('path');

const jsonld = require('jsonld');

const chai = require('chai');

const phyx = require('../src');

const expect = chai.expect;

/**
 * Test whether conversion of Phyx files to an OWL ontology occurs predictably.
 */

describe('PhyxWrapper', function () {
  describe('convert brochu_2003.json to an OWL ontology', function () {
    const jsonFilename = path.resolve(__dirname, './examples/brochu_2003.json');
    const jsonldFilename = path.resolve(__dirname, './examples/brochu_2003.jsonld');

    let brochu2003;

    it('should be able to load brochu_2003.json', function () {
      brochu2003 = JSON.parse(fs.readFileSync(jsonFilename));
      expect(brochu2003).to.be.an('object');
    });

    let brochu2003owl;
    it('should be able to convert brochu_2003.json to an OWL Ontology', function () {
      this.timeout(10000);
      brochu2003owl = new phyx.PhyxWrapper(brochu2003).asOWLOntology('http://example.org/brochu_2003.json');
      // fs.writeFileSync(jsonldFilename, JSON.stringify(brochu2003owl, null, 2));
      expect(brochu2003owl).to.be.an('object');
    });

    it('should generate the same OWL ontology as it generated earlier', function () {
      const expectedBrochu2003 = JSON.parse(fs.readFileSync(jsonldFilename));
      expect(brochu2003owl).to.be.deep.equal(expectedBrochu2003);
    });
  });
  describe('convert brochu_2003.jsonld to n-quads', function () {
    const jsonldFilename = path.resolve(__dirname, './examples/brochu_2003.jsonld');
    const nqFilename = path.resolve(__dirname, './examples/brochu_2003.nq');

    let brochu2003jsonld;

    it('should be able to load brochu_2003.jsonld', function () {
      brochu2003jsonld = JSON.parse(fs.readFileSync(jsonldFilename));
      expect(brochu2003jsonld).to.be.an('object');
    });

    let context;
    it('should be able to load the current context file (v0.3.0)', function () {
      context = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../docs/context/v0.3.0/phyx.json')));
      expect(context).to.be.an('object');
    });

    let brochu2003nq;
    it('should be able to convert brochu_2003.jsonld to n-quads', function () {
      this.timeout(10000);
      // Replace the @context on the fly.
      brochu2003jsonld['@context'] = context['@context'];
      return jsonld.toRDF(brochu2003jsonld, { format: 'application/n-quads' }).then((rdf) => {
        brochu2003nq = rdf;
        // fs.writeFileSync(nqFilename, brochu2003nq);
        expect(brochu2003nq).to.be.a('string');
      });
    });

    it('should generate the same n-quads ontology as it generated earlier', function () {
      const expectedBrochu2003nq = fs.readFileSync(nqFilename).toString();
      expect(brochu2003nq).to.be.deep.equal(expectedBrochu2003nq);
    });
  });
});
