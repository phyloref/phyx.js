#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const retus = require('retus');

const phyx = require('..');

/*
 * An application for resolving input Phyx files on the Open Tree of Life.
 */

// Read command line arguments.
const argv = require('yargs')
  .usage("$0 [files to resolve on the Open Tree of Life]")
  .describe('write-table', 'A file to write out a table of results to')
  .help()
  .alias('h', 'help')
  .argv

const filenames = argv._;

/*
 * Get a list of all files in a directory. We will recurse into directories and choose files that meet the
 * criteria in the function `check(filename) => boolean`.
 */
function getFilesInDir(dir, check = (filename => filename.toLowerCase().endsWith(".json"))) {
  // console.debug(`Processing file: ${dir}`)
  if (!fs.existsSync(dir)) return [];

  const lsync = fs.lstatSync(dir);
  if (lsync.isFile()) {
    if (!check(dir)) {
      // console.log(`Skipping ${dir}.`)
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
    // console.debug(`${dir} is neither a file nor a directory; skipping.`);
    return [];
  }
}
const files = filenames.map(filename => getFilesInDir(filename)).reduce((acc, curr) => acc.concat(curr), []);
// console.debug(`Files to process: ${files.join(", ")}`);

/*
 * Resolve the input file on the Open Tree of Life.
 */
function resolvePhyx(filename) {
  // console.debug(`Starting with ${filename}.`);

  try {
    // Parse the input file into JSON.
    let phyxContent = JSON.parse(fs.readFileSync(filename));

    console.info(`\nResolving phyloreferences in ${filename}:`);
    return (phyxContent.phylorefs || []).map(phyloref => {
      const wrappedPhyloref = new phyx.PhylorefWrapper(phyloref);
      console.info(` - Phyloref ${wrappedPhyloref.label}:`);

      function specifierToOTLId(specifier) {
        const wrappedSpecifier = new phyx.TaxonomicUnitWrapper(specifier);

        if (!wrappedSpecifier.taxonConcept) {
          console.info(`     - ${wrappedSpecifier.label}: not a taxon concept`);
          return undefined;
        } else {
          const nameComplete = new phyx.TaxonConceptWrapper(specifier).nameComplete;

          if (!nameComplete) {
            console.info(`     - ${wrappedSpecifier.label} is missing a taxonomic name: ${JSON.stringify(specifier)}`);
            return undefined;
          } else {
            const { statusCode, body } = retus("https://api.opentreeoflife.org/v3/tnrs/match_names", {
              method: 'post',
              json: { names : [ nameComplete ] },
            });

            const matches = body['results'].map(result => result['matches']).reduce((acc, curr) => acc.concat(curr), []);

            const ottNames = matches.filter(match => match).map(match => match['taxon']['name']).filter(name => name);
            const ottIds = matches.filter(match => match).map(match => match['taxon']['ott_id']).filter(ott_id => ott_id);
            const firstOttId = ottIds[0];

            if (firstOttId) {
              console.info(`     - ${wrappedSpecifier.label}: taxon name '${nameComplete}' resolved to ${ottNames.join('|')} (OTT IDs ${ottIds.join('|')}, using ${firstOttId})`);
              return firstOttId;
            } else {
              console.info(`     - ${wrappedSpecifier.label} not found on the Open Tree of Life: ${JSON.stringify(body)}`);
              return undefined;
            }
           }
        }
      }

      console.info(`   - Internal specifiers:`);
      const internalOTTids = wrappedPhyloref.internalSpecifiers.map(specifierToOTLId);
      console.info(`   - External specifiers:`);
      const externalOTTids = wrappedPhyloref.externalSpecifiers.map(specifierToOTLId);

      if (internalOTTids.filter(x => x === undefined).length > 0) {
        console.info('Not all internal specifiers could be resolved to OTT Ids, skipping.');
        return [
          filename,
          wrappedPhyloref.label,
          wrappedPhyloref.phyloref.cladeDefinition,
          'internal_specifiers_missing',
          '', '', '', ''
        ];
      } else if (externalOTTids.filter(x => x === undefined).length > 0) {
        console.info('Not all internal specifiers could be resolved to OTT Ids, skipping.');
        return [
          filename,
          wrappedPhyloref.label,
          wrappedPhyloref.phyloref.cladeDefinition,
          'external_specifiers_missing',
          '', '', '', ''
        ];
      } else if (internalOTTids.length == 0) {
        console.info('No internal specifiers found, skipping.');
        return [
          filename,
          wrappedPhyloref.label,
          wrappedPhyloref.phyloref.cladeDefinition,
          'no_internal_specifiers',
          '', '', '', ''
        ];
      } else {
        // console.debug('Request: ', { node_ids: internalOTTids, excluded_node_ids: externalOTTids });
        const result = retus("https://api.opentreeoflife.org/v3/tree_of_life/mrca ", {
          throwHttpErrors: false,
          method: 'post',
          json: { node_ids: internalOTTids.map(id => "ott" + id), excluded_node_ids: externalOTTids.map(id => "ott" + id) },
          responseType: 'text',
        });

        // There are two types of responses we might get:
        //  - If we have external specifiers, we'll get a 'node_ids', where the first one
        //    is the node-based name and the last one is the branch-based name, and a 'synth_id'.
        //  - If we have only internal specifiers, we'll get a 'mrca' with a 'node_id' (as well as
        //    'supported_by' and 'unique_name') and a 'synth_id'.

        if (result.statusCode == 404 || result.statusCode == 400) {
          console.info(`   -> Could not find a MRCA: ${result}.`);
          return [
            filename,
            wrappedPhyloref.label,
            wrappedPhyloref.phyloref.cladeDefinition,
            'no_mrca_found:' + result.statusCode,
            '', '', '', ''
          ];
        }

        const body = JSON.parse(result.body);
        const synth_id = body['synth_id'];
        if (body['node_ids']) {
          const node_id = body.node_ids[body.node_ids.length - 1];
          console.info(`   -> ${body.node_ids.length} node IDs returned, with branch-based node at: https://tree.opentreeoflife.org/opentree/argus/${synth_id}@${node_id}`);

          const nodeInfo = retus("https://api.opentreeoflife.org/v3/tree_of_life/node_info ", {
            method: 'post',
            json: { node_id }
          });

          let name = "";
          if (nodeInfo['body'] && nodeInfo['body']['taxon'] && nodeInfo['body']['taxon']['unique_name']) {
            name = nodeInfo['body']['taxon']['unique_name'];
            console.info(`     - Identified as ${name}.`);
          }

          return [
            filename,
            wrappedPhyloref.label,
            wrappedPhyloref.phyloref.cladeDefinition,
            `found_${body.node_ids.length}_nodes`,
            'maximum',
            name,
            synth_id,
            node_id,
            `https://tree.opentreeoflife.org/opentree/argus/${synth_id}@${node_id}`
          ];
        } else if(body['mrca']) {
          const name = body.mrca.unique_name || ((body.mrca.taxon || {}).name) || "";
          console.info(`   -> Found MRCA node (${name}): https://tree.opentreeoflife.org/opentree/argus/${synth_id}@${body.mrca.node_id}`);
          return [
            filename,
            wrappedPhyloref.label,
            wrappedPhyloref.phyloref.cladeDefinition,
            'found_mrca',
            'minimum',
            name,
            synth_id,
            body.mrca.node_id,
            `https://tree.opentreeoflife.org/opentree/argus/${synth_id}@${body.mrca.node_id}`
          ];
        } else {
          console.error('   -> Unable to interpret Open Tree MRCA response: ', body);
        }
        return [
          filename,
          wrappedPhyloref.label,
          wrappedPhyloref.phyloref.cladeDefinition,
          'unknown',
          '', '', '', ''
        ];
      }
    });
  } catch(e) {
    console.error(`Could not resolve ${filename}: `, e);
  }
  return [];
}

// Process all files.
const results = files.map(file => resolvePhyx(file)).reduce((acc, curr) => acc.concat(curr), []).filter(x => x);
console.log(results);
if (argv.writeTable) {
  const output = results.map(result => result.join("\t")).join("\n");
  fs.writeFileSync(
    argv.writeTable,
    output
  );
  console.info(`Wrote table to ${argv.writeTable}.`);
}