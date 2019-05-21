/** Utility functions. */
const { has } = require('lodash');

/** List of OWL/RDF terms we use. */
const owlterms = require('../utils/owlterms');

/** For parsing scientific names. */
const { TaxonNameWrapper } = require('./TaxonNameWrapper');

/**
 * The TaxonConceptWrapper wraps taxon concepts. These are taxonomic units with
 * a type of TaxonomicUnitWrapper.TYPE_TAXON_CONCEPT. They are based on the
 * Taxon Concept ontology at https://github.com/tdwg/ontology/tree/master/ontology/voc.
 *
 * A taxon concept:
 *    - SHOULD have a hasName property indicating the name this taxon refers to.
 *    - MAY have accordingTo, describedBy or circumscribedBy to indicate how this
 *      taxon concept should be circumscribed. If none of these are present,
 *      this taxonomic unit will be considered a taxon rather than a taxon concept
 *      (i.e. as a nominal taxon concept, as in https://github.com/darwin-sw/dsw/wiki/ClassTaxon).
 *    - MAY have nameString and accordingToString properties. We will fall back
 *      to these properties if hasName or accordingTo are missing.
 */

class TaxonConceptWrapper {
  /** The @type of a taxon or taxon concept. */
  static get TYPE_TAXON_CONCEPT() {
    return owlterms.TDWG_VOC_TAXON_CONCEPT;
  }

  /** Create a TaxonConceptWrapper around a taxon concept. */
  constructor(tunit) {
    this.tunit = tunit;
  }

  /**
   * Return the taxon name of this taxon concept (if any) as an object.
   */
  get taxonName() {
    // Do we have any names as taxon name objects?
    if (has(this.tunit, 'hasName')) return this.tunit.hasName;

    // Do we have a nameString with a taxon name as string?
    if (has(this.tunit, 'nameString')) return TaxonNameWrapper.fromVerbatimName(this.tunit.nameString);

    // If not, we have no name!
    return undefined;
  }

  /**
   * Return the complete taxon name of this taxon concept (if any), which is the
   * uninomial, binomial or trinomial name.
   */
  get nameComplete() {
    // Do we have any names as taxon name objects?
    if (has(this.tunit, 'hasName')) return new TaxonNameWrapper(this.tunit.hasName).nameComplete;

    // Do we have a nameString with a taxon name as string?
    if (has(this.tunit, 'nameString')) return TaxonNameWrapper.fromVerbatimName(this.tunit.nameString).nameComplete;

    // If not, we have no name!
    return undefined;
  }

  /**
   * Return the accordingTo information (if any) as an object.
   *
   * For now, we return this verbatim. Once we close #15, we should parse raw labels
   * with a CitationWrapper.
   */
  get accordingTo() {
    // Do we have any accordingTo information?
    if (has(this.tunit, 'accordingTo')) return this.type.accordingTo;

    // Do we have an accordingToString?
    if (has(this.tunit, 'accordingToString')) return this.type.accordingToString;

    // If not, we have no accodingTo information!
    return undefined;
  }

  /**
   * Return the accordingTo information (if any) as a string.
   *
   * For now, we stringify objects by converting them into JSON strings. Once we
   * close #15, we will be able to generate a label using CitationWrapper.
   */
  get accordingToString() {
    // Do we have any accordingTo information?
    if (has(this.tunit, 'accordingTo')) return JSON.stringify(this.type.accordingTo);

    // Do we have an accordingToString?
    if (has(this.tunit, 'accordingToString')) return this.type.accordingToString;

    // If not, we have no accodingTo information!
    return undefined;
  }

  /**
   * Return the label of this taxon concept.
   */
  get label() {
    // If we're wrapping a taxonName, use its label.
    if (this.taxonName) {
      // Do we also have accordingTo information?
      if (this.accordingToString) {
        return `${new TaxonNameWrapper(this.taxonName).label} sensu ${this.accordingToString}`;
      }

      return new TaxonNameWrapper(this.taxonName).label;
    }

    return undefined;
  }

  /**
   * Given a node label, attempt to parse it as a scientific name.
   *
   * Note that this is NOT memoized -- you should really be using
   * TaxonomicUnitWrapper.fromLabel() or TaxonNameWrapper.fromVerbatimName() rather
   * than calling this directly.
   *
   * @return A taxonomic unit that corresponds to this taxon concept.
   */
  static fromLabel(nodeLabel) {
    if (nodeLabel === undefined || nodeLabel === null || nodeLabel.trim() === '') return undefined;

    // Check if this label can be divided into a name and a sensu/sec component.
    const match = /^\s*(.*)\s+(?:sec|sensu)\.?\s+(.*)\s*$/.exec(nodeLabel);
    if (match) {
      return {
        '@type': TaxonConceptWrapper.TYPE_TAXON_CONCEPT,
        nameString: match[1],
        accordingTo: match[2],
      };
    }

    // Can we parse it as a taxon name? If not, we will return undefined.
    const taxonName = TaxonNameWrapper.fromVerbatimName(nodeLabel);
    if (taxonName) {
      return {
        '@type': TaxonConceptWrapper.TYPE_TAXON_CONCEPT,
        hasName: taxonName,
      };
    }

    // Couldn't parse it at all.
    return undefined;
  }

  /**
   * Return how this class should look in an OWL equivalentClass expression.
   *
   * Note that we don't include the accordingTo information in this
   * query, since we don't have a useful way to use that during OWL reasoning.
   */
  asEquivClass() {
    // Without a taxonomicName, we can't do anything.
    if (!this.taxonName) return undefined;

    return {
      '@type': 'owl:Restriction',
      onProperty: 'hasName',
      someValuesFrom: new TaxonNameWrapper(this.taxonName).asEquivClass(),
    };
  }
}

module.exports = {
  TaxonConceptWrapper,
};
