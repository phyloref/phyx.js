/** Utility functions. */
const { has } = require('lodash');

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
    this.txname = txname;
  }

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
  static createFromVerbatimName(verbatimName, nomenCode = 'unknown') {
    // Have we already parsed this verbatim name?
    if (PhyxCacheManager.has(`TaxonNameWrapper.taxonNameCache.${nomenCode}`, verbatimName)) {
      return PhyxCacheManager.get(`TaxonNameWrapper.taxonNameCache.${nomenCode}`, verbatimName);
    }

    // Use a regular expression to parse the verbatimName.
    let txname;
    const results = /^([A-Z][a-z]+)[ _]([a-z-]+)(?:\b|_)\s*(.*)/.exec(verbatimName);

    if (results !== null) {
      txname = {
        '@type': TaxonNameWrapper.TYPE_TAXON_NAME,
        nomenclaturalCode: TaxonNameWrapper.getNomenCodeAsURI(nomenCode),
        label: verbatimName,
        nameComplete: `${results[1]} ${results[2]} ${results[3]}`.trim(),
        genusPart: results[1],
        specificEpithet: results[2],
      };
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
   * Return the verbatim name of this scientific name.
   */
  get verbatimName() {
    return this.txname.label;
  }

  /*
   * Return the complete name (i.e. the uninomial, binomial or trinomial name
   * without authority information).
   */
  get nameComplete() {
    return this.txname.nameComplete;
  }

  /** Return the binomial name if available. */
  get binomialName() {
    // Get the binomial name. Constructed from the genus and specific epithet
    // if available.
    if (this.genusPart === undefined || this.specificEpithet === undefined) return undefined;
    return `${this.genusPart} ${this.specificEpithet}`;
  }

  /** Return the genus part of this scientific name if available. */
  get genusPart() {
    // Try to read the genus if available.
    if (has(this.txname, 'genusPart')) return this.txname.genus;

    // If there is no genus but there is a scientificName, try to extract a genus
    // from it.
    if (has(this.txname, 'nameComplete')) {
      const txname = TaxonNameWrapper.createFromVerbatimName(this.txname.nameComplete);
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
    if (has(this.txname, 'nameComplete')) {
      const txname = TaxonNameWrapper.createFromVerbatimName(this.txname.scientificName);
      if (has(txname, 'specificEpithet')) return txname.specificEpithet;
    }
    return undefined;
  }
}

module.exports = {
  TaxonNameWrapper,
};
