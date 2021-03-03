/** Used to parse timestamps for phyloref statuses. */
const moment = require('moment');
const { has, cloneDeep, uniq } = require('lodash');

const owlterms = require('../utils/owlterms');
const { TaxonomicUnitWrapper } = require('./TaxonomicUnitWrapper');
const { TaxonConceptWrapper } = require('./TaxonConceptWrapper');
const { PhylogenyWrapper } = require('./PhylogenyWrapper');
const { CitationWrapper } = require('./CitationWrapper');

/**
 * PhylorefWrapper
 *
 */

class PhylorefWrapper {
  // Wraps a phyloreference in a PHYX model.

  constructor(phyloref, phyxDefaultNomenCode = owlterms.UNKNOWN_CODE) {
    // Wraps the provided phyloreference
    this.phyloref = phyloref;
    this.phyxDefaultNomenCode = phyxDefaultNomenCode;
  }

  /** Return the internal specifiers of this phyloref (if any). */
  get internalSpecifiers() {
    if (!has(this.phyloref, 'internalSpecifiers')) {
      this.phyloref.internalSpecifiers = [];
    }

    return this.phyloref.internalSpecifiers;
  }

  /** Return the external specifiers of this phyloref (if any). */
  get externalSpecifiers() {
    if (!has(this.phyloref, 'externalSpecifiers')) {
      this.phyloref.externalSpecifiers = [];
    }

    return this.phyloref.externalSpecifiers;
  }

  get label() {
    // Return a label for this phyloreference.
    if (has(this.phyloref, 'label')) return this.phyloref.label;
    if (has(this.phyloref, 'labels') && this.phyloref.labels.length > 0) return this.phyloref.labels[0];
    if (has(this.phyloref, 'title')) return this.phyloref.title;

    return undefined;
  }

  set label(newLabel) {
    // Set a label for this phyloreference.
    if (has(this.phyloref, 'label')) {
      this.phyloref.label = newLabel;
    } else {
      // Vue.set(this.phyloref, 'label', newLabel);
      this.phyloref.label = newLabel;
    }
  }

  /** Return all the specifiers of this phyloref (if any). */
  get specifiers() {
    // Returns a list of all specifiers by combining the internal and external
    // specifiers into a single list, with internal specifiers before
    // external specifiers.
    let specifiers = this.internalSpecifiers;
    specifiers = specifiers.concat(this.externalSpecifiers);
    return specifiers;
  }

  getSpecifierType(specifier) {
    // For a given specifier, return a string indicating whether it is
    // an 'Internal' or 'External' specifier.

    if (this.internalSpecifiers.includes(specifier)) return 'Internal';
    if (this.externalSpecifiers.includes(specifier)) return 'External';
    return 'Specifier';
  }

  setSpecifierType(specifier, specifierType) {
    // Change the type of a given specifier. To do this, we first need
    // to determine if it was originally an internal or external
    // specifier, then move it into the other list.

    let index;
    if (specifierType === 'Internal') {
      // To set a specifier to 'Internal', we might need to delete it from the
      // list of external specifiers first.
      index = this.externalSpecifiers.indexOf(specifier);
      if (index !== -1) this.externalSpecifiers.splice(index, 1);

      // Don't add it to the list of internal specifiers if it's already there.
      if (!this.internalSpecifiers.includes(specifier)) {
        this.phyloref.internalSpecifiers.unshift(specifier);
      }
    } else if (specifierType === 'External') {
      // To set a specifier to 'External', we might need to delete it from the
      // list of internal specifiers first.
      index = this.phyloref.internalSpecifiers.indexOf(specifier);
      if (index !== -1) this.phyloref.internalSpecifiers.splice(index, 1);

      // Don't add it to the list of internal specifiers if it's already there.
      if (!this.phyloref.externalSpecifiers.includes(specifier)) {
        this.phyloref.externalSpecifiers.unshift(specifier);
      }
    } else {
      // Neither internal nor external? Ignore.
    }
  }

  deleteSpecifier(specifier) {
    // Since the user interface combines specifiers into a single list,
    // it doesn't remember if the specifier to be deleted is internal
    // or external. We delete the intended specifier from both arrays.

    let index = this.phyloref.internalSpecifiers.indexOf(specifier);
    if (index !== -1) this.phyloref.internalSpecifiers.splice(index, 1);

    index = this.phyloref.externalSpecifiers.indexOf(specifier);
    if (index !== -1) this.phyloref.externalSpecifiers.splice(index, 1);
  }

  getExpectedNodeLabels(phylogeny) {
    // Given a phylogeny, determine which node labels we expect this phyloref to
    // resolve to. To do this, we:
    //  1. Find all node labels that are case-sensitively identical
    //     to the phyloreference.
    //  2. Find all node labels that have additionalNodeProperties with
    //     expectedPhyloreferenceNamed case-sensitively identical to
    //     the phyloreference.
    const phylorefLabel = this.label;
    const nodeLabels = new Set();

    new PhylogenyWrapper(
      phylogeny,
      this.defaultNomenCode
    ).getNodeLabels().forEach((nodeLabel) => {
      // Is this node label identical to the phyloreference name?
      if (nodeLabel === phylorefLabel) {
        nodeLabels.add(nodeLabel);
      } else if (
        has(phylogeny, 'additionalNodeProperties')
        && has(phylogeny.additionalNodeProperties, nodeLabel)
        && has(phylogeny.additionalNodeProperties[nodeLabel], 'expectedPhyloreferenceNamed')
      ) {
        // Does this node label have an expectedPhyloreferenceNamed that
        // includes this phyloreference name?

        const expectedPhylorefs = phylogeny
          .additionalNodeProperties[nodeLabel]
          .expectedPhyloreferenceNamed;

        if (expectedPhylorefs.includes(phylorefLabel)) {
          nodeLabels.add(nodeLabel);
        }
      }
    });

    // Return node labels sorted alphabetically.
    return Array.from(nodeLabels).sort();
  }

  static getStatusCURIEsInEnglish() {
    // Return dictionary of all phyloref statuses in English
    return {
      'pso:draft': 'Draft',
      'pso:final-draft': 'Final draft',
      'pso:under-review': 'Under review',
      'pso:submitted': 'Tested',
      'pso:published': 'Published',
      'pso:retracted-from-publication': 'Retracted',
    };
  }

  getCurrentStatus() {
    // Return a result object that contains:
    //  - status: phyloreference status as a short URI (CURIE)
    //  - statusInEnglish: an English representation of the phyloref status
    //  - intervalStart: the start of the interval
    //  - intervalEnd: the end of the interval

    if (
      has(this.phyloref, 'pso:holdsStatusInTime')
      && Array.isArray(this.phyloref['pso:holdsStatusInTime'])
      && this.phyloref['pso:holdsStatusInTime'].length > 0
    ) {
      // If we have any pso:holdsStatusInTime entries, pick the first one and
      // extract the CURIE and time interval information from it.
      const lastStatusInTime = this.phyloref['pso:holdsStatusInTime'][this.phyloref['pso:holdsStatusInTime'].length - 1];
      const statusCURIE = lastStatusInTime['pso:withStatus']['@id'];

      // Look for time interval information
      let intervalStart;
      let intervalEnd;

      if (has(lastStatusInTime, 'tvc:atTime')) {
        const atTime = lastStatusInTime['tvc:atTime'];
        if (has(atTime, 'timeinterval:hasIntervalStartDate')) intervalStart = atTime['timeinterval:hasIntervalStartDate'];
        if (has(atTime, 'timeinterval:hasIntervalEndDate')) intervalEnd = atTime['timeinterval:hasIntervalEndDate'];
      }

      // Return result object
      return {
        statusCURIE,
        statusInEnglish: PhylorefWrapper.getStatusCURIEsInEnglish()[statusCURIE],
        intervalStart,
        intervalEnd,
      };
    }

    // If we couldn't figure out a status for this phyloref, assume it's a draft.
    return {
      statusCURIE: 'pso:draft',
      statusInEnglish: PhylorefWrapper.getStatusCURIEsInEnglish()['pso:draft'],
    };
  }

  getStatusChanges() {
    // Return a list of status changes for a particular phyloreference
    if (has(this.phyloref, 'pso:holdsStatusInTime')) {
      return this.phyloref['pso:holdsStatusInTime'].map((entry) => {
        const result = {};

        // Create a statusCURIE convenience field.
        if (has(entry, 'pso:withStatus')) {
          result.statusCURIE = entry['pso:withStatus']['@id'];
          result.statusInEnglish = PhylorefWrapper.getStatusCURIEsInEnglish()[result.statusCURIE];
        }

        // Create intervalStart/intervalEnd convenient fields
        if (has(entry, 'tvc:atTime')) {
          const atTime = entry['tvc:atTime'];
          if (has(atTime, 'timeinterval:hasIntervalStartDate')) {
            result.intervalStart = atTime['timeinterval:hasIntervalStartDate'];
            result.intervalStartAsCalendar = moment(result.intervalStart).calendar();
          }

          if (has(atTime, 'timeinterval:hasIntervalEndDate')) {
            result.intervalEnd = atTime['timeinterval:hasIntervalEndDate'];
            result.intervalEndAsCalendar = moment(result.intervalEnd).calendar();
          }
        }

        return result;
      });
    }

    // No changes? Return an empty list.
    return [];
  }

  setStatus(status) {
    // Set the status of a phyloreference
    //
    // Check whether we have a valid status CURIE.
    if (!has(PhylorefWrapper.getStatusCURIEsInEnglish(), status)) {
      throw new TypeError(`setStatus() called with invalid status CURIE '${status}'`);
    }

    // See if we can end the previous interval.
    const currentTime = new Date(Date.now()).toISOString();

    if (!has(this.phyloref, 'pso:holdsStatusInTime')) {
      // Vue.set(this.phyloref, 'pso:holdsStatusInTime', []);
      this.phyloref['pso:holdsStatusInTime'] = [];
    }

    // Check to see if there's a previous time interval we should end.
    if (
      Array.isArray(this.phyloref['pso:holdsStatusInTime'])
      && this.phyloref['pso:holdsStatusInTime'].length > 0
    ) {
      const lastStatusInTime = this.phyloref['pso:holdsStatusInTime'][this.phyloref['pso:holdsStatusInTime'].length - 1];

      // if (!has(lastStatusInTime, 'tvc:atTime'))
      //  Vue.set(lastStatusInTime, 'tvc:atTime', {});
      if (!has(lastStatusInTime, 'tvc:atTime')) {
        lastStatusInTime['tvc:atTime'] = {};
      }
      if (!has(lastStatusInTime['tvc:atTime'], 'timeinterval:hasIntervalEndDate')) {
        // If the last time entry doesn't already have an interval end date, set it to now.
        lastStatusInTime['tvc:atTime']['timeinterval:hasIntervalEndDate'] = currentTime;
      }
    }

    // Create new entry.
    this.phyloref['pso:holdsStatusInTime'].push({
      '@type': 'http://purl.org/spar/pso/StatusInTime',
      'pso:withStatus': { '@id': status },
      'tvc:atTime': {
        'timeinterval:hasIntervalStartDate': currentTime,
      },
    });
  }

  /**
   * Return a list of all the unique nomenclatural codes used by this phyloreference.
   * The default nomenclatural code used in creating the PhylorefWrapper will be used
   * for any taxonomic units that don't have any nomenclatural code set. If any
   * specifiers are not taxon concepts, they will be represented in the returned
   * list as owlterms.UNKNOWN_CODE.
   */
  get uniqNomenCodes() {
    return uniq(this.specifiers.map((specifier) => {
      const taxonConcept = new TaxonomicUnitWrapper(
        specifier,
        this.phyxDefaultNomenCode
      ).taxonConcept;
      if (!taxonConcept) return owlterms.UNKNOWN_CODE;

      const nomenCode = new TaxonConceptWrapper(
        taxonConcept,
        this.phyxDefaultNomenCode
      ).nomenCode;
      if (!nomenCode) return owlterms.UNKNOWN_CODE;

      return nomenCode;
    }));
  }

  /**
   * Returns a summarized nomenclatural code for this phyloref. If all of the
   * specifiers have either the same nomenclatural code or `undefined`,
   * this getter will return that nomenclatural code. Otherwise, this method
   * will return owlterms.UNKNOWN_CODE.
   */
  get defaultNomenCode() {
    // Check to see if we have a single nomenclatural code to use.
    if (this.uniqNomenCodes.length === 1) return this.uniqNomenCodes[0];

    // If one or more of our specifiers have no nomenclatural code (e.g. if
    // they are specimens), they will show up as owlterms.UNKNOWN_CODE.
    // If we have a single nomenclatural code *apart* from all the
    // owlterms.UNKNOWN_CODEs, then that is still usable as a default
    // nomenclatural code for this phyloreference.
    const uniqNomenCodesNoUnknowns = this.uniqNomenCodes
      .filter(code => code !== owlterms.UNKNOWN_CODE);
    if (uniqNomenCodesNoUnknowns.length === 1) return uniqNomenCodesNoUnknowns[0];

    return owlterms.UNKNOWN_CODE;
  }

  /**
   * Create a component class for the set of internal and external specifiers provided.
   * We turn this into a label (in the form `A & B ~ C V D`), which we use to ensure that
   * we don't create more than one class for a particular set of internal and external
   * specifiers.
   * - jsonld: The JSON-LD representation of the Phyloreference this is an component class
   *   for. We mainly use this to retrieve its '@id'.
   * - internalSpecifiers: The set of internal specifiers for this component class.
   * - externalSpecifiers: The set of external specifiers for this component class.
   * - equivClass: The equivalent class expression for this component class as a function
   *   that returns the expression as a string.
   * - reusePrevious (default: true): If true, we reuse previous expressions with the
   *   same set of included and excluded specifiers. If false, we always generate a new
   *   component class for this expression.
   * - parentClass: If not undefined, provides a JSON-LD definition of the class to set as the
   *   parent class of this component class. We only use the ['@id'].
   */
  createComponentClass(
    jsonld,
    internalSpecifiers,
    externalSpecifiers,
    equivClass,
    reusePrevious = true,
    parentClass = undefined
  ) {
    if (internalSpecifiers.length === 0) throw new Error('Cannot create component class without any internal specifiers');
    if (internalSpecifiers.length === 1 && externalSpecifiers.length === 0) throw new Error('Cannot create component class with a single internal specifiers and no external specifiers');

    /* Generate a label that represents this component class. */

    // By default, taxonomic unit labels don't include the nomenclatural code.
    // However, we should include that here in order to distinguish between
    // taxonomic names in different taxonomic codes. This method generates that
    // name for a specifier.
    const outerThis = this;
    function generateSpecifierName(specifier) {
      const wrapped = new TaxonomicUnitWrapper(specifier, outerThis.defaultNomenCode);
      if (!wrapped) return '(error)';
      if (wrapped.taxonConcept) {
        const nomenCodeDetails = new TaxonConceptWrapper(wrapped.taxonConcept).nomenCodeDetails;
        if (nomenCodeDetails) return `${wrapped.label} (${nomenCodeDetails.shortName})`;
      }
      return wrapped.label;
    }

    // Start with the internal specifiers, concatenated with '&'.
    const internalSpecifierLabel = internalSpecifiers
      .map(generateSpecifierName)
      .sort()
      .join(' & ');
    let componentClassLabel = `(${internalSpecifierLabel}`;

    if (externalSpecifiers.length === 0) {
      componentClassLabel += ')';
    } else {
      // Add the external specifiers, concatenated with 'V'.
      const externalSpecifierLabel = externalSpecifiers
        .map(generateSpecifierName)
        .sort()
        .join(' V ');
      componentClassLabel += ` ~ ${externalSpecifierLabel})`;
    }

    // process.stderr.write(`component class label: ${componentClassLabel}\n`);

    // TODO We need to replace this with an actual object-based comparison,
    // rather than trusting the labels to tell us everything.
    if (reusePrevious && has(PhylorefWrapper.componentClassesByLabel, componentClassLabel)) {
      // If we see the same label again, return the previously defined component class.
      return { '@id': PhylorefWrapper.componentClassesByLabel[componentClassLabel]['@id'] };
    }

    // Create a new component class for this set of internal and external specifiers.
    PhylorefWrapper.componentClassCount += 1;
    const componentClass = {};
    componentClass['@id'] = `${jsonld['@id']}_component${PhylorefWrapper.componentClassCount}`;
    // process.stderr.write(`Creating new componentClass with id: ${componentClass['@id']}`);

    componentClass['@type'] = 'owl:Class';
    componentClass.label = componentClassLabel;
    componentClass.equivalentClass = equivClass;
    if (externalSpecifiers.length > 0) componentClass.subClassOf = ['phyloref:PhyloreferenceUsingMaximumClade'];
    else componentClass.subClassOf = ['phyloref:PhyloreferenceUsingMinimumClade'];

    if (parentClass) {
      componentClass.subClassOf.push({
        '@id': parentClass['@id'],
      });
    }

    jsonld.hasComponentClass.push(componentClass);
    PhylorefWrapper.componentClassesByLabel[componentClassLabel] = componentClass;

    return { '@id': componentClass['@id'] };
  }

  getIncludesRestrictionForTU(tu) {
    return {
      '@type': 'owl:Restriction',
      onProperty: 'phyloref:includes_TU',
      someValuesFrom: new TaxonomicUnitWrapper(tu, this.defaultNomenCode).asOWLEquivClass,
    };
  }

  /**
   * Return an OWL restriction for the most recent common ancestor (MRCA)
   * of two taxonomic units.
   */
  getMRCARestrictionOfTwoTUs(tu1, tu2) {
    return {
      '@type': 'owl:Restriction',
      onProperty: 'obo:CDAO_0000149', // cdao:has_Child
      someValuesFrom: {
        '@type': 'owl:Class',
        intersectionOf: [
          {
            '@type': 'owl:Restriction',
            onProperty: 'phyloref:excludes_TU',
            someValuesFrom: new TaxonomicUnitWrapper(tu1, this.defaultNomenCode).asOWLEquivClass,
          },
          this.getIncludesRestrictionForTU(tu2),
        ],
      },
    };
  }

  /*
   * Create an OWL restriction for a phyloreference made up entirely of internal
   * specifiers.
   *  - jsonld: the JSON-LD representation of this phyloreference in model 1.0.
   *    We mainly use this to access the '@id' and internal and external specifiers.
   *  - remainingInternals: all internal specifiers that have not yet been selected.
   *  - selected: internal specifiers have been seen selected. This should initially
   *    be [], and will be filled in when this method calls itself recursively.
   *
   * This method works like this:
   *  1. We have several special cases: we fail if 0 or 1 specifiers are
   *     provided, and we have a special representation for 2 specifiers.
   *  2. Create an expression for the currently selected specifiers. This expression
   *     is in the form:
   *       has_Child some (
   *        excludes_lineage_to some [remaining specifiers]
   *        and [selected specifiers]
   *       )
   *     We generate the expressions for remaining specifiers and selected specifiers by calling
   *     this method recursively.
   *  3. Finally, we select another internal from the remainingInternals and generate an
   *     expression for that selection by calling this method recursively. Note that we
   *     only process cases where there are more remainingInternals than selected
   *     internals -- when there are fewer, we'll just end up with the inverses of the
   *     previous comparisons, which we'll already have covered.
   */
  createClassExpressionsForInternals(jsonld, remainingInternals, selected) {
    // process.stderr.write(`@id [${jsonld['@id']}] Remaining internals:
    // ${remainingInternals.length}, selected: ${selected.length}\n`);

    // Quick special case: if we have two 'remainingInternals' and zero selecteds,
    // we can just return the MRCA for two internal specifiers.
    if (selected.length === 0) {
      if (remainingInternals.length === 2) {
        return [
          this.getMRCARestrictionOfTwoTUs(remainingInternals[0], remainingInternals[1]),
        ];
      } if (remainingInternals.length === 1) {
        throw new Error('Cannot determine class expression for a single specifier');
      } else if (remainingInternals.length === 0) {
        throw new Error('Cannot determine class expression for zero specifiers');
      }
    }

    // Step 1. If we've already selected something, create an expression for it.
    const classExprs = [];
    if (selected.length > 0) {
      let remainingInternalsExpr = [];
      if (remainingInternals.length === 1) {
        remainingInternalsExpr = this.getIncludesRestrictionForTU(remainingInternals[0]);
      } else if (remainingInternals.length === 2) {
        remainingInternalsExpr = this.getMRCARestrictionOfTwoTUs(
          remainingInternals[0],
          remainingInternals[1]
        );
      } else {
        remainingInternalsExpr = this.createComponentClass(
          jsonld,
          remainingInternals,
          [],
          this.createClassExpressionsForInternals(jsonld, remainingInternals, [])
        );
      }

      let selectedExpr = [];
      if (selected.length === 1) {
        selectedExpr = this.getIncludesRestrictionForTU(selected[0]);
      } else if (selected.length === 2) {
        selectedExpr = this.getMRCARestrictionOfTwoTUs(selected[0], selected[1]);
      } else {
        selectedExpr = this.createComponentClass(
          jsonld,
          selected,
          [],
          this.createClassExpressionsForInternals(jsonld, selected, [])
        );
      }

      classExprs.push({
        '@type': 'owl:Restriction',
        onProperty: 'obo:CDAO_0000149', // cdao:has_Child
        someValuesFrom: {
          '@type': 'owl:Class',
          intersectionOf: [{
            '@type': 'owl:Restriction',
            onProperty: 'phyloref:excludes_lineage_to',
            someValuesFrom: remainingInternalsExpr,
          }, selectedExpr],
        },
      });
    }

    // Step 2. Now select everything from remaining once, and start recursing through
    // every possibility.
    // Note that we only process cases where there are more remainingInternals than
    // selected internals -- when there are fewer, we'll just end up with the inverses
    // of the previous comparisons, which we'll already have covered.
    if (remainingInternals.length > 1 && selected.length <= remainingInternals.length) {
      remainingInternals.map(newlySelected => this.createClassExpressionsForInternals(
        jsonld,
        // The new remaining is the old remaining minus the selected TU.
        remainingInternals.filter(i => i !== newlySelected),
        // The new selected is the old selected plus the selected TU.
        selected.concat([newlySelected])
      ))
        .reduce((acc, val) => acc.concat(val), [])
        .forEach(expr => classExprs.push(expr));
    }

    return classExprs;
  }

  /*
   * Phyloref.asJSONLD(fallbackIRI)
   *
   * Export this phylogeny as JSON-LD.
   *
   * Arguments:
   *  - fallbackIRI: The base IRI to use for this phyloref if it does not have
   *    an '@id'.
   */
  asJSONLD(fallbackIRI) {
    // Keep all currently extant data.
    const phylorefAsJSONLD = cloneDeep(this.phyloref);

    // Set the @id and @type. If we don't already have an '@id', use the
    // fallbackIRI.
    if (!has(phylorefAsJSONLD, '@id')) phylorefAsJSONLD['@id'] = fallbackIRI;
    phylorefAsJSONLD['@type'] = 'owl:Class';

    // If we don't have a bibliographicCitation but we do have a definition source,
    // then generate a bibliographicCitation for the source.
    if (has(phylorefAsJSONLD, 'definitionSource')) {
      const definitionSource = phylorefAsJSONLD.definitionSource;
      if (!has(definitionSource, 'bibliographicCitation')) {
        definitionSource.bibliographicCitation = new CitationWrapper(definitionSource).toString();
      }
    }

    // Construct a class expression for this phyloreference.
    const internalSpecifiers = phylorefAsJSONLD.internalSpecifiers || [];
    const externalSpecifiers = phylorefAsJSONLD.externalSpecifiers || [];

    // If it is an apomorphy-based class expression, we can't generate logical
    // expressions for it anyway.
    const phylorefType = phylorefAsJSONLD.phylorefType;
    if (
      (phylorefType && phylorefType === 'phyloref:PhyloreferenceUsingApomorphy')
      || (has(phylorefAsJSONLD, 'apomorphy'))
    ) {
      // This is an apomorphy-based definition!
      phylorefAsJSONLD.subClassOf = [
        'phyloref:Phyloreference',
        'phyloref:PhyloreferenceUsingApomorphy',
      ];

      return phylorefAsJSONLD;
    }

    // We might need to make component classes.
    // So we reset our component class counts and records.
    PhylorefWrapper.componentClassCount = 0;
    PhylorefWrapper.componentClassesByLabel = {};
    phylorefAsJSONLD.hasComponentClass = [];

    // The type of this phyloreference.
    let calculatedPhylorefType;

    // The list of logical expressions generated for this phyloref.
    let logicalExpressions = [];

    if (internalSpecifiers.length === 0) {
      // We can't handle phyloreferences without at least one internal specifier.
      calculatedPhylorefType = 'phyloref:MalformedPhyloreference';
      phylorefAsJSONLD.malformedPhyloreference = 'No internal specifiers provided';
    } else if (externalSpecifiers.length > 0) {
      calculatedPhylorefType = 'phyloref:PhyloreferenceUsingMaximumClade';

      // If the phyloreference has at least one external specifier, we
      // can provide a simplified expression for the internal specifier,
      // in the form:
      //  phyloref:includes_TU some [internal1] and
      //  phyloref:includes_TU some [internal2] and ...
      //  phyloref:excludes_TU some [exclusion1] and
      //  has_Ancestor some (phyloref:excludesTU some [exclusion2]) ...
      //
      // Since we don't know which of the external specifiers will actually
      // be the one that will be used, we need to generate logical expressions
      // for every possibility.

      logicalExpressions = externalSpecifiers.map((selectedExternal) => {
        // Add the internal specifiers.
        const intersectionExprs = internalSpecifiers.map(
          sp => this.getIncludesRestrictionForTU(sp)
        );

        // Add the selected external specifier.
        intersectionExprs.push({
          '@type': 'owl:Restriction',
          onProperty: 'phyloref:excludes_TU',
          someValuesFrom: new TaxonomicUnitWrapper(
            selectedExternal,
            this.defaultNomenCode
          ).asOWLEquivClass,
        });

        // Collect all of the externals that are not selected.
        const remainingExternals = externalSpecifiers.filter(ex => ex !== selectedExternal);

        // Add the remaining externals, which we assume will resolve outside of
        // this clade.
        remainingExternals.forEach((externalTU) => {
          intersectionExprs.push({
            '@type': 'owl:Restriction',
            onProperty: 'obo:CDAO_0000144', // has_Ancestor
            someValuesFrom: {
              '@type': 'owl:Restriction',
              onProperty: 'phyloref:excludes_TU',
              someValuesFrom: new TaxonomicUnitWrapper(
                externalTU,
                this.defaultNomenCode
              ).asOWLEquivClass,
            },
          });
        });

        return {
          '@type': 'owl:Class',
          intersectionOf: intersectionExprs,
        };
      });
    } else {
      calculatedPhylorefType = 'phyloref:PhyloreferenceUsingMinimumClade';

      // We only have internal specifiers. We therefore need to use the algorithm in
      // this.createClassExpressionsForInternals() to create this expression.
      logicalExpressions = this.createClassExpressionsForInternals(
        phylorefAsJSONLD, internalSpecifiers, []
      );
    }

    // If we have a single logical expression, we set that as an equivalentClass
    // expression. If we have more than one, we produce multiple component classes
    // to represent it.
    if (logicalExpressions.length === 0) {
      // This is fine, as long as there is an explanation in
      // phyloref.malformedPhyloreference explaining why no logical expressions
      // could be generated. Otherwise, throw an error.
      if (!has(phylorefAsJSONLD, 'malformedPhyloreference')) {
        throw new Error(
          `Phyloref ${this.label} was generated by Phyx.js with neither logical expressions nor an explanation for the lack of logical expressions. `
          + 'This indicates an error in the Phyx.js library. Please report this bug at https://github.com/phyloref/phyx.js/issues.'
        );
      }
    } else if (logicalExpressions.length === 1) {
      // If we have a single logical expression, then that is what this phyloref
      // is equivalent to.
      phylorefAsJSONLD.equivalentClass = logicalExpressions[0];
    } else {
      // If we have multiple logical expressions, the phyloreference can be
      // represented by any of them. We model this by creating subclasses of
      // the phyloreference for each logical expression -- that way, it's clear
      // that these expressions aren't equivalent to each other (which is what
      // caused https://github.com/phyloref/phyx.js/issues/57), but nodes
      // resolved by any of those expressions will also be included in the
      // phyloreference itself.
      //
      // Note that there are two differences from the way in which we usually call
      // this.createComponentClass():
      //  1. Usually, createComponentClass() reuses logical expressions with the
      //     same sets of internal and external specifiers. That won't work here,
      //     since *all* these logical expressions have the same specifiers. So,
      //     we turn off caching.
      //  2. We need to set each of these component classes to be a subclass of
      //     this phyloreference so that it can include instances from each of the
      //     logical expressions.
      logicalExpressions.forEach(classExpr => this.createComponentClass(
        phylorefAsJSONLD,
        internalSpecifiers,
        externalSpecifiers,
        classExpr,
        // False in order to turn off caching by internal and external specifiers.
        false,
        // Make the new component class a subclass of this phyloreference.
        phylorefAsJSONLD
      ));
    }

    // Every phyloreference is a subclass of phyloref:Phyloreference.
    if (!phylorefAsJSONLD.subClassOf) phylorefAsJSONLD.subClassOf = [];
    if (!Array.isArray(phylorefAsJSONLD.subClassOf)) {
      phylorefAsJSONLD.subClassOf = [phylorefAsJSONLD.subClassOf];
    }
    phylorefAsJSONLD.subClassOf.push('phyloref:Phyloreference');

    // If the this Phyloref has a phylorefType that differs from the calculated
    // phyloref type, throw an error.
    if (has(phylorefAsJSONLD, 'phylorefType') && phylorefAsJSONLD.phylorefType !== calculatedPhylorefType) {
      throw new Error(
        `Phyloref ${this.label} has phylorefType set to '${phylorefAsJSONLD.phylorefType}', but it appears to be a '${calculatedPhylorefType}'.`
      );
    }
    phylorefAsJSONLD.subClassOf.push(calculatedPhylorefType);

    return phylorefAsJSONLD;
  }
}

module.exports = {
  PhylorefWrapper,
};
