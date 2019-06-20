/** Used to make deep copies of objects. */
const { has, cloneDeep } = require('lodash');

const owlterms = require('../utils/owlterms');

const { PhylorefWrapper } = require('./PhylorefWrapper');
const { PhylogenyWrapper } = require('./PhylogenyWrapper');
const { TaxonomicUnitMatcher } = require('../matchers/TaxonomicUnitMatcher');

/* PHYX file wrapper */

class PhyxWrapper {
  // Wraps an entire PHYX document.

  constructor(phyx, newickParser) {
    // Wraps an entire PHYX document.
    // - phyx: the Phyx structure to wrap.
    // - newickParser: a method that accepts a Newick string and returns a list of
    //   nodes. Each node should have a 'children' key with its children and
    //   optionally a 'name' key with its label. This code previously depended
    //   on phylotree.js, whose newick_parser() function works exactly like this.
    //   This option allows you to drop in Phylotree's newick_parser() or --
    //   if you prefer -- any other option.
    this.phyx = phyx;
    this.newickParser = newickParser;
  }

  static get BASE_URI() {
    // Returns the default base URI for PHYX documents in JSON-LD.
    return 'http://example.org/phyloref/jsonld_export';
  }

  static getBaseURIForPhyloref(phylorefCount) {
    // Return the base URI for a phyloreference based on its index.
    return `${PhyxWrapper.BASE_URI}#phyloref${phylorefCount}`;
  }

  static getBaseURIForPhylogeny(phylogenyCount) {
    // Return the base URI for phylogenies based on its index.
    return `${PhyxWrapper.BASE_URI}#phylogeny${phylogenyCount}`;
  }

  static getBaseURIForTUMatch(countTaxonomicUnitMatches) {
    // Return the base URI for taxonomic unit matches.
    return `${PhyxWrapper.BASE_URI}#taxonomic_unit_match${countTaxonomicUnitMatches}`;
  }

  asJSONLD() {
    // Export this PHYX document as a JSON-LD document. This replicates what
    // phyx2owl.py does in the Clade Ontology.
    //
    // The document is mostly in JSON-LD already, except for two important
    // things:
    //  1. We have to convert all phylogenies into a series of statements
    //     relating to the nodes inside these phylogenies.
    //  2. We have to convert phylogenies into OWL restrictions.
    //  3. Insert all matches between taxonomic units in this file.
    //
    const jsonld = cloneDeep(this.phyx);

    // Add descriptions for individual nodes in each phylogeny.
    if (has(jsonld, 'phylogenies')) {
      jsonld.phylogenies = jsonld.phylogenies.map(
        (phylogeny, countPhylogeny) => new PhylogenyWrapper(phylogeny)
          .asJSONLD(PhyxWrapper.getBaseURIForPhylogeny(countPhylogeny), this.newickParser)
      );
    }

    // Convert phyloreferences into an OWL class restriction
    if (has(jsonld, 'phylorefs')) {
      jsonld.phylorefs = jsonld.phylorefs.map(
        (phyloref, countPhyloref) => new PhylorefWrapper(phyloref)
          .asJSONLD(PhyxWrapper.getBaseURIForPhyloref(countPhyloref))
      );
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
    jsonld['@id'] = PhyxWrapper.BASE_URI;
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
