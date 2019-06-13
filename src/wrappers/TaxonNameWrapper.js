/** Utility functions. */
const { has, cloneDeep, isArray } = require('lodash');

/** OWL/RDF terms. */
const owlterms = require('../utils/owlterms');

/** We need the cache manager to memoize parsing scientific names. */
const { PhyxCacheManager } = require('../utils/PhyxCacheManager');

/**
 * Wraps a taxon name to provide access to components of
 * the taxon name. This is based on the TDWG TaxonName standard, as at
 * https://github.com/tdwg/ontology/blob/master/ontology/voc/TaxonName.rdf.
 */
class TaxonNameWrapper {
  /**
   * Create a new taxon name wrapper around the JSON representation of
   * a taxon name.
   */
  constructor(txname) {
    if (txname === undefined) throw new Error('TaxonNameWrapper tried to wrap undefined');
    this.txname = txname;
  }

  /**
   * The type associated with these taxonName objects.
   */
  static get TYPE_TAXON_NAME() {
    return owlterms.TDWG_VOC_TAXON_NAME;
  }

  /**
   * Returns the URI for a particular nomenclature code.
   */
  static getNomenCodeAsURI(name) {
    switch (name.toLowerCase()) {
      case 'iczn':
        return owlterms.ICZN_NAME;
      case 'icn':
      case 'icbn':
      case 'icnafp':
        return owlterms.ICN_NAME;
      case 'ictv':
        return owlterms.ICTV_NAME;
      case 'icnp':
        return owlterms.ICNP_NAME;
      default:
        return owlterms.NAME_IN_UNKNOWN_CODE;
    }
  }

  /**
   * Create a scientific name JSON object from a verbatim scientific name.
   */
  static fromVerbatimName(verbatimName, nomenCode = 'unknown') {
    // Have we already parsed this verbatim name?
    if (PhyxCacheManager.has(`TaxonNameWrapper.taxonNameCache.${nomenCode}`, verbatimName)) {
      return PhyxCacheManager.get(`TaxonNameWrapper.taxonNameCache.${nomenCode}`, verbatimName);
    }

    // Use a regular expression to parse the verbatimName.
    let txname;
    const results = /^([A-Z][a-z]+)[ _]([a-z-]+)(?:\b|_)\s*([a-z-]*)/.exec(verbatimName);

    if (results) {
      txname = {
        '@type': TaxonNameWrapper.TYPE_TAXON_NAME,
        nomenclaturalCode: TaxonNameWrapper.getNomenCodeAsURI(nomenCode),
        label: verbatimName,
        nameComplete: `${results[1]} ${results[2]} ${results[3]}`.trim(),
        genusPart: results[1],
        specificEpithet: results[2],
        infraspecificEpithet: results[3],
      };
    } else {
      // Is it a uninomial name?
      const checkUninomial = /^([A-Z][a-z]+)(?:[_\s]|\b)/.exec(verbatimName);
      if (checkUninomial) {
        txname = {
          '@type': TaxonNameWrapper.TYPE_TAXON_NAME,
          nomenclaturalCode: TaxonNameWrapper.getNomenCodeAsURI(nomenCode),
          label: verbatimName,
          nameComplete: checkUninomial[1],
          uninomial: checkUninomial[1],
        };
      }
    }

    // Store in the cache.
    if (txname !== undefined) {
      PhyxCacheManager.put(`TaxonNameWrapper.taxonNameCache.${nomenCode}`, verbatimName, txname);
    }

    return txname;
  }

  /**
   * Return the label of this scientific name.
   */
  get label() {
    return this.txname.label || this.nameComplete;
  }

  /**
   * Return the nomenclatural code of this taxon name.
   */
  get nomenclaturalCode() {
    return this.txname.nomenclaturalCode || TaxonNameWrapper.getNomenCodeAsURI('unknown');
  }

  /**
   * Return the verbatim name of this taxon name.
   */
  get verbatimName() {
    return this.txname.label;
  }

  /*
   * Return the complete name (i.e. the uninomial, binomial or trinomial name
   * without authority information).
   */
  get nameComplete() {
    return this.txname.nameComplete
      || this.trinomialName
      || this.binomialName
      || this.uninomialName;
  }

  /** Return the uninomial name if there is one. */
  get uninomialName() {
    if (has(this.txname, 'uninomial')) return this.txname.uninomial;

    // If there is no genus but there is a scientificName, try to extract a genus
    // from it.
    if (this.nameComplete) {
      const txname = TaxonNameWrapper.fromVerbatimName(this.nameComplete, this.nomenclaturalCode);
      if (has(txname, 'uninomial')) return txname.uninomial;
    }

    return undefined;
  }

  /** Return the binomial name if available. */
  get binomialName() {
    // Get the binomial name. Constructed from the genus and specific epithet
    // if available.
    if (this.genusPart === undefined || this.specificEpithet === undefined) return undefined;
    return `${this.genusPart} ${this.specificEpithet}`;
  }

  /** Return the trinomial name if available. */
  get trinomialName() {
    if (
      this.infraspecificEpithet === undefined
      || this.specificEpithet === undefined
      || this.genusPart === undefined
    ) return undefined;
    return `${this.genusPart} ${this.specificEpithet} ${this.infraspecificEpithet}`;
  }

  /** Return the genus part of this scientific name if available. */
  get genusPart() {
    // Try to read the genus if available.
    if (has(this.txname, 'genusPart')) return this.txname.genusPart;

    // If there is no genus but there is a scientificName, try to extract a genus
    // from it.
    if (this.nameComplete) {
      const txname = TaxonNameWrapper.fromVerbatimName(this.nameComplete, this.nomenclaturalCode);
      if (has(txname, 'genusPart')) return txname.genusPart;
    }

    return undefined;
  }

  /** Return the specific epithet of this scientific name if available. */
  get specificEpithet() {
    // Try to read the specific epithet if available.
    if (has(this.txname, 'specificEpithet')) return this.txname.specificEpithet;

    // If there is no specific epithet but there is a scientificName, try to
    // extract a specific epithet from it.
    if (this.nameComplete) {
      const txname = TaxonNameWrapper.fromVerbatimName(
        this.nameComplete,
        this.nomenclaturalCode
      );
      if (has(txname, 'specificEpithet')) return txname.specificEpithet;
    }

    return undefined;
  }

  /** Return the infraspecific epithet of this scientific name if available. */
  get infraspecificEpithet() {
    // Try to read the specific epithet if available.
    if (has(this.txname, 'infraspecificEpithet')) return this.txname.infraspecificEpithet;

    // If there is no specific epithet but there is a scientificName, try to
    // extract a specific epithet from it.
    if (this.nameComplete) {
      const txname = TaxonNameWrapper.fromVerbatimName(
        this.nameComplete,
        this.nomenclaturalCode
      );
      if (has(txname, 'infraspecificEpithet')) return txname.infraspecificEpithet;
    }

    return undefined;
  }

  /**
   * Return this taxon name in an JSON-LD representation.
   */
  asJSONLD() {
    const jsonld = cloneDeep(this.txname);

    // Make sure '@type' is an array.
    if (!has(jsonld, '@type')) jsonld['@type'] = [];
    if (!isArray(jsonld['@type'])) jsonld['@type'] = [jsonld['@type']];

    // Make it explicit that the type includes the nomenclaturalCode.
    const nomenCode = this.nomenclaturalCode;
    if (!jsonld['@type'].includes(nomenCode)) jsonld['@type'].push(nomenCode);

    return jsonld;
  }

  /**
   * Return this taxon name as an OWL equivalentClass expression.
   */
  get asOWLEquivClass() {
    // No complete name, can't return anything.
    if (!this.nameComplete) return undefined;

    return {
      '@type': 'owl:Restriction',
      onProperty: owlterms.TDWG_VOC_NAME_COMPLETE,
      hasValue: this.nameComplete,
    };
  }
}

module.exports = {
  TaxonNameWrapper,
};
