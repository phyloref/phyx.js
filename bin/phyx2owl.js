#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const phyx = require('..');

/*
 * An application for converting input Phyx files to OWL ontologies.
 */

// Read command line arguments.
const argv = require('yargs')
  .usage("$0 [files to convert into OWL ontologies]")
  .help()
  .alias('h', 'help')
  .argv

const filenames = argv._;

function getFilesInDir(dir, check = (filename => filename.toLowerCase().endsWith(".json"))) {
  console.log(`Processing file: ${dir}`)
  if (!fs.existsSync(dir)) return [];

  const lsync = fs.lstatSync(dir);
  if (lsync.isFile()) {
    if (!check(dir)) {
      console.log(`Skipping ${dir}.`)
      return [];
    } else {
      return [dir];
    }
  } else if (lsync.isDirectory()) {
    const files = fs.readdirSync(dir);
    return files.map(file => getFilesInDir(path.join(dir, file), check))
      .reduce((acc, curr) => acc.concat(curr), [])
      .filter(filename => filename);
  } else {
    console.info(`${dir} is neither a file nor a directory; skipping.`);
    return [];
  }
}
const files = filenames.map(filename => getFilesInDir(filename)).reduce((acc, curr) => acc.concat(curr), []);
console.debug(`Files to process: ${files.join(", ")}`);

function convertFileToOWL(filename) {
  let outputFilename;
  if (filename.toLowerCase().endsWith(".json")) {
    outputFilename = filename.substring(0, filename.length - 5) + ".owl";
  } else {
    outputFilename = filename + ".owl";
  }

  try {
    const phyxContent = JSON.parse(fs.readFileSync(filename));
    const wrappedPhyx = new phyx.PhyxWrapper(phyxContent);
    const owlOntology = wrappedPhyx.asJSONLD();
    fs.writeFileSync(
      outputFilename,
      JSON.stringify(owlOntology, null, 2)
    );

    console.info(`Converted ${filename} to ${outputFilename}`);
    return true;
  } catch(e) {
    console.error(`Could not convert ${filename} to ${outputFilename}: ${e}`);
    return false;
  }
}
const successes = files.map(file => convertFileToOWL(file));
if(successes.every(x => x)) {
  console.log(`${successes.length} files converted successfully.`);
} else {
  console.log(`Errors occurred; ${successes.filter(x => x).length} files converted successfully, ${successes.filter(x => !x).length} files failed.`);
}
