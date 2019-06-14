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
    this.txname = txname;
  }

  /**
   * The type associated with these taxonName objects.
   */
  static get TYPE_TAXON_NAME() {
    return owlterms.TDWG_VOC_TAXON_NAME;
  }

  /**
   * Return a list of all supported nomenclatural code. Each entry will have
   * the following keys:
   *  - code: A list of short names that can be used to represent this nomenclatural code.
   *  - label: An informal name of this nomenclatural code in English.
   *  - title: The formal name of this nomenclatural code in English.
   *  - uri: The URI of this nomenclatural code.
   *
   * This will be used in drawing user interfaces, so this should be in order
   * of likelihood of use.
   */
  static getNomenclaturalCodes() {
    return [
      {
        code: ['iczn'],
        label: 'Zoological name (ICZN)',
        title: 'International Code of Zoological Nomenclature',
        uri: owlterms.ICZN_NAME,
      },
      {
        code: ['icn', 'icbn', 'icnafp'],
        label: 'Algae, fungi and plants (ICNafp or ICBN)',
        title: 'International Code of Nomenclature for algae, fungi, and plants',
        uri: owlterms.ICN_NAME,
      },
      {
        code: ['icnp'],
        label: 'Prokaryotes (ICNP)',
        title: 'International Code of Nomenclature of Prokaryotes',
        uri: owlterms.ICNP_NAME,
      },
      {
        code: ['ictv'],
        label: 'Viruses (ICTV)',
        title: 'International Committee on Taxonomy of Viruses',
        uri: owlterms.ICTV_NAME,
      },
      {
        code: ['unknown'],
        label: 'Unknown',
        title: 'Unknown nomenclatural code',
        uri: owlterms.NAME_IN_UNKNOWN_CODE,
      },
    ];
  }

  /**
   * Returns the URI for a particular nomenclature code.
   */
  static getNomenCodeAsURI(nomenCode) {
    const codes = TaxonNameWrapper.getNomenclaturalCodes();
    const matchingCode = codes.find(code => code.code.includes(nomenCode.toLowerCase()));
    if (matchingCode) return matchingCode.uri;
    return owlterms.NAME_IN_UNKNOWN_CODE;
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
        nomenclaturalCode: nomenCode,
        label: verbatimName,
        nameComplete: `${results[1]} ${results[2]} ${results[3]}`.trim(),
        genusPart: results[1],
        specificEpithet: results[2],
      };
    } else {
      // Is it a uninomial name?
      const checkUninomial = /^([A-Z][a-z]+)(?:[_\s]|\b)/.exec(verbatimName);
      if (checkUninomial) {
        txname = {
          '@type': TaxonNameWrapper.TYPE_TAXON_NAME,
          nomenclaturalCode: nomenCode,
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
   * Set the nomenclatural code of this taxon name.
   */
  set nomenclaturalCode(nomenCode) {
    this.txname.nomenclaturalCode = nomenCode;
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
    return this.txname.nameComplete;
  }

  /** Return the uninomial name if there is one. */
  get uninomial() {
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

  /**
   * Return this taxon name in an JSON-LD representation.
   */
  get asJSONLD() {
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
  asOWLEquivClass() {
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
