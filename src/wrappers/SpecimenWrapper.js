const { has } = require('lodash');
const { PhyxCacheManager } = require('../utils/PhyxCacheManager');

/* Specimen wrapper */

class SpecimenWrapper {
  // Wraps a specimen identifier.

  constructor(specimen) {
    // Constructs a wrapper around a specimen.
    this.specimen = specimen;

    if (!has(specimen, 'occurrenceID')) {
      // There might be a catalogNumber, institutionCode or a collectionCode.
      // In which case, let's construct an occurrenceID!
      if (has(specimen, 'catalogNumber')) {
        if (has(specimen, 'institutionCode')) {
          if (has(specimen, 'collectionCode')) {
            this.specimen.occurrenceID = `urn:catalog:${specimen.institutionCode}:${specimen.collectionCode}:${specimen.catalogNumber}`;
          } else {
            this.specimen.occurrenceID = `urn:catalog:${specimen.institutionCode}::${specimen.catalogNumber}`;
          }
        } else {
          this.specimen.occurrenceID = `urn:catalog:::${specimen.catalogNumber}`;
        }
      } else {
        this.specimen.occurrenceID = 'urn:catalog:::';
      }
    }
  }

  static createFromOccurrenceID(occurrenceID) {
    // Create a specimen object from the occurrence ID.
    // The two expected formats are:
    //  - 'urn:catalog:[institutionCode]:[collectionCode]:[catalogNumber]'
    //      (in which case, we ignore the first two "components" here)
    //  - '[institutionCode]:[collectionCode]:[catalogNumber]'
    // Note that the returned object is NOT wrapped -- so please wrap it if needed!

    // Copy the occurrence ID so we can truncate it if necessary.
    let occurID = occurrenceID;
    if (occurID.startsWith('urn:catalog:')) occurID = occurID.substr(12);

    // Prepare the specimen.
    const specimen = {
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
    if (URL_URN_PREFIXES.filter(prefix => occurID.toLowerCase().startsWith(prefix)).length > 0) {
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

  get catalogNumber() {
    // Get the catalog number from the specimen object if present.
    if (has(this.specimen, 'catalogNumber')) return this.specimen.catalogNumber;

    // Otherwise, try to parse the occurrenceID and see if we can extract a
    // catalogNumber from there.
    if (has(this.specimen, 'occurrenceID')) {
      const specimen = SpecimenWrapper.createFromOccurrenceID(this.specimen.occurrenceID);
      if (has(specimen, 'catalogNumber')) return specimen.catalogNumber;
    }
    return undefined;
  }

  get institutionCode() {
    // Get the institution code from the specimen object if present.
    if (has(this.specimen, 'institutionCode')) return this.specimen.institutionCode;

    // Otherwise, try to parse the occurrenceID and see if we can extract an
    // occurrenceID from there.
    if (has(this.specimen, 'occurrenceID')) {
      const specimen = SpecimenWrapper.createFromOccurrenceID(this.specimen.occurrenceID);
      if (has(specimen, 'institutionCode')) return specimen.institutionCode;
    }
    return undefined;
  }

  get collectionCode() {
    // Get the collection code from the specimen object if present.
    if (has(this.specimen, 'collectionCode')) return this.specimen.collectionCode;

    // Otherwise, try to parse the occurrenceID and see if we can extract an
    // occurrenceID from there.
    if (has(this.specimen, 'occurrenceID')) {
      const specimen = SpecimenWrapper.createFromOccurrenceID(this.specimen.occurrenceID);
      if (has(specimen, 'collectionCode')) return specimen.collectionCode;
    }
    return undefined;
  }

  get occurrenceID() {
    // Does this specimen have an occurrenceID? If so, return it.
    // If not, we attempt to construct one in the form:
    //   "urn:catalog:" + institutionCode (if present) + ':' +
    //      collectionCode (if present) + ':' + catalogNumber (if present)
    // If all else fails, we return undefined.
    //
    // If this was a full wrapper, we might create a setter on the occurrenceID;
    // however, the Vue model modifies the underlying specimen object, not the
    // wrapper.

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

  get label() {
    // Return a label for this specimen
    return `Specimen ${this.occurrenceID}`;
  }
}

module.exports = {
  SpecimenWrapper,
};
