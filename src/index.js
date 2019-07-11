/**
 * PHYX Library
 * Copyright (c) The Phyloreferencing Project, 2018-19
 *
 * PHYloreference eXchange (PHYX) files store phyloreferences along with
 * annotated phylogenies that allow their expected resolution to be curated
 * and tested. This library provides classes and methods that help read and
 * manipulate components of PHYX files.
 *
 * Note that our goal here isn't to provide a library for modeling an entire
 * PHYX file in Javascript. The Curation Tool can mostly access and edit
 * components of the PHYX file as text strings or JSON objects, and the terms
 * used in the PHYX file should be clearly defined on their own. This library
 * contains convenience classes and methods that make accessing those components
 * easier.
 *
 * Most of these classes are wrappers. Because the object they wrap may be
 * unexpectedly modified through the UI, wrapper constructors should be extremely
 * lightweight so that the wrapper can be created quickly. Individual methods
 * can be complex and slow if necessary.
 */

/** The Phyx Cache Manager -- used to manage caches across this library. */
const { PhyxCacheManager } = require('./utils/PhyxCacheManager');

/** A TaxonConceptWrapper for wrapping taxonomic concepts. */
const { TaxonConceptWrapper } = require('./wrappers/TaxonConceptWrapper');

/** A TaxonNameWrapper for wrapping taxonomic names. */
const { TaxonNameWrapper } = require('./wrappers/TaxonNameWrapper');

/** A SpecimenWrapper for wrapping specimens. */
const { SpecimenWrapper } = require('./wrappers/SpecimenWrapper');

/** A TaxonomicUnitWrapper for wrapping taxonomic units. */
const { TaxonomicUnitWrapper } = require('./wrappers/TaxonomicUnitWrapper');

/** A TaxonomicUnitMatcher for matching taxonomic units. */
const { TaxonomicUnitMatcher } = require('./matchers/TaxonomicUnitMatcher');

/** A PhylogenyWrapper for wrapping phylogenies. */
const { PhylogenyWrapper } = require('./wrappers/PhylogenyWrapper');

/** A PhylorefWrapper for wrapping phyloreferences. */
const { PhylorefWrapper } = require('./wrappers/PhylorefWrapper');

/** A PhyxWrapper for wrapping an entire Phyx document. */
const { PhyxWrapper } = require('./wrappers/PhyxWrapper');

/* Exports */
module.exports = {
  TaxonConceptWrapper,
  TaxonNameWrapper,
  SpecimenWrapper,
  TaxonomicUnitWrapper,
  TaxonomicUnitMatcher,
  PhylogenyWrapper,
  PhylorefWrapper,
  PhyxWrapper,
  PhyxCacheManager,
  clearCaches() {
    // Clear the caches in the PhyxCacheManager.
    PhyxCacheManager.clear();
  },
};
