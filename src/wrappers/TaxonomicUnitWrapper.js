/** Utility functions. */
const { has, isArray, cloneDeep } = require('lodash');

/** List of OWL/RDF terms we use. */
const owlterms = require('../utils/owlterms');

/** We store the taxonomic units we extract from phylogeny labels in the Phyx Cache Manager. */
const { PhyxCacheManager } = require('../utils/PhyxCacheManager');

/** For parsing specimen identifiers. */
const { SpecimenWrapper } = require('./SpecimenWrapper');

/** For parsing scientific names. */
const { TaxonConceptWrapper } = require('./TaxonConceptWrapper');

/**
 * The TaxonomicUnitWrapper wraps taxonomic units, whether on a node or being used
 * as a specifier on a phyloreference. Every taxonomic unit can additionally be
 * wrapped by more specific classes, such as {@link TaxonConceptWrapper} or
 * {@link SpecimenWrapper}. We can determine which type it is based on its
 * '@type' and whether it includes:
 *  - TaxonomicUnitWrapper.TYPE_TAXON_CONCEPT => {@link TaxonConceptWrapper}
 *  - TaxonomicUnitWrapper.TYPE_SPECIMEN => {@link SpecimenWrapper}
 *  - TaxonomicUnitWrapper.TYPE_APOMORPHY => reserved for future use
 *  - TaxonomicUnitWrapper.TYPE_PHYLOREF => reserved for future use
 *
 * It also contains static methods for extracting
 * taxonomic units from arbitrary strings, such as phylogeny labels.
 *
 * Every taxonomic unit SHOULD have an rdfs:label and MAY include a dcterm:description
 * to describe it in human-readable terms. It MUST include a '@type' that specifies
 * what type of taxonomic unit it is.
 *
 * Taxonomic units may be specified with only an '@id' or a set of '@id's, which
 * indicate external references.
 */

class TaxonomicUnitWrapper {
  /* Types of taxonomic units we support (see documentation above). */

  /** A taxon or taxon concept. */
  static get TYPE_TAXON_CONCEPT() {
    return TaxonConceptWrapper.TYPE_TAXON_CONCEPT;
  }

  /** A specimen. */
  static get TYPE_SPECIMEN() {
    return SpecimenWrapper.TYPE_SPECIMEN;
  }

  /** Wrap a taxonomic unit. */
  constructor(tunit) {
    this.tunit = tunit;
  }

  /**
   * What type of specifier is this? This is an array that could contain multiple
   * classes, but should contain one of:
   *  - {@link TYPE_TAXON_CONCEPT}
   *  - {@link TYPE_SPECIMEN}
   */
  get types() {
    if (!has(this.tunit, '@type')) return [];
    if (isArray(this.tunit['@type'])) return this.tunit['@type'];
    return [this.tunit['@type']];
  }

  /**
   * Return this taxonomic unit if it is a taxon concept.
   */
  get taxonConcept() {
    if (this.types.includes(TaxonomicUnitWrapper.TYPE_TAXON_CONCEPT)) return this.tunit;
    return undefined;
  }

  /**
   * Return this taxonomic unit if it is a specimen.
   */
  get specimen() {
    // Only specimens have scientific names.
    if (this.types.includes(TaxonomicUnitWrapper.TYPE_SPECIMEN)) return this.tunit;

    return undefined;
  }

  /**
   * Return the list of external references for this taxonomic unit.
   * This is just all the '@ids' of this object.
   */
  get externalReferences() {
    if (!has(this.tunit, '@id')) return [];
    if (isArray(this.tunit['@id'])) return this.tunit['@id'];
    return [this.tunit['@id']];
  }

  /**
   * Return the label of this taxonomic unit.
   */
  get label() {
    // A label or description for this TU?
    if (has(this.tunit, 'label')) return this.tunit.label;
    if (has(this.tunit, 'description')) return this.tunit.description;

    // Am I a specimen?
    if (this.specimen) {
      return new SpecimenWrapper(this.specimen).label;
    }

    // Am I a taxon concept?
    if (this.taxonConcept) {
      return new TaxonConceptWrapper(this.taxonConcept).label;
    }

    // If I can't figure out any time, just list the external references.
    const externalReferences = this.externalReferences;
    if (externalReferences.length > 0) {
      return externalReferences
        .map(externalRef => `<${externalRef}>`)
        .join(' and ');
    }

    // If we don't have any properties of a taxonomic unit, return undefined.
    return undefined;
  }

  /**
   * Given a node label, attempt to parse it as a scientific name.
   * @return A taxonomic unit that this node label could be parsed as.
   */
  static fromNodeLabel(nodeLabel) {
    if (nodeLabel === undefined || nodeLabel === null) return undefined;

    // Rather than figuring out with this label, check to see if we've parsed
    // this before.
    if (PhyxCacheManager.has('TaxonomicUnitWrapper.taxonomicUnitsFromNodeLabelCache', nodeLabel)) {
      return PhyxCacheManager.get('TaxonomicUnitWrapper.taxonomicUnitsFromNodeLabelCache', nodeLabel);
    }

    // Look for taxon concept.
    let tunit = TaxonConceptWrapper.fromLabel(nodeLabel);

    // Look for specimen.
    if (!tunit) {
      if (nodeLabel.toLowerCase().startsWith('specimen ')) {
        // Eliminate a 'Specimen ' prefix if it exists.
        tunit = SpecimenWrapper.fromOccurrenceID(nodeLabel.substr(9));
      } else {
        // Try parsing it as a specimen without a prefix.
        tunit = SpecimenWrapper.fromOccurrenceID(nodeLabel);
      }
    }

    // If it's neither a taxon concept nor a specimen, maybe it's an external reference?
    if (!tunit) {
      const URL_URN_PREFIXES = [
        'http://',
        'https://',
        'ftp://',
        'sftp://',
        'file://',
        'urn:',
      ];

      if (URL_URN_PREFIXES.filter(prefix => nodeLabel.startsWith(prefix)).length > 0) {
        // The node label starts with something that looks like a URL!
        // Treat it as an external reference.
        tunit = {
          '@id': nodeLabel,
        };
      }
    }

    // Record in the cache
    PhyxCacheManager.put('TaxonomicUnitWrapper.taxonomicUnitsFromNodeLabelCache', nodeLabel, tunit);

    return tunit;
  }

  /**
   * Return this taxonomic unit as an OWL/JSON-LD object.
   */
  asJSONLD() {
    const jsonld = cloneDeep(this.tunit);

    // Add CDAO_TU as a type to the existing types.
    if (has(this.tunit, '@type')) {
      if (isArray(this.tunit['@type'])) this.tunit['@type'].push(owlterms.CDAO_TU);
    }

    if (this.types.includes(TaxonomicUnitWrapper.TYPE_TAXON_CONCEPT)) {
      jsonld.equivalentClass = new TaxonConceptWrapper(this.tunit).asEquivClass();
    } else if (this.types.includes(TaxonomicUnitWrapper.TYPE_SPECIMEN)) {
      jsonld.equivalentClass = new SpecimenWrapper(this.specimen).asEquivClass();
    } else {
      // Nothing we can do, so just ignore it.
    }

    return jsonld;
  }
}

module.exports = {
  TaxonomicUnitWrapper,
};
