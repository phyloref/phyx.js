/*
 * Use JPhyloRef to ensure that the expected JSON-LD files pass testing.
 * A different test, `examples.js`, will then test whether the current Phyx.js
 * produces a file identical to the expected JSON-LD files.
 */

const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const Downloader = require('nodejs-file-downloader');
const chai = require('chai');

const expect = chai.expect;

/*
 * Constants
 */
// The version of JPhyloRef to download.
const JPHYLOREF_VERSION = '0.3.1';

// The URL from where JPhyloRef should be downloaded.
const JPHYLOREF_URL = `https://repo.maven.apache.org/maven2/org/phyloref/jphyloref/0.3.1/jphyloref-${JPHYLOREF_VERSION}.jar`;
// Where should the JPhyloRef be stored?
const JPHYLOREF_PATH = relativeToTestFile(`jphyloref-${JPHYLOREF_VERSION}.jar`);

/*
 * Create a path relative to the directory that this test file is in.
 */
function relativeToTestFile(relativePath) {
  return path.join(path.dirname(__filename), relativePath);
}

/**
 * Test whether the expected JSON-LD files pass testing using JPhyloRef.
 */

describe('JPhyloRef', function () {
  describe('download JPhyloRef', function () {
    // TODO: we should eventually use SHA to ensure that we have the expected file.
    if (
      fs.existsSync(JPHYLOREF_PATH) &&
      fs.statSync(JPHYLOREF_PATH).size > 0
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
          fileName: path.basename(JPHYLOREF_PATH)
        }).download();
      });
    }
  });

  describe('test example JSON-LD files using JPhyloRef', function () {
    fs.readdirSync(relativeToTestFile('examples'))
      .filter(filename => filename.endsWith('.nq'))
      .forEach(filename => {
        it(`should test ${filename}`, function () {
          this.timeout(20000);

          // Start JPhyloRef to test filename.
          const filePath = relativeToTestFile('examples/' + filename);
          const child = child_process.spawnSync(
            `java`,
            [
              '-jar', JPHYLOREF_PATH,
              'test', filePath
            ],
            {
              shell: true
            }
          );
          const matches = /Testing complete:(\d+) successes, (\d+) failures, (\d+) failures marked TODO, (\d+) skipped./.exec(child.stderr);
          expect(matches).is.not.null;
          if (matches === null) console.log(`Test result line not found in STDERR <${child.stderr}>`);
          console.log(`For ${filename}: ${matches}`);

          expect(child.status).to.equal(0);
        });
      });
  });
});
