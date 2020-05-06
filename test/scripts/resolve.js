/*
 * Test resolution against the Open Tree of Life via the resolve script.
 */

const child = require('child_process');

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
  it('should support `--help` ', function () {
    const result = child.spawnSync(RESOLVE_JS, ['--help'], {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    expect(result.status).to.equal(0);
    expect(result.stderr).to.be.empty;
    expect(result.stdout).to.contain('resolve.js [files to resolve on the Open Tree of Life]');
  });
});
