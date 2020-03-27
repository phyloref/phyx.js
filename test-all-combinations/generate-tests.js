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

/*
 * TODO: This doesn't work! I need to re-read the paper at
 * https://academic.oup.com/sysbio/article/27/1/27/1626689
 * and figure out why.
 */
function T1(n, m) {
  if (n == 1 && m == 0) return 1;
  if (n == 1) return 0;
  if (n > 1 && m == 1) return T(n - 1, 1);
  if (n > 1 && m > 1) return m * T(n - 1, m) + (n + m - 2) * T(n - 1, m - 1);
  throw new Error(`Should never get here: (${n}, ${m})`);
}

function T(n, m) {
  const val = T1(n, m);
  // console.log(`T(${n}, ${m}) = ${val}`);
  return val;
}

var expectedMultifurcatingTrees = 0;
for(var m = 1; m < nodeCount + 1; m++) {
  const x = T(nodeCount, m);
  //console.log(`T(${nodeCount}, ${m}) = ${x}`)
  expectedMultifurcatingTrees += x;
}
console.log(`Expected multifurcating trees (#TODO) = ${expectedMultifurcatingTrees}`);

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

      selectOne(firstUnselected).map(res2 => {
        const [secondSelected, secondUnselected] = res2;

        return generateTrees(secondUnselected).map(tree => [[...selected, ...secondSelected, ...firstSelected], tree]);
      }).reduce((acc, cur) => acc.concat(cur), []);
    }).reduce((acc, cur) => acc.concat(cur), []);

    // Need to calculate n > 6? Then you need to extend this algorithm to handle
    // "selectNResults". Since we only need n = 6, we only need to select at most
    // two for now.

    return [...selectOneResults, ...selectTwoResults].filter(tree => tree.length > 0);
  }).reduce((acc, cur) => acc.concat(cur), []);
}

function normalizeTree(tree) {
  if (!Array.isArray(tree)) return tree;
  if (tree.length == 0) return [];
  if (tree.length == 1) return tree;
  return tree.map(node => normalizeTree(node)).sort();
}

const { uniqWith, isEqual } = require('lodash');
const fs = require('fs');

const trees = generateTrees(leafNodes);
const normalizedUniqTrees = uniqWith(trees.map(tree => normalizeTree(tree)), isEqual);

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
        newick: newick
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
  const jsonld = new phyx.PhyxWrapper(phyx_document).asJSONLD();

  const filename = `./test-all-combinations/tree${index + 1}.jsonld`;
  fs.writeFileSync(filename, JSON.stringify(jsonld, null, 4));

  console.log(newick + "\t # A:" + chooseTarget("A", newick) + " B:" + chooseTarget("B", newick) + " C:" + chooseTarget("C", newick) + " AB:" + chooseABTarget(newick) + " AxC:" + chooseAxCTarget(newick));

  // TODO: Now we need to do all the multifurcating trees.
});

console.log(`${normalizedUniqTrees.length} trees generated out of an expected ${expectedBifurcatingTrees}.`)
