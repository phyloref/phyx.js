#!/usr/bin/env node

const assert = require('assert').strict;
const { uniqWith, isEqual } = require('lodash');
const fs = require('fs');
const path = require('path');

const pathToScript = __dirname;

/*
 * In order to test whether we can resolve every possible type of clade,
 * we will generate every possible Phyx file for a given number of input
 * nodes.
 *
 * Synopsis: npm run generate-every-topology -- --nodes [number of nodes] --multifurcating
 *
 * If the --multifurcating flag is not used, only binary trees will be generated.
 */

// Set up command line arguments.
const argv = require('yargs')
  .example("$0 --nodes [number of leaf nodes]", 'Generate Phyx files for every possible combination of the given number of nodes')
  .describe('nodes', 'The number of leaf nodes to generate in each phylogeny')
  .demandOption(['nodes'])
  .alias('nodes', 'n')

  .describe('multifurcating', 'Generate multifurcating trees as well as binary trees')
  .alias('multifurcating', 'multi')

  .help('h')
  .alias('help', 'h')
  .argv

// Determine how many leaf nodes we need to use.
const nodeCount = argv.nodes

if (nodeCount < 2) {
  console.error(`The number of leaf nodes must be 2 or greater (${nodeCount})`)
  process.exit(2);
}

// Determine (and report) the number of expected binomial and multifurcating trees we will generate.
function factorial(n) {
  if (n == 0) return 1;
  return (n != 1) ? n * factorial(n - 1) : 1;
}

// Taken from https://academic.oup.com/sysbio/article/27/1/27/1626689 and
// https://en.wikipedia.org/wiki/Phylogenetic_tree#Enumerating_trees
const expectedBifurcatingTrees = factorial(2 * nodeCount - 3)/((2**(nodeCount - 2)) * factorial(nodeCount - 2));
console.log(`Expected bifurcating trees = ${expectedBifurcatingTrees}`);

// I tried to calculate this using the formula in
// https://academic.oup.com/sysbio/article/27/1/27/1626689, but I didn't get it
// working correctly. So for now I'm just hardcoding these numbers from
// https://en.wikipedia.org/wiki/Phylogenetic_tree#Enumerating_trees
const multifurcatingTreeCounts = [
  0,
  0,
  0,
  1,
  11,
  131,
  1807,
  28813,
  524897,
  10791887,
  247678399,
]
if (nodeCount > 10) {
  throw new Error("We only support multifurcating trees up to n=10");
}
const expectedMultifurcatingTrees = multifurcatingTreeCounts[nodeCount];
console.log(`Expected multifurcating trees = ${expectedMultifurcatingTrees}`);

const expectedTotalTrees = expectedBifurcatingTrees + expectedMultifurcatingTrees
console.log(`Expected total trees = ${expectedTotalTrees}`);

/*
 * Generate bifurcating phylogenies.
 */

// Generate a list of leaf node labels to use. We use characters from 'A' to 'Z'.
const labels = [...Array('Z'.charCodeAt(0) - 'A'.charCodeAt(0) + 1).keys()].map(i => i + 'A'.charCodeAt(0)).map(chr => String.fromCharCode(chr));
if (nodeCount > 26) throw new Error('We only suppose single-character labels, and so n > 26 are not supported.');
const leafNodes = labels.slice(0, nodeCount);

/*
 * The key to this algorithm is the selectOne function. Given an input array of
 * n elements, it returns n tuples, each containing one of the elements from the
 * array and the remainder of the array, excluding the selected item.
 * For example, given an input of [1, 2, 3], this will return:
 *  [[1], [2, 3]],
 *  [[2], [1, 3]],
 *  [[3], [1, 2]]
 */
function selectOne(array) {
  const result = [];
  for (let i = 0; i < array.length; i++) {
    const changeable = [...array];
    const deleted = changeable.splice(i, 1);
    result.push([deleted, changeable])
  }
  return result;
}
assert.deepEqual(
  selectOne([1, 2, 3]),
  [
    [[1], [2, 3]],
    [[2], [1, 3]],
    [[3], [1, 2]],
  ]
);

/*
 * selectN(n, array) extends selectOne(array) for selecting a greater number of
 * elements. Returns an array of results, each of which is a tuple with an array
 * of selected items and an array of not-selected items. For example, calling
 * selectN(2, [1, 2, 3]) will result in:
 * [
 *  [[1, 2], [3]],
 *  [[1, 3], [2]],
 *  [[2, 3], [1]],
 * ]
 */
function selectN(n, array) {
  const first = selectOne(array);
  if (n == 1) return first;
  if (n >= array.length) throw new Error(`selectN(${n}, ${array.join(',')}) cannot be used to select ${n} items from an array of length ${array.length}`);

  let currentArray = [...first];
  for (let i = 1; i < n; i++) {
    currentArray = currentArray.map(entry => {
      const [selected, unselected] = entry;

      return selectOne(unselected).map(res => {
        const [innerSelected, innerUnselected] = res;

        return [
          [...selected, ...innerSelected].sort(),
          innerUnselected.sort()
        ];
      });
    }).reduce((acc, cur) => acc.concat(cur), []);
  }
  return uniqWith(currentArray, isEqual);
}
assert.deepEqual(
  selectN(2, [1, 2, 3]),
  [
    [[1, 2], [3]],
    [[1, 3], [2]],
    [[2, 3], [1]],
  ]
);
assert.deepEqual(
  selectN(2, [1, 2, 3, 4, 5]),
  [
    [[1, 2], [3, 4, 5]],
    [[1, 3], [2, 4, 5]],
    [[1, 4], [2, 3, 5]],
    [[1, 5], [2, 3, 4]],
    [[2, 3], [1, 4, 5]],
    [[2, 4], [1, 3, 5]],
    [[2, 5], [1, 3, 4]],
    [[3, 4], [1, 2, 5]],
    [[3, 5], [1, 2, 4]],
    [[4, 5], [1, 2, 3]],
  ]
);

/*
 * Since we use arrays instead of sets, we generate a large number of duplicate
 * trees. To eliminate them, we "normalize" all trees. The algorithm we use to
 * do that is:
 *  - 1. Every array in the phylogeny is sorted, so e.g. [4, [2, [3, 1]]] will
 *       be rearranged to [[[1, 3], 2], 4].
 *  - 2. Nodes containing a single element within an array (i.e. [[1]]) are
 *       reduced so that the unnecessary node is eliminated (e.g. [1]).
 */
function normalizeTree(tree) {
  if (!Array.isArray(tree)) return tree;
  if (tree.length == 0) return [];
  if (tree.length == 1) {
    // Look for cases where we have e.g. [[a]], which should be normalized to [a].
    if (Array.isArray(tree) && tree.length == 1) {
      return normalizeTree(tree[0]);
    }
    return tree;
  }
  return tree.map(node => normalizeTree(node)).sort();
}
assert.deepEqual(normalizeTree([4, [2, [3, 1]]]), [[[1, 3], 2], 4]);
assert.deepEqual(normalizeTree([1, [[2, 3]]]), [1, [2, 3]]);
assert.deepEqual(normalizeTree([[2, 1], [[6, 7], 4, [3, 5]]]), [[1, 2], [[3, 5], 4, [6, 7]]]);
assert.deepEqual(normalizeTree([[4, [5, 3], [7, 6]], [1, 2]]), [[1, 2], [[3, 5], 4, [6, 7]]]);

/*
 * Given a phylogeny, this method will rearrange it into every possible binary
 * combination. We use selectN to select groups of nodes from 1 to nodeLength,
 * and then call ourselves recursively to find every combination of the two
 * groups provided.
 */
function generateTrees(nodes) {
  // console.log(`generateTrees(${JSON.stringify(nodes)})`);
  if (nodes.length == 1) return nodes;

  // For a given number of leaf nodes, we need to keep grouping them in
  // combinations up to the node length.
  let results = [];
  for (let i = 1; i < (nodes.length + 1)/2; i++) {
    const groups = selectN(i, nodes);
    // We end up generating duplicate phylogenies here; to avoid generating a
    // large number of duplicates, we'll use `uniqWith` to remove duplicates.
    const bifurcatingTrees = uniqWith(
      groups.map(result =>
        // Result is a tuple with $i nodes in $results[0]
        // and the remainder in $results[1]. We call
        // ourselves recursively to find every possible
        // combination of these groups.
        generateTrees(result[0]).map(res0 =>
          generateTrees(result[1]).map(res1 => {
            const results = [[res0, res1]];
            if (!argv.multifurcating) return results;
            return results.concat([
              [...res0, res1],
              [res0, ...res1],
              [...res0, ...res1],
            ]);
          }).reduce((acc, cur) => acc.concat(cur), []).map(normalizeTree)
        ).reduce((acc, cur) => acc.concat(cur), []).map(normalizeTree)
      ).reduce((acc, cur) => acc.concat(cur), []).map(normalizeTree),
      isEqual
    );

    // console.log(`select(${i}, ${JSON.stringify(nodes)}) generated ${JSON.stringify(temp)}.`);
    results = results.concat(bifurcatingTrees);
  }

  // console.log(`From ${JSON.stringify(nodes)} generated ${JSON.stringify(results)}.`);
  return results;
}

// Generate trees from the provided leaf nodes, normalize the resulting trees and
// remove any duplicates.
const trees = generateTrees(leafNodes);
let normalizedUniqTrees = uniqWith(trees.map(tree => normalizeTree(tree)), isEqual);

normalizedUniqTrees.forEach((tree, index) => {
  console.log(`Tree ${index + 1}: ${JSON.stringify(tree)}.`);
})

// Report on the number of trees produced versus what was expected.
if (argv.multifurcating) {
    console.log(`Generated ${normalizedUniqTrees.length} trees out of ${expectedTotalTrees} expected with ${nodeCount} leaf nodes each: ${leafNodes}`)
} else {
    console.log(`Generated ${normalizedUniqTrees.length} bifurcating trees out of ${expectedBifurcatingTrees} expected with ${nodeCount} leaf nodes each: ${leafNodes}`)
}

/*
 * We record all the phylogenies in a Nexus file for testing.
 */
let nexusFile = `#NEXUS

BEGIN TREES;

[! Generated by generate-tests.js for n=${nodeCount} on ${new Date()} ]

`;
normalizedUniqTrees.forEach((uniqTree, index) => {
  function treeToNewick(tree) {
    if (!Array.isArray(tree)) return tree;
    if (tree.length === 1) return tree[0];
    return `(${tree.map(treeToNewick).join(', ')})`;
  }
  nexusFile += `  TREE T${index} = ${treeToNewick(uniqTree)};\n`;
});
nexusFile += "\nEND;\n";
const filename = path.resolve(pathToScript, `n${nodeCount}`, 'trees.nex');
fs.writeFileSync(filename, nexusFile);

/*
 * To generate testable Phyx files, we will need:
 *  - Each phylogeny to be written in Newick, with internal labels describing
 *    which phyloreferences *should* resolve to that node.
 *    - We do this by describing each internal nodes as e.g. "ABCxDE", meaning
 *      "The LCA of ABC, which excludes the DE clade".
 */
normalizedUniqTrees.forEach((tree, index) => {
  function generateLabel(nodes) {
    if (!Array.isArray(nodes)) return nodes;
    return nodes.map(node => generateLabel(node)).flat().sort();
  }

  function generateLabelTrimmed(nodeString, sisterString) {
    return ("N" + nodeString.toLowerCase() + "_" + sisterString.toLowerCase() + "n").trim();
  }

  function generateInternalNodeLabel(nodes, sister = []) {
    // console.log(`generateInternalNodeLabel(${JSON.stringify(nodes)}; ${sister})`)
    if (nodes.length == 1) return generateLabelTrimmed(nodes[0], generateLabel(sister).join(""));
    return "(" + nodes.map((node, index) => {
      const sisters = [...nodes];
      const deleted = sisters.splice(index, 1); // Take out this one node.
      return generateInternalNodeLabel(deleted[0], sisters);
    }).join(",") + ")" + generateLabelTrimmed(generateLabel(nodes).join(""), generateLabel(sister).join(""));
  }

  function breakIntoWords(newick) {
    return newick.split(/\W+/).sort((a, b) => a.length - b.length);
  }

  function chooseTarget(targetNode, newick) {
    // Choose a one-character target node.
    return breakIntoWords(newick).filter(node => node.match(`^N.*${targetNode.toLowerCase()}.*_`)).map(word => word.replace('_', ' ').trim()).shift();
  }

  function chooseABTarget(newick) {
    // The AB target should be the smallest clade containing 'AB' before the 'x'.
    return breakIntoWords(newick).filter(node => node.match(/^NAB.*_/i)).map(word => word.replace('_', ' ').trim()).shift();
  }

  function chooseAxCTarget(newick) {
    // The AxC target should be the smallest clade containing 'A' before the 'x' and C after the 'x'.
    return breakIntoWords(newick).filter(node => node.match(/^NA.*_.*C.*$/i)).map(word => word.replace('_', ' ').trim()).shift();
  }

  // Construct a phyloreference.
  const newick = generateInternalNodeLabel(tree);
  const phyx_document = {
    '@context': 'http://www.phyloref.org/phyx.js/context/v0.2.0/phyx.json',
    phylogenies: [
      {
        newick,
      }
    ],
    phylorefs: [
      {
        label: (chooseABTarget(newick) || "undefined").replace(' ', '_'),
        internalSpecifiers: [
          {
            "@type": "http://rs.tdwg.org/ontology/voc/TaxonConcept#TaxonConcept",
            "hasName": {
                "@type": "http://rs.tdwg.org/ontology/voc/TaxonName#TaxonName",
                "nameComplete": chooseTarget("A", newick)
            }
          },
          {
            "@type": "http://rs.tdwg.org/ontology/voc/TaxonConcept#TaxonConcept",
            "hasName": {
                "@type": "http://rs.tdwg.org/ontology/voc/TaxonName#TaxonName",
                "nameComplete": chooseTarget("B", newick)
            }
          }
        ]
      },
      {
        label: (chooseAxCTarget(newick)  || "undefined").replace(' ', '_'),
        internalSpecifiers: [
          {
            "@type": "http://rs.tdwg.org/ontology/voc/TaxonConcept#TaxonConcept",
            "hasName": {
                "@type": "http://rs.tdwg.org/ontology/voc/TaxonName#TaxonName",
                "nameComplete": chooseTarget("A", newick)
            }
          }
        ],
        externalSpecifiers: [
          {
            "@type": "http://rs.tdwg.org/ontology/voc/TaxonConcept#TaxonConcept",
            "hasName": {
                "@type": "http://rs.tdwg.org/ontology/voc/TaxonName#TaxonName",
                "nameComplete": chooseTarget("C", newick)
            }
          }
        ]
      }
    ]
  };

  // Convert this Phyx document into a JSON-LD ontology and write it into a file.
  const phyx = require('../src');
  console.log(`Wrapping Phyx for Newick: ${newick}`);
  const jsonld = new phyx.PhyxWrapper(phyx_document).asOWLOntology();

  const filename = path.resolve(pathToScript, `n${nodeCount}`, `tree${index + 1}.jsonld`);
  fs.writeFileSync(filename, JSON.stringify(jsonld, null, 4));

  // Report on the phylogeny produced and the nodes being matched.
  // There are six nodes we're interested in:
  //  A: The node labeled 'A'.
  //  B: The node labeled 'B'.
  //  C: The node labeled 'C'.
  //  AB: The MRCA of A and B.
  //  AxC: The ancestor of A that is sibling to an ancestor of C.
  console.log(newick +
    "\t # A:" + (chooseTarget("A", newick) || "undefined").replace(' ', '_') +
    " B:" + (chooseTarget("B", newick) || "undefined").replace(' ', '_') +
    " C:" + (chooseTarget("C", newick) || "undefined").replace(' ', '_') +
    " AB:" + (chooseABTarget(newick) || "undefined").replace(' ', '_') +
    " AxC:" + (chooseAxCTarget(newick) || "undefined").replace(' ', '_'));
});

// Report on the number of trees produced versus what was expected.
if (argv.multifurcating) {
    console.log(`${normalizedUniqTrees.length} multifurcating trees generated out of an expected ${expectedTotalTrees}.`)
} else {
    console.log(`${normalizedUniqTrees.length} binary trees generated out of an expected ${expectedBifurcatingTrees}.`)
}
