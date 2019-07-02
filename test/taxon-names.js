/*
 * Test taxon name processing.
 */

const chai = require('chai');
const phyx = require('../src');

const expect = chai.expect;

/*
 * Test whether TaxonNameWrapper parses taxon names correctly.
 */

describe('TaxonNameWrapper', function () {
  describe('#constructor', function () {
    it('should accept empty taxon names without errors', function () {
      const wrapper = new phyx.TaxonNameWrapper({});

      expect(wrapper).to.be.an.instanceOf(phyx.TaxonNameWrapper);
      expect(wrapper.nameComplete).to.be.undefined;
    });
    it('should be able to parse uninomial names as such', function () {
      const wrapper = new phyx.TaxonNameWrapper({
        nameComplete: 'Mus',
      });

      expect(wrapper.uninomial).to.equal('Mus');
      expect(wrapper.genusPart).to.be.undefined;
      expect(wrapper.specificEpithet).to.be.undefined;
    });
    it('should be able to parse binomial names into genus and specific epithet', function () {
      const wrapper = new phyx.TaxonNameWrapper({
        nameComplete: 'Mus musculus',
      });

      expect(wrapper.genusPart).to.equal('Mus');
      expect(wrapper.specificEpithet).to.equal('musculus');
    });
    it('should be able to parse trinomial names into genus, specific epithet and infraspecific epithet', function () {
      const wrapper = new phyx.TaxonNameWrapper({
        nameComplete: 'Mus musculus domesticus',
      });

      expect(wrapper.genusPart).to.equal('Mus');
      expect(wrapper.specificEpithet).to.equal('musculus');
      expect(wrapper.infraspecificEpithet).to.equal('domesticus');
    });
    it('should ignore authority after a binomial name', function () {
      const taxonName = phyx.TaxonNameWrapper.fromVerbatimName('Mus musculus Linnaeus, 1758');
      expect(taxonName.nameComplete).to.equal('Mus musculus');
      expect(taxonName.genusPart).to.equal('Mus');
      expect(taxonName.specificEpithet).to.equal('musculus');
      expect(taxonName.infraspecificEpithet).to.be.undefined;
      expect(taxonName.uninomial).to.be.undefined;
    });
  });
});
