#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const retus = require('retus');
const lodash = require('lodash');

const phyx = require('..');

/*
 * An application for resolving input Phyx files on the Open Tree of Life.
 */

// Read command line arguments.
const argv = require('yargs')
  .usage("$0 [files to resolve on the Open Tree of Life]")
  .describe('write-table', 'A file to which to write a table of results')
  .describe('verbose', 'Display debugging information')
  .boolean('verbose')
  .help()
  .alias('h', 'help')
  .showHelpOnFail(true)
  .argv

const filenames = argv._;
if (filenames.length == 0) {
  console.error(`No input files provided. Use 'npm run resolve --help' for more information.`);
  process.exit(1);
}

/* Helper methods */

/**
 * Display debugging output to STDERR if the '--verbose' flag has been set.
 */
function debug(...args) {
  if (argv.verbose) {
    process.stderr.write(args.join(' ') + "\n")
  }
}

/*
 * Get a list of all files in a directory. We will recurse into directories and choose files that meet the
 * criteria in the function `check(filename) => boolean`.
 */
function getFilesInDir(dir, check = (filename => filename.toLowerCase().endsWith(".json"))) {
  // debug(`Processing file: ${dir}`)
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
    // debug(`${dir} is neither a file nor a directory; skipping.`);
    return [];
  }
}
const files = filenames.map(filename => getFilesInDir(filename)).reduce((acc, curr) => acc.concat(curr), []);
// debug(`Files to process: ${files.join(", ")}`);

if (files.length == 0) {
  console.error(`No files found in input directories or files: ${filenames.join(', ')}.`);
  process.exit(1);
}

/**
 * Resolve the input file on the Open Tree of Life.
 *
 * @return A set of results in the format:
 *    {
 *      'filename': 'input.json',
 *      'phyloref': { '@id': '...', ... },
 *      'internalSpecifiers': {
 *        'Alligator mississippiensis': [
 *          'https://tree.opentreeoflife.org/taxonomy/browse?id=335590'
 *        ],
 *        'Caiman crocodilus': [
 *          'https://tree.opentreeoflife.org/taxonomy/browse?id=912130'
 *        ]
 *      },
 *      'externalSpecifiers': {},
 *      resolved: {
 *        '@id': 'https://tree.opentreeoflife.org/opentree/argus/opentree12.3@ott195670',
 *        'label': 'Alligatoridae'
 *      }
 *    }
 */
function resolvePhyx(filename) {
  // debug(`Starting with ${filename}.`);

  try {
    // Parse the input file into JSON.
    let phyxContent = JSON.parse(fs.readFileSync(filename));

    debug(`\nResolving phyloreferences in ${filename}:`);
    return (phyxContent.phylorefs || []).map(phyloref => {
      const wrappedPhyloref = new phyx.PhylorefWrapper(phyloref);
      debug(` - Phyloref ${wrappedPhyloref.label}:`);

      function specifierToOTLId(specifier) {
        const wrappedSpecifier = new phyx.TaxonomicUnitWrapper(specifier);

        if (!wrappedSpecifier.taxonConcept) {
          debug(`     - ${wrappedSpecifier.label}: not a taxon concept`);
          return undefined;
        } else {
          const nameComplete = new phyx.TaxonConceptWrapper(specifier).nameComplete;

          if (!nameComplete) {
            debug(`     - ${wrappedSpecifier.label} is missing a taxonomic name: ${JSON.stringify(specifier)}`);
            return undefined;
          } else {
            const nameToUse = nameComplete.replace(/\s+\(originally \w+\)/g, "");
            const { statusCode, body } = retus("https://api.opentreeoflife.org/v3/tnrs/match_names", {
              method: 'post',
              json: { names : [ nameToUse ] },
            });

            const matches = body['results'].map(result => result['matches']).reduce((acc, curr) => acc.concat(curr), []);

            const ottNames = matches.filter(match => match).map(match => match['taxon']['name']).filter(name => name);
            const ottIds = matches.filter(match => match).map(match => match['taxon']['ott_id']).filter(ott_id => ott_id);

            if (ottIds.length > 1) debug(`     - Taxon name ${nameComplete} resolved to multiple OTT Ids: ${ottIds.join(', ')}.`)

            if (ottIds.length == 0) return undefined;

            const result = {};
            result[nameComplete] = ottIds;
            return result;
          }
        }
      }

      const internalOTTs = wrappedPhyloref.internalSpecifiers.map(specifierToOTLId);
      const internalOTTids = lodash.flattenDeep(internalOTTs.map(ott => lodash.head(lodash.values(ott))));
      debug(`   - Internal specifiers: ${internalOTTids.join(', ')}`);
      // console.log(internalOTTids);

      const externalOTTs = wrappedPhyloref.externalSpecifiers.map(specifierToOTLId);
      const externalOTTids = lodash.flattenDeep(externalOTTs.map(ott => lodash.head(lodash.values(ott))));
      debug(`   - External specifiers: ${externalOTTids.join(', ')}`);
      // console.log(externalOTTids);

      if (internalOTTids.filter(x => x === undefined).length > 0) {
        debug('Not all internal specifiers could be resolved to OTT Ids, skipping phyloreference.');
        return {
          filename,
          phyloref,
          error: 'internal_specifiers_missing',
        };
      } else if (externalOTTids.filter(x => x === undefined).length > 0) {
        debug('Not all external specifiers could be resolved to OTT Ids, skipping phyloreference.');
        return {
          filename,
          phyloref,
          error: 'external_specifiers_missing',
        };
      } else if (internalOTTids.length == 0) {
        debug('No internal specifiers found, skipping phyloreference.');
        return {
          filename,
          phyloref,
          error: 'no_internal_specifiers',
        };
      } else if (internalOTTids.length === 1 && externalOTTids.length === 0) {
          debug('Cannot resolve phyloreference with a single internal specifier, skipping phyloreference.');
          return {
            filename,
            phyloref,
            error: 'one_internal_specifier_with_no_external_specifiers',
          };
      } else {
        // debug('Request: ', { node_ids: internalOTTids, excluded_node_ids: externalOTTids });
        const result = retus("https://api.opentreeoflife.org/v3/tree_of_life/mrca", {
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

        if (result.statusCode == 200) {
          // Document returned successfully!
        } else if (result.statusCode == 404 || result.statusCode == 400) {
          // The API returns 400/404 codes when it can't find the MRCA. I think that:
          //  400 means that one of the OTT IDs is not present on the synthetic tree.
          //  404 means that the constraints couldn't be met, i.e. you can't exclude those node IDs.
          debug(`   -> Could not find a MRCA: ${JSON.stringify(result, null, 2)}.`);
          return {
            filename,
            phyloref,
            error: 'no_mrca_found:' + result.statusCode,
          };
        } else {
          // Unknown connection error! Bail out.
          throw new Error(`Could not connect to the Open Tree of Life API: ${result}`)
        }

        const body = JSON.parse(result.body);
        const synth_id = body['synth_id'];
        if (body['node_ids']) {
          const node_id = body.node_ids[body.node_ids.length - 1];
          debug(`   -> ${body.node_ids.length} node IDs returned, with branch-based node at: https://tree.opentreeoflife.org/opentree/argus/${synth_id}@${node_id}`);

          const nodeInfo = retus("https://api.opentreeoflife.org/v3/tree_of_life/node_info ", {
            method: 'post',
            json: { node_id }
          });

          let name = "";
          if (nodeInfo['body'] && nodeInfo['body']['taxon'] && nodeInfo['body']['taxon']['unique_name']) {
            name = nodeInfo['body']['taxon']['unique_name'];
            debug(`     - Identified as ${name}.`);
          }

          return {
            filename,
            phyloref,
            internalSpecifiers: internalOTTs,
            externalSpecifiers: externalOTTs,
            status: `found_${body.node_ids.length}_nodes`,
            cladeType: 'maximum',
            resolved: {
              '@id': `https://tree.opentreeoflife.org/opentree/argus/${synth_id}@${node_id}`,
              'label': name
            }
          };
        } else if(body['mrca']) {
          const name = body.mrca.unique_name || ((body.mrca.taxon || {}).name) || "";
          debug(`   -> Found MRCA node (${name}): https://tree.opentreeoflife.org/opentree/argus/${synth_id}@${body.mrca.node_id}`);
          return {
            filename,
            phyloref,
            internalSpecifiers: internalOTTs,
            externalSpecifiers: externalOTTs,
            status: `found_mrca`,
            cladeType: 'minimum',
            resolved: {
              '@id': `https://tree.opentreeoflife.org/opentree/argus/${synth_id}@${body.mrca.node_id}`,
              'label': name
            }
          }
        } else {
          console.error('Unable to interpret Open Tree MRCA response: ', body);
        }
        return {
          filename,
          phyloref,
          error: 'unknown',
        }
      }
    });
  } catch(e) {
    console.error(`Could not resolve ${filename}: `, e);
  }
  return {
    filename,
    phyloref,
    error: 'unknown',
  }
}

// Process all files.
const results = lodash.groupBy(
  files.map(file => resolvePhyx(file)).reduce((acc, curr) => acc.concat(curr), []).filter(x => x),
  result => result.phyloref['@id'] || new phyx.PhylorefWrapper(result.phyloref).label || lodash.uniqueId('_')
);
process.stdout.write(JSON.stringify(results, null, 4));

if (argv.writeTable) {
  const output = lodash.flatten(lodash.values(results)).map(result => {
    const wrappedPhyloref = new phyx.PhylorefWrapper(result.phyloref);

    return [
      result.filename,
      wrappedPhyloref.label.replace(/\s+/g, ' ').trim(),
      ((result.phyloref || {}).cladeDefinition || "").replace(/\s+/g, ' ').trim(),
      result.error || result.status || 'unknown',
      result.cladeType,
      (result.resolved || {})['label'],
      (result.resolved || {})['@id']
    ].join("\t");
  }).join("\n");
  fs.writeFileSync(
    argv.writeTable,
    "filename\tlabel\tcladeDefinition\tstatus\tcladeType\tott_label\tott_url\n" +
    output
  );
  debug(`\nWrote table to ${argv.writeTable}.`);
}
process.exitCode = 0;
