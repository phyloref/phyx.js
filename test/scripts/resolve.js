/*
 * Test resolution against the Open Tree of Life via the resolve script.
 */

const child = require('child_process');
const path = require('path');

const lodash = require('lodash');
const chai = require('chai');

const expect = chai.expect;

/*
 * Test whether we can use the resolve script to resolve phylorefs against
 * the Open Tree of Life.
 */

const RESOLVE_JS = 'bin/resolve.js';

describe('bin/resolve.js', function () {
  it('should work without any arguments', function () {
    const result = child.spawnSync(RESOLVE_JS, [], {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    expect(result.status).to.equal(1);
    expect(result.stdout).to.be.empty;
    expect(result.stderr).to.contain('No input files provided.');
  });
  it('should support `--help`', function () {
    const result = child.spawnSync(RESOLVE_JS, ['--help'], {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    expect(result.status).to.equal(0);
    expect(result.stderr).to.be.empty;
    expect(result.stdout).to.contain('resolve.js [files to resolve on the Open Tree of Life]');
  });
  it('should provide the expected results on the `brochu_2003.json` example file', function () {
    var resultObj; // eslint-disable-line no-var

    this.timeout(20000); // Take up to 20 seconds to run this.

    const result = child.spawnSync(RESOLVE_JS, [path.resolve(__dirname, '../examples/correct/brochu_2003.json')], {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    expect(result.status).to.equal(0);
    expect(result.stderr).to.be.empty;

    expect(function () {
      resultObj = JSON.parse(result.stdout);
    }).to.not.throw(SyntaxError);

    expect(lodash.keys(resultObj)).to.have.members([
      'Alligatoridae',
      'Alligatorinae',
      'Caimaninae',
      'Crocodyloidea',
      'Crocodylidae',
      'Diplocynodontinae',
    ]);

    expect(resultObj.Alligatoridae[0].resolved).to.include({
      '@id': 'https://tree.opentreeoflife.org/opentree/argus/opentree13.4@ott195670',
      label: 'Alligatoridae',
    });
    expect(resultObj.Alligatorinae[0].resolved).to.include({
      '@id': 'https://tree.opentreeoflife.org/opentree/argus/opentree13.4@ott151255',
      label: 'Alligatorinae',
    });
    expect(resultObj.Crocodylidae[0].resolved).to.include({
      '@id': 'https://tree.opentreeoflife.org/opentree/argus/opentree13.4@ott1092501',
      label: 'Longirostres',
    });
    expect(resultObj.Diplocynodontinae[0]).to.include({
      error: 'no_mrca_found:400',
    });
  });
  it('should correctly report errors with certain phyloreferences', function () {
    var resultObj; // eslint-disable-line no-var

    this.timeout(20000); // Take up to 20 seconds to run this.

    const result = child.spawnSync(RESOLVE_JS, [path.resolve(__dirname, '../examples/incorrect/otl-resolution-errors.json')], {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    expect(result.status).to.equal(0);
    expect(result.stderr).to.be.empty;

    expect(function () {
      resultObj = JSON.parse(result.stdout);
    }).to.not.throw(SyntaxError);

    expect(lodash.keys(resultObj)).to.have.members([
      'SingleSpecifier',
      'TaxonNameNotFound',
      'Produces404OnOTR',
    ]);

    // console.log(JSON.stringify(resultObj, null, 2));

    expect(resultObj.SingleSpecifier[0]).to.include({
      error: 'one_internal_specifier_with_no_external_specifiers',
    });

    expect(resultObj.TaxonNameNotFound[0]).to.include({
      error: 'internal_specifiers_missing',
    });

    expect(resultObj.Produces404OnOTR[0]).to.include({
      error: 'no_mrca_found:404',
    });
  });
});
