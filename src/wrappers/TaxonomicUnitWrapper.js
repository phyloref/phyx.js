/** Utility functions. */
const {
  has,
  isArray,
  cloneDeep,
  assign,
} = require('lodash');

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

  /** An apomorphy. */
  static get TYPE_APOMORPHY() {
    // TODO move to owlterms.
    // This is cdao:Character.
    return 'http://purl.obolibrary.org/obo/CDAO_0000071';
  }

  /** An external reference. */
  static get TYPE_EXTERNAL_REFERENCE() {
    // TODO replace with a better extref system.
    return 'http://purl.org/dc/terms/BibliographicResource';
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

    // Is this a specimen?
    if (this.specimen) {
      return new SpecimenWrapper(this.specimen).label;
    }

    // Is this a taxon concept?
    if (this.taxonConcept) {
      return new TaxonConceptWrapper(this.taxonConcept).label;
    }

    // If its neither a specimen nor a taxon concept, just list the
    // external references.
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
   * Given a label, attempt to parse it into a taxonomic unit, whether a scientific
   * name or a specimen identifier.
   *
   * @return A taxonomic unit that this label could be parsed as.
   */
  static fromLabel(nodeLabel) {
    if (nodeLabel === undefined || nodeLabel === null || nodeLabel.trim() === '') return undefined;

    // Rather than figuring out with this label, check to see if we've parsed
    // this before.
    if (PhyxCacheManager.has('TaxonomicUnitWrapper.taxonomicUnitsFromNodeLabelCache', nodeLabel)) {
      return PhyxCacheManager.get('TaxonomicUnitWrapper.taxonomicUnitsFromNodeLabelCache', nodeLabel);
    }

    // Look for taxon concept.
    const taxonConcept = TaxonConceptWrapper.fromLabel(nodeLabel);

    // Look for specimen information.
    let specimen;
    if (nodeLabel.toLowerCase().startsWith('specimen ')) {
      // Eliminate a 'Specimen ' prefix if it exists.
      specimen = SpecimenWrapper.fromOccurrenceID(nodeLabel.substr(9));
    }

    let tunit;
    if (taxonConcept && specimen) {
      // If we have both, then treat it as a specimen that has been identified
      // to a particular taxonomic name.
      tunit = assign({}, taxonConcept, specimen);

      tunit['@type'] = TaxonomicUnitWrapper.TYPE_SPECIMEN;
    } else if (taxonConcept) {
      tunit = taxonConcept;
    } else if (specimen) {
      tunit = specimen;
    }

    // Look for external references. For now, we only check to see if the entire
    // nodeLabel starts with URL/URNs, but we should eventually just look for
    // them inside the label.
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
      if (tunit === undefined) tunit = {};
      tunit['@id'] = nodeLabel;
    }

    // Finally, let's record the label we parsed to get to this tunit!
    if (tunit) {
      tunit.label = nodeLabel;
    }

    // Record in the cache
    PhyxCacheManager.put('TaxonomicUnitWrapper.taxonomicUnitsFromNodeLabelCache', nodeLabel, tunit);

    return tunit;
  }

  /**
   * Return the JSON representation of this taxonomic unit, i.e. the object we're wrapping.
   */
  get asJSON() {
    return this.tunit;
  }

  /**
   * Return this taxonomic unit as an OWL/JSON-LD object.
   */
  get asJSONLD() {
    const jsonld = cloneDeep(this.tunit);

    // Add CDAO_TU as a type to the existing types.
    if (has(this.tunit, '@type')) {
      if (isArray(this.tunit['@type'])) this.tunit['@type'].push(owlterms.CDAO_TU);
    }

    const equivClass = this.asOWLEquivClass;
    if (equivClass) {
      jsonld.equivalentClass = equivClass;
    }

    return jsonld;
  }

  /**
   * Return the equivalent class expression for this taxonomic unit.
   */
  get asOWLEquivClass() {
    if (this.types.includes(TaxonomicUnitWrapper.TYPE_TAXON_CONCEPT)) {
      return new TaxonConceptWrapper(this.tunit).asOWLEquivClass;
    }

    if (this.types.includes(TaxonomicUnitWrapper.TYPE_SPECIMEN)) {
      return new SpecimenWrapper(this.specimen).asOWLEquivClass;
    }

    // Nothing we can do, so just ignore it.
    return undefined;
  }
}

module.exports = {
  TaxonomicUnitWrapper,
};
