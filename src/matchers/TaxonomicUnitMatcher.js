const { TaxonomicUnitWrapper } = require('../wrappers/TaxonomicUnitWrapper');
const { TaxonConceptWrapper } = require('../wrappers/TaxonConceptWrapper');
const { SpecimenWrapper } = require('../wrappers/SpecimenWrapper');

/**
 * The TaxonomicUnitMatcher matches pairs of taxonomic units and provides
 * a consistent report on:
 *  - Which taxonomic units have matched, and
 *  - Why the match occurred.
 *
 * In Model 2.0, we start by using direct matching in OWL, so this should no longer
 * be needed. However, I'll leave this around to provide matching in the
 * Curation Tool UI and in case it's needed again later.
 */
class TaxonomicUnitMatcher {
  /**
   * Create a Taxonomic Unit Matcher to match two taxonomic units. Matching
   * will occur immediately, so when this method returns, you can check
   * tuMatch.matched and tuMatch.matchReason to determine if the two TUs matched
   * and why.
   */
  constructor(tunit1, tunit2) {
    this.tunit1 = tunit1;
    this.tunit2 = tunit2;

    // Set up places to store the match results.
    this.matched = undefined; // Boolean variable for storing whether these TUnits matched.
    this.matchReason = undefined; // The reason provided for this match.

    // Execute the match.
    this.match();
  }

  /** Return this TUMatch as a JSON object for insertion into the PHYX file. */
  asJSONLD(idIRI) {
    if (!this.matched) return undefined;

    return {
      '@id': idIRI,
      reason: this.matchReason,
      matchesTaxonomicUnits: [
        { '@id': this.tunit1['@id'] },
        { '@id': this.tunit2['@id'] },
      ],
    };
  }

  /** Try to match the two taxonomic units using a number of matching methods. */
  match() {
    if (
      this.matchByNameComplete()
      || this.matchByExternalReferences()
      || this.matchByOccurrenceID()
    ) {
      this.matched = true;
    } else {
      this.matched = false;
      this.matchReason = undefined;
    }
  }

  /** Try to match by nameComplete, and return true if it could be matched. */
  matchByNameComplete() {
    // Note that this doesn't apply just to taxon concepts -- we try to match
    // any taxonomic units that have nameComplete, which might be taxon concepts
    // OR specimens with taxonomic units.
    const wrappedTName1 = new TaxonConceptWrapper(this.tunit1);
    const wrappedTName2 = new TaxonConceptWrapper(this.tunit2);

    if (
      wrappedTName1.nameComplete && wrappedTName2.nameComplete
      && wrappedTName1.nameComplete === wrappedTName2.nameComplete
    ) {
      this.matchReason = `Taxon name '${wrappedTName1.label}' and taxon name '${wrappedTName2.label}' share the same complete name`;
      return true;
    }

    return false;
  }

  /** Match by external references. */
  matchByExternalReferences() {
    const wrappedTUnit1 = new TaxonomicUnitWrapper(this.tunit1);
    const wrappedTUnit2 = new TaxonomicUnitWrapper(this.tunit2);

    const externalRefs1 = wrappedTUnit1.externalReferences;
    const externalRefs2 = wrappedTUnit2.externalReferences;

    return externalRefs1.some(
      (extref1) => externalRefs2.some(
        (extref2) => {
          if (
            extref1
            && extref2
            && (extref1.toLowerCase() === extref2.toLowerCase())
          ) {
            this.matchReason = `External reference '${extref1}' is shared by taxonomic unit ${this.tunit1} and ${this.tunit2}`;
            return true;
          }

          return false;
        }
      )
    );
  }

  /** Match by occurrence ID */
  matchByOccurrenceID() {
    // Are both TUs specimens?
    const wrappedTUnit1 = new TaxonomicUnitWrapper(this.tunit1);
    const wrappedTUnit2 = new TaxonomicUnitWrapper(this.tunit2);

    if (!wrappedTUnit1.types.includes(TaxonomicUnitWrapper.TYPE_SPECIMEN)) return false;
    if (!wrappedTUnit2.types.includes(TaxonomicUnitWrapper.TYPE_SPECIMEN)) return false;

    // Occurrence IDs from both taxonomic units.
    const wrappedSpecimen1 = new SpecimenWrapper(this.tunit1);
    const wrappedSpecimen2 = new SpecimenWrapper(this.tunit2);

    if (
      wrappedSpecimen1.occurrenceID && wrappedSpecimen2.occurrenceID
      && wrappedSpecimen1.occurrenceID === wrappedSpecimen2.occurrenceID
    ) {
      this.matchReason = `Specimen identifier '${wrappedSpecimen1.occurrenceID}' is shared by taxonomic units`;

      return true;
    }

    return false;
  }
}

module.exports = {
  TaxonomicUnitMatcher,
};
