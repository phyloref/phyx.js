/** Utility functions. */
const { has, isArray, cloneDeep } = require('lodash');

/** List of OWL/RDF terms we use. */
const owlterms = require('../utils/owlterms');

/** We store the taxonomic units we extract from phylogeny labels in the Phyx Cache Manager. */
const { PhyxCacheManager } = require('../utils/PhyxCacheManager');

/** For parsing specimen identifiers. */
const { SpecimenWrapper } = require('./SpecimenWrapper');

/** For parsing scientific names. */
const { TaxonNameWrapper } = require('./TaxonNameWrapper');

/**
 * The TaxonomicUnitWrapper wraps taxonomic units, whether on a node or being used
 * as a specifier on a phyloreference. It also contains static methods for extracting
 * taxonomic units from arbitrary strings, such as phylogeny labels.
 *
 * Every taxonomic unit SHOULD have an rdfs:label and MAY include a dcterm:description
 * to describe it in human-readable terms. It MUST include a '@type' that specifies
 * what type of taxonomic unit it is:
 *
 *  - TaxonomicUnitWrapper.TYPE_TAXON_CONCEPT: A taxon concept.
 *    - Based on http://rs.tdwg.org/ontology/voc/TaxonConcept#TaxonConcept
 *    - SHOULD have a hasName property indicating the name this taxon refers to.
 *    - MAY have accordingTo, describedBy or circumscribedBy to indicate how this
 *      taxon concept should be circumscribed. If none of these are present,
 *      this taxonomic unit will be considered a taxon rather than a taxon concept
 *      (i.e. as a nominal taxon concept, as in https://github.com/darwin-sw/dsw/wiki/ClassTaxon).
 *    - MAY have nameString and accordingToString properties. We will fall back
 *      to these properties if hasName or accordingTo are missing.
 *
 *  - TaxonomicUnitWrapper.TYPE_SPECIMEN: A specimen.
 *    - Based on http://rs.tdwg.org/dwc/terms/Occurrence
 *    - Should have an occurrenceID with the occurrence identifier.
 *
 * Taxonomic units may be specified with only an '@id' or a set of '@id's, which
 * indicate external references. We will add extra types for TYPE_APOMORPHY and
 * TYPE_PHYLOREF when needed.
 *
 * TODO: We need to develop a syntax for representing apomorphies and referencing
 * phyloreferences.
 */

class TaxonomicUnitWrapper {
  /* Types of taxonomic units we support (see documentation above). */

  /** A taxon or taxon concept. */
  static get TYPE_TAXON_CONCEPT() {
    return 'http://rs.tdwg.org/ontology/voc/TaxonConcept#TaxonConcept';
  }

  /** A specimen. */
  static get TYPE_SPECIMEN() {
    return 'http://rs.tdwg.org/ontology/voc/Specimen#Specimen';
  }

  /** Wrap a taxonomic unit. */
  constructor(tunit) {
    this.tunit = tunit;
  }

  /**
   * What type of specifier is this? This is a URL that represents the type of
   * specifier we have.
   */
  get type() {
    return this.tunit['@type'];
  }

  /**
   * Return the taxon name of this taxonomic unit (if any).
   */
  get taxonName() {
    // Only taxon concepts have scientific names.
    if (this.type !== TaxonomicUnitWrapper.TYPE_TAXON_CONCEPT) return undefined;

    // Do we have any names?
    if (has(this.tunit, 'hasName')) return this.type.hasName;

    // Do we have a nameString?
    if (has(this.tunit, 'nameString')) return TaxonNameWrapper.createFromVerbatimName(this.tunit.nameString);

    // If not, we have no name!
    return undefined;
  }

  /**
   * Return the accordingTo information (if any).
   */
  get accordingTo() {
    // Only taxon concepts have accordingTo information.
    if (this.type !== TaxonomicUnitWrapper.TYPE_TAXON_CONCEPT) return undefined;

    // For now, we return this verbatim. Once we close #15, we should wrap this
    // with a CitationWrapper.

    // Do we have any accordingTo information?
    if (has(this.tunit, 'accordingTo')) return this.type.accordingTo;

    // Do we have an accordingToString?
    if (has(this.tunit, 'accordingToString')) return this.type.accordingToString;

    // If not, we have no accodingTo information!
    return undefined;
  }

  /**
   * Return the specimen in this taxonomic unit (if any).
   */
  get specimen() {
    // Only specimens have scientific names.
    if (this.type !== TaxonomicUnitWrapper.TYPE_SPECIMEN) return undefined;

    // Look for an occurrenceID.
    if (has(this.tunit, 'occurrenceID')) return this.tunit.occurrenceID;

    // No specimen in this taxonomic unit!
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
    const labels = [];

    // A label or description for this TU?
    if (has(this.tunit, 'label')) return this.tunit.label;
    if (has(this.tunit, 'description')) return this.tunit.description;

    // Any specimens?
    const specimens = this.specimens;
    if (specimens.length > 0) {
      specimens.forEach((specimen) => {
        labels.push(new SpecimenWrapper(specimen).label);
      });
    }

    // Any external references?
    const externalReferences = this.externalReferences;
    if (externalReferences.length > 0) {
      externalReferences.forEach(externalRef => labels.push(`<${externalRef}>`));
    }

    // Any scientific names?
    const scientificNames = this.scientificNames;
    if (scientificNames.length > 0) {
      scientificNames.forEach((scname) => {
        labels.push(new TaxonNameWrapper(scname).label);
      });
    }

    // If we don't have any properties of a taxonomic unit, return undefined.
    if (labels.length === 0) return undefined;

    return labels.join(' or ');
  }

  /**
   * Given a node label, attempt to parse it as a scientific name.
   * @return A list of taxonomic units.
   */
  static getTaxonomicUnitsFromNodeLabel(nodeLabel) {
    if (nodeLabel === undefined || nodeLabel === null) return [];

    // This regular expression times a while to run, so let's memoize this.
    if (PhyxCacheManager.has('TaxonomicUnitWrapper.taxonomicUnitsFromNodeLabelCache', nodeLabel)) {
      return PhyxCacheManager.get('TaxonomicUnitWrapper.taxonomicUnitsFromNodeLabelCache', nodeLabel);
    }

    // Taxonomic units found in label.
    const tunits = [];

    // Can we parse the name into a scientific name?
    const scientificName = TaxonNameWrapper.createFromVerbatimName(nodeLabel);
    if (scientificName !== undefined) {
      tunits.push(scientificName);
    }

    // Record in the cache
    PhyxCacheManager.put('TaxonomicUnitWrapper.taxonomicUnitsFromNodeLabelCache', nodeLabel, tunits);

    return tunits;
  }

  asJSONLD() {
    const jsonld = cloneDeep(this.tunit);

    if (has(this.tunit, '@type')) {
      if (isArray(this.tunit['@type'])) this.tunit['@type'].push(owlterms.CDAO_TU);
    }

    if (this.type === TaxonomicUnitWrapper.TYPE_TAXON_CONCEPT) {
      const wrappedTaxonName = new TaxonNameWrapper(this.taxonName);

      jsonld.equivalentClass = {
        '@type': 'owl:Restriction',
        onProperty: 'hasName',
        someValuesFrom: wrappedTaxonName.asJSONLD(),
      };
    } else if (this.type === TaxonomicUnitWrapper.TYPE_SPECIMEN) {
      const wrappedSpecimen = new SpecimenWrapper(this.specimen);

      jsonld.equivalentClass = wrappedSpecimen.asJSONLD();
    } else {
      // Nothing we can do, so just ignore it.
    }

    return jsonld;
  }
}

module.exports = {
  TaxonomicUnitWrapper,
};
