/*
 * Test taxonomic unit construction and matching.
 */

const chai = require('chai');
const phyx = require('../src');

// Use Chai's expect API.
const expect = chai.expect;

// Some constants.
const NOMEN_CODE_UNKNOWN = 'http://purl.obolibrary.org/obo/NOMEN_0000036';

/*
 * We primarily test two classes here:
 *  - TaxonomicUnitWrapper, which wraps a taxonomic unit and determines if it
 *    refers to a scientific name, specimen identifier or external reference,
 *    or a combination of these.
 *  - TaxonomicUnitMatcher, which accepts two taxonomic units and determines
 *    whether and for what reason the two can be matched.
 */

describe('TaxonomicUnitWrapper', function () {
  describe('#constructor given no arguments', function () {
    it('should create an empty TaxonomicUnitWrapper without a defined label', function () {
      // Empty TU without @type.
      let wrapper = new phyx.TaxonomicUnitWrapper({});
      expect(wrapper).to.be.instanceOf(phyx.TaxonomicUnitWrapper);
      expect(wrapper.label).to.be.undefined;

      // Empty TU with type TYPE_TAXON_CONCEPT.
      wrapper = new phyx.TaxonomicUnitWrapper({
        '@type': phyx.TaxonomicUnitWrapper.TYPE_TAXON_CONCEPT,
      });
      expect(wrapper).to.be.instanceOf(phyx.TaxonomicUnitWrapper);
      expect(wrapper.label).to.be.undefined;

      // Empty TU with type TYPE_SPECIMEN.
      wrapper = new phyx.TaxonomicUnitWrapper({
        '@type': phyx.TaxonomicUnitWrapper.TYPE_SPECIMEN,
      });
      expect(wrapper).to.be.instanceOf(phyx.TaxonomicUnitWrapper);
      expect(wrapper.label).to.be.undefined;

      // Empty TU with type TYPE_SPECIMEN and a taxonomic name.
      wrapper = new phyx.TaxonomicUnitWrapper({
        '@type': phyx.TaxonomicUnitWrapper.TYPE_SPECIMEN,
        nameString: 'Taxonomic name',
      });
      expect(wrapper).to.be.instanceOf(phyx.TaxonomicUnitWrapper);
      expect(wrapper.label).to.be.undefined;
    });
  });
  describe('#label given a taxonomic unit', function () {
    it('should return a wrapped scientific name', function () {
      const wrapper = new phyx.TaxonomicUnitWrapper({
        '@type': phyx.TaxonomicUnitWrapper.TYPE_TAXON_CONCEPT,
        hasName: {
          label: 'Ornithorhynchus anatinus (Shaw, 1799)',
          nameComplete: 'Ornithorhynchus anatinus',
        },
      });
      expect(wrapper.label).to.equal('Ornithorhynchus anatinus (Shaw, 1799)');
    });
    it('should return a wrapped specimen identifier preceded by "Specimen"', function () {
      const wrapper = new phyx.TaxonomicUnitWrapper({
        '@type': phyx.TaxonomicUnitWrapper.TYPE_SPECIMEN,
        occurrenceID: 'MVZ 225749',
      });
      expect(wrapper.label).to.equal('Specimen MVZ 225749');
    });
    it('should return specimens with an occurrenceID as well as a taxon concept', function () {
      const wrapper = new phyx.TaxonomicUnitWrapper({
        '@type': [
          phyx.TaxonomicUnitWrapper.TYPE_SPECIMEN,
        ],
        nameString: 'Rana luteiventris',
        occurrenceID: 'MVZ 225749',
      });
      expect(wrapper.label).to.equal('Specimen MVZ 225749 identified as Rana luteiventris');
    });
    it('should ignore occurrence ID if typed as a taxon concept', function () {
      const wrapper = new phyx.TaxonomicUnitWrapper({
        '@type': phyx.TaxonomicUnitWrapper.TYPE_TAXON_CONCEPT,
        nameString: 'Rana luteiventris',
        occurrenceID: 'MVZ 225749',
      });
      expect(wrapper.label).to.equal('Rana luteiventris');
    });
    it('should return a wrapped external reference by surrounding it with "<>"', function () {
      const wrapper = new phyx.TaxonomicUnitWrapper({
        '@id': [
          'http://arctos.database.museum/guid/MVZ:Herp:225749',
        ],
      });
      expect(wrapper.label).to.equal('<http://arctos.database.museum/guid/MVZ:Herp:225749>');
    });
    it('should provide both taxon name and occurrence ID in label, but ignore external reference', function () {
      const wrapper = new phyx.TaxonomicUnitWrapper({
        '@id': [
          'http://arctos.database.museum/guid/MVZ:Herp:225749',
        ],
        '@type': phyx.TaxonomicUnitWrapper.TYPE_SPECIMEN,
        nameString: 'Rana luteiventris',
        occurrenceID: 'MVZ 225749',
      });
      expect(wrapper.label).to.equal('Specimen MVZ 225749 identified as Rana luteiventris');
    });
  });
  describe('#fromLabel', function () {
    it('should return empty lists when inputs are empty or undefined', function () {
      expect(phyx.TaxonomicUnitWrapper.fromLabel()).to.be.undefined;
      expect(phyx.TaxonomicUnitWrapper.fromLabel(undefined)).to.be.undefined;
      expect(phyx.TaxonomicUnitWrapper.fromLabel(null)).to.be.undefined;
      expect(phyx.TaxonomicUnitWrapper.fromLabel('')).to.be.undefined;
      expect(phyx.TaxonomicUnitWrapper.fromLabel('    ')).to.be.undefined;
    });
    it('when given a scientific name, it should return a list of a single TU wrapping a scientific name', function () {
      expect(phyx.TaxonomicUnitWrapper.fromLabel('Rana luteiventris MVZ225749'))
        .to.be.deep.equal({
          '@type': 'http://rs.tdwg.org/ontology/voc/TaxonConcept#TaxonConcept',
          label: 'Rana luteiventris MVZ225749',
          hasName: {
            '@type': 'http://rs.tdwg.org/ontology/voc/TaxonName#TaxonName',
            nomenclaturalCode: 'http://purl.obolibrary.org/obo/NOMEN_0000036',
            label: 'Rana luteiventris MVZ225749',
            genusPart: 'Rana',
            specificEpithet: 'luteiventris',
            nameComplete: 'Rana luteiventris',
          },
        });
    });
    it('when given a scientific name separated with underscores, it should return a list of a single TU wrapping the scientific name', function () {
      expect(phyx.TaxonomicUnitWrapper.fromLabel('Rana_luteiventris_MVZ_225749'))
        .to.be.deep.equal({
          '@type': 'http://rs.tdwg.org/ontology/voc/TaxonConcept#TaxonConcept',
          label: 'Rana_luteiventris_MVZ_225749',
          hasName: {
            '@type': 'http://rs.tdwg.org/ontology/voc/TaxonName#TaxonName',
            label: 'Rana_luteiventris_MVZ_225749',
            nomenclaturalCode: 'http://purl.obolibrary.org/obo/NOMEN_0000036',
            nameComplete: 'Rana luteiventris',
            genusPart: 'Rana',
            specificEpithet: 'luteiventris',
          },
        });
    });
  });
  describe('#asOWLEquivClass', function () {
    it('when given a taxon concept, only the complete name should be present in the equivClass', function () {
      const wrapper = new phyx.TaxonomicUnitWrapper({
        '@type': phyx.TaxonomicUnitWrapper.TYPE_TAXON_CONCEPT,
        nameString: 'Rana luteiventris Thompson, 1913',
      });
      expect(wrapper.asOWLEquivClass).to.deep.equal({
        '@type': 'owl:Restriction',
        onProperty: 'http://rs.tdwg.org/ontology/voc/TaxonConcept#hasName',
        someValuesFrom: {
          '@type': 'owl:Class',
          intersectionOf: [{
            '@type': 'owl:Restriction',
            onProperty: 'http://rs.tdwg.org/ontology/voc/TaxonName#nameComplete',
            hasValue: 'Rana luteiventris',
          }, {
            '@type': 'owl:Restriction',
            hasValue: NOMEN_CODE_UNKNOWN,
            onProperty: 'http://rs.tdwg.org/ontology/voc/TaxonName#nomenclaturalCode',
          }],
        },
      });
    });
    it('when given a specimen, only the occurrence ID should be present in the equivClass', function () {
      const wrapper = new phyx.TaxonomicUnitWrapper({
        '@type': phyx.TaxonomicUnitWrapper.TYPE_SPECIMEN,
        nameString: 'Rana luteiventris',
        occurrenceID: 'MVZ 225749',
      });
      expect(wrapper.asOWLEquivClass).to.deep.equal({
        '@type': 'owl:Restriction',
        onProperty: 'http://rs.tdwg.org/dwc/terms/occurrenceID',
        hasValue: 'MVZ 225749',
      });
    });
  });
});

describe('TaxonomicUnitMatcher', function () {
  // To test matching, let's set up some taxonomic units.
  // Note that:
  //  tunit1 and tunit2 should match by scientific name.
  //  tunit2 and tunit3 should match by specimen identifier.
  //  tunit3 and tunit4 should match by external references.
  const tunit1 = {
    '@type': phyx.TaxonomicUnitWrapper.TYPE_TAXON_CONCEPT,
    hasName: {
      nameComplete: 'Rana luteiventris',
    },
  };
  const tunit2 = {
    '@type': [
      phyx.TaxonomicUnitWrapper.TYPE_SPECIMEN,
    ],
    nameString: 'Rana luteiventris MVZ225749',
    occurrenceID: 'MVZ225749',
  };
  const tunit3 = {
    '@type': phyx.TaxonomicUnitWrapper.TYPE_SPECIMEN,
    occurrenceID: 'MVZ225749',
    '@id': 'http://arctos.database.museum/guid/MVZ:Herp:225749',
  };
  const tunit4 = {
    '@id': 'http://arctos.database.museum/guid/MVZ:Herp:225749',
  };

  describe('#matchByNameComplete', function () {
    it('should be able to match tunit1 and tunit2 by complete name', function () {
      expect(new phyx.TaxonomicUnitMatcher(tunit1, tunit2).matchByExternalReferences()).to.be.false;
      expect(new phyx.TaxonomicUnitMatcher(tunit1, tunit2).matchByOccurrenceID()).to.be.false;
      expect(new phyx.TaxonomicUnitMatcher(tunit1, tunit2).matchByNameComplete()).to.be.true;
    });
  });
  describe('#matchByExternalReferences', function () {
    it('should be able to match tunit3 and tunit4 by external references', function () {
      expect(new phyx.TaxonomicUnitMatcher(tunit3, tunit4).matchByExternalReferences()).to.be.true;
      expect(new phyx.TaxonomicUnitMatcher(tunit3, tunit4).matchByOccurrenceID()).to.be.false;
      expect(new phyx.TaxonomicUnitMatcher(tunit3, tunit4).matchByNameComplete()).to.be.false;
    });
  });
  describe('#matchByOccurrenceID', function () {
    it('should be able to match tunit2 and tunit3 by specimen identifiers', function () {
      expect(new phyx.TaxonomicUnitMatcher(tunit2, tunit3).matchByExternalReferences()).to.be.false;
      expect(new phyx.TaxonomicUnitMatcher(tunit2, tunit3).matchByOccurrenceID()).to.be.true;
      expect(new phyx.TaxonomicUnitMatcher(tunit2, tunit3).matchByNameComplete()).to.be.false;
    });
  });
  describe('#matched and #matchReason', function () {
    it('should match tunit1 and tunit2 on the basis of identical complete names', function () {
      const matcher = new phyx.TaxonomicUnitMatcher(tunit1, tunit2);
      expect(matcher.matched).to.be.true;
      expect(matcher.matchReason).to.include('share the same complete name');
    });

    it('should match tunit3 and tunit4 by identical external reference', function () {
      const matcher = new phyx.TaxonomicUnitMatcher(tunit3, tunit4);
      expect(matcher.matched).to.be.true;
      expect(matcher.matchReason).to.include('External reference');
    });

    it('should match tunit2 and tunit3 by identical specimen identifier', function () {
      const matcher = new phyx.TaxonomicUnitMatcher(tunit2, tunit3);
      expect(matcher.matched).to.be.true;
      expect(matcher.matchReason).to.include('Specimen identifier');
    });
  });
});
