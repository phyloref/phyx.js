/** Used to make deep copies of objects. */
const { has, cloneDeep } = require('lodash');

const owlterms = require('../utils/owlterms');

const { PhylorefWrapper } = require('./PhylorefWrapper');
const { PhylogenyWrapper } = require('./PhylogenyWrapper');
const { TaxonomicUnitMatcher } = require('../matchers/TaxonomicUnitMatcher');

/**
 * The PhyxWrapper wraps an entire Phyx document.
 */

class PhyxWrapper {
  /**
   * Wraps an entire PHYX document.
   * @param {Object} phyx - The Phyx structure to wrap.
   * @param {function(newick: string): {name: string, children: Object[]}} newickParser - A method
   *    that accepts a Newick string and returns a list of nodes. Each node should have a
   *    'children' key with its children and optionally a 'name' key with its label. This
   *    code previously depended on phylotree.js, whose newick_parser() function works exactly
   *    like this. This option allows you to drop in Phylotree's newick_parser() or -- if you
   *    prefer -- any other option.
   */
  constructor(phyx, newickParser) {
    //
    this.phyx = phyx;
    this.newickParser = newickParser;
  }

  /**
   * Generate an executable ontology from this Phyx document. The document is mostly in JSON-LD
   * already, except for three important things:
   *    1. We have to convert all phylogenies into a series of statements relating to the nodes
   *       inside these phylogenies.
   *    2. We have to convert phylogenies into OWL restrictions.
   *    3. Insert all matches between taxonomic units in this file.
   *
   * @param {string} [baseURI=""] - The base URI to use when generating this Phyx document.
   * @return {Object} This Phyx document as an OWL ontology as a JSON-LD object.
   */
  asOWLOntology(baseURI = '') {
    const jsonld = cloneDeep(this.phyx);

    // Some helper methods for generating base URIs for phylorefs and phylogenies.
    function getBaseURIForPhyloref(index) {
      return `${baseURI}#phyloref${index}`;
    }

    function getBaseURIForPhylogeny(index) {
      return `${baseURI}#phylogeny${index}`;
    }

    // Convert phyloreferences into an OWL class restriction
    if (has(jsonld, 'phylorefs')) {
      jsonld.phylorefs = jsonld.phylorefs.map(
        (phyloref, countPhyloref) => new PhylorefWrapper(phyloref)
          .asJSONLD(getBaseURIForPhyloref(countPhyloref))
      );
    }

    // Add descriptions for individual nodes in each phylogeny.
    if (has(jsonld, 'phylogenies')) {
      jsonld.phylogenies = jsonld.phylogenies.map(
        (phylogeny, countPhylogeny) => new PhylogenyWrapper(phylogeny)
          .asJSONLD(getBaseURIForPhylogeny(countPhylogeny), this.newickParser)
      );

      // Go through all the nodes and add information on expected resolution.
      jsonld.phylogenies.forEach((phylogeny) => {
        const phylogenyId = phylogeny['@id'];
        (phylogeny.nodes || []).forEach((node) => {
          // We can't set expected resolution information on unlabeled nodes.
          if (!node.labels) return;

          jsonld.phylorefs.forEach((phyloref) => {
            const phylorefId = phyloref['@id'];

            // There are two ways in which we determine that a phyloreference
            // is expected to resolve to a node:
            //  (1) If nodeLabel is set, then that must be one of the node's labels.
            //  (2) If nodeLabel is not set, then one of the node's label should be
            //      identical to the phyloreference's label.
            //
            // We set flagNodeExpectsPhyloref in all cases where we should note
            // that this node expects to resolve to this phyloreference.
            let flagNodeExpectsPhyloref = false;

            if (
              has(phyloref, 'expectedResolution')
              && has(phyloref.expectedResolution, phylogenyId)
            ) {
              // Expected resolution information set! The node label mentioned in that
              // information must be identical to one of the labels of this phylogeny node.
              const nodeLabel = phyloref.expectedResolution[phylogenyId].nodeLabel;

              if (nodeLabel && (node.labels || []).includes(nodeLabel)) {
                flagNodeExpectsPhyloref = true;
              }
            } else if ((node.labels || []).includes(phyloref.label)) {
              // No expected resolution information, so we just check whether
              // the phyloref label is one of the labels on this phylogeny node.
              flagNodeExpectsPhyloref = true;
            }

            if (flagNodeExpectsPhyloref) {
              // Modify this phylogeny node's type to include that it is a type
              // of:
              //  obi:is_specified_output_of some (
              //    obi:Prediction and obi:has_specified_output some #phyloref_id
              //  )
              node[owlterms.RDF_TYPE].push({
                '@type': owlterms.OWL_RESTRICTION,
                onProperty: owlterms.OBI_IS_SPECIFIED_OUTPUT_OF,
                someValuesFrom: {
                  '@type': owlterms.OWL_CLASS,
                  intersectionOf: [
                    { '@id': owlterms.OBI_PREDICTION },
                    {
                      '@type': owlterms.OWL_RESTRICTION,
                      onProperty: owlterms.OBI_HAS_SPECIFIED_INPUT,
                      someValuesFrom: {
                        '@id': phylorefId,
                      },
                    },
                  ],
                },
              });
            }
          });
        });
      });
    }

    // Match all specifiers with nodes.
    if (has(jsonld, 'phylorefs') && has(jsonld, 'phylogenies')) {
      jsonld.hasTaxonomicUnitMatches = [];

      // Used to create unique identifiers for each taxonomic unit match.
      let countTaxonomicUnitMatches = 0;

      jsonld.phylorefs.forEach((phylorefToChange) => {
        const phyloref = phylorefToChange;
        let specifiers = [];

        if (has(phyloref, 'internalSpecifiers')) {
          specifiers = specifiers.concat(phyloref.internalSpecifiers);
        }

        if (has(phyloref, 'externalSpecifiers')) {
          specifiers = specifiers.concat(phyloref.externalSpecifiers);
        }

        specifiers.forEach((specifier) => {
          if (!has(specifier, 'referencesTaxonomicUnits')) return;
          const specifierTUs = specifier.referencesTaxonomicUnits;
          let nodesMatchedCount = 0;

          jsonld.phylogenies.forEach((phylogenyToChange) => {
            const phylogeny = phylogenyToChange;

            specifierTUs.forEach((specifierTU) => {
              phylogeny.nodes.forEach((node) => {
                if (!has(node, 'representsTaxonomicUnits')) return;
                const nodeTUs = node.representsTaxonomicUnits;

                nodeTUs.forEach((nodeTU) => {
                  const matcher = new TaxonomicUnitMatcher(specifierTU, nodeTU);
                  if (matcher.matched) {
                    const tuMatchAsJSONLD = matcher.asJSONLD(
                      PhyxWrapper.getBaseURIForTUMatch(countTaxonomicUnitMatches)
                    );
                    jsonld.hasTaxonomicUnitMatches.push(tuMatchAsJSONLD);
                    nodesMatchedCount += 1;
                    countTaxonomicUnitMatches += 1;
                  }
                });
              });
            });
          });

          if (nodesMatchedCount === 0) {
            // No nodes matched? Record this as an unmatched specifier.
            if (!has(phyloref, 'hasUnmatchedSpecifiers')) phyloref.hasUnmatchedSpecifiers = [];
            phyloref.hasUnmatchedSpecifiers.push(specifier);
          }
        });
      });
    }

    // Finally, add the base URI as an ontology.
    if (baseURI) jsonld['@id'] = baseURI;
    jsonld['@type'] = [owlterms.PHYLOREFERENCE_TEST_CASE, 'owl:Ontology'];
    jsonld['owl:imports'] = [
      'http://raw.githubusercontent.com/phyloref/curation-workflow/develop/ontologies/phyloref_testcase.owl',
      'http://ontology.phyloref.org/2018-12-14/phyloref.owl',
      'http://ontology.phyloref.org/2018-12-14/tcan.owl',
    ];

    // If the '@context' is missing, add it here.
    if (!has(jsonld, '@context')) {
      jsonld['@context'] = owlterms.PHYX_CONTEXT_JSON;
    }

    return jsonld;
  }
}

module.exports = {
  PhyxWrapper,
};
