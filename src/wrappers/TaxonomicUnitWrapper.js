/** Utility functions. */
const { has, isArray } = require('lodash');

/** URIs from the OWL/RDF world. */
const owlterms = require('../utils/owlterms');

/** We store the taxonomic units we extract from phylogeny labels in the Phyx Cache Manager. */
const { PhyxCacheManager } = require('../utils/PhyxCacheManager');

/** For parsing specimen identifiers. */
const { SpecimenWrapper } = require('./SpecimenWrapper');

/** For parsing scientific names. */
const { ScientificNameWrapper } = require('./ScientificNameWrapper');

/**
 * The TaxonomicUnitWrapper wraps taxonomic units, whether on a node or being used
 * as a specifier on a phyloreference. It also contains static methods for extracting
 * taxonomic units from phylogeny labels.
 *
 * Every taxonomic unit can have an rdfs:label or a dcterm:description to describe
 * it in human-readable terms. It also includes an OWL restriction to describe
 * the taxonomic unit in one of the following OWL/Manchester forms:
 *  - tc:hasName some (ICZN_Name and dwc:scientificName value "scientific name")
 *  - tc:circumscribedBy some (dwc:organismID value "occurrence ID")
 *
 * External references can be represented by the '@id' of the taxonomic unit itself.
 *
 * TODO: We need to develop a syntax for representing apomorphies and referencing
 * phyloreferences.
 */

class TaxonomicUnitWrapper {
  /** Wrap a taxonomic unit. */
  constructor(tunit) {
    this.tunit = tunit;
  }

  /**
   * Return the OWL restriction of this taxonomic unit.
   */
  get owlRestrictions() {
    if (has(this.tunit, '@type')) {
      if (!isArray(this.tunit['@type'])) {
        this.tunit['@type'] = [this.tunit['@type']];
      }

      return this.tunit['@type'];
    }

    return undefined;
  }

  /**
   * Set the OWL restriction of this taxonomic unit.
   */
  set owlRestrictions(owlRestrictions) {
    this.tunit['@type'] = owlRestrictions;
  }

  /**
   * Return the list of OWL restrictions for a particular property.
   */
  getOwlRestrictionsForProperty(prop) {
    if (!this.owlRestrictions) return [];
    return this.owlRestrictions.filter(restriction => (restriction.onProperty === prop));
  }

  /**
   * Return the list of scientific names in this taxonomic unit.
   */
  get scientificNames() {
    return this.getOwlRestrictionsForProperty(owlterms.TU_HAS_NAME_PROP)
      .filter(restriction => has(restriction, 'someValuesFrom'))
      .map((restriction) => {
        if (isArray(restriction.someValuesFrom)) return restriction.someValuesFrom;
        return [restriction.someValuesFrom];
      });
  }

  /**
   * Return the list of organism IDs in this taxonomic unit.
   */
  get specimens() {
    return this.getOwlRestrictionsForProperty(owlterms.TU_ORGANISM_ID_PROP);
  }

  /**
   * Return the list of external references for this taxonomic unit.
   */
  get externalReferences() {
    if (isArray(this.tunit['@id'])) return this.tunit['@id'];
    return [this.tunit['@id']];
  }

  /**
   * Return the label of this taxonomic unit.
   */
  get label() {
    const labels = [];

    // A label or description for the TU?
    if (has(this.tunit, 'label')) return this.tunit.label;
    if (has(this.tunit, 'description')) return this.tunit.description;

    // Any specimens?
    const specimens = this.specimens;
    if (specimens.length > 0) {
      specimens.forEach((specimen) => {
        labels.push(new SpecimenWrapper(specimen).label);
      });
    }

    // Any external references?
    const externalReferences = this.externalReferences;
    if (externalReferences.length > 0) {
      externalReferences.forEach(externalRef => labels.push(`<${externalRef}>`));
    }

    // Any scientific names?
    const scientificNames = this.scientificNames;
    if (scientificNames.length > 0) {
      scientificNames.forEach((scname) => {
        labels.push(new ScientificNameWrapper(scname).label);
      });
    }

    // If we don't have any properties of a taxonomic unit, return undefined.
    if (labels.length === 0) return undefined;

    return labels.join(' or ');
  }

  /**
   * Given a node label, attempt to parse it as a scientific name.
   * @return A list of taxonomic units.
   */
  static getTaxonomicUnitsFromNodeLabel(nodeLabel) {
    if (nodeLabel === undefined || nodeLabel === null) return [];

    // This regular expression times a while to run, so let's memoize this.
    if (PhyxCacheManager.has('TaxonomicUnitWrapper.taxonomicUnitsFromNodeLabelCache', nodeLabel)) {
      return PhyxCacheManager.get('TaxonomicUnitWrapper.taxonomicUnitsFromNodeLabelCache', nodeLabel);
    }

    // Check if the label starts with a binomial name.
    let tunits = [];
    const results = /^([A-Z][a-z]+)[ _]([a-z-]+)(?:\b|_)\s*(.*)/.exec(nodeLabel);
    if (results !== null) {
      tunits = [{
        scientificNames: [{
          scientificName: `${results[1]} ${results[2]} ${results[3]}`.trim(),
          binomialName: `${results[1]} ${results[2]}`,
          genus: results[1],
          specificEpithet: results[2],
        }],
      }];
    } else {
      // It may be a scientific name, but we don't know how to parse it as such.
      tunits = [];
    }

    // Record in the cache
    PhyxCacheManager.put('TaxonomicUnitWrapper.taxonomicUnitsFromNodeLabelCache', nodeLabel, tunits);

    return tunits;
  }
}

module.exports = {
  TaxonomicUnitWrapper,
};
