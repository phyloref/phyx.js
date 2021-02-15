/** Helper methods from lodash. */
const { has, cloneDeep, uniq } = require('lodash');

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
   * @param {function(newick: string): {name: string, children: Object[]}}
   *    [newickParser=PhylogenyWrapper.getParsedNewick] - A method
   *    that accepts a Newick string and returns a list of nodes. Each node should have a
   *    'children' key with its children and optionally a 'name' key with its label. This
   *    code previously depended on phylotree.js, whose newick_parser() function works exactly
   *    like this. This option allows you to drop in Phylotree's newick_parser() or -- if you
   *    prefer -- any other option.
   */
  constructor(phyx, newickParser = PhylogenyWrapper.getParsedNewick) {
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
   *    This should include a trailing '#' or '/'. Use '' to indicate that relative IDs
   *    should be generated in the produced ontology (e.g. '#phylogeny1'). Note that if a
   *    baseURI is provided, then relative IDs already in the Phyx file (identified by an
   *    initial '#') will be turned into absolute IDs by removing the initial `#` and
   *    prepending them with the baseURI.
   * @return {Object} This Phyx document as an OWL ontology as a JSON-LD object.
   */
  asOWLOntology(baseURI = '') {
    const jsonld = cloneDeep(this.phyx);

    // Some helper methods for generating base URIs for phylorefs and phylogenies.
    function getBaseURIForPhyloref(index) {
      if (baseURI) return `${baseURI}phyloref${index}`;
      return `#phyloref${index}`;
    }

    function getBaseURIForPhylogeny(index) {
      if (baseURI) return `${baseURI}phylogeny${index}`;
      return `#phylogeny${index}`;
    }

    // Given a relative ID (e.g. '#phylo1') make it absolute (`${baseURI}phylo1`).
    function makeIDAbsolute(phylogenyId) {
      if (baseURI && phylogenyId.startsWith('#')) return `${baseURI}${phylogenyId.substring(1)}`; // Remove the initial '#'.
      return phylogenyId;
    }

    // Given an absolute ID (`${baseURI}phylo1`) make it relative (e.g. '#phylo1').
    function makeIDRelative(phylogenyId) {
      if (phylogenyId.startsWith(baseURI)) return `#${phylogenyId.substring(baseURI.length)}`;
      return phylogenyId;
    }

    // Determine a 'default nomenclatural code' for this Phyx file. There are
    // two ways to do this:
    //  1. If the Phyx file has a 'defaultNomenclaturalCodeURI' property, we use that.
    //  2. Otherwise, we check to see if every phyloref in this file has the same
    //     nomenclatural code. If so, we can use that code. If not, i.e. if any of
    //     the phylorefs are missing a nomenclatural code or include a specifier,
    //     we default to owlterms.UNKNOWN_CODE.
    function determineDefaultNomenCode() {
      if (has(jsonld, 'defaultNomenclaturalCodeURI')) return jsonld.defaultNomenclaturalCodeURI;
      const nomenCodes = (jsonld.phylorefs || [])
        .map(phyloref => new PhylorefWrapper(phyloref).summarizedNomenCode);
      const uniqNomenCodes = uniq(nomenCodes);
      if (uniqNomenCodes.length === 1) return uniqNomenCodes[0];
      return owlterms.UNKNOWN_CODE;
    }
    const defaultNomenCode = determineDefaultNomenCode();

    if (has(jsonld, 'phylorefs')) {
      // We might have phyloref IDs set to relative URIs (e.g. "#phyloref0").
      // If the baseURI is set to '', that's fine. But if not, we'll add it
      // to the relative URI to make it absolute. This seems to avoid problems
      // with some JSON-LD parsers.
      if (baseURI) {
        jsonld.phylorefs = jsonld.phylorefs.map((phyloref) => {
          if ((phyloref['@id'] || '').startsWith('#')) {
            const modifiedPhyloref = cloneDeep(phyloref);
            modifiedPhyloref['@id'] = makeIDAbsolute(phyloref['@id']);
            return modifiedPhyloref;
          }
          return phyloref;
        });
      }

      // Convert phyloreferences into an OWL class restriction
      jsonld.phylorefs = jsonld.phylorefs.map(
        (phyloref, countPhyloref) => new PhylorefWrapper(phyloref, defaultNomenCode)
          .asJSONLD(getBaseURIForPhyloref(countPhyloref))
      );
    }

    if (has(jsonld, 'phylogenies')) {
      // We might have phyloref IDs set to relative URIs (e.g. "#phyloref0").
      // If the baseURI is set to '', that's fine. But if not, we'll add it
      // to the relative URI to make it absolute. This seems to avoid problems
      // with some JSON-LD parsers.
      if (baseURI) {
        jsonld.phylogenies = jsonld.phylogenies.map((phylogeny) => {
          if ((phylogeny['@id'] || '').startsWith('#')) {
            const modifiedPhylogeny = cloneDeep(phylogeny);
            modifiedPhylogeny['@id'] = makeIDAbsolute(phylogeny['@id']);
            return modifiedPhylogeny;
          }
          return phylogeny;
        });
      }

      // Add descriptions for individual nodes in each phylogeny.
      jsonld.phylogenies = jsonld.phylogenies.map(
        (phylogeny, countPhylogeny) => new PhylogenyWrapper(phylogeny, defaultNomenCode)
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

            // console.log(`Testing expected resolution of '${phylorefId}' on `
            // + `'${phylogenyId}' (${makeIDRelative(phylogenyId)}).`);

            if (
              has(phyloref, 'expectedResolution')
              && (
                // The user might have used the absolute phylogeny ID here.
                has(phyloref.expectedResolution, phylogenyId)

                // Or they might have used a relative phylogeny ID.
                || has(phyloref.expectedResolution, makeIDRelative(phylogenyId))
              )
            ) {
              // Expected resolution information set! The node label mentioned in that
              // information must be identical to one of the labels of this phylogeny node.

              // Figure out which phylogenyId was matched here.
              const nodeLabel = has(phyloref.expectedResolution, phylogenyId)
                ? phyloref.expectedResolution[phylogenyId].nodeLabel
                : phyloref.expectedResolution[makeIDRelative(phylogenyId)].nodeLabel;

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
