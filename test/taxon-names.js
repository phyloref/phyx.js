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
    it('should be able to parse uninomial names as genus names without a specific epithet', function () {
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
    it('should ignore authority after a binomial name', function () {
      const wrapper = new phyx.TaxonNameWrapper({
        nameComplete: 'Mus musculus Linnaeus, 1758',
      });

      expect(wrapper.genusPart).to.equal('Mus');
      expect(wrapper.specificEpithet).to.equal('musculus');
    });
  });
});
