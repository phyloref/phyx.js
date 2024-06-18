const fs = require('fs');
const path = require('path');

/** Helper methods from lodash. */
const { has, cloneDeep, uniq } = require('lodash');

/** For NQuads export. */
const JSONLD = require('jsonld');

const owlterms = require('../utils/owlterms');

const { PhylorefWrapper } = require('./PhylorefWrapper');
const { PhylogenyWrapper } = require('./PhylogenyWrapper');
const { CitationWrapper } = require('./CitationWrapper');

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

  // Determine a 'default nomenclatural code' for this Phyx file. There are
  // two ways to do this:
  //  1. If the Phyx file has a 'defaultNomenclaturalCodeIRI' property, we use that.
  //  2. Otherwise, we check to see if every phyloref in this file has the same
  //     nomenclatural code. If so, we can use that code. If not, i.e. if any of
  //     the phylorefs are missing a nomenclatural code or include a specifier,
  //     we default to owlterms.UNKNOWN_CODE.
  get defaultNomenCode() {
    if (has(this.phyx, 'defaultNomenclaturalCodeIRI')) return this.phyx.defaultNomenclaturalCodeIRI;
    const nomenCodes = (this.phyx.phylorefs || [])
      .map(phyloref => new PhylorefWrapper(phyloref).defaultNomenCode);
    const uniqNomenCodes = uniq(nomenCodes);
    if (uniqNomenCodes.length === 1) return uniqNomenCodes[0];
    return owlterms.UNKNOWN_CODE;
  }

  /**
   * Return a provided Phyx document as a normalized JSON document. We ignore most keys -- including
   * keys we don't know -- but any key that can be wrapped by one of the other Wrappers in this
   * package will be wrapped and normalized before being returned.
   *
   * Normalization is mostly needed for TaxonomicUnitWrappers and its subclasses
   * (TaxonConceptWrapper, TaxonNameWrapper), since these can be represented in several essentially
   * identical ways. But if we implement it at every level, we can implement comparison code in
   * Klados easily.
   *
   * Two Phyx documents should -- upon being normalized -- be comparable with each other with
   * lodash.deepEqual().
   */
  static normalize(phyxDocument) {
    const normalizedDocument = cloneDeep(phyxDocument);

    normalizedDocument.phylorefs = (phyxDocument.phylorefs || []).map(PhylorefWrapper.normalize);
    normalizedDocument.phylogenies = (phyxDocument.phylogenies || [])
      .map(PhylogenyWrapper.normalize);
    if ('source' in phyxDocument) {
      normalizedDocument.source = CitationWrapper.normalize(phyxDocument.source);
    }

    return normalizedDocument;
  }

  /**
   * Generate an executable ontology from this Phyx document. The document is mostly in JSON-LD
   * already, except for three important things:
   *    1. We have to convert all phylogenies into a series of statements relating to the nodes
   *       inside these phylogenies.
   *    2. We have to convert phylogenies into OWL restrictions.
   *    3. Insert all matches between taxonomic units in this file.
   *
   * @param {string} [baseIRI=""] - The base IRI to use when generating this Phyx document.
   *    This should include a trailing '#' or '/'. Use '' to indicate that relative IDs
   *    should be generated in the produced ontology (e.g. '#phylogeny1'). Note that if a
   *    baseIRI is provided, then relative IDs already in the Phyx file (identified by an
   *    initial '#') will be turned into absolute IDs by removing the initial `#` and
   *    prepending them with the baseIRI.
   * @return {Object} This Phyx document as an OWL ontology as a JSON-LD object.
   */
  asJSONLD(baseIRI = '') {
    const jsonld = cloneDeep(this.phyx);

    // Some helper methods for generating base IRIs for phylorefs and phylogenies.
    function getBaseIRIForPhyloref(index) {
      if (baseIRI) return `${baseIRI}phyloref${index}`;
      return `#phyloref${index}`;
    }

    function getBaseIRIForPhylogeny(index) {
      if (baseIRI) return `${baseIRI}phylogeny${index}`;
      return `#phylogeny${index}`;
    }

    // Given a relative ID (e.g. '#phylo1') make it absolute (`${baseIRI}phylo1`).
    function makeIDAbsolute(phylogenyId) {
      if (baseIRI && phylogenyId.startsWith('#')) return `${baseIRI}${phylogenyId.substring(1)}`; // Remove the initial '#'.
      return phylogenyId;
    }

    // Given an absolute ID (`${baseIRI}phylo1`) make it relative (e.g. '#phylo1').
    function makeIDRelative(phylogenyId) {
      if (phylogenyId.startsWith(baseIRI)) return `#${phylogenyId.substring(baseIRI.length)}`;
      return phylogenyId;
    }

    if (has(jsonld, 'phylorefs')) {
      // We might have phyloref IDs set to relative IRIs (e.g. "#phyloref0").
      // If the baseIRI is set to '', that's fine. But if not, we'll add it
      // to the relative IRI to make it absolute. This seems to avoid problems
      // with some JSON-LD parsers.
      if (baseIRI) {
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
        (phyloref, countPhyloref) => new PhylorefWrapper(phyloref, this.defaultNomenCode)
          .asJSONLD(getBaseIRIForPhyloref(countPhyloref))
      );
    }

    if (has(jsonld, 'phylogenies')) {
      // We might have phyloref IDs set to relative IRIs (e.g. "#phyloref0").
      // If the baseIRI is set to '', that's fine. But if not, we'll add it
      // to the relative IRI to make it absolute. This seems to avoid problems
      // with some JSON-LD parsers.
      if (baseIRI) {
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
        (phylogeny, countPhylogeny) => new PhylogenyWrapper(phylogeny, this.defaultNomenCode)
          .asJSONLD(getBaseIRIForPhylogeny(countPhylogeny), this.newickParser)
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

    // Earlier, we used to generate a list of taxonomic matches here (stored in
    // jsonld.hasTaxonomicUnitMatches) that logically expressed how taxonomic
    // units in phyloref specifiers were related to taxonomic units in phylogeny
    // nodes. This is no longer necessary, since phyloref specifiers are now logical
    // expressions that directly evaluate to phylogeny nodes. However, if in the
    // future we decide that we need to perform more advanced TU matching, this
    // would be the place to implement that.

    // If there is a top-level source, generate a bibliographicCitation for it.
    if (has(jsonld, 'source')) {
      jsonld.source.bibliographicCitation = new CitationWrapper(jsonld.source).toString();
    }

    // Set up the top-level object '@type'. If one is present, we add our terms to that.
    if (!has(jsonld, '@type')) jsonld['@type'] = [];
    if (!Array.isArray(jsonld['@type'])) jsonld['@type'] = [jsonld['@type']];
    jsonld['@type'].push('owl:Ontology');

    // Set up the ontology imports. If one is present, we add our imports to that.
    if (!has(jsonld, 'owl:imports')) jsonld['owl:imports'] = [];
    if (!Array.isArray(jsonld['owl:imports'])) jsonld['owl:imports'] = [jsonld['owl:imports']];
    jsonld['owl:imports'].push('http://ontology.phyloref.org/2018-12-14/phyloref.owl');
    jsonld['owl:imports'].push('http://ontology.phyloref.org/2018-12-14/tcan.owl');

    // If the '@context' is missing, add it here.
    if (!has(jsonld, '@context')) {
      jsonld['@context'] = owlterms.PHYX_CONTEXT_JSON;
    }

    return jsonld;
  }

  /**
   * Generate an executable ontology from this Phyx document as N-Quads. Under the
   * hood, we generate an OWL/JSON-LD representation of this Phyx document, and then
   * convert it into N-Quads so that OWLAPI-supporting tools can directly consume it.
   *
   * @param {string} [baseIRI=""] - The base IRI to use when generating this Phyx document.
   *    This should include a trailing '#' or '/'. Use '' to indicate that relative IDs
   *    should be generated in the produced ontology (e.g. '#phylogeny1'). Note that if a
   *    baseIRI is provided, then relative IDs already in the Phyx file (identified by an
   *    initial '#') will be turned into absolute IDs by removing the initial `#` and
   *    prepending them with the baseIRI.
   * @param {string} [filePath=undefined] - The path of the Phyx file being converted.
   *    Used only if the `@context` of the file is a relative path.
   * @return {Promise[string]} A Promise to return this Phyx document as a string that can
   *    be written to an N-Quads file.
   */
  toRDF(baseIRI = '', filePath = undefined) {
    const owlJSONLD = this.asJSONLD(baseIRI);

    // For the purposes of testing, we are sometimes given a relative path to `@context`,
    // but the JSONLD package does not support this. Instead, we'll import the contents
    // of the relative path on the fly.
    if (filePath && has(owlJSONLD, '@context') && owlJSONLD['@context'].startsWith('.')) {
      owlJSONLD['@context'] = JSON.parse(fs.readFileSync(
        path.resolve(filePath, owlJSONLD['@context'])
      ));
    }

    return JSONLD.toRDF(owlJSONLD, { format: 'application/n-quads' });
  }
}

module.exports = {
  PhyxWrapper,
};
