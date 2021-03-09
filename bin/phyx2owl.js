#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const phyx = require('..');

/*
 * An application for converting input Phyx files to OWL ontologies.
 */

// Read command line arguments.
const argv = require('yargs')
  .usage("$0 [files or directories to convert into OWL ontologies]")
  .describe('max-internal-specifiers', 'The maximum number of internal specifiers (phylorefs with more than this number will be ignored)')
  .default('max-internal-specifiers', 8)
  .describe('max-external-specifiers', 'The maximum number of external specifiers (phylorefs with more than this number will be ignored)')
  .default('max-external-specifiers', 8)
  .describe('base-iri', 'The base IRI to use for the input files')
  .help()
  .alias('h', 'help')
  .argv

/*
 * Get a list of all files in a directory. We will recurse into directories and choose
 * files that meet the criteria in the function `check(filename) => boolean`.
 */
function getFilesInDir(filePath, check = (filename => filename.toLowerCase().endsWith(".json"))) {
  // console.debug(`Processing file: ${filePath}`)
  if (!fs.existsSync(filePath)) return [];

  const lsync = fs.lstatSync(filePath);
  if (lsync.isFile()) {
    // If `path` is a file, check if it meets the provided requirement. If so,
    // add it to the list of collected files.
    if (!check(filePath)) {
      // console.debug(`Skipping ${filePath}.`)
      return [];
    } else {
      return [filePath];
    }
  } else if (lsync.isDirectory()) {
    // If `path` is a directory, recurse into every file in that directory.
    const files = fs.readdirSync(filePath);
    return files.map(file => getFilesInDir(path.join(filePath, file), check))
      .reduce((acc, curr) => acc.concat(curr), []);
  } else {
    // console.debug(`${filePath} is neither a file nor a directory; skipping.`);
    return [];
  }
}

// Get a list of all the files requested for processing on the command line.
// At this point, we convert directories into lists of files.
const filenames = argv._;
if (filenames.length === 0) {
  console.error("No input files provided.");
  process.exit(1);
}

const files = filenames
  .map(filename => getFilesInDir(filename))
  .reduce((acc, curr) => acc.concat(curr), []);
// console.debug(`Files to process: ${files.join(", ")}`);

if (files.length === 0) {
  console.error(`Input files do not exist or consist of directories that do not contain JSON files: ${filenames.join(', ')}`);
  process.exit(1);
}

/*
 * Convert the input file into the output filename.
 * If no argOutputFilename is given, we generate one from the input
 * filename: either by replacing '.json' with '.owl', or by concatenating
 * '.owl' at the end.
 */
function convertFileToOWL(filename, argOutputFilename = "") {
  // console.debug(`Starting with ${filename}.`);
  let outputFilename;
  if (argOutputFilename != "") {
    outputFilename = argOutputFilename;
  } else if (filename.toLowerCase().endsWith(".json")) {
    outputFilename = filename.substring(0, filename.length - 5) + ".owl";
  } else {
    outputFilename = filename + ".owl";
  }

  try {
    // Parse the input file into JSON.
    let phyxContent = JSON.parse(fs.readFileSync(filename));

    // Remove any phylorefs that have too many specifiers.
    const phylorefCount = (phyxContent.phylorefs || []).length;
    filteredPhylorefs = (phyxContent.phylorefs || []).filter(phyloref => {
      const wrappedPhyloref = new phyx.PhylorefWrapper(phyloref);
      const internalSpecifiersCount = wrappedPhyloref.internalSpecifiers.length;
      const externalSpecifiersCount = wrappedPhyloref.externalSpecifiers.length;
      if (internalSpecifiersCount > argv.maxInternalSpecifiers) {
        console.warn(`Phyloreference ${wrappedPhyloref.label} was skipped, since it has ${internalSpecifiersCount} internal specifiers.`);
        return false;
      } else if (externalSpecifiersCount > argv.maxExternalSpecifiers) {
        console.warn(`Phyloreference ${wrappedPhyloref.label} was skipped, since it has ${externalSpecifiersCount} external specifiers.`);
        return false;
      }
      return true;
    });
    phyxContent.phylorefs = filteredPhylorefs;

    // Convert the Phyx file into JSON-LD.
    const wrappedPhyx = new phyx.PhyxWrapper(phyxContent);
    const owlOntology = wrappedPhyx.asOWLOntology(argv.baseIri);
    const owlOntologyStr = JSON.stringify(owlOntology, null, 2);
    fs.writeFileSync(
      outputFilename,
      owlOntologyStr
    );

    // Report on whether any phyloreferences were converted.
    if (filteredPhylorefs.length == 0) {
        console.warn(`No phyloreferences in ${filename} were converted to ${outputFilename}, as they were all filtered out.`);
        return false;
    } else if (phylorefCount > filteredPhylorefs.length) {
        console.warn(`Only ${filteredPhylorefs.length} out of ${phylorefCount} were converted from ${filename} to ${outputFilename}.`);
        return true;
    } else {
        console.info(`Converted ${filename} to ${outputFilename}.`);
        return true;
    }

    return true;
  } catch(e) {
    console.error(`Could not convert ${filename} to ${outputFilename}: ${e} at ${e.stack}`);
    console.error(``)
  }
  return false;
}

// Count and report all the successes in converting files to OWL.
const successes = files.map(file => convertFileToOWL(file));
if(successes.every(x => x)) {
  console.log(`${successes.length} files converted successfully.`);
} else {
  console.log(`Errors occurred; ${successes.filter(x => x).length} files converted successfully, ${successes.filter(x => !x).length} files failed.`);
}
