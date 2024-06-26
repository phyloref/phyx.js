/*
 * Use JPhyloRef to ensure that the expected JSON-LD files pass testing.
 * A different test, `examples.js`, will then test whether the current Phyx.js
 * produces a file identical to the expected JSON-LD files.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const Downloader = require('nodejs-file-downloader');
const chai = require('chai');

const expect = chai.expect;

/*
 * Constants
 */
// The version of JPhyloRef to download.
const JPHYLOREF_VERSION = '1.1.1';

// The URL from where JPhyloRef should be downloaded.
const JPHYLOREF_URL = `https://repo.maven.apache.org/maven2/org/phyloref/jphyloref/${JPHYLOREF_VERSION}/jphyloref-${JPHYLOREF_VERSION}.jar`;
// Where should the JPhyloRef be stored?
const JPHYLOREF_PATH = path.resolve(__dirname, `jphyloref-${JPHYLOREF_VERSION}.jar`);

/**
 * Test whether the expected JSON-LD files pass testing using JPhyloRef.
 */

describe('JPhyloRef', function () {
  describe('download JPhyloRef', function () {
    // TODO: we should eventually use SHA to ensure that we have the expected file.
    if (
      fs.existsSync(JPHYLOREF_PATH)
      && fs.statSync(JPHYLOREF_PATH).size > 0
    ) {
      it('has already been downloaded', function () {
        expect(true);
      });
    } else {
      it('should be downloadable', function () {
        this.timeout(10000);
        // Download JPhyloRef from Maven and save it to JPHYLOREF_PATH.
        return new Downloader({
          url: JPHYLOREF_URL,
          directory: path.dirname(JPHYLOREF_PATH),
          fileName: path.basename(JPHYLOREF_PATH),
        }).download();
      });
    }
  });

  describe('test example JSON-LD files using JPhyloRef', function () {
    fs.readdirSync(path.resolve(__dirname, 'examples', 'correct'))
      .filter(filename => filename.endsWith('.nq'))
      .forEach((filename) => {
        it(`testing ${filename}`, function () {
          this.timeout(60000);

          // Start JPhyloRef to test filename.
          const filePath = path.resolve(__dirname, 'examples', 'correct', filename);
          const child = childProcess.spawnSync(
            'java',
            [
              '-jar', JPHYLOREF_PATH,
              'test', filePath,
            ],
            {
              encoding: 'utf8',
              shell: true,
            }
          );
          const matches = /Testing complete:(\d+) successes, (\d+) failures, (\d+) failures marked TODO, (\d+) skipped./.exec(child.stderr);

          expect(matches, `Test result line not found in STDERR <${child.stderr}>`).to.have.lengthOf(5);

          // const countSuccess = Number(matches[1]);
          const countFailure = Number(matches[2]);
          const countTODOs = Number(matches[3]);
          // const countSkipped = Number(matches[4]);

          // We can't test for one or more successes since some example Phyx file
          // such as apomorphy-based phyloreferences don't have any successes at all.
          // expect(countSuccess, 'Expected one or more successes').to.be.greaterThan(0);
          expect(countFailure, 'Expected zero failures').to.equal(0);
          expect(countTODOs, 'Expected zero TODOs').to.equal(0);

          // An exit code of 0 means success. An exit code of 255 means that while
          // there were no successes, there were also no failures. Either is acceptable here.
          expect(child.status).to.be.oneOf([0, 255]);
        });
      });
  });
});
