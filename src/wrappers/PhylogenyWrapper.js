const { has, cloneDeep } = require('lodash');

// Used to parse Newick strings.
const newickJs = require('newick-js');

// OWL terms to be used here.
const owlterms = require('../utils/owlterms');

const { TaxonomicUnitWrapper } = require('./TaxonomicUnitWrapper');
const { TaxonomicUnitMatcher } = require('../matchers/TaxonomicUnitMatcher');
const { CitationWrapper } = require('./CitationWrapper');

/**
 * Wraps a Phylogeny in a PHYX file and provides access to node, node labels
 * and other information. Remember that a Phylogeny also has the
 * additionalNodeProperties object which provides additional properties for
 * nodes.
 * @category Wrappers
 */
class PhylogenyWrapper {
  /**
   * Construct a phylogeny based on a Phylogeny object in a PHYX phylogeny.
   * Note that this version ONLY uses the `newick` property to determine the
   * phylogeny: if other representations are included (such as a node-based
   * format, as used in JSON-LD), they will be ignored and possibly overwritten
   * during export. So, to update the phylogeny, please only update the newick
   * string!
   *
   * This ensures that we don't need to reconcile between different
   * possible representations of a phylogeny.
   *
   * @param {Object} phylogeny - The phylogeny object from a Phyx document to wrap.
   * @param {string|undefined} [defaultNomenCode=owlterms.UNKNOWN_CODE] - The nomenclatural
   *    code to assume for taxonomic units extracted from node labels; owlterms.UNKNOWN_CODE
   *    is `undefined`.
   */
  constructor(phylogeny, defaultNomenCode = owlterms.UNKNOWN_CODE) {
    this.phylogeny = phylogeny;
    this.defaultNomenCode = defaultNomenCode;
  }

  /**
   * Return a normalized form of the phylogeny. The Newick string is left as it is; only its
   * `source` citation, if there is one, is normalized (see {@link CitationWrapper.normalize}).
   *
   * @param {Object} phylogeny - The phylogeny object from a Phyx document.
   * @return {Object} A normalized copy of the phylogeny. The original is not modified.
   */
  static normalize(phylogeny) {
    const normalizedPhylogeny = cloneDeep(phylogeny);

    // We could normalize the Newick string, but that doesn't seem very nice.

    // Normalize the source if there is one.
    if ('source' in phylogeny) {
      normalizedPhylogeny.source = CitationWrapper.normalize(
        phylogeny.source || {},
      );
    }

    return normalizedPhylogeny;
  }

  /**
   * Given a Newick string, return a list of errors found in parsing this
   * string. The errors are returned as a list of objects, each of which
   * has two properties:
   *  - title: A short title of the error, distinct for each type of error.
   *  - message: A longer description of the error, which might include
   *    information specific to a particular error.
   *
   * We try to order errors from most helpful ('Unbalanced parentheses in
   * Newick string') to least helpful ('Error parsing phylogeny').
   *
   * @param {string} newick - The Newick string to check.
   * @return {Object[]} A list of `{title, message}` objects, empty if no errors were found.
   */
  static getErrorsInNewickString(newick) {
    const newickTrimmed = newick.trim();
    const errors = [];

    // Look for an empty Newick string.
    if (
      newickTrimmed === '' ||
      newickTrimmed === '()' ||
      newickTrimmed === '();'
    ) {
      // None of the later errors are relevant here, so bail out now.
      return [
        {
          title: 'No phylogeny entered',
          message: 'Click on "Edit as Newick" to enter a phylogeny below.',
        },
      ];
    }

    // Look for an unbalanced Newick string.
    let parenLevels = 0;
    for (let x = 0; x < newickTrimmed.length; x += 1) {
      if (newickTrimmed[x] === '(') parenLevels += 1;
      if (newickTrimmed[x] === ')') parenLevels -= 1;
    }

    if (parenLevels !== 0) {
      errors.push({
        title: 'Unbalanced parentheses in Newick string',
        message:
          parenLevels > 0
            ? `You have ${parenLevels} too many open parentheses`
            : `You have ${-parenLevels} too few open parentheses`,
      });
    }

    // Finally, try parsing it with newickJs.parse() and see if we get an error.
    try {
      newickJs.parse(newickTrimmed);
    } catch (ex) {
      errors.push({
        title: 'Error parsing phylogeny',
        message: `An error occured while parsing this phylogeny: ${ex.message}`,
      });
    }

    return errors;
  }

  /**
   * Recurse through PhyloTree nodes, executing function on each node.
   *
   * When the function `func` is called, it is given three arguments:
   *  - The current node object (initially: `node`)
   *  - The count of the current node object (initially: `nodeCount`)
   *  - The parent count of the current node object (initially: `parentCount`)
   *
   * @param {Object} node - The node to recurse from. The function will be called on node
   *    *before* being called on its children.
   * @param {function(Object, number, number)} func - The function to call on `node` and all
   *    of its children.
   * @param {number} [nodeCount=0] - `node` will be called with this nodeCount. All of its
   *    children will be called with consecutively increasing nodeCounts.
   * @param {number} [parentCount=undefined] - The nodeCount associated with the parent of
   *    this node within this run of recurseNodes. For instance, immediate children of `node`
   *    will have a parentCount of `nodeCount` (0 by default). By default, `node` itself will
   *    have a parentCount of `undefined`.
   * @return {number} The next unused nodeCount, i.e. one more than the last node visited.
   */
  static recurseNodes(node, func, nodeCount = 0, parentCount = undefined) {
    func(node, nodeCount, parentCount);

    let nextID = nodeCount + 1;

    // Recurse through all children of this node.
    if (has(node, 'children')) {
      node.children.forEach(child => {
        nextID = PhylogenyWrapper.recurseNodes(child, func, nextID, nodeCount);
      });
    }

    return nextID;
  }

  /**
   * Return the set of all taxonomic units in this phylogeny.
   * Node labels will be extracted from:
   *  - internal nodes only (if nodeType == 'internal')
   *  - terminal nodes only (if nodeType == 'terminal')
   *  - both internal and terminal nodes (if nodeType == 'both')
   *
   * See `getTaxonomicUnitsForNodeLabel` to see how node labels are converted
   * into taxonomic units, but in brief:
   *  1. We look for taxonomic units in the additionalNodeProperties.
   *  2. If none are found, we attempt to parse the node label as a scientific name.
   *
   * @param {string} [nodeType='both'] - 'internal', 'terminal' or 'both'.
   * @return {Set<Object>} The taxonomic units found.
   */
  getTaxonomicUnits(nodeType = 'both') {
    const nodeLabels = this.getNodeLabels(nodeType);
    const tunits = new Set();

    nodeLabels.forEach(nodeLabel => {
      this.getTaxonomicUnitsForNodeLabel(nodeLabel).forEach(tunit => {
        tunits.add(tunit);
      });
    });

    return tunits;
  }

  /**
   * Return a list of all the node labels in this phylogeny.
   *
   * nodeType can be one of:
   *  - 'internal': Return node labels on internal nodes.
   *  - 'terminal': Return node labels on terminal nodes.
   *  - 'both': Return node labels on both internal and terminal nodes.
   *
   * @param {string} [nodeType='both'] - Which nodes to return labels from, as above.
   * @return {string[]} The distinct node labels, in no particular order.
   */
  getNodeLabels(nodeType = 'both') {
    // Parse the phylogeny (will throw an exception if parsing failed).
    const { graph } = newickJs.parse(this.phylogeny.newick || '()');
    const [vertices, arcs] = graph;

    if (nodeType === 'both') {
      // Return all node labels.
      return Array.from(
        new Set(
          Array.from(vertices)
            .map(vertex => vertex.label)
            .filter(label => label !== undefined),
        ),
      );
    }

    if (nodeType === 'internal') {
      // Return the internal nodes (those with atleast one child).
      return Array.from(
        new Set(
          Array.from(arcs)
            .map(arc => arc[0].label) // Retrieve the label of the parent vertex in this arc.
            .filter(label => label !== undefined),
        ),
      );
    }

    if (nodeType === 'terminal') {
      // Return the terminal nodes. This would require calculating the children
      // of every vertex in the graph and then identifying vertices without any
      // children.
      //
      // A quicker and dirtier way to do this is by removing internal labels
      // from the list of all node labels. This will report an incorrect result
      // if an internal node has the same label as a terminal node, but at that
      // point a lot of other assumptions are going to fail, too, so this is
      // probably good enough for now.
      const allLabels = this.getNodeLabels('both');
      const internalLabels = new Set(this.getNodeLabels('internal'));

      return allLabels.filter(label => !internalLabels.has(label));
    }

    throw new Error(`Unknown nodeType: '${nodeType}'`);
  }

  /**
   * Return a list of taxonomic units for a node label.
   *
   * If the additionalNodeProperties for this node label includes taxonomic units
   * (using `representsTaxonomicUnits` = obo:CDAO_0000187), then those taxonomic
   * units are used. Otherwise, one will be constructed using the default
   * nomenclatural code set up when this PhylogenyWrapper was set up.
   *
   * @param {string} nodeLabel - The node label to look up.
   * @return {Object[]} The taxonomic units for this node label, or an empty list if it
   *    has none and none could be parsed from the label.
   */
  getTaxonomicUnitsForNodeLabel(nodeLabel) {
    // Look up additional node properties.
    let additionalNodeProperties = {};
    if (
      has(this.phylogeny, 'additionalNodeProperties') &&
      has(this.phylogeny.additionalNodeProperties, nodeLabel)
    ) {
      additionalNodeProperties =
        this.phylogeny.additionalNodeProperties[nodeLabel];
    }

    // If there are explicit taxonomic units in the
    // representsTaxonomicUnits property, we need to use those.
    if (has(additionalNodeProperties, 'representsTaxonomicUnits')) {
      return additionalNodeProperties.representsTaxonomicUnits;
    }

    // If that doesn't work, we can try to extract scientific names from
    // the node label. Note that taxonomic units will NOT be extracted from
    // the label if there is a taxonomic unit present!
    //
    // Note that old-style taxonomic units were lists while new-style taxonomic
    // units are single objects. So we turn it into a single entry list here.
    const tunit = TaxonomicUnitWrapper.fromLabel(
      nodeLabel.trim(),
      this.defaultNomenCode,
    );
    if (tunit) return [tunit];
    return []; // No TUnit? Return the empty list.
  }

  /**
   * Return a list of node labels matched by a given specifier on this phylogeny.
   * A node matches if any of its taxonomic units (see `getTaxonomicUnitsForNodeLabel`)
   * matches the specifier under {@link TaxonomicUnitMatcher}.
   *
   * @param {Object} specifier - The specifier (a taxonomic unit) to match.
   * @return {string[]} The matching node labels.
   */
  getNodeLabelsMatchedBySpecifier(specifier) {
    return this.getNodeLabels().filter(nodeLabel => {
      // Find all the taxonomic units associated with the specifier and
      // with the node.
      const nodeTUnits = this.getTaxonomicUnitsForNodeLabel(nodeLabel);

      // Attempt pairwise matches between taxonomic units in the specifier
      // and associated with the node.
      return nodeTUnits.some(
        tunit => new TaxonomicUnitMatcher(specifier, tunit).matched,
      );
    });
  }

  /**
   * Parse a Newick string into a tree-like structure.
   *
   * We previously used phylotree.js's Newick parser to parse Newick into a
   * tree-like structure. However, this is difficult to integrate using NPM.
   * This method provides a similar facility using the newick-js library, with
   * the property names phylotree.js's parser used. Each node is an object with:
   *
   *  - children: its child nodes, absent on a leaf
   *  - name: its label, absent if it has none
   *  - attribute: the length of the branch leading to it, absent if the Newick
   *    string gives none
   *
   * Each node also keeps newick-js's own `label`, which is the same as `name`.
   *
   * Throws an exception if the Newick could not be parsed.
   *
   * @param {string} newick - The Newick string to parse.
   * @return {{json: Object}} An object whose `json` property is the root node.
   */
  static getParsedNewick(newick) {
    const { graph, root, rootWeight } = newickJs.parse(newick);
    const [, arcs] = graph;

    // Go through the arcs, assigning 'children' to the appropriate parent node.
    arcs.forEach(arc => {
      const [parent, child, weight] = arc;

      // Add child to parent.children.
      if (!has(parent, 'children')) parent.children = [];
      parent.children.push(child);

      // Phylotree.js uses 'name' instead of 'label'.
      if (has(parent, 'label')) {
        parent.name = parent.label;
      }
      if (has(child, 'label')) {
        child.name = child.label;
      }

      // Phylotree.js uses 'attribute' to store weights, so we'll store it there as well.
      if (!has(child, 'attribute') && !Number.isNaN(weight))
        child.attribute = weight;
    });

    // Set root 'attribute' to root weight.
    if (!has(root, 'attribute') && !Number.isNaN(rootWeight))
      root.attribute = rootWeight;

    // The loop above names the root as a parent, but a tree with a single node
    // has no arcs, so its root would otherwise never get a 'name'.
    if (has(root, 'label')) root.name = root.label;

    return { json: root };
  }

  /**
   * Return the parsed Newick string, but with EVERY node given an IRI in its `@id`.
   *
   * @param {string} baseIRI - The base IRI to use for node elements (e.g. ':phylogeny1').
   *    Node IDs are generated by concatenating `_node${number}` to the end of the baseIRI.
   * @param {function(string): Object} [newickParser=PhylogenyWrapper.getParsedNewick] - A
   *    method for converting a Newick string to a object-based representation. The static
   *    method PhylogenyWrapper.getParsedNewick() is used if none is provided.
   * @return {Object} The parsed phylogeny, as returned by `newickParser`.
   */
  getParsedNewickWithIRIs(
    baseIRI,
    newickParser = PhylogenyWrapper.getParsedNewick,
  ) {
    const parsed = newickParser(this.phylogeny.newick || '()');
    if (has(parsed, 'json')) {
      PhylogenyWrapper.recurseNodes(parsed.json, (node, nodeCount) => {
        // Start with the additional node properties.
        const nodeAsJSONLD = node;

        // Set @id and @type.
        const nodeIRI = `${baseIRI}_node${nodeCount}`;
        nodeAsJSONLD['@id'] = nodeIRI;
      });
    }

    return parsed;
  }

  /**
   * Returns a list of all nodes in this phylogeny as JSON-LD objects. Every node has an `@id`
   * and an rdf:type; the other properties appear only on some nodes:
   *
   *  - labels, representsTaxonomicUnits (possibly empty), and any properties
   *    additionalNodeProperties gives for the label: labelled nodes only
   *  - parent and siblings (possibly empty): every node except the root
   *  - children: internal nodes only
   *
   * @param {string} baseIRI - The base IRI to use for node elements (e.g. ':phylogeny1').
   *    Node IDs are generated by concatenating `_node${number}` to the end of the baseIRI.
   * @param {function(string): Object} [newickParser] - A method for converting a Newick
   *    string to a object-based representation. See PhylogenyWrapper.getParsedNewick() for
   *    an example implementation.
   * @return {Object[]} The nodes as JSON-LD objects.
   */
  getNodesAsJSONLD(baseIRI, newickParser) {
    // List of nodes we have identified.
    const nodes = [];

    // We need to track the identifiers we give each node as we go.
    const nodesById = {};
    const nodeIdsByParentId = {};

    // Extract the newick string.
    const { additionalNodeProperties } = this.phylogeny;

    // Parse the Newick string; if parseable, recurse through the nodes,
    // added them to the list of JSON-LD nodes as we go.

    const parsed = this.getParsedNewickWithIRIs(baseIRI, newickParser);
    if (has(parsed, 'json')) {
      PhylogenyWrapper.recurseNodes(
        parsed.json,
        (node, _nodeCount, parentCount) => {
          // Start with the additional node properties.
          const nodeAsJSONLD = {};

          // Set @id and @type. '@id' should already be set by getParsedNewickWithIRIs()!
          const nodeIRI = node['@id'];
          nodeAsJSONLD['@id'] = nodeIRI;

          // Since we may need to add multiple classes into the rdf:type, we need
          // to make @type an array. However, the JSON-LD library we use in JPhyloRef
          // can't support @type being an array (despite that being in the standard,
          // see https://w3c.github.io/json-ld-syntax/#example-14-specifying-multiple-types-for-a-node),
          // so we fall back to using rdf:type instead.
          nodeAsJSONLD[owlterms.RDF_TYPE] = [{ '@id': owlterms.CDAO_NODE }];

          // Add labels, additional node properties and taxonomic units.
          if (has(node, 'name') && node.name !== '') {
            // Add node label.
            nodeAsJSONLD.labels = [node.name];

            // Add additional node properties, if any.
            if (
              additionalNodeProperties &&
              has(additionalNodeProperties, node.name)
            ) {
              Object.keys(additionalNodeProperties[node.name]).forEach(key => {
                nodeAsJSONLD[key] = additionalNodeProperties[node.name][key];
              });
            }

            // Add taxonomic units into the metadata.
            nodeAsJSONLD.representsTaxonomicUnits =
              this.getTaxonomicUnitsForNodeLabel(node.name);

            // Add it into the @type so we can reason over it.
            nodeAsJSONLD.representsTaxonomicUnits.forEach(tu => {
              const wrappedTUnit = new TaxonomicUnitWrapper(tu);

              if (wrappedTUnit) {
                const equivClass = wrappedTUnit.asOWLEquivClass;
                if (equivClass) {
                  nodeAsJSONLD[owlterms.RDF_TYPE].push({
                    '@type': 'owl:Restriction',
                    onProperty: owlterms.CDAO_REPRESENTS_TU,
                    someValuesFrom: equivClass,
                  });
                }
              }
            });
          }

          // Add references to parents and siblings.
          if (parentCount !== undefined) {
            const parentIRI = `${baseIRI}_node${parentCount}`;
            nodeAsJSONLD.parent = parentIRI;

            // Update list of nodes by parent IDs.
            if (!has(nodeIdsByParentId, parentIRI)) {
              nodeIdsByParentId[parentIRI] = new Set();
            }
            nodeIdsByParentId[parentIRI].add(nodeIRI);
          }

          // Add nodeAsJSONLD to list
          if (has(nodesById, nodeIRI)) {
            throw new Error(
              `Error in programming: duplicate node IRI generated (${nodeIRI})`,
            );
          }
          nodesById[nodeIRI] = nodeAsJSONLD;
          nodes.push(nodeAsJSONLD);
        },
      );
    }

    // Go through nodes again and set children and sibling relationships.
    Object.keys(nodeIdsByParentId).forEach(parentId => {
      // What are the children of this parentId?
      const childrenIDs = Array.from(nodeIdsByParentId[parentId]);
      const children = childrenIDs.map(childId => nodesById[childId]);

      // Is this the root node?
      if (has(nodesById, parentId)) {
        const parent = nodesById[parentId];
        parent.children = childrenIDs;
      }

      children.forEach(child => {
        const childToModify = child;
        // Add all other sibling to node.siblings, but don't add this node itself!
        childToModify.siblings = childrenIDs.filter(
          childId => childId !== child['@id'],
        );
      });
    });

    return nodes;
  }

  /**
   * Export this phylogeny as JSON-LD.
   *
   * @param {string} fallbackIRI - The fallback IRI to use for this phylogeny if it does not
   *    already have an '@id' set.
   * @param {function(string): Object} [newickParser] - A function that parses a Newick
   *    string and returns an object based representation of this phylogeny. If not set, the
   *    static method PhylogenyWrapper.getParsedNewick will be used instead.
   * @return {Object} This phylogeny as a JSON-LD object.
   */
  asJSONLD(fallbackIRI, newickParser) {
    // Create a copy to export.
    const phylogenyAsJSONLD = JSON.parse(JSON.stringify(this.phylogeny));

    // Set name and class for phylogeny. If no '@id' is set, use the provided
    // fallbackIRI.
    if (!has(phylogenyAsJSONLD, '@id')) phylogenyAsJSONLD['@id'] = fallbackIRI;
    phylogenyAsJSONLD['@type'] = 'phyloref:ReferencePhylogenyEvidence';

    // Translate nodes into JSON-LD objects.
    phylogenyAsJSONLD.nodes = this.getNodesAsJSONLD(
      phylogenyAsJSONLD['@id'],
      newickParser,
    );
    if (phylogenyAsJSONLD.nodes.length > 0) {
      // We don't have a better way to identify the root node, so we just
      // default to the first one.
      phylogenyAsJSONLD.hasRootNode = {
        '@id': phylogenyAsJSONLD.nodes[0]['@id'],
      };
    }

    // Add a bibliographicCitation to the source if it is a Citation.
    if (has(phylogenyAsJSONLD, 'source')) {
      const source = phylogenyAsJSONLD.source;

      if (!has(source, 'bibliographicCitation')) {
        source.bibliographicCitation = new CitationWrapper(source).toString();
      }
    }

    return phylogenyAsJSONLD;
  }
}

module.exports = {
  PhylogenyWrapper,
};
