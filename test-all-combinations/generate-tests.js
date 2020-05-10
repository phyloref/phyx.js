#!/usr/bin/env node

/*
 * In order to test whether we can resolve every possible type of clade,
 * we will generate every possible Phyx file for a given number of input
 * nodes.
 *
 * Synopsis: npm run generate-all-combinations --nodes [number of nodes]
 *
 *
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

const nodeCount = argv.nodes

if (nodeCount < 2) {
  console.error(`The number of leaf nodes must be 2 or greater (${nodeCount})`)
  process.exit(2);
}

// To label the leaf nodes, we'll name them from 'A' to 'Z', and then from 'AA' to 'ZZ', and so on.
function generateNextNodeLabel(str = "") {
  // When called without a value, the next value is 'A'.
  if (str == "") return "A";

  // Split the string into [everthing but the last character][the last character].
  const head = str.substring(0, str.length - 1);
  const last = str.substring(str.length - 1);

  // console.log(`(${head},${last})`);

  if (last == 'Z') {
    // When the last character goes up to 'Z', we increment the rest of the
    // string, and then add an 'A' at the end.
    return generateNextNodeLabel(head) + 'A'
  } else {
    // For characters other than 'Z', we increment it.
    return head + (String.fromCharCode(last.charCodeAt(0) + 1))
  }
}

const leafNodes = [];
var lastValue = "";
for(var x = 0; x < nodeCount; x++) {
  lastValue = generateNextNodeLabel(lastValue)
  leafNodes.push(lastValue);
}

console.log(`Generating Phyx files with ${nodeCount} leaf nodes each: ${leafNodes}`)

// Taken from https://academic.oup.com/sysbio/article/27/1/27/1626689 and
// https://en.wikipedia.org/wiki/Phylogenetic_tree#Enumerating_trees
function factorial(n) {
  if (n == 0) return 1;
  return (n != 1) ? n * factorial(n - 1) : 1;
}
const expectedBifurcatingTrees = factorial(2 * nodeCount - 3)/((2**(nodeCount - 2)) * factorial(nodeCount - 2));
console.log(`Expected bifurcating trees = ${expectedBifurcatingTrees}`);

// I tried to calculate this using the formula in
// https://academic.oup.com/sysbio/article/27/1/27/1626689, but I didn't get it
// working correctly. So I'm just hardcoding these numbers from
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
  throw new Error("Multifurcating tree counts only go up to n > 10");
}
const expectedMultifurcatingTrees = multifurcatingTreeCounts[nodeCount];
console.log(`Expected multifurcating trees = ${expectedMultifurcatingTrees}`);

const expectedTotalTrees = expectedBifurcatingTrees + expectedMultifurcatingTrees
console.log(`Expected total trees = ${expectedTotalTrees}`);

// 1 = (A)
// 2 = (A, B)
// 3 = (A, B), C; A, (B, C); (A, C), B; A, B, C
// 4 = (A, B), (C, D); A, (B, C, D)

/*
 * Start generating every possible phylogeny.
 */
function selectOne(array) {
  const result = [];
  for (var i = 0; i < array.length; i++) {
    const changeable = [...array];
    const deleted = changeable.splice(i, 1);
    result.push([deleted, changeable])
  }
  return result;
}

function generateTrees(nodes) {
  if (nodes.length == 1) return nodes;

  return selectOne(nodes).map(res => {
    const [selected, unselected] = res;

    // Generate (A, (B, C)) type trees by selecting one leaf node and then finding every combination of the remaining nodes.
    const selectOneResults = generateTrees(unselected).map(tree => [...selected, tree]);

    // Needed when n == 5, where you also need ((A, B), ...) type trees.
    const selectTwoResults = selectOne(unselected).map(res => {
      const [innerSelected, innerUnselected] = res;

      return generateTrees(innerUnselected).map(tree => [[...selected, ...innerSelected], tree]);
    }).reduce((acc, cur) => acc.concat(cur), []);

    // Needed when n == 6, where you also need ((A, B, C), ...)
    const selectThreeResults = selectOne(unselected).map(res => {
      const [firstSelected, firstUnselected] = res;

      return selectOne(firstUnselected).map(res2 => {
        const [secondSelected, secondUnselected] = res2;

        if (secondUnselected.length == 0) return [];
        return generateTrees(secondUnselected).map(tree => [
          [[[...selected, ...firstSelected], ...secondSelected], tree],
          [[...selected, [...firstSelected, ...secondSelected]], tree],
          [[[...selected, ...secondSelected], ...firstSelected], tree],
        ]).reduce((acc, cur) => acc.concat(cur), []);
      }).reduce((acc, cur) => acc.concat(cur), []);
    }).reduce((acc, cur) => acc.concat(cur), []);

    // Need to calculate n > 6? Then you need to extend this algorithm to handle
    // "selectNResults". Since we only need n = 6, we only need to select at most
    // two for now.

    return [...selectOneResults, ...selectTwoResults, ...selectThreeResults].filter(tree => tree != null && tree.length > 0);
  }).reduce((acc, cur) => acc.concat(cur), []);
}

function normalizeTree(tree) {
  if (!Array.isArray(tree)) return tree;
  if (tree.length == 0) return [];
  if (tree.length == 1) {
    // Look for cases where we have e.g. [[a, b]], which should be normalized to [a, b].
    if (Array.isArray(tree) && Array.isArray(tree[0]) && tree[0].length == 1) {
      return normalizeTree(tree[0]);
    }
    return tree;
  }
  return tree.map(node => normalizeTree(node)).sort();
}

const { uniqWith, isEqual } = require('lodash');
const fs = require('fs');

const trees = generateTrees(leafNodes);
let normalizedUniqTrees = uniqWith(trees.map(tree => normalizeTree(tree)), isEqual);

if (argv.multifurcating) {
  function getMultifurcatingTreeForNode(bifurcatingTree) {
    // If we don't have a tree, throw an error.
    if (bifurcatingTree.length == 0) throw new RuntimeException(`Expected a bifurcating tree, got an empty tree.`);

    // If we have more than 2 elements, then this isn't a bifurcating tree! Abort.
    if (bifurcatingTree.length > 2) throw new RuntimeException(`Expected a bifurcating tree, got ${bifurcatingTree.join(', ')}.`);

    // If we are called with a single node, just return that one node.
    if (bifurcatingTree.length == 1) return bifurcatingTree[0];

    const left = bifurcatingTree[0];
    const right = bifurcatingTree[1];

    // Given that tree is perfectly bifurcating, there are four possible trees here:
    //  - (A, B) => (A, B)
    //  - ((A, B), C) => (A, B, C)
    //  - (A, (B, C)) => (A, B, C)
    //  - ((A, B), (C, D)) =>
    //    - ((A, B), C, D)
    //    - (A, (B, C), D)
    //    - (A, B, (C, D))
    //    - ((A, B, C), D)
    //    - (A, (B, C, D))
    //    - (A, B, C, D)
    if (Array.isArray(left)) {
      if (Array.isArray(right)) {
        // Both left and right must be bifurcating too!
        if (left.length > 2) throw new RuntimeException(`Expected a bifurcating tree on left, got ${left.join(', ')}.`);
        if (left.length > 2) throw new RuntimeException(`Expected a bifurcating tree on right, got ${right.join(', ')}.`);

        const ll = left[0];
        const lr = left[1];
        const rl = right[0];
        const rr = right[1];

        const multifurcated_node_only = [
          // Return the bifurcating node.
          [left, right],

          // Additional multifurcating combinations.
          [[ll, lr], rl, rr],
          [ll, [lr, rl], rr],
          [ll, lr, [rl, rr]],
          [[ll, rr], lr, rl],
          [[ll, lr, rl], rr],
          [ll, [lr, rl, rr]],
          [lr, [ll, rl, rr]],
          [rl, [ll, lr, rr]],
          [ll, lr, rl, rr],
        ];

        //
        let recursive_nodes = [];
        if (Array.isArray(ll)) {
          const ll_alternatives = getMultifurcatingTreeForNode(ll);
          recursive_nodes = recursive_nodes.concat(ll_alternatives.map(alt => [
            [[alt, lr], rl, rr],
            [alt, [lr, rl], rr],
            [alt, lr, [rl, rr]],
            [[alt, rr], lr, rl],
            [[alt, lr, rl], rr],
            [alt, [lr, rl, rr]],
            [lr, [alt, rl, rr]],
            [rl, [alt, lr, rr]],
            [alt, lr, rl, rr],
            [[...alt, lr], rl, rr],
            [...alt, [lr, rl], rr],
            [...alt, lr, [rl, rr]],
            [[...alt, rr], lr, rl],
            [[...alt, lr, rl], rr],
            [...alt, [lr, rl, rr]],
            [lr, [...alt, rl, rr]],
            [rl, [...alt, lr, rr]],
            [...alt, lr, rl, rr],
          ]));
        }
        if (Array.isArray(lr)) {
          const lr_alternatives = getMultifurcatingTreeForNode(lr);
          recursive_nodes = recursive_nodes.concat(lr_alternatives.map(alt => [
            [[ll, alt], rl, rr],
            [ll, [alt, rl], rr],
            [ll, alt, [rl, rr]],
            [[ll, rr], alt, rl],
            [[ll, alt, rl], rr],
            [ll, [alt, rl, rr]],
            [alt, [ll, rl, rr]],
            [rl, [ll, alt, rr]],
            [ll, alt, rl, rr],
            [[ll, ...alt], rl, rr],
            [ll, [...alt, rl], rr],
            [ll, ...alt, [rl, rr]],
            [[ll, rr], ...alt, rl],
            [[ll, ...alt, rl], rr],
            [ll, [...alt, rl, rr]],
            [...alt, [ll, rl, rr]],
            [rl, [ll, ...alt, rr]],
            [ll, ...alt, rl, rr],
          ]));
        }
        if (Array.isArray(rl)) {
          const rl_alternatives = getMultifurcatingTreeForNode(rl);
          recursive_nodes = recursive_nodes.concat(rl_alternatives.map(alt => [
            [[ll, lr], alt, rr],
            [ll, [lr, alt], rr],
            [ll, lr, [alt, rr]],
            [[ll, rr], lr, alt],
            [[ll, lr, alt], rr],
            [ll, [lr, alt, rr]],
            [lr, [ll, alt, rr]],
            [alt, [ll, lr, rr]],
            [ll, lr, alt, rr],
            [[ll, lr], ...alt, rr],
            [ll, [lr, ...alt], rr],
            [ll, lr, [...alt, rr]],
            [[ll, rr], lr, ...alt],
            [[ll, lr, ...alt], rr],
            [ll, [lr, ...alt, rr]],
            [lr, [ll, ...alt, rr]],
            [...alt, [ll, lr, rr]],
            [ll, lr, ...alt, rr],
          ]));
        }
        if (Array.isArray(rr)) {
          const rr_alternatives = getMultifurcatingTreeForNode(rr);
          recursive_nodes = recursive_nodes.concat(rr_alternatives.map(alt => [
            [[ll, lr], rl, alt],
            [ll, [lr, rl], alt],
            [ll, lr, [rl, alt]],
            [[ll, alt], lr, rl],
            [[ll, lr, rl], alt],
            [ll, [lr, rl, alt]],
            [lr, [ll, rl, alt]],
            [rl, [ll, lr, alt]],
            [ll, lr, rl, alt],
            [[ll, lr], rl, ...alt],
            [ll, [lr, rl], ...alt],
            [ll, lr, [rl, ...alt]],
            [[ll, ...alt], lr, rl],
            [[ll, lr, rl], ...alt],
            [ll, [lr, rl, ...alt]],
            [lr, [ll, rl, ...alt]],
            [rl, [ll, lr, ...alt]],
            [ll, lr, rl, ...alt],
          ]));
        }

        return multifurcated_node_only.concat(recursive_nodes.reduce((acc, cur) => acc.concat(cur), []));
      } else {
        const direct = [
          [left, right],
          [left[0], left[1], right],
        ];
        const recursed = getMultifurcatingTreeForNode(left).map(alt => [
          [alt, right],
        ]);
        return direct.concat(recursed.reduce((acc, cur) => acc.concat(cur), []));
      }
    } else {
      if (Array.isArray(right)) {
        const direct = [
          [left, right],
          [left, right[0], right[1]],
        ];
        const recursed = getMultifurcatingTreeForNode(right).map(alt => [
          [left, alt],
        ]);
        return direct.concat(recursed.reduce((acc, cur) => acc.concat(cur), []));
      } else {
        // Neither is an array, so there is no additional multifurcating node to return.
        return [
          [left, right],
        ];
      }
    }
  }

  const multifurcatingTrees = normalizedUniqTrees
    .map(getMultifurcatingTreeForNode)
    .reduce((acc, cur) => acc.concat(cur), []);

  normalizedUniqTrees = uniqWith(multifurcatingTrees.map(tree => normalizeTree(tree)), isEqual)
}

normalizedUniqTrees.forEach((tree, index) => console.log(index + ": " + JSON.stringify(tree)));
console.log("Length: " + normalizedUniqTrees.length)

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
        label: chooseABTarget(newick).replace(' ', '_'),
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
        label: chooseAxCTarget(newick).replace(' ', '_'),
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

  const phyx = require('../src');
  console.log(`Wrapping Phyx for Newick: ${newick}`);
  const jsonld = new phyx.PhyxWrapper(phyx_document).asJSONLD();

  const filename = `./test-all-combinations/tree${index + 1}.jsonld`;
  fs.writeFileSync(filename, JSON.stringify(jsonld, null, 4));

  console.log(newick + "\t # A:" + chooseTarget("A", newick) + " B:" + chooseTarget("B", newick) + " C:" + chooseTarget("C", newick) + " AB:" + chooseABTarget(newick) + " AxC:" + chooseAxCTarget(newick));

  // TODO: Now we need to do all the multifurcating trees.
});

if (argv.multifurcating) {
    console.log(`${normalizedUniqTrees.length} multifurcating trees generated out of an expected ${expectedTotalTrees}.`)
} else {
    console.log(`${normalizedUniqTrees.length} binary trees generated out of an expected ${expectedBifurcatingTrees}.`)
}
