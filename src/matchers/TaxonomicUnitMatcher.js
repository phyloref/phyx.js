const { has } = require('lodash');
const { TaxonNameWrapper } = require('../wrappers/TaxonNameWrapper');
const { SpecimenWrapper } = require('../wrappers/SpecimenWrapper');

/* Taxonomic unit matching */

class TaxonomicUnitMatcher {
  // A taxonomic unit matcher tests for taxonomic matches between pairs of
  // taxonomic units.

  constructor(tunit1, tunit2) {
    // Construct a Taxonomic Unit Matcher to compare the two provided
    // taxonomic units.
    this.tunit1 = tunit1;
    this.tunit2 = tunit2;

    // Set up places to store the match results.
    this.matched = undefined; // Boolean variable for storing whether these TUnits matched.
    this.matchReason = undefined; // The reason provided for this match.

    // Execute the match.
    this.match();
  }

  asJSONLD(idURI) {
    // Return this TUMatch as a JSON object for insertion into the PHYX file.
    if (!this.matched) return undefined;

    return {
      '@id': idURI,
      '@type': 'testcase:TUMatch',
      reason: this.matchReason,
      matchesTaxonomicUnits: [
        { '@id': this.tunit1['@id'] },
        { '@id': this.tunit2['@id'] },
      ],
    };
  }

  match() {
    // Try to match the two taxonomic units using a number of matching methods.
    if (
      this.matchByBinomialName()
      || this.matchByExternalReferences()
      || this.matchBySpecimenIdentifier()
    ) {
      this.matched = true;
    } else {
      this.matched = false;
      this.matchReason = undefined;
    }
  }

  matchByBinomialName() {
    // Try to match by binomial name, and return true if it could be matched.

    // Do both TUnits have scientificNames?
    if (!has(this.tunit1, 'scientificNames') || !has(this.tunit2, 'scientificNames')) return false;

    return this.tunit1.scientificNames.some((scname1) => {
      const scname1wrapped = new TaxonNameWrapper(scname1);
      return this.tunit2.scientificNames.some((scname2) => {
        const scname2wrapped = new TaxonNameWrapper(scname2);

        const result = scname1wrapped.binomialName !== undefined
          && scname2wrapped.binomialName !== undefined
          && scname1wrapped.binomialName.trim().length > 0
          && scname1wrapped.binomialName.trim() === scname2wrapped.binomialName.trim();

        if (result) {
          this.matchReason = `Scientific name '${scname1wrapped.scientificName}' and scientific name '${scname2wrapped.scientificName}' share the same binomial name`;
        }

        return result;
      });
    });
  }

  matchByExternalReferences() {
    // Try to match by external references.

    if (has(this.tunit1, 'externalReferences') && has(this.tunit2, 'externalReferences')) {
      // Each external reference is a URL as a string. We will lowercase it,
      // but do no other transformation.
      return this.tunit1.externalReferences.some(
        extref1 => this.tunit2.externalReferences.some((extref2) => {
          const result = (
            // Make sure that the external reference isn't blank
            extref1.trim() !== ''

              // And that it is identical after trimming
              && extref1.toLowerCase().trim() === extref2.toLowerCase().trim()
          );

          if (result) {
            this.matchReason = `External reference '${extref1}' is shared by taxonomic unit ${this.tunit1} and ${this.tunit2}`;
          }

          return result;
        })
      );
    }

    return false;
  }

  matchBySpecimenIdentifier() {
    // Try to match by specimen identifier (i.e. occurrence ID).

    if (has(this.tunit1, 'includesSpecimens') && has(this.tunit2, 'includesSpecimens')) {
      // Convert specimen identifiers (if present) into a standard format and compare those.
      return this.tunit1.includesSpecimens.some((specimen1) => {
        const specimenURN1 = new SpecimenWrapper(specimen1).occurrenceID;
        return this.tunit2.includesSpecimens.some((specimen2) => {
          const specimenURN2 = new SpecimenWrapper(specimen2).occurrenceID;

          const result = (specimenURN1 === specimenURN2);

          if (result) {
            this.matchReason = `Specimen identifier '${specimenURN1}' is shared by taxonomic units`;
          }

          return result;
        });
      });
    }

    return false;
  }
}

module.exports = {
  TaxonomicUnitMatcher,
};
