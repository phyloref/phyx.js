/*
 * Test phyloreferences.
 */

// Require phyx.js, our PHYX library, and Chai for testing.
const chai = require('chai');
const phyx = require('../src');

// Use owlterms so we don't have to repeat OWL terms.
const owlterms = require('../src/utils/owlterms');

// We use Chai's Expect API.
const expect = chai.expect;

/*
 * Phyloref tests cover three aspects of phyloreferences:
 *  - Whether we can create a phyloref with a particular set of specifiers,
 *    and whether we can correctly change the type of a specifer (from 'External'
 *    to 'Internal'), delete specifiers, and retrieve specifier labels.
 *  - Whether we can determine to which node a phyloref is expected to resolve to
 *    by using additionalNodeProperties.
 *  - Whether we can update the phyloref's status several times and retrieve the
 *    full history of its status changes.
 */

describe('PhylorefWrapper', function () {
  // Nomenclatural codes.
  const NOMEN_CODE_UNKNOWN = 'http://purl.obolibrary.org/obo/NOMEN_0000036';
  const NOMEN_CODE_ICZN = 'http://purl.obolibrary.org/obo/NOMEN_0000107';

  // Some specifiers to use in testing.
  const specifier1 = {
    '@type': phyx.TaxonomicUnitWrapper.TYPE_SPECIMEN,
    occurrenceID: 'MVZ:225749',
  };
  const specifier2 = {
    '@type': phyx.TaxonomicUnitWrapper.TYPE_SPECIMEN,
    occurrenceID: 'MVZ:191016',
  };
  const specifier3 = {
    '@type': phyx.TaxonomicUnitWrapper.TYPE_TAXON_CONCEPT,
    hasName: {
      '@type': phyx.TaxonNameWrapper.TYPE_TAXON_NAME,
      nomenclaturalCode: owlterms.ICZN_NAME,
      nameComplete: 'Rana boylii',
    },
  };

  describe('given an empty phyloreference', function () {
    const wrapper = new phyx.PhylorefWrapper({});

    describe('#constructor', function () {
      it('should return a PhylorefWrapper', function () {
        expect(wrapper).to.be.an.instanceOf(phyx.PhylorefWrapper);
      });
    });

    describe('#label', function () {
      it('should return undefined', function () {
        expect(wrapper.label).to.be.undefined;
      });

      it('should be settable by assigning to .label', function () {
        wrapper.label = 'phyloref1';
        expect(wrapper.label).equals('phyloref1');
      });
    });

    describe('#specifiers', function () {
      it('should initially return an empty list', function () {
        expect(wrapper.specifiers).to.be.empty;
      });

      it('should initially return a nomenclatural code of unknown', function () {
        expect(wrapper.nomenCode).to.equal(NOMEN_CODE_UNKNOWN);
      });

      describe('when a new external specifier is added using .externalSpecifiers', function () {
        it('should return a list with the new specifier', function () {
          wrapper.externalSpecifiers.push(specifier3);
          expect(wrapper.specifiers).to.deep.equal([specifier3]);
        });

        it('should return a nomenclatural code of ICZN', function () {
          expect(wrapper.nomenCode).to.equal(NOMEN_CODE_ICZN);
        });
      });

      describe('when a new external specifier is added using .externalSpecifiers', function () {
        it('should return a list with the new specifier', function () {
          wrapper.externalSpecifiers.push(specifier2);
          expect(wrapper.specifiers).to.deep.equal([specifier3, specifier2]);
        });

        it('should return a nomenclatural code of unknown', function () {
          expect(wrapper.nomenCode).to.equal(NOMEN_CODE_UNKNOWN);
        });
      });

      describe('when a specifier is deleted using .deleteSpecifier', function () {
        it('should return the updated list', function () {
          wrapper.deleteSpecifier(specifier2);
          expect(wrapper.specifiers).to.deep.equal([specifier3]);
        });
      });

      describe('when a specifier is added using .externalSpecifiers', function () {
        it('should return the updated list', function () {
          wrapper.externalSpecifiers.push(specifier1);
          expect(wrapper.specifiers).to.deep.equal([specifier3, specifier1]);
        });
      });

      describe('when a specifier is changed to an internal specifier using .setSpecifierType', function () {
        it('should remain in the list of specifiers', function () {
          wrapper.setSpecifierType(specifier1, 'Internal');
          expect(wrapper.specifiers).to.deep.equal([specifier1, specifier3]);
        });
      });

      describe('when a specifier is added using .internalSpecifiers', function () {
        it('should be included in the list of all specifiers', function () {
          wrapper.internalSpecifiers.push(specifier2);
          expect(wrapper.specifiers).to.deep.equal([specifier1, specifier2, specifier3]);
        });
      });
    });

    describe('#getSpecifierType', function () {
      it('should return the correct specifier type for each specifier', function () {
        expect(wrapper.getSpecifierType(specifier1)).to.equal('Internal');
        expect(wrapper.getSpecifierType(specifier2)).to.equal('Internal');
        expect(wrapper.getSpecifierType(specifier3)).to.equal('External');
      });
    });

    describe('#getSpecifierLabel as TaxonomicUnitWrapper', function () {
      it('should return the correct label for each specifier', function () {
        expect((new phyx.TaxonomicUnitWrapper(specifier1)).label).to.equal('Specimen MVZ:225749');
        expect((new phyx.TaxonomicUnitWrapper(specifier2)).label).to.equal('Specimen MVZ:191016');
        expect((new phyx.TaxonomicUnitWrapper(specifier3)).label).to.equal('Rana boylii');
      });
    });
  });

  describe('given a particular phylogeny', function () {
    // Some phylogenies to use in testing.
    const phylogeny1 = {
      newick: '((MVZ225749, MVZ191016)Test, "Rana boylii")',
      additionalNodeProperties: {
        Test: {
          expectedPhyloreferenceNamed: 'phyloref1',
        },
      },
    };

    describe('#getExpectedNodeLabels', function () {
      it('should be able to determine expected node labels for a phylogeny', function () {
        const phyloref1 = new phyx.PhylorefWrapper({
          label: 'phyloref1',
          internalSpecifiers: [specifier1, specifier2],
          externalSpecifiers: [specifier3],
        });

        expect(phyloref1.getExpectedNodeLabels(phylogeny1))
          .to.deep.equal(['Test']);
      });
    });
  });

  describe('given an empty phyloreference', function () {
    const wrapper = new phyx.PhylorefWrapper({});

    describe('#getCurrentStatus', function () {
      it('should return "pso:draft" as the default initial status', function () {
        // Initially, an empty phyloref should report a status of 'pso:draft'.
        expect(wrapper.getCurrentStatus().statusCURIE).to.equal('pso:draft');
      });
    });

    describe('#setStatus', function () {
      it('should throw an error if given a mistyped status', function () {
        expect(function () { wrapper.setStatus('pso:retracted-from_publication'); })
          .to.throw(
            TypeError,
            'setStatus() called with invalid status CURIE \'pso:retracted-from_publication\'',
            'PhylorefWrapper throws TypeError on a mistyped status'
          );
      });
    });

    describe('#getStatusChanges', function () {
      it('should return the empty list', function () {
        expect(wrapper.getStatusChanges()).to.be.empty;
      });

      describe('when modified by using .setStatus', function () {
        it('should return the updated list', function () {
          wrapper.setStatus('pso:final-draft');
          wrapper.setStatus('pso:under-review');
          wrapper.setStatus('pso:submitted');
          wrapper.setStatus('pso:published');
          wrapper.setStatus('pso:retracted-from-publication');

          // And see if we get the statuses back in the correct order.
          const statusChanges = wrapper.getStatusChanges();
          expect(statusChanges.length, 'number of status changes should be 5').to.equal(5);
          expect(statusChanges[0].statusCURIE, 'first status change should be "pso:final-draft"').to.equal('pso:final-draft');
          expect(statusChanges[1].statusCURIE, 'second status change should be "pso:under-review"').to.equal('pso:under-review');
          expect(statusChanges[2].statusCURIE, 'third status change should be a "pso:submitted"').to.equal('pso:submitted');
          expect(statusChanges[3].statusCURIE, 'fourth status change should be a "pso:published"').to.equal('pso:published');
          expect(statusChanges[4].statusCURIE, 'fifth status change should be a "pso:retracted-from-publication"').to.equal('pso:retracted-from-publication');
        });
      });
    });
  });

  describe('#asJSONLD', function () {
    it('should preserve an existing @id on input phylorefs', function () {
      const jsonld = new phyx.PhylorefWrapper({
        '@id': '#providedId',
        internalSpecifiers: [specifier1],
        externalSpecifiers: [specifier2],
      }).asJSONLD('#phyloref0');
      expect(jsonld).to.have.property('@id');
      expect(jsonld['@id']).to.equal('#providedId');
    });
    it('should generate a new @id on input phylorefs', function () {
      const jsonld = new phyx.PhylorefWrapper({
        internalSpecifiers: [specifier1],
        externalSpecifiers: [specifier2],
      }).asJSONLD('#phyloref0');
      expect(jsonld).to.have.property('@id');
      expect(jsonld['@id']).to.equal('#phyloref0');
    });
    it('should generate the expected equivClass expression for 1 int, 1 ext phyloref', function () {
      const jsonld = new phyx.PhylorefWrapper({
        internalSpecifiers: [specifier1],
        externalSpecifiers: [specifier2],
      }).asJSONLD('#');
      expect(jsonld).to.have.property('equivalentClass');
      expect(jsonld.equivalentClass).to.deep.equal({
        '@type': owlterms.OWL_CLASS,
        intersectionOf: [
          {
            '@type': owlterms.OWL_RESTRICTION,
            onProperty: owlterms.PHYLOREF_INCLUDES_TU,
            someValuesFrom: {
              '@type': owlterms.OWL_RESTRICTION,
              hasValue: 'MVZ:225749',
              onProperty: owlterms.DWC_OCCURRENCE_ID,
            },
          },
          {
            '@type': owlterms.OWL_RESTRICTION,
            onProperty: owlterms.PHYLOREF_EXCLUDES_TU,
            someValuesFrom: {
              '@type': owlterms.OWL_RESTRICTION,
              hasValue: 'MVZ:191016',
              onProperty: owlterms.DWC_OCCURRENCE_ID,
            },
          },
        ],
      });
    });

    it('should generate the expected equivClass expression for 2 int phyloref', function () {
      const jsonld = new phyx.PhylorefWrapper({
        internalSpecifiers: [specifier2, specifier3],
      }).asJSONLD('#');
      expect(jsonld).to.have.property('equivalentClass');
      expect(jsonld.equivalentClass).to.deep.equal({
        '@type': owlterms.OWL_RESTRICTION,
        onProperty: owlterms.CDAO_HAS_CHILD,
        someValuesFrom: {
          '@type': owlterms.OWL_CLASS,
          intersectionOf: [
            {
              '@type': owlterms.OWL_RESTRICTION,
              onProperty: owlterms.PHYLOREF_EXCLUDES_TU,
              someValuesFrom: {
                '@type': owlterms.OWL_RESTRICTION,
                hasValue: 'MVZ:191016',
                onProperty: owlterms.DWC_OCCURRENCE_ID,
              },
            },
            {
              '@type': owlterms.OWL_RESTRICTION,
              onProperty: owlterms.PHYLOREF_INCLUDES_TU,
              someValuesFrom: {
                '@type': owlterms.OWL_RESTRICTION,
                onProperty: owlterms.TDWG_VOC_HAS_NAME,
                someValuesFrom: {
                  '@type': owlterms.OWL_CLASS,
                  intersectionOf: [{
                    '@type': owlterms.OWL_RESTRICTION,
                    hasValue: 'Rana boylii',
                    onProperty: owlterms.TDWG_VOC_NAME_COMPLETE,
                  }, {
                    '@type': owlterms.OWL_RESTRICTION,
                    hasValue: owlterms.ICZN_NAME,
                    onProperty: owlterms.NOMENCLATURAL_CODE,
                  }],
                },
              },
            },
          ],
        },
      });
    });
  });
});
