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
 *
 * Every instance of this class is expected to have some combination of the
 * following fields:
 *  - rdfs:label -- the verbatim taxon name
 *  - nameComplete -- the complete uninomial, binomial or trinomial name.
 *  - nomenclaturalCode -- the nomenclatural code under which the complete name
 *    should be interpreted.
 *
 * We will also read the following fields if they are present:
 *  - uninomial: The uninomial name of this taxon, if one is present.
 *  - genusPart: The genus name.
 *  - specificEpithet: The specific epithet.
 *  - infraspecificEpithet: The infraspecific epithet.
 *
 * We wrap whatever we're given, so we won't assume that these fields are actually
 * consistent with each other. However, when one of these fields are set, we
 * overwrite the nameComplete to ensure that they are consistent. Similarly,
 * changing the nameComplete will overwrite the genusPart, specificEpithet and
 * infraspecificEpithet.
 *
 * Note that the TaxonName ontology recommends dc:title instead of rdfs:label;
 * however, I like the idea of using dc:title for documents and rdfs:label for
 * vocabulary terms, so I'm okay with using rdfs:label for the verbatim name.
 */
class TaxonNameWrapper {
  /**
   * Create a new taxon name wrapper around the JSON representation of
   * a taxon name.
   */
  constructor(txname, defaultNomenCode = owlterms.UNKNOWN_CODE) {
    if (txname === undefined) throw new Error('TaxonNameWrapper tried to wrap undefined');
    this.txname = txname;
    this.defaultNomenCode = defaultNomenCode;
  }

  /**
   * The type associated with these taxonName objects.
   */
  static get TYPE_TAXON_NAME() {
    return owlterms.TDWG_VOC_TAXON_NAME;
  }

  /**
   * The IRI for an unknown nomenclatural code (i.e. all we know is that it's a scientific name).
   */
  static get UNKNOWN_CODE() {
    return owlterms.UNKNOWN_CODE;
  }

  /* Directly access IRIs for nomenclatural codes. */
  static get ICZN_CODE() { return owlterms.ICZN_CODE; }

  static get ICN_CODE() { return owlterms.ICN_CODE; }

  static get ICNP_CODE() { return owlterms.ICNP_CODE; }

  static get ICTV_CODE() { return owlterms.ICTV_CODE; }

  static get ICNCP_CODE() { return owlterms.ICNCP_CODE; }

  /**
   * Return a list of all supported nomenclatural code. Each entry will have
   * the following keys:
   *  - code: A list of short names that can be used to represent this nomenclatural code.
   *  - label: An informal name of this nomenclatural code in English.
   *  - title: The formal name of this nomenclatural code in English.
   *  - iri: The IRI of this nomenclatural code.
   *
   * This will be used in drawing user interfaces, so this should be in order
   * of likelihood of use.
   */
  static getNomenclaturalCodes() {
    return [
      // Note: the unknown code needs to be the first one in this list.
      {
        iri: owlterms.UNKNOWN_CODE,
        shortName: 'Code not known',
        label: 'Nomenclatural code not known',
        title: 'Nomenclatural code not known',
      },
      {
        iri: owlterms.ICZN_CODE,
        shortName: 'ICZN',
        label: 'Animals (ICZN)',
        title: 'International Code of Zoological Nomenclature',
      },
      {
        iri: owlterms.ICN_CODE,
        shortName: 'ICN',
        label: 'Algae, fungi and plants (ICN, previously ICBN)',
        title: 'International Code of Nomenclature for algae, fungi, and plants',
      },
      {
        iri: owlterms.ICNP_CODE,
        shortName: 'ICNP',
        label: 'Prokaryotes (ICNP)',
        title: 'International Code of Nomenclature of Prokaryotes',
      },
      {
        iri: owlterms.ICTV_CODE,
        shortName: 'ICTV',
        label: 'Viruses (ICTV)',
        title: 'International Committee on Taxonomy of Viruses',
      },
      {
        iri: owlterms.ICNCP_CODE,
        shortName: 'ICNCP',
        label: 'Cultivated plants (ICNCP)',
        title: 'International Code of Cultivated Plants',
      },
    ];
  }

  /**
   * Returns the nomenclatural code entry for a code.
   */
  static getNomenCodeDetails(nomenCode) {
    const codes = TaxonNameWrapper.getNomenclaturalCodes();

    // If the nomenCode provided is owlterms.UNKNOWN_CODE,
    // return that entry.
    if (nomenCode === owlterms.UNKNOWN_CODE) {
      return codes[0];
    }

    // Look for the entry with the same IRI as the provided IRI.
    const matchingCode = codes
      .find(code => (code.iri || '').toLowerCase() === nomenCode.toLowerCase());
    if (matchingCode) return matchingCode;
    return undefined;
  }

  /**
   * Returns the nomenclatural code of this taxon name.
   */
  get nomenclaturalCode() {
    return this.txname.nomenclaturalCode || this.defaultNomenCode;
  }

  /**
   * Returns the nomenclatural code of this taxon name as a IRI.
   */
  get nomenclaturalCodeDetails() {
    const nomenCode = this.nomenclaturalCode;
    const nomenObj = TaxonNameWrapper.getNomenCodeDetails(nomenCode);
    if (!nomenObj) return undefined;

    return nomenObj;
  }

  /**
   * Set the nomenclatural code of this taxon name.
   */
  set nomenclaturalCode(nomenCode) {
    this.txname.nomenclaturalCode = nomenCode;
  }

  /**
   * Parses a verbatim taxon name into an (unwrapped) TaxonName.
   */
  static fromVerbatimName(verbatimName, nomenCode = owlterms.UNKNOWN_CODE) {
    // Have we already parsed this verbatim name?
    if (PhyxCacheManager.has(`TaxonNameWrapper.taxonNameCache.${nomenCode}`, verbatimName)) {
      return PhyxCacheManager.get(`TaxonNameWrapper.taxonNameCache.${nomenCode}`, verbatimName);
    }

    // Use a regular expression to parse the verbatimName.

    // Attempt 1. Look for a trinomial name.
    let txname;
    let results = /^([A-Z][a-z]+)[ _]([a-z-]+\.?)(?:\b|_)\s*([a-z-]+)\b/.exec(verbatimName);

    if (results) {
      txname = {
        '@type': TaxonNameWrapper.TYPE_TAXON_NAME,
        label: verbatimName,
        nameComplete: `${results[1]} ${results[2]} ${results[3]}`.trim(),
        genusPart: results[1],
        specificEpithet: results[2],
        infraspecificEpithet: results[3],
      };
    }

    // Attempt 2. Look for a binomial name.
    if (!txname) {
      results = /^([A-Z][a-z]+)[ _]([a-z-]+\.?)(?:\b|_)/.exec(verbatimName);

      if (results) {
        txname = {
          '@type': TaxonNameWrapper.TYPE_TAXON_NAME,
          label: verbatimName,
          nameComplete: `${results[1]} ${results[2]}`.trim(),
          genusPart: results[1],
          specificEpithet: results[2],
        };
      }
    }

    // Attempt 3. Look for a uninomial name.
    if (!txname) {
      // Is it a uninomial name?
      results = /^([A-Z][a-z]+)(?:[_\s]|\b)/.exec(verbatimName);
      if (results) {
        txname = {
          '@type': TaxonNameWrapper.TYPE_TAXON_NAME,
          label: verbatimName,
          nameComplete: results[1],
          uninomial: results[1],
        };
      }
    }

    // Add a nomenclatural code if possible.
    if (txname && nomenCode) {
      txname.nomenclaturalCode = nomenCode;
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
   * Set the label of this scientific name.
   */
  set label(lab) {
    this.txname.label = lab;
    if (!this.nameComplete) {
      // If we don't have a nameComplete, treat this as the name complete.
      this.nameComplete = lab;
    }
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

  /**
   * Set the complete name. To do this, we re-parse the provided name.
   */
  set nameComplete(name) {
    this.txname = TaxonNameWrapper.fromVerbatimName(name, this.nomenclaturalCode);
  }

  /** Return the uninomial name if there is one. */
  get uninomial() {
    if (this.txname.uninomial) return this.txname.uninomial;

    // If there is no genus but there is a scientificName, try to extract a genus
    // from it.
    if (this.txname.nameComplete) {
      const txname = TaxonNameWrapper.fromVerbatimName(
        this.txname.nameComplete,
        this.nomenclaturalCode
      );
      if (has(txname, 'uninomial')) return txname.uninomial;
    }

    return undefined;
  }

  /** Set the uninomial name. */
  set uninomial(uninom) {
    this.txname.uninomial = uninom;
    this.txname.nameComplete = uninom;
  }

  /** Return the binomial name if available. */
  get binomialName() {
    // Get the binomial name. Constructed from the genus and specific epithet
    // if available.
    if (this.genusPart === undefined || this.specificEpithet === undefined) return undefined;
    return `${this.genusPart} ${this.specificEpithet}`;
  }

  /** Set the binomial name. */
  set binomialName(binom) {
    this.txname.uninomial = undefined;
    this.txname.nameComplete = binom;
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

  /** Set the trinomial name. */
  set trinomialName(trinom) {
    this.txname.uninomial = undefined;
    this.txname.nameComplete = trinom;
  }

  /** Return the genus part of this scientific name if available. */
  get genusPart() {
    // Try to read the genus if available.
    if (has(this.txname, 'genusPart')) return this.txname.genusPart;

    // If there is no genus but there is a scientificName, try to extract a genus
    // from it.
    if (this.txname.nameComplete) {
      const txname = TaxonNameWrapper.fromVerbatimName(
        this.txname.nameComplete,
        this.nomenclaturalCode
      );
      if (has(txname, 'genusPart')) return txname.genusPart;
    }

    return undefined;
  }

  /** Set the genus part of this name. */
  set genusPart(genus) {
    this.txname.genusPart = genus;
    if (this.specificEpithet) {
      if (this.infraspecificEpithet) {
        this.txname.nameComplete = `${genus} ${this.specificEpithet} ${this.infraspecificEpithet}`;
      } else {
        this.txname.nameComplete = `${genus} ${this.specificEpithet}`;
      }
    }
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

  /** Set the specificEpithet part of this name. */
  set specificEpithet(epithet) {
    this.txname.specificEpithet = epithet;
    if (this.genusPart) {
      if (this.infraspecificEpithet) {
        this.txname.nameComplete = `${this.genusPart} ${epithet} ${this.infraspecificEpithet}`;
      } else {
        this.txname.nameComplete = `${this.genusPart} ${epithet}`;
      }
    }
  }

  /** Return the infraspecific epithet of this scientific name if available. */
  get infraspecificEpithet() {
    // Try to read the specific epithet if available.
    if (has(this.txname, 'infraspecificEpithet')) return this.txname.infraspecificEpithet;

    // If there is no specific epithet but there is a scientificName, try to
    // extract a specific epithet from it.
    if (this.txname.nameComplete) {
      const txname = TaxonNameWrapper.fromVerbatimName(
        this.nameComplete,
        this.nomenclaturalCode
      );
      if (has(txname, 'infraspecificEpithet')) return txname.infraspecificEpithet;
    }

    return undefined;
  }

  /** Set the infraspecificEpithet part of this name. */
  set infraspecificEpithet(epithet) {
    this.txname.infraspecificEpithet = epithet;
    if (this.genusPart) {
      if (this.specificEpithet) {
        this.txname.nameComplete = `${this.genusPart} ${this.specificEpithet} ${epithet}`;
      } else {
        this.txname.nameComplete = `${this.genusPart} sp. ${epithet}`;
      }
    }
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
  get asOWLEquivClass() {
    // No complete name, can't return anything.
    if (!this.nameComplete) return undefined;

    // Do we have a nomenclaturalCode?
    if (!this.nomenclaturalCode) {
      return {
        '@type': 'owl:Restriction',
        onProperty: owlterms.TDWG_VOC_NAME_COMPLETE,
        hasValue: this.nameComplete,
      };
    }

    // If we do have a nomenclatural code, incorporate that into the logical
    // expression as well.
    return {
      '@type': 'owl:Class',
      intersectionOf: [{
        '@type': 'owl:Restriction',
        onProperty: owlterms.TDWG_VOC_NAME_COMPLETE,
        hasValue: this.nameComplete,
      }, {
        '@type': 'owl:Restriction',
        onProperty: owlterms.NOMENCLATURAL_CODE,
        hasValue: {
          '@id': this.nomenclaturalCode,
        },
      }],
    };
  }
}

module.exports = {
  TaxonNameWrapper,
};
