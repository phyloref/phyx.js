/*
 * Test nomenclatural code lookups and fallback behavior. While most of the
 * nomenclatural code logic is in TaxonNameWrapper, we need to provide fallback
 * nomenclatural codes in TaxonConceptWrapper, TaxonomicUnitWrapper and
 * PhylorefWrapper as well. This test file makes sure that this functionality
 * works correctly at all of these levels.
 */

const fs = require('fs');
const path = require('path');

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

      nomenCodes.forEach(nomenCode => {
        expect(nomenCode).to.have.all.keys(EXPECTED_NOMEN_DETAIL_FIELDS);
      })
    });
  });

  describe('#getNomenCodeDetails', function () {
    it('should provide details for some built-in codes', function () {
      const codesToTest = {
        'Code not known': owlterms.UNKNOWN_CODE,
        'ICZN': owlterms.ICZN_CODE,
        'ICN': owlterms.ICN_CODE,
        'ICNP': owlterms.ICNP_CODE,
        'ICTV': owlterms.ICTV_CODE,
        'ICNCP': owlterms.ICNCP_CODE,
      };

      Object.keys(codesToTest).forEach(code => {
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

/*
 * There are two ways in which nomenclatural codes can be set at the Phyx level:
 *  (1) If there is a `defaultNomenclaturalCodeIRI` field at the Phyx level,
 *      that will be used to provide a nomenclatural code for all specifiers
 *      without a nomenclatural code as well as for all the phylogeny nodes.
 *  (2) If no `defaultNomenclaturalCodeIRI` is provided, but all the specifiers
 *      on all the phylorefs in the file have the same nomenclatural code, then
 *      that code will be used on all the phylogeny nodes.
 */
describe('PhyxWrapper', function () {
  it('should use the defaultNomenclaturalCodeIRI for phylogeny nodes', function () {
    // The examples/correct/alligatoridae_default_nomen_code.json file has
    // a `defaultNomenclaturalCodeIRI`.
    const json = JSON.parse(fs.readFileSync(
      path.resolve(__dirname, './examples/correct/alligatoridae_default_nomen_code.json')
    ));

    // Make sure this is the right example file.
    expect(json, 'Expected alligatoridae_default_nomen_code.json to include a defaultNomenclaturalCodeIRI value.')
      .to.include.key('defaultNomenclaturalCodeIRI');
    const defaultNomenclaturalCodeIRI = json.defaultNomenclaturalCodeIRI;

    const jsonld = new phyx.PhyxWrapper(json).asOWLOntology();
    expect(jsonld).to.include.key('phylogenies');
    expect(jsonld.phylogenies).to.be.an('array').with.length(1);

    const phylogeny1 = jsonld.phylogenies[0];
    expect(phylogeny1).to.include.key('nodes');

    phylogeny1.nodes.forEach(node => {
      const nodeType = node['rdf:type'];

      // There should be at least one type definition: obo:CDAO_0000140.
      expect(nodeType[0]).to.deep.equal({
        "@id": "obo:CDAO_0000140"
      });

      // The second type definition -- if it exists -- must be a name entry,
      // which should include the appropriate nomenclatural code.
      if (nodeType.length > 1) {
        const nameEntry = nodeType[1];
        expect(nameEntry.someValuesFrom.someValuesFrom.intersectionOf).to.deep.include(
          {
            "@type": "owl:Restriction",
            "onProperty": "http://rs.tdwg.org/ontology/voc/TaxonName#nomenclaturalCode",
            "hasValue": {
              "@id": defaultNomenclaturalCodeIRI
            }
          }
        );
      }
    });
  });

  it('should use the inferred nomenclatural code for phylogeny nodes', function () {
    // The examples/correct/alligatoridae_inferred_nomen_code.json file does not have
    // a `defaultNomenclaturalCodeIRI`, but the nomenclatural code can be inferred from
    // its specifiers.
    const json = JSON.parse(fs.readFileSync(
      path.resolve(__dirname, './examples/correct/alligatoridae_inferred_nomen_code.json')
    ));

    // Make sure this is the right example file.
    expect(json, 'Expected alligatoridae_inferred_nomen_code.json to not include a defaultNomenclaturalCodeIRI value.')
      .to.not.include.key('defaultNomenclaturalCodeIRI');

    const wrapped = new phyx.PhyxWrapper(json);
    const inferredNomenCode = wrapped.defaultNomenCode;
    expect(inferredNomenCode).to.equal(owlterms.ICZN_CODE);

    const jsonld = wrapped.asOWLOntology();
    expect(jsonld).to.include.key('phylogenies');
    expect(jsonld.phylogenies).to.be.an('array').with.length(1);

    const phylogeny1 = jsonld.phylogenies[0];
    expect(phylogeny1).to.include.key('nodes');

    phylogeny1.nodes.forEach(node => {
      const nodeType = node['rdf:type'];

      // There should be at least one type definition: obo:CDAO_0000140.
      expect(nodeType[0]).to.deep.equal({
        "@id": "obo:CDAO_0000140"
      });

      // The second type definition -- if it exists -- must be a name entry,
      // which should include the appropriate nomenclatural code.
      if (nodeType.length > 1) {
        const nameEntry = nodeType[1];
        expect(nameEntry.someValuesFrom.someValuesFrom.intersectionOf).to.deep.include(
          {
            "@type": "owl:Restriction",
            "onProperty": "http://rs.tdwg.org/ontology/voc/TaxonName#nomenclaturalCode",
            "hasValue": {
              "@id": inferredNomenCode
            }
          }
        );
      }
    });
  });
});
