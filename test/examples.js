/*
 * Test conversion on example files.
 */

const fs = require('fs');
const path = require('path');

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
      brochu2003owl = new phyx.PhyxWrapper(brochu2003).asOWLOntology('http://example.org/brochu_2003.json#');
      // fs.writeFileSync(jsonldFilename, JSON.stringify(brochu2003owl, null, 2));
      expect(brochu2003owl).to.be.an('object');
    });

    it('should generate the same OWL ontology as it generated earlier', function () {
      const expectedBrochu2003 = JSON.parse(fs.readFileSync(jsonldFilename));
      expect(brochu2003owl).to.be.deep.equal(expectedBrochu2003);
    });
  });
});
