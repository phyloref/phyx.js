const phyxCacheManager = require('../utils/PhyxCacheManager');
const SpecimenWrapper = require('./SpecimenWrapper');
const ScientificNameWrapper = require('./ScientificNameWrapper');

/* Taxonomic unit wrapper */

class TaxonomicUnitWrapper {
  // Wraps a taxonomic unit.
  // Also provides static methods for obtaining lists of wrapped taxonomic units
  // from node labels.

  constructor(tunit) {
    // Wrap a taxonomic unit.
    this.tunit = tunit;
  }

  get label() {
    // Try to determine the label of a taxonomic unit. This checks the
    // 'label' and 'description' properties, and then tries to create a
    // descriptive label by combining the scientific names, specimens
    // and external references of the taxonomic unit.
    const labels = [];

    // A label or description for the TU?
    if (hasOwnProperty(this.tunit, 'label')) return this.tunit.label;
    if (hasOwnProperty(this.tunit, 'description')) return this.tunit.description;

    // Any specimens?
    if (hasOwnProperty(this.tunit, 'includesSpecimens')) {
      this.tunit.includesSpecimens.forEach((specimen) => {
        labels.push(new SpecimenWrapper(specimen).label);
      });
    }

    // Any external references?
    if (hasOwnProperty(this.tunit, 'externalReferences')) {
      this.tunit.externalReferences.forEach(externalRef => labels.push(`<${externalRef}>`));
    }

    // Any scientific names?
    if (hasOwnProperty(this.tunit, 'scientificNames')) {
      this.tunit.scientificNames.forEach((scname) => {
        labels.push(new ScientificNameWrapper(scname).label);
      });
    }

    // If we don't have any properties of a taxonomic unit, return undefined.
    if (labels.length === 0) return undefined;

    return labels.join(' or ');
  }

  // Access variables in the underlying wrapped taxonomic unit.
  get scientificNames() {
    return this.tunit.scientificNames;
  }

  get includeSpecimens() {
    return this.tunit.includesSpecimens;
  }

  get externalReferences() {
    return this.tunit.externalReferences;
  }

  static getTaxonomicUnitsFromNodeLabel(nodeLabel) {
    // Given a node label, attempt to parse it as a scientific name.
    // Returns a list of taxonomic units.
    if (nodeLabel === undefined || nodeLabel === null) return [];

    // This regular expression times a while to run, so let's memoize this.
    if (phyxCacheManager.has('TaxonomicUnitWrapper.taxonomicUnitsFromNodeLabelCache', nodeLabel)) {
      return phyxCacheManager.get('TaxonomicUnitWrapper.taxonomicUnitsFromNodeLabelCache', nodeLabel);
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
    phyxCacheManager.put('TaxonomicUnitWrapper.taxonomicUnitsFromNodeLabelCache', nodeLabel, tunits);

    return tunits;
  }
}

module.exports = {
  TaxonomicUnitWrapper,
};
