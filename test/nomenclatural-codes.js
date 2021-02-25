/*
 * Test nomenclatural code lookups and fallback behavior. While most of the
 * nomenclatural code logic is in TaxonNameWrapper, we need to provide fallback
 * nomenclatural codes in TaxonConceptWrapper, TaxonomicUnitWrapper and
 * PhylorefWrapper as well. This test file makes sure that this functionality
 * works correctly at all of these levels.
 */

const { cloneDeep } = require('lodash');

const chai = require('chai');
const phyx = require('../src');
const owlterms = require('../src/utils/owlterms');

// Use Chai's expect API.
const expect = chai.expect;

/* The list of expected fields in nomenclatural details. */
const EXPECTED_NOMEN_DETAIL_FIELDS = ['iri', 'shortName', 'label', 'title'];

/* Some example taxon names to use. */
const ranaLuteiventris = {
  '@type': [
    phyx.TaxonomicUnitWrapper.TYPE_TAXON_CONCEPT,
    phyx.TaxonomicUnitWrapper.TYPE_SPECIMEN,
  ],
  hasName: {
    label: 'Rana luteiventris',
  },
  occurrenceID: 'MVZ 225749',
};

/*
 * The nomenclatural codes are set up in TaxonNameWrapper, so that's where
 * most of the nomenclatural code behavior code exists.
 */
describe('TaxonNameWrapper', function () {
  describe('#getNomenclaturalCodes', function () {
    it('should provide a non-empty list with the expected keys', function () {
      const nomenCodes = phyx.TaxonNameWrapper.getNomenclaturalCodes();

      expect(nomenCodes)
        .to.be.an('array')
        .that.is.not.empty;

      nomenCodes.forEach((nomenCode) => {
        expect(nomenCode).to.have.all.keys(EXPECTED_NOMEN_DETAIL_FIELDS);
      });
    });
  });

  describe('#getNomenCodeDetails', function () {
    it('should provide details for some built-in codes', function () {
      const codesToTest = {
        'Code not known': owlterms.UNKNOWN_CODE,
        ICZN: owlterms.ICZN_CODE,
        ICN: owlterms.ICN_CODE,
        ICNP: owlterms.ICNP_CODE,
        ICTV: owlterms.ICTV_CODE,
        ICNCP: owlterms.ICNCP_CODE,
      };

      Object.keys(codesToTest).forEach((code) => {
        const uri = codesToTest[code];
        const details = phyx.TaxonNameWrapper.getNomenCodeDetails(uri);
        expect(details).to.have.all.keys(EXPECTED_NOMEN_DETAIL_FIELDS);
        expect(details.shortName).to.equal(code);
      });
    });
  });

  describe('#nomenclaturalCodeDetails', function () {
    it('should provide nomenclatural code details for an example taxon name', function () {
      const wrapper = new phyx.TaxonNameWrapper(ranaLuteiventris.hasName);
      expect(wrapper.nomenclaturalCode).to.equal(owlterms.UNKNOWN_CODE);
      expect(wrapper.nomenclaturalCodeDetails.shortName).to.equal('Code not known');

      const wrapperWithDefault = new phyx.TaxonNameWrapper(
        ranaLuteiventris.hasName,
        owlterms.ICZN_CODE
      );
      expect(wrapperWithDefault.nomenclaturalCode).to.equal(owlterms.ICZN_CODE);
      expect(wrapperWithDefault.nomenclaturalCodeDetails.shortName).to.equal('ICZN');

      const nameWithNomenCode = cloneDeep(ranaLuteiventris.hasName);
      nameWithNomenCode.nomenclaturalCode = owlterms.ICZN_CODE;
      const wrapperWithExplicit = new phyx.TaxonNameWrapper(nameWithNomenCode, owlterms.ICN_CODE);
      expect(wrapperWithExplicit.nomenclaturalCode).to.equal(owlterms.ICZN_CODE);
      expect(wrapperWithExplicit.nomenclaturalCodeDetails.shortName).to.equal('ICZN');
    });
  });
});

/*
 * Make sure we can set a default nomenclatural code in TaxonConceptWrapper.
 */
describe('TaxonConceptWrapper', function () {
  describe('#nomenCode', function () {
    const wrapper = new phyx.TaxonConceptWrapper(ranaLuteiventris);

    it('should return UNKNOWN_CODE if one is not set', function () {
      expect(wrapper.nomenCode).to.equal(owlterms.UNKNOWN_CODE);
    });

    it('should return the default nomenclatural code if one is provided', function () {
      const wrapperWithDefault = new phyx.TaxonConceptWrapper(ranaLuteiventris, owlterms.ICZN_CODE);
      expect(wrapperWithDefault.nomenCode).to.equal(owlterms.ICZN_CODE);
      expect(wrapperWithDefault.nomenCodeDetails.shortName).to.equal('ICZN');
    });
  });
});
