const { has } = require('lodash');
const { TaxonConceptWrapper } = require('./TaxonConceptWrapper');
const owlterms = require('../utils/owlterms');
const { PhyxCacheManager } = require('../utils/PhyxCacheManager');

/**
 * The SpecimenWrapper wraps specimen taxonomic units. These can be identified
 * with a '@type' of SpecimenWrapper.TYPE_SPECIMEN (which is currently
 * https://dwc.tdwg.org/terms/#occurrence).
 *
 * - TaxonomicUnitWrapper.TYPE_SPECIMEN: A specimen.
 *    - Based on http://rs.tdwg.org/dwc/terms/Occurrence
 *    - Should have a dwc:occurrenceID with the occurrence identifier.
 *    - Should have a dwc:basisOfRecord to indicate what sort of occurrence this is.
 *
 * Since TaxonNameWrapper follows the TDWG ontology, we'd love to do the same for
 * SpecimenWrapper, but unfortunately the TaxonOccurrence ontology has been deprecated
 * (see https://github.com/tdwg/ontology). Therefore, it instead improvises a
 * representation based on dwc:Occurrence.
 */
class SpecimenWrapper {
  /** The '@type' of specimens in JSON-LD document. */
  static get TYPE_SPECIMEN() {
    return owlterms.DWC_OCCURRENCE;
  }

  /** Construct a wrapper around a specimen. */
  constructor(specimen) {
    this.specimen = specimen;
  }

  /**
   * Parse the provided occurrence ID. The two expected formats are:
   *  - 'urn:catalog:[institutionCode]:[collectionCode]:[catalogNumber]'
   *      (in which case, we ignore the first two "components" here)
   *  - '[institutionCode]:[collectionCode]:[catalogNumber]'
   */
  static fromOccurrenceID(occurrenceID, basisOfRecord = 'PreservedSpecimen') {
    // Copy the occurrence ID so we can truncate it if necessary.
    let occurID = occurrenceID;
    if (occurID.startsWith('urn:catalog:')) occurID = occurID.substr(12);

    // Prepare the specimen.
    const specimen = {
      '@type': SpecimenWrapper.TYPE_SPECIMEN,
      'dwc:basisOfRecord': basisOfRecord,
      occurrenceID: occurID,
    };

    // Look for certain prefixes that suggest that we've been passed a URN or
    // URL instead. If so, don't do any further processing!
    const URL_URN_PREFIXES = [
      'http://',
      'https://',
      'ftp://',
      'sftp://',
      'file://',
      'urn:',
    ];
    if (URL_URN_PREFIXES.filter((prefix) => occurID.toLowerCase().startsWith(prefix)).length > 0) {
      return specimen;
    }

    // Parsing an occurrence ID takes some time, so we should memoize it.
    if (PhyxCacheManager.has('SpecimenWrapper.occurrenceIDCache', occurID)) {
      return PhyxCacheManager.get('SpecimenWrapper.occurrenceIDCache', occurID);
    }

    // Split the occurrence ID into components, and store them in the appropriate fields.
    const comps = occurID.split(/:/);
    if (comps.length === 1) {
      // specimen.institutionCode = undefined;
      // specimen.collectionCode = undefined;
      [specimen.catalogNumber] = comps;
    } else if (comps.length === 2) {
      [specimen.institutionCode, specimen.catalogNumber] = comps;
    } else if (comps.length >= 3) {
      let catalogNumValues = []; // Store all split catalog number values.
      [specimen.institutionCode, specimen.collectionCode, ...catalogNumValues] = comps;
      specimen.catalogNumber = catalogNumValues.join(':');
    }

    PhyxCacheManager.put('SpecimenWrapper.occurrenceIDCache', occurID, specimen);
    return specimen;
  }

  /**
   * Get the catalogNumber if present.
   */
  get catalogNumber() {
    // Get the catalog number from the specimen object if present.
    if (has(this.specimen, 'catalogNumber')) return this.specimen.catalogNumber;

    // Otherwise, try to parse the occurrenceID and see if we can extract a
    // catalogNumber from there.
    if (has(this.specimen, 'occurrenceID')) {
      const specimen = SpecimenWrapper.fromOccurrenceID(this.specimen.occurrenceID);
      if (has(specimen, 'catalogNumber')) return specimen.catalogNumber;
    }
    return undefined;
  }

  /**
   * Get the institutionCode if present.
   */
  get institutionCode() {
    // Get the institution code from the specimen object if present.
    if (has(this.specimen, 'institutionCode')) return this.specimen.institutionCode;

    // Otherwise, try to parse the occurrenceID and see if we can extract an
    // occurrenceID from there.
    if (has(this.specimen, 'occurrenceID')) {
      const specimen = SpecimenWrapper.fromOccurrenceID(this.specimen.occurrenceID);
      if (has(specimen, 'institutionCode')) return specimen.institutionCode;
    }
    return undefined;
  }

  /**
   * Get the collectionCode if present.
   */
  get collectionCode() {
    // Get the collection code from the specimen object if present.
    if (has(this.specimen, 'collectionCode')) return this.specimen.collectionCode;

    // Otherwise, try to parse the occurrenceID and see if we can extract an
    // occurrenceID from there.
    if (has(this.specimen, 'occurrenceID')) {
      const specimen = SpecimenWrapper.fromOccurrenceID(this.specimen.occurrenceID);
      if (has(specimen, 'collectionCode')) return specimen.collectionCode;
    }
    return undefined;
  }

  /**
   * Return the occurrence ID of this specimen, if we have one. Otherwise, we
   * attempt to construct one in the form:
   *  "urn:catalog:" + institutionCode (if present) + ':' +
   *  collectionCode (if present) + ':' + catalogNumber (if present)
   */
  get occurrenceID() {
    // Return the occurrenceID if it exists.
    if (has(this.specimen, 'occurrenceID') && this.specimen.occurrenceID.trim() !== '') {
      return this.specimen.occurrenceID.trim();
    }

    // Otherwise, we could try to construct the occurrenceID from its components.
    if (has(this.specimen, 'catalogNumber')) {
      if (has(this.specimen, 'institutionCode')) {
        if (has(this.specimen, 'collectionCode')) {
          return `urn:catalog:${this.specimen.institutionCode.trim()}:${this.specimen.collectionCode.trim()}:${this.specimen.catalogNumber.trim()}`;
        }
        return `urn:catalog:${this.specimen.institutionCode.trim()}::${this.specimen.catalogNumber.trim()}`;
      }
      if (has(this.specimen, 'collectionCode')) {
        return `urn:catalog::${this.specimen.collectionCode.trim()}:${this.specimen.catalogNumber.trim()}`;
      }
      return `urn:catalog:::${this.specimen.catalogNumber.trim()}`;
    }

    // None of our specimen identifier schemes worked.
    return undefined;
  }

  /**
   * Return the basis of record, if one is present.
   */
  get basisOfRecord() {
    if (has(this.specimen, 'dwc:basisOfRecord')) return this.specimen['dwc:basisOfRecord'];
    return undefined;
  }

  /**
   * Set the basis of record. See http://rs.tdwg.org/dwc/terms/basisOfRecord for
   * recommended values.
   */
  set basisOfRecord(bor) {
    this.specimen['dwc:basisOfRecord'] = bor;
  }

  /** Return this specimen as a taxon concept if it contains taxon name information. */
  get taxonConcept() {
    if (has(this.specimen, 'hasName')) return this.specimen;
    if (has(this.specimen, 'nameString')) return this.specimen;
    return undefined;
  }

  /** Return a label for this specimen. */
  get label() {
    // We can't return anything without an occurrenceID.
    if (!this.occurrenceID) return undefined;

    // Note that specimens may be identified to a taxon concept. If so, we should
    // include that information in the label.
    if (this.taxonConcept) {
      return `Specimen ${this.occurrenceID} identified as ${new TaxonConceptWrapper(this.taxonConcept).label}`;
    }

    // Return a label for this specimen.
    return `Specimen ${this.occurrenceID}`;
  }

  /** Return this specimen as an equivalentClass expression. */
  get asOWLEquivClass() {
    // We can't do anything without an occurrence ID!
    if (!this.occurrenceID) return undefined;

    // TODO: Should we also match by this.taxonConcept is one is available?
    // Technically no, but it might be useful. Hmm.

    // Return as an OWL restriction.
    return {
      '@type': 'owl:Restriction',
      onProperty: owlterms.DWC_OCCURRENCE_ID,
      hasValue: this.occurrenceID,
    };
  }
}

module.exports = {
  SpecimenWrapper,
};
