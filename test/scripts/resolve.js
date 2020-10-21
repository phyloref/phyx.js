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

    const result = child.spawnSync(RESOLVE_JS, [path.resolve(__dirname, '../examples/brochu_2003.json')], {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    expect(result.status).to.equal(0);
    expect(result.stderr).to.be.empty;

    expect(function () {
      resultObj = JSON.parse(result.stdout);
    }).to.not.throw(SyntaxError);

    console.log(`Result object: ${JSON.stringify(resultObj, null, 2)}`);

    expect(lodash.keys(resultObj)).to.have.members([
      'Alligatoridae',
      'Alligatorinae',
      'Caimaninae',
      'Crocodyloidea',
      'Crocodylidae',
      'Diplocynodontinae',
    ]);

    expect(resultObj.Alligatoridae[0].resolved).to.include({
      '@id': 'https://tree.opentreeoflife.org/opentree/argus/opentree12.3@ott195670',
      label: 'Alligatoridae',
    });
    expect(resultObj.Alligatorinae[0].resolved).to.include({
      '@id': 'https://tree.opentreeoflife.org/opentree/argus/opentree12.3@ott151255',
      label: 'Alligatorinae',
    });
    expect(resultObj.Crocodylidae[0].resolved).to.include({
      '@id': 'https://tree.opentreeoflife.org/opentree/argus/opentree12.3@ott1092501',
      label: 'Longirostres',
    });
    expect(resultObj.Diplocynodontinae[0]).to.include({
      error: 'no_mrca_found:400',
    });
  });
});
