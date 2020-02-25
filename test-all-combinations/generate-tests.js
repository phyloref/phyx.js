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
