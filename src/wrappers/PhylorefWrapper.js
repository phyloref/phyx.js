/** Used to parse timestamps for phyloref statuses. */
const moment = require('moment');
const { has, cloneDeep } = require('lodash');

const { TaxonomicUnitWrapper } = require('./TaxonomicUnitWrapper');
const { PhylogenyWrapper } = require('./PhylogenyWrapper');

/**
 * PhylorefWrapper
 *
 */

class PhylorefWrapper {
  // Wraps a phyloreference in a PHYX model.

  constructor(phyloref) {
    // Wraps the provided phyloreference
    this.phyloref = phyloref;
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

    new PhylogenyWrapper(phylogeny).getNodeLabels().forEach((nodeLabel) => {
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
   * Create an additional class for the set of internal and external specifiers provided.
   * We turn this into a label (in the form `A & B ~ C V D`), which we use to ensure that
   * we don't create more than one class for a particular set of internal and external
   * specifiers.
   * - jsonld: The JSON-LD representation of the Phyloreference this is an additional class
   *   for. We mainly use this to retrieve its '@id'.
   * - internalSpecifiers: The set of internal specifiers for this additional class.
   * - externalSpecifiers: The set of external specifiers for this additional class.
   * - equivClass: The equivalent class expression for this additional class as a function
   *   that returns the expression as a string.
   * - reusePrevious (default: true): If true, we reuse previous expressions with the
   *   same set of included and excluded specifiers. If false, we always generate a new
   *   additional class for this expression.
   * - parentClass: If not undefined, provides a JSON-LD definition of the class to set as the
   *   parent class of this additional class. We only use the ['@id'].
   */
  static createAdditionalClass(jsonld, internalSpecifiers, externalSpecifiers, equivClass, reusePrevious = true, parentClass = undefined) {
    if (internalSpecifiers.length === 0) throw new Error('Cannot create additional class without any internal specifiers');
    if (internalSpecifiers.length === 1 && externalSpecifiers.length === 0) throw new Error('Cannot create additional class with a single internal specifiers and no external specifiers');

    /* Generate a label that represents this additional class. */

    // Start with the internal specifiers, concatenated with '&'.
    const internalSpecifierLabel = internalSpecifiers
      .map(i => new TaxonomicUnitWrapper(i).label || '(error)')
      .sort()
      .join(' & ');
    let additionalClassLabel = `(${internalSpecifierLabel}`;

    if (externalSpecifiers.length === 0) {
      additionalClassLabel += ')';
    } else {
      // Add the external specifiers, concatenated with 'V'.
      const externalSpecifierLabel = externalSpecifiers
        .map(i => new TaxonomicUnitWrapper(i).label || '(error)')
        .sort()
        .join(' V ');
      additionalClassLabel += ` ~ ${externalSpecifierLabel})`;
    }

    // process.stderr.write(`Additional class label: ${additionalClassLabel}\n`);

    // TODO We need to replace this with an actual object-based comparison,
    // rather than trusting the labels to tell us everything.
    if (reusePrevious && has(PhylorefWrapper.additionalClassesByLabel, additionalClassLabel)) {
      // If we see the same label again, return the previously defined additional class.
      return { '@id': PhylorefWrapper.additionalClassesByLabel[additionalClassLabel]['@id'] };
    }

    // Create a new additional class for this set of internal and external specifiers.
    PhylorefWrapper.additionalClassCount += 1;
    const additionalClass = {};
    additionalClass['@id'] = `${jsonld['@id']}_additional${PhylorefWrapper.additionalClassCount}`;
    // process.stderr.write(`Creating new additionalClass with id: ${additionalClass['@id']}`);

    additionalClass['@type'] = 'owl:Class';
    additionalClass.label = additionalClassLabel;
    additionalClass.equivalentClass = equivClass;
    if(externalSpecifiers.length > 0)
      additionalClass.subClassOf = ['phyloref:PhyloreferenceUsingMaximumClade'];
    else
      additionalClass.subClassOf = ['phyloref:PhyloreferenceUsingMinimumClade'];

    if(parentClass) additionalClass.subClassOf.push({
      '@id': parentClass['@id']
    });

    jsonld.hasAdditionalClass.push(additionalClass);
    PhylorefWrapper.additionalClassesByLabel[additionalClassLabel] = additionalClass;

    return { '@id': additionalClass['@id'] };
  }

  static getIncludesRestrictionForTU(tu) {
    return {
      '@type': 'owl:Restriction',
      onProperty: 'phyloref:includes_TU',
      someValuesFrom: new TaxonomicUnitWrapper(tu).asOWLEquivClass,
    };
  }

  /**
   * Return an OWL restriction for the most recent common ancestor (MRCA)
   * of two taxonomic units.
   */
  static getMRCARestrictionOfTwoTUs(tu1, tu2) {
    return {
      '@type': 'owl:Restriction',
      onProperty: 'obo:CDAO_0000149', // cdao:has_Child
      someValuesFrom: {
        '@type': 'owl:Class',
        intersectionOf: [
          {
            '@type': 'owl:Restriction',
            onProperty: 'phyloref:excludes_TU',
            someValuesFrom: new TaxonomicUnitWrapper(tu1).asOWLEquivClass,
          },
          PhylorefWrapper.getIncludesRestrictionForTU(tu2),
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
  static createClassExpressionsForInternals(jsonld, remainingInternals, selected) {
    // process.stderr.write(`@id [${jsonld['@id']}] Remaining internals:
    // ${remainingInternals.length}, selected: ${selected.length}\n`);

    // Quick special case: if we have two 'remainingInternals' and zero selecteds,
    // we can just return the MRCA for two internal specifiers.
    if (selected.length === 0) {
      if (remainingInternals.length === 2) {
        return [
          PhylorefWrapper.getMRCARestrictionOfTwoTUs(remainingInternals[0], remainingInternals[1]),
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
        remainingInternalsExpr = PhylorefWrapper.getIncludesRestrictionForTU(remainingInternals[0]);
      } else if (remainingInternals.length === 2) {
        remainingInternalsExpr = PhylorefWrapper.getMRCARestrictionOfTwoTUs(
          remainingInternals[0],
          remainingInternals[1]
        );
      } else {
        remainingInternalsExpr = PhylorefWrapper.createAdditionalClass(
          jsonld,
          remainingInternals,
          [],
          PhylorefWrapper.createClassExpressionsForInternals(jsonld, remainingInternals, [])
        );
      }

      let selectedExpr = [];
      if (selected.length === 1) {
        selectedExpr = PhylorefWrapper.getIncludesRestrictionForTU(selected[0]);
      } else if (selected.length === 2) {
        selectedExpr = PhylorefWrapper.getMRCARestrictionOfTwoTUs(selected[0], selected[1]);
      } else {
        selectedExpr = PhylorefWrapper.createAdditionalClass(
          jsonld,
          selected,
          [],
          PhylorefWrapper.createClassExpressionsForInternals(jsonld, selected, [])
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
      remainingInternals.map(newlySelected => PhylorefWrapper.createClassExpressionsForInternals(
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
   * Given an expression that evaluates to an included node and a taxonomic unit,
   * return an expression for including it and excluding the TU. Note that this
   * always returns an array.
   *
   * When the included expression includes a single taxonomic unit (i.e. is in the
   * form `includes_TU some [TU]`), then the simple form is adequate. However, when
   * it's a more complex expression, it's possible that the excluded TU isn't just
   * sister to this clade but outside of it entirely. In that case, we add another
   * class expression:
   *  [includesExpr] and (has_Ancestor some (excludes_TU some [TU]))
   */
  static getClassExpressionsForExprAndTU(includedExpr, tu) {
    if (!includedExpr) throw new Error('Exclusions require an included expression');

    const exprs = [{
      '@type': 'owl:Class',
      intersectionOf: [
        includedExpr,
        {
          '@type': 'owl:Restriction',
          onProperty: 'phyloref:excludes_TU',
          someValuesFrom: new TaxonomicUnitWrapper(tu).asOWLEquivClass,
        },
      ],
    }];

    if (!Array.isArray(includedExpr) && has(includedExpr, 'onProperty') && includedExpr.onProperty === 'phyloref:includes_TU') {
      // In this specific set of circumstances, we do NOT need to add the has_Ancestor check.
    } else {
      // Add the has_Ancestor check!
      exprs.push({
        '@type': 'owl:Class',
        intersectionOf: [
          includedExpr,
          {
            '@type': 'owl:Restriction',
            onProperty: 'obo:CDAO_0000144', // has_Ancestor
            someValuesFrom: {
              '@type': 'owl:Restriction',
              onProperty: 'phyloref:excludes_TU',
              someValuesFrom: new TaxonomicUnitWrapper(tu).asOWLEquivClass,
            },
          },
        ],
      });
    }

    return exprs;
  }


  /*
   * Returns a list of class expressions for a phyloreference that has an expression
   * for the MRCA of its internal specifiers, but also has one or more external specifiers.
   *  - jsonld: The JSON-LD form of the Phyloreference from Model 1.0. Mainly used
   *    for retrieving the '@id' and the specifiers.
   *  - accumulatedExpr: Initially, an expression that evaluates to the MRCA of all
   *    internal specifiers, calculated using createClassExpressionsForInternals().
   *    When we call this method recusively, this expression will incorporate
   *    representations of external references.
   *  - remainingExternals: External specifiers that are yet to be incorporated into the
   *    expressions we are building.
   *  - selected: External specifiers that have already been selected.
   *
   * Our overall algorithm here is:
   *  1. If we need to add a single remaining external to the accumulated expression,
   *     we can do that by adding an `excludes_TU` to the expression (and possibly a
   *     `has_Ancestor` check, see getClassExpressionsForExprAndTU()).
   *  2. If we need to add more than one remaining external, we select each external
   *     specifier one at a time. We add the selected specifier to the accumulated
   *     expression using getClassExpressionsForExprAndTU(), and then call ourselves
   *     recursively to add the remaining specifiers.
   *
   * The goal here is to create expressions for every possible sequence of external
   * specifiers, so we can account for cases where some external specifiers are closer
   * to the initial internal-specifier-only expression than others.
   */
  static createClassExpressionsForExternals(jsonld, accumulatedExpr, remainingExternals, selected) {
    // process.stderr.write(`@id [${jsonld['@id']}] Remaining externals:
    // ${remainingExternals.length}, selected: ${selected.length}\n`);

    // Step 1. If we only have one external remaining, we can provide our two-case example
    // to detect it.
    const classExprs = [];
    if (remainingExternals.length === 0) {
      throw new Error('Cannot create class expression when no externals remain');
    } else if (remainingExternals.length === 1) {
      const remainingExternalsExprs = PhylorefWrapper.getClassExpressionsForExprAndTU(
        accumulatedExpr,
        remainingExternals[0],
        selected.length > 0
      );
      remainingExternalsExprs.forEach(expr => classExprs.push(expr));
    } else { // if(remainingExternals.length > 1)
      // Recurse into remaining externals. Every time we select a single entry,
      // we create a class expression for that.
      remainingExternals.map((newlySelected) => {
        // process.stderr.write(`Selecting new object, remaining now at:
        // ${remainingExternals.filter(i => i !== newlySelected).length},
        // selected: ${selected.concat([newlySelected]).length}\n`);

        // Create a new additional class for the accumulated expression plus the
        // newly selected external specifier.
        const newlyAccumulatedExpr = PhylorefWrapper.createAdditionalClass(
          jsonld,
          jsonld.internalSpecifiers,
          selected.concat([newlySelected]),
          PhylorefWrapper.getClassExpressionsForExprAndTU(
            accumulatedExpr, newlySelected, selected.length > 0
          )
        );

        // Call ourselves recursively to add the remaining externals.
        return PhylorefWrapper.createClassExpressionsForExternals(
          jsonld,
          newlyAccumulatedExpr,
          // The new remaining is the old remaining minus the selected TU.
          remainingExternals.filter(i => i !== newlySelected),
          // The new selected is the old selected plus the selected TU.
          selected.concat([newlySelected])
        );
      })
        .reduce((acc, val) => acc.concat(val), [])
        .forEach(expr => classExprs.push(expr));
    }

    return classExprs;
  }

  /*
   * Phyloref.asJSONLD(phylorefURI)
   *
   * Export this phylogeny as JSON-LD.
   *
   * Arguments:
   *  - fallbackIRI: The base IRI to use for this phyloref if it does not have
   *    an '@id'.
   */
  asJSONLD(fallbackIRI) {
    // Keep all currently extant data.
    // - baseURI: the base URI for this phyloreference
    const phylorefAsJSONLD = cloneDeep(this.phyloref);

    // Set the @id and @type. If we don't already have an '@id', use the
    // fallbackIRI.
    if (!has(phylorefAsJSONLD, '@id')) phylorefAsJSONLD['@id'] = fallbackIRI;
    phylorefAsJSONLD['@type'] = 'owl:Class';

    // Construct a class expression for this phyloreference.
    const internalSpecifiers = phylorefAsJSONLD.internalSpecifiers || [];
    const externalSpecifiers = phylorefAsJSONLD.externalSpecifiers || [];

    // In the following section: we ran into a bug (https://github.com/phyloref/phyx.js/issues/57)
    // that was caused by OWL reasoners deciding that two phylorefs were identical
    // because they shared an equivalentClass expression. To prevent this from
    // happening, we now set up each phyloreference as a subclass of every logical
    // expression that evaluates to it. We use the createAdditionalClass() method
    // to do that, passing it `false` to ensure that it doesn't just reuse existing
    // additional classes when doing this.

    // We might need to make additional JSON-LD.
    // So we reset our additional class counts and records.
    PhylorefWrapper.additionalClassCount = 0;
    PhylorefWrapper.additionalClassesByLabel = {};
    phylorefAsJSONLD.hasAdditionalClass = [];

    if (internalSpecifiers.length === 0) {
      // We can't handle phyloreferences without at least one internal specifier.
      phylorefAsJSONLD.malformedPhyloreference = 'No internal specifiers provided';
    } else if (externalSpecifiers.length > 0) {
      // If the phyloreference has at least one external specifier, we
      // can provide a simplified expression for the internal specifier,
      // in the form:
      //  phyloref:includes_TU some [internal1] and
      //  phyloref:includes_TU some [internal2] and ...
      // To which we can then add the external specifiers.
      if (internalSpecifiers.length === 1) {
        PhylorefWrapper.createClassExpressionsForExternals(
          phylorefAsJSONLD,
          PhylorefWrapper.getIncludesRestrictionForTU(internalSpecifiers[0]),
          externalSpecifiers,
          []
        ).forEach(classExpr => PhylorefWrapper.createAdditionalClass(
          phylorefAsJSONLD,
          internalSpecifiers,
          externalSpecifiers,
          classExpr,
          false,
          phylorefAsJSONLD
        ));
      } else {
        const expressionForInternals = {
          '@type': 'owl:Class',
          intersectionOf: internalSpecifiers.map(PhylorefWrapper.getIncludesRestrictionForTU),
        };

        PhylorefWrapper.createClassExpressionsForExternals(
          phylorefAsJSONLD, expressionForInternals, externalSpecifiers, []
        ).forEach(classExpr => PhylorefWrapper.createAdditionalClass(
          phylorefAsJSONLD,
          internalSpecifiers,
          externalSpecifiers,
          classExpr,
          false,
          phylorefAsJSONLD
        ));
      }
    } else {
      // We only have internal specifiers. We therefore need to use the algorithm in
      // PhylorefWrapper.createClassExpressionsForInternals() to create this expression.
      PhylorefWrapper.createClassExpressionsForInternals(
        phylorefAsJSONLD, internalSpecifiers, []
      ).forEach(classExpr => PhylorefWrapper.createAdditionalClass(
        phylorefAsJSONLD,
        internalSpecifiers,
        externalSpecifiers,
        classExpr,
        false,
        phylorefAsJSONLD
      ));
    }

    // Every phyloreference is a subclass of phyloref:Phyloreference.
    if (!phylorefAsJSONLD.subClassOf) phylorefAsJSONLD.subClassOf = [];
    if (!Array.isArray(phylorefAsJSONLD.subClassOf))
      phylorefAsJSONLD.subClassOf = [phylorefAsJSONLD.subClassOf];
    phylorefAsJSONLD.subClassOf.push('phyloref:Phyloreference');

    return phylorefAsJSONLD;
  }
}

module.exports = {
  PhylorefWrapper,
};
