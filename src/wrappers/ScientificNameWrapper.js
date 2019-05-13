const phyxCacheManager = require('../utils/PhyxCacheManager');

/* Scientific name processing */

class ScientificNameWrapper {
  // Wraps a scientific name to provide access to components of
  // the scientific name. For now, we ignore binomialName, genus and
  // specificEpithet and rederive them from the scientific name.

  constructor(scname) {
    // Create a new scientific name wrapper around the JSON representation of
    // a scientific name.
    this.scname = scname;
  }

  static createFromVerbatimName(verbatimName) {
    // Returns a scientific name object created from a particular verbatim name.
    // Not that the returned object will NOT be wrapped -- so remember to wrap it
    // if necessary!

    // Start with the 'scientific name' as the verbatim name.
    const scname = {
      scientificName: verbatimName,
    };

    // Split the verbatim name into a genus and specific epithet, if possible.
    // Splitting the verbatim name takes some time, so let's memoize this.
    if (phyxCacheManager.has('ScientificNameWrapper.scnameCache', verbatimName)) {
      return phyxCacheManager.get('ScientificNameWrapper.scnameCache', verbatimName);
    }

    const comps = verbatimName.split(/\s+/);

    // Did we find a binomial?
    if (comps.length >= 2) {
      [, scname.specificEpithet] = comps;
    }

    // Did we find a uninomial?
    if (comps.length >= 1) {
      [scname.genus] = comps;
    }

    // Store in the cache.
    phyxCacheManager.put('ScientificNameWrapper.scnameCache', verbatimName, scname);

    return scname;
  }

  get scientificName() {
    // Get the "dwc:scientificName" -- the complete scientific name.
    return this.scname.scientificName;
  }

  get binomialName() {
    // Get the binomial name. Constructed from the genus and specific epithet
    // if available.
    if (this.genus === undefined || this.specificEpithet === undefined) return undefined;
    return `${this.genus} ${this.specificEpithet}`;
  }

  get genus() {
    // Try to read the genus if available.
    if (hasOwnProperty(this.scname, 'genus')) return this.scname.genus;

    // If there is no genus but there is a scientificName, try to extract a genus
    // from it.
    if (hasOwnProperty(this.scname, 'scientificName')) {
      const scname = ScientificNameWrapper.createFromVerbatimName(this.scname.scientificName);
      if (hasOwnProperty(scname, 'genus')) return scname.genus;
    }
    return undefined;
  }

  get specificEpithet() {
    // Try to read the specific epithet if available.
    if (hasOwnProperty(this.scname, 'specificEpithet')) return this.scname.specificEpithet;

    // If there is no specific epithet but there is a scientificName, try to
    // extract a specific epithet from it.
    if (hasOwnProperty(this.scname, 'scientificName')) {
      const scname = ScientificNameWrapper.createFromVerbatimName(this.scname.scientificName);
      if (hasOwnProperty(scname, 'specificEpithet')) return scname.specificEpithet;
    }
    return undefined;
  }

  get label() {
    // Return a label corresponding to this scientific name -- we use the complete verbatim name.
    return this.scientificName;
  }
}

module.exports = {
  ScientificNameWrapper,
};
