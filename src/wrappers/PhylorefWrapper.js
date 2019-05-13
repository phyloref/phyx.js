/** Used to parse timestamps for phyloref statuses. */
const moment = require('moment');
const { has } = require('lodash');

const owlterms = require('../utils/owlterms');
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

    // Reset internal and external specifiers if needed.
    // if (!has(this.phyloref, 'internalSpecifiers'))
    //  Vue.set(this.phyloref, 'internalSpecifiers', []);
    if (!has(this.phyloref, 'internalSpecifiers')) {
      this.phyloref.internalSpecifiers = [];
    }
    // if (!has(this.phyloref, 'externalSpecifiers'))
    //  Vue.set(this.phyloref, 'externalSpecifiers', []);
    if (!has(this.phyloref, 'externalSpecifiers')) {
      this.phyloref.externalSpecifiers = [];
    }
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

  get specifiers() {
    // Returns a list of all specifiers by combining the internal and external
    // specifiers into a single list, with internal specifiers before
    // external specifiers.
    let specifiers = this.phyloref.internalSpecifiers;
    specifiers = specifiers.concat(this.phyloref.externalSpecifiers);
    return specifiers;
  }

  getSpecifierType(specifier) {
    // For a given specifier, return a string indicating whether it is
    // an 'Internal' or 'External' specifier.

    if (this.phyloref.internalSpecifiers.includes(specifier)) return 'Internal';
    if (this.phyloref.externalSpecifiers.includes(specifier)) return 'External';
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
      index = this.phyloref.externalSpecifiers.indexOf(specifier);
      if (index !== -1) this.phyloref.externalSpecifiers.splice(index, 1);

      // Don't add it to the list of internal specifiers if it's already there.
      if (!this.phyloref.internalSpecifiers.includes(specifier)) {
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

  static getSpecifierLabel(specifier) {
    // Try to determine the label of a specifier. This checks the
    // 'label' and 'description' properties, and then tries to create a
    // descriptive label by using the list of referenced taxonomic units.
    //
    // This logically belongs in PhylorefWrapper, but we don't actually need to
    // know the phyloreference to figure out the specifier label, which is why
    // this is a static method.

    // Is this specifier even non-null?
    if (specifier === undefined) return undefined;
    if (specifier === null) return undefined;

    // Maybe there is a label or description right there?
    if (has(specifier, 'label')) return specifier.label;
    if (has(specifier, 'description')) return specifier.description;

    // Look at the individual taxonomic units.
    if (has(specifier, 'referencesTaxonomicUnits')) {
      const labels = specifier.referencesTaxonomicUnits
        .map(tu => new TaxonomicUnitWrapper(tu).label)
        .filter(label => (label !== undefined));
      if (labels.length > 0) return labels.join('; ');
    }

    // No idea!
    return undefined;
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

  asJSONLD(phylorefURI) {
    // Export this phyloreference in JSON-LD.

    // Keep all currently extant data.
    // - baseURI: the base URI for this phyloreference
    const phylorefAsJSONLD = JSON.parse(JSON.stringify(this.phyloref));

    // Set the @id and @type.
    phylorefAsJSONLD['@id'] = phylorefURI;

    phylorefAsJSONLD['@type'] = [
      // We pun this as an instance that is a Phyloreference.
      // (We need this to ensure that the object properties that store
      // information on specifiers will work correctly)
      'phyloref:Phyloreference',
      // Since we're writing this in RDF, just adding a '@type' of
      // phyloref:Phyloreference would imply that phylorefURI is a named
      // individual of class phyloref:Phyloreference. We need to explicitly
      // let OWL know that this phylorefURI is an owl:Class.
      //
      // (This is implied by some of the properties that we apply to phylorefURI,
      // such as by the domain of owl:equivalentClass. But it's nice to make that
      // explicit as well!)
      'owl:Class',
    ];

    // Add identifiers for each internal specifier.
    let internalSpecifierCount = 0;
    phylorefAsJSONLD.internalSpecifiers.forEach((internalSpecifierToChange) => {
      internalSpecifierCount += 1;

      const internalSpecifier = internalSpecifierToChange;
      const specifierId = `${phylorefURI}_specifier_internal${internalSpecifierCount}`;

      internalSpecifier['@id'] = specifierId;
      internalSpecifier['@type'] = [
        owlterms.TESTCASE_SPECIFIER,
      ];

      // Add identifiers to all taxonomic units.
      let countTaxonomicUnits = 0;
      if (has(internalSpecifier, 'referencesTaxonomicUnits')) {
        internalSpecifier.referencesTaxonomicUnits.forEach((tunitToChange) => {
          const tunit = tunitToChange;

          tunit['@id'] = `${specifierId}_tunit${countTaxonomicUnits}`;
          tunit['@type'] = 'http://purl.obolibrary.org/obo/CDAO_0000138';
          countTaxonomicUnits += 1;
        });
      }
    });

    // Add identifiers for each external specifier.
    let externalSpecifierCount = 0;
    phylorefAsJSONLD.externalSpecifiers.forEach((externalSpecifierToChange) => {
      externalSpecifierCount += 1;

      const externalSpecifier = externalSpecifierToChange;
      const specifierId = `${phylorefURI}_specifier_external${externalSpecifierCount}`;

      externalSpecifier['@id'] = specifierId;
      externalSpecifier['@type'] = [
        owlterms.TESTCASE_SPECIFIER,
      ];

      // Add identifiers to all taxonomic units.
      let countTaxonomicUnits = 0;
      if (has(externalSpecifier, 'referencesTaxonomicUnits')) {
        externalSpecifier.referencesTaxonomicUnits.forEach((tunitToChange) => {
          const tunit = tunitToChange;

          tunit['@id'] = `${specifierId}_tunit${countTaxonomicUnits}`;
          tunit['@type'] = 'http://purl.obolibrary.org/obo/CDAO_0000138';
          countTaxonomicUnits += 1;
        });
      }
    });

    // For historical reasons, the Clade Ontology uses 'hasInternalSpecifier' to
    // store the specifiers as OWL classes and 'internalSpecifiers' to store them
    // as RDF annotations. We simplify that here by duplicating them here, but
    // this should really be fixed in the Clade Ontology and in phyx.json.
    phylorefAsJSONLD.hasInternalSpecifier = phylorefAsJSONLD.internalSpecifiers;
    phylorefAsJSONLD.hasExternalSpecifier = phylorefAsJSONLD.externalSpecifiers;

    if (internalSpecifierCount === 0 && externalSpecifierCount === 0) {
      phylorefAsJSONLD.malformedPhyloreference = 'No specifiers provided';
    } else if (externalSpecifierCount > 1) {
      phylorefAsJSONLD.malformedPhyloreference = 'Multiple external specifiers are not yet supported';
    } else if (internalSpecifierCount === 1 && externalSpecifierCount === 0) {
      phylorefAsJSONLD.malformedPhyloreference = 'Only a single internal specifier was provided';
    } else if (externalSpecifierCount === 0) {
      // This phyloreference is made up entirely of internal specifiers.

      // We can write this in an accumulative manner by creating class expressions
      // in the form:
      //  mrca(mrca(mrca(node1, node2), node3), node4)

      // We could write this as a single giant expression, but this tends to
      // slow down the reasoner dramatically. So instead, we break it up into a
      // series of "additional classes", each of which represents a part of the
      // overall expression.
      phylorefAsJSONLD.hasAdditionalClass = [];

      let equivalentClassAccumulator = PhylorefWrapper.getClassExpressionForMRCA(
        phylorefURI,
        phylorefAsJSONLD.hasAdditionalClass,
        phylorefAsJSONLD.internalSpecifiers[0],
        phylorefAsJSONLD.internalSpecifiers[1]
      );

      for (let index = 2; index < internalSpecifierCount; index += 1) {
        equivalentClassAccumulator = PhylorefWrapper.getClassExpressionForMRCA(
          phylorefURI,
          phylorefAsJSONLD.hasAdditionalClass,
          equivalentClassAccumulator,
          phylorefAsJSONLD.internalSpecifiers[index]
        );
      }

      phylorefAsJSONLD.equivalentClass = equivalentClassAccumulator;
    } else {
      // This phyloreference is made up of one external specifier and some number
      // of internal specifiers.

      const internalSpecifierRestrictions = phylorefAsJSONLD.internalSpecifiers
        .map(specifier => PhylorefWrapper
          .wrapInternalOWLRestriction(PhylorefWrapper.getOWLRestrictionForSpecifier(specifier)));

      const externalSpecifierRestrictions = phylorefAsJSONLD.externalSpecifiers
        .map(specifier => PhylorefWrapper
          .wrapExternalOWLRestriction(PhylorefWrapper.getOWLRestrictionForSpecifier(specifier)));

      phylorefAsJSONLD.equivalentClass = {
        '@type': 'owl:Class',
        intersectionOf: internalSpecifierRestrictions.concat(externalSpecifierRestrictions),
      };
    }

    return phylorefAsJSONLD;
  }

  static getOWLRestrictionForSpecifier(specifier) {
    // Return an OWL restriction corresponding to a specifier.
    return {
      '@type': 'owl:Restriction',
      onProperty: 'testcase:matches_specifier',
      hasValue: {
        '@id': specifier['@id'],
      },
    };
  }

  static wrapInternalOWLRestriction(restriction) {
    // Wraps a restriction to act as an internal specifier.
    // Mainly, we just need to extend the restriction to match:
    //  restriction or cdao:has_Descendant some restriction
    return {
      '@type': 'owl:Restriction',
      unionOf: [
        restriction,
        {
          '@type': 'owl:Restriction',
          onProperty: owlterms.CDAO_HAS_DESCENDANT,
          someValuesFrom: restriction,
        },
      ],
    };
  }

  static wrapExternalOWLRestriction(restriction) {
    // Wraps a restriction to act as an external specifier.
    // This needs to match:
    //  cdao:has_Sibling some (restriction or cdao:has_Descendant some restriction)
    // Since that second part is just an internal specifier restriction, we can
    // incorporate that in here.
    return {
      '@type': 'owl:Restriction',
      // onProperty: PHYLOREF_HAS_SIBLING,
      onProperty: owlterms.PHYLOREF_EXCLUDES_LINEAGE_TO,
      someValuesFrom: restriction,
    };
  }

  static getClassExpressionForMRCA(baseURI, additionalClasses, specifier1, specifier2) {
    // Create an OWL restriction for the most recent common ancestor (MRCA)
    // of the nodes matched by two specifiers.
    const additionalClassesIds = new Set(additionalClasses.map(cl => cl['@id']));

    // Specifiers might be either a real specifier or an additional class.
    // We can check their @ids here and translate specifiers into class expressions.
    let owlRestriction1;
    if (additionalClassesIds.has(specifier1['@id'])) {
      owlRestriction1 = specifier1;
    } else {
      owlRestriction1 = PhylorefWrapper.getOWLRestrictionForSpecifier(specifier1);
    }

    let owlRestriction2;
    if (additionalClassesIds.has(specifier2['@id'])) {
      owlRestriction2 = specifier2;
    } else {
      owlRestriction2 = PhylorefWrapper.getOWLRestrictionForSpecifier(specifier2);
    }

    // Construct OWL expression.
    const mrcaAsOWL = {
      '@type': 'owl:Class',
      unionOf: [
        {
          // What if specifier2 is a descendant of specifier1? If so, the MRCA
          // is specifier1!
          '@type': 'owl:Class',
          intersectionOf: [
            owlRestriction1,
            {
              '@type': 'owl:Restriction',
              onProperty: owlterms.CDAO_HAS_DESCENDANT,
              someValuesFrom: owlRestriction2,
            },
          ],
        },
        {
          // What if specifier1 is a descendant of specifier2? If so, the MRCA
          // is specifier2!
          '@type': 'owl:Class',
          intersectionOf: [
            owlRestriction2,
            {
              '@type': 'owl:Restriction',
              onProperty: owlterms.CDAO_HAS_DESCENDANT,
              someValuesFrom: owlRestriction1,
            },
          ],
        },
        {
          // If neither specifier is a descendant of the other, we can use our
          // standard formula.
          '@type': 'owl:Class',
          intersectionOf: [{
            '@type': 'owl:Restriction',
            onProperty: owlterms.CDAO_HAS_CHILD,
            someValuesFrom: {
              '@type': 'owl:Class',
              intersectionOf: [
                PhylorefWrapper.wrapInternalOWLRestriction(owlRestriction1),
                PhylorefWrapper.wrapExternalOWLRestriction(owlRestriction2),
              ],
            },
          }, {
            '@type': 'owl:Restriction',
            onProperty: owlterms.CDAO_HAS_CHILD,
            someValuesFrom: {
              '@type': 'owl:Class',
              intersectionOf: [
                PhylorefWrapper.wrapInternalOWLRestriction(owlRestriction2),
                PhylorefWrapper.wrapExternalOWLRestriction(owlRestriction1),
              ],
            },
          }],
        },
      ],
    };

    // Instead of building a single, large, complex expression, reasoners appear
    // to prefer smaller expressions for classes that are assembled together.
    // To help with that, we'll store the class expression in the additionalClasses
    // list, and return a reference to this class.
    const additionalClassId = `${baseURI}_additional${additionalClasses.length}`;
    additionalClasses.push({
      '@id': additionalClassId,
      '@type': 'owl:Class',
      equivalentClass: mrcaAsOWL,
    });

    return { '@id': additionalClassId };
  }
}

module.exports = {
  PhylorefWrapper,
};
