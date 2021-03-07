/*
 * Test phylogenies.
 */

// Load phyx.js, our PHYX library, and chai for testing.
const chai = require('chai');
const phyx = require('../src');

// Make it easier to access owlterms.
const owlterms = require('../src/utils/owlterms');

// Use Chai's expect API for testing.
const expect = chai.expect;

/*
 * These tests focus on three aspects of PhylogenyWrapper:
 *  - Whether it can detect errors in an input Newick string.
 *  - Retrieve taxonomic units from the phylogeny based on either their node label
 *    or on the additional properties associated with the phylogeny.
 *  - Whether we can match specifiers with nodes on the phylogeny if they share
 *    taxonomic units that match.
 */

describe('PhylogenyWrapper', function () {
  describe('#constructor', function () {
    describe('when used to wrap an empty object', function () {
      it('should return a PhylogenyWrapper object', function () {
        expect(new phyx.PhylogenyWrapper({}))
          .to.be.an.instanceOf(phyx.PhylogenyWrapper);
      });
    });
  });

  describe('#getErrorsInNewickString', function () {
    describe('when given a correct Newick string', function () {
      const correctNewickStrings = [
        '(A:3, B:5, (C:6, N:7));',
      ];

      it('should return an empty list of errors', function () {
        correctNewickStrings.forEach((str) => {
          expect(phyx.PhylogenyWrapper.getErrorsInNewickString(str)).to.be.empty;
        });
      });
    });

    describe('when given an empty Newick string', function () {
      const emptyNewickStrings = [
        '()',
        '();  ',
      ];

      it('should return a single "No phylogeny entered" error', function () {
        emptyNewickStrings.forEach((newick) => {
          const errors = phyx.PhylogenyWrapper.getErrorsInNewickString(newick);
          expect(errors).to.have.length(1);
          expect(errors[0].title).to.equal('No phylogeny entered');
        });
      });
    });

    describe('when given an unbalanced Newick string', function () {
      const unbalancedNewickString = [
        {
          newick: '(A, B))',
          expected: 'You have 1 too few open parentheses',
        },
        {
          newick: '(A, (B, (C, D))',
          expected: 'You have 1 too many open parentheses',
        },
        {
          newick: '(A, (B, (C, (((D))',
          expected: 'You have 4 too many open parentheses',
        },
      ];

      it('should report how many parentheses are missing', function () {
        unbalancedNewickString.forEach((entry) => {
          const errors = phyx.PhylogenyWrapper.getErrorsInNewickString(entry.newick);

          // We should get two errors.
          expect(errors).to.have.lengthOf(2);

          // Should include an error about the unbalanced parentheses.
          expect(errors[0].title).to.equal('Unbalanced parentheses in Newick string');
          expect(errors[0].message).to.equal(entry.expected);

          // Should include an error passed on from the Newick parser.
          expect(errors[1].title).to.equal('Error parsing phylogeny');
          expect(errors[1].message).to.include('An error occured while parsing this phylogeny:');
        });
      });
    });

    describe('when given an incomplete Newick string', function () {
      const incompleteNewickStrings = [
        ';',
        '))(A, (B, ',
      ];

      it('should report an error parsing the phylogeny', function () {
        incompleteNewickStrings.forEach((newick) => {
          const errors = phyx.PhylogenyWrapper.getErrorsInNewickString(newick);

          expect(errors).to.have.lengthOf(1);
          expect(errors[0].title).to.equal('Error parsing phylogeny');
          expect(errors[0].message).to.include('An error occured while parsing this phylogeny:');
        });
      });
    });
  });

  describe('#getNodeLabels', function () {
    const tests = [
      {
        // Note that 'newick' is the input for this test.
        newick: '(A, (B, (C, D))E, F, (G, (H, I, J)K, L)M, N)O',
        // The following keys indicate the expected all/internal/terminal node labels
        // for the given Newick string.
        nodeLabels: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'],
        internalNodeLabels: ['E', 'K', 'M', 'O'],
        terminalNodeLabels: ['A', 'B', 'C', 'D', 'F', 'G', 'H', 'I', 'J', 'L', 'N'],
      },
    ];

    tests.forEach((test) => {
      const wrapper = new phyx.PhylogenyWrapper({ newick: test.newick });

      describe('For a particular Newick phylogeny', function () {
        it('should return a list of all node labels by default', function () {
          expect(wrapper.getNodeLabels().sort())
            .to.have.members(test.nodeLabels.sort());
        });

        it('should return a list of internal labels when asked for internal labels', function () {
          expect(wrapper.getNodeLabels('internal').sort())
            .to.have.members(test.internalNodeLabels.sort());
        });

        it('should return a list of terminal labels when asked for terminal labels', function () {
          expect(wrapper.getNodeLabels('terminal').sort())
            .to.have.members(test.terminalNodeLabels.sort());
        });
      });
    });
  });

  describe('given a particular phylogeny with additional node properties', function () {
    const wrapper = new phyx.PhylogenyWrapper({
      newick: '((MVZ225749, MVZ191016), Rana boylii)',
      additionalNodeProperties: {
        MVZ225749: {
          representsTaxonomicUnits: [{
            '@type': [
              phyx.TaxonomicUnitWrapper.TYPE_SPECIMEN,
            ],
            nameString: 'Rana luteiventris',
            occurrenceID: 'MVZ:225749',
          }],
        },
        MVZ191016: {
          representsTaxonomicUnits: [{
            '@type': [
              phyx.TaxonomicUnitWrapper.TYPE_SPECIMEN,
            ],
            nameString: 'Rana luteiventris',
            occurrenceID: 'MVZ:191016',
          }],
        },
      },
    });

    describe('#getNodeLabels', function () {
      it('should return the list of node labels from the Newick string', function () {
        expect(wrapper.getNodeLabels().sort())
          .to.have.members([
            'MVZ191016',
            'MVZ225749',
            'Rana boylii',
          ]);
      });
    });

    describe('#getTaxonomicUnitsForNodeLabel', function () {
      it('should return the list of taxonomic units using information from additional node properties', function () {
        expect(wrapper.getTaxonomicUnitsForNodeLabel('MVZ191016')).to.deep.equal([{
          '@type': [
            phyx.TaxonomicUnitWrapper.TYPE_SPECIMEN,
          ],
          nameString: 'Rana luteiventris',
          occurrenceID: 'MVZ:191016',
        }]);

        expect(wrapper.getTaxonomicUnitsForNodeLabel('MVZ225749')).to.deep.equal([{
          '@type': [
            phyx.TaxonomicUnitWrapper.TYPE_SPECIMEN,
          ],
          nameString: 'Rana luteiventris',
          occurrenceID: 'MVZ:225749',
        }]);

        expect(wrapper.getTaxonomicUnitsForNodeLabel('Rana boylii')).to.deep.equal([{
          '@type': owlterms.TDWG_VOC_TAXON_CONCEPT,
          label: 'Rana boylii',
          hasName: {
            '@type': 'http://rs.tdwg.org/ontology/voc/TaxonName#TaxonName',
            label: 'Rana boylii',
            nameComplete: 'Rana boylii',
            genusPart: 'Rana',
            specificEpithet: 'boylii',
          },
        }]);
      });
    });

    describe('#getNodeLabelsMatchedBySpecifier', function () {
      it('should match a specifier to MVZ225749 based on occurrence ID', function () {
        const specifier1 = {
          '@type': phyx.TaxonomicUnitWrapper.TYPE_SPECIMEN,
          occurrenceID: 'MVZ:225749',
        };
        expect(wrapper.getNodeLabelsMatchedBySpecifier(specifier1))
          .to.have.members(['MVZ225749']);
      });

      it('should match a specifier to MVZ191016 based on occurrence ID', function () {
        const specifier2 = {
          '@type': phyx.TaxonomicUnitWrapper.TYPE_SPECIMEN,
          occurrenceID: 'MVZ:191016',
        };

        expect(wrapper.getNodeLabelsMatchedBySpecifier(specifier2))
          .to.have.members(['MVZ191016']);
      });

      it('should match a specifier to node "Rana boylii" based on the parsed scientific name', function () {
        const specifier3 = {
          '@type': phyx.TaxonomicUnitWrapper.TYPE_TAXON_CONCEPT,
          nameString: 'Rana boylii',
        };

        expect(wrapper.getNodeLabelsMatchedBySpecifier(specifier3))
          .to.have.members(['Rana boylii']);
      });
    });
  });

  describe('#asJSONLD', function () {
    it('should preserve an existing @id on input phylogenies', function () {
      const jsonld = new phyx.PhylogenyWrapper({
        '@id': '#providedId',
        newick: '((Homo_sapiens, Panthera_tigris), Mus_musculus)',
      }).asJSONLD('#phylogeny0');
      expect(jsonld).to.have.property('@id');
      expect(jsonld['@id']).to.equal('#providedId');
    });
    it('should generate a new @id on input phylorefs', function () {
      const jsonld = new phyx.PhylogenyWrapper({
        newick: '((Homo_sapiens, Panthera_tigris), Mus_musculus)',
      }, owlterms.ICZN_CODE).asJSONLD('#phylogeny0');
      expect(jsonld).to.have.property('@id');
      expect(jsonld['@id']).to.equal('#phylogeny0');
    });
    it('should generate the phylogeny in JSON-LD as expected', function () {
      const expectedResults = [
        {
          newick: '((Homo_sapiens, Panthera_tigris), Mus_musculus)',
          jsonld: {
            '@id': '#',
            hasRootNode: { '@id': '#_node0' },
            newick: '((Homo_sapiens, Panthera_tigris), Mus_musculus)',
            nodes: [
              {
                '@id': '#_node0',
                children: ['#_node1', '#_node2'],
                'rdf:type': [{ '@id': owlterms.CDAO_NODE }],
              },
              {
                '@id': '#_node1',
                'rdf:type': [
                  { '@id': owlterms.CDAO_NODE },
                  {
                    '@type': owlterms.OWL_RESTRICTION,
                    onProperty: owlterms.CDAO_REPRESENTS_TU,
                    someValuesFrom: {
                      '@type': owlterms.OWL_RESTRICTION,
                      onProperty: owlterms.TDWG_VOC_HAS_NAME,
                      someValuesFrom: {
                        '@type': owlterms.OWL_CLASS,
                        intersectionOf: [{
                          '@type': owlterms.OWL_RESTRICTION,
                          hasValue: 'Mus musculus',
                          onProperty: owlterms.TDWG_VOC_NAME_COMPLETE,
                        }, {
                          '@type': owlterms.OWL_RESTRICTION,
                          hasValue: {
                            '@id': owlterms.ICZN_CODE,
                          },
                          onProperty: owlterms.NOMENCLATURAL_CODE,
                        }],
                      },
                    },
                  },
                ],
                labels: ['Mus_musculus'],
                parent: '#_node0',
                representsTaxonomicUnits: [{
                  '@type': owlterms.TDWG_VOC_TAXON_CONCEPT,
                  hasName: {
                    '@type': owlterms.TDWG_VOC_TAXON_NAME,
                    genusPart: 'Mus',
                    label: 'Mus_musculus',
                    nameComplete: 'Mus musculus',
                    nomenclaturalCode: owlterms.ICZN_CODE,
                    specificEpithet: 'musculus',
                  },
                  label: 'Mus_musculus',
                }],
                siblings: ['#_node2'],
              },
              {
                '@id': '#_node2',
                children: ['#_node3', '#_node4'],
                'rdf:type': [{ '@id': owlterms.CDAO_NODE }],
                parent: '#_node0',
                siblings: ['#_node1'],
              },
              {
                '@id': '#_node3',
                'rdf:type': [
                  { '@id': owlterms.CDAO_NODE },
                  {
                    '@type': owlterms.OWL_RESTRICTION,
                    onProperty: owlterms.CDAO_REPRESENTS_TU,
                    someValuesFrom: {
                      '@type': owlterms.OWL_RESTRICTION,
                      onProperty: owlterms.TDWG_VOC_HAS_NAME,
                      someValuesFrom: {
                        '@type': owlterms.OWL_CLASS,
                        intersectionOf: [{
                          '@type': owlterms.OWL_RESTRICTION,
                          hasValue: 'Panthera tigris',
                          onProperty: owlterms.TDWG_VOC_NAME_COMPLETE,
                        }, {
                          '@type': owlterms.OWL_RESTRICTION,
                          hasValue: {
                            '@id': owlterms.ICZN_CODE,
                          },
                          onProperty: owlterms.NOMENCLATURAL_CODE,
                        }],
                      },
                    },
                  },
                ],
                labels: ['Panthera_tigris'],
                parent: '#_node2',
                representsTaxonomicUnits: [{
                  '@type': owlterms.TDWG_VOC_TAXON_CONCEPT,
                  hasName: {
                    '@type': owlterms.TDWG_VOC_TAXON_NAME,
                    genusPart: 'Panthera',
                    label: 'Panthera_tigris',
                    nameComplete: 'Panthera tigris',
                    nomenclaturalCode: owlterms.ICZN_CODE,
                    specificEpithet: 'tigris',
                  },
                  label: 'Panthera_tigris',
                }],
                siblings: ['#_node4'],
              },
              {
                '@id': '#_node4',
                'rdf:type': [
                  { '@id': owlterms.CDAO_NODE },
                  {
                    '@type': owlterms.OWL_RESTRICTION,
                    onProperty: owlterms.CDAO_REPRESENTS_TU,
                    someValuesFrom: {
                      '@type': owlterms.OWL_RESTRICTION,
                      onProperty: owlterms.TDWG_VOC_HAS_NAME,
                      someValuesFrom: {
                        '@type': owlterms.OWL_CLASS,
                        intersectionOf: [{
                          '@type': owlterms.OWL_RESTRICTION,
                          hasValue: 'Homo sapiens',
                          onProperty: owlterms.TDWG_VOC_NAME_COMPLETE,
                        }, {
                          '@type': owlterms.OWL_RESTRICTION,
                          hasValue: {
                            '@id': owlterms.ICZN_CODE,
                          },
                          onProperty: owlterms.NOMENCLATURAL_CODE,
                        }],
                      },
                    },
                  },
                ],
                labels: ['Homo_sapiens'],
                parent: '#_node2',
                representsTaxonomicUnits: [
                  {
                    '@type': owlterms.TDWG_VOC_TAXON_CONCEPT,
                    hasName: {
                      '@type': owlterms.TDWG_VOC_TAXON_NAME,
                      genusPart: 'Homo',
                      label: 'Homo_sapiens',
                      nameComplete: 'Homo sapiens',
                      nomenclaturalCode: owlterms.ICZN_CODE,
                      specificEpithet: 'sapiens',
                    },
                    label: 'Homo_sapiens',
                  },
                ],
                siblings: ['#_node3'],
              },
            ],
          },
        },
      ];

      expectedResults.forEach((expected) => {
        const wrapper = new phyx.PhylogenyWrapper({
          '@id': '#',
          newick: expected.newick,
        }, owlterms.ICZN_CODE);
        expect(wrapper.asJSONLD('#phylogeny0')).to.deep.equal(expected.jsonld);
      });
    });
  });

  describe('#getParsedNewickWithIRIs', function () {
    const tests = [
      {
        newick: '(((A, B)C, D)E, F)G',
        result: {
          json: {
            '@id': '_node0',
            name: 'G',
            label: 'G',
            children: [
              { '@id': '_node1', name: 'F', label: 'F' },
              {
                '@id': '_node2',
                name: 'E',
                label: 'E',
                children: [
                  { '@id': '_node3', name: 'D', label: 'D' },
                  {
                    '@id': '_node4',
                    name: 'C',
                    label: 'C',
                    children: [
                      { '@id': '_node5', name: 'B', label: 'B' },
                      { '@id': '_node6', name: 'A', label: 'A' },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    ];

    tests.forEach((test) => {
      it('should be able to parse a provided Newick string as expected', function () {
        expect(new phyx.PhylogenyWrapper({ newick: test.newick }).getParsedNewickWithIRIs(''))
          .to.deep.equal(test.result);
      });
    });
  });
});
