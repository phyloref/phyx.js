/*
 * Test conversion to OWL using the phyx2owl.js script.
 */

const child = require('child_process');
const path = require('path');
const fs = require('fs');

const chai = require('chai');

const expect = chai.expect;

/*
 * Test whether we can convert Phyx files to OWL in JSON-LD using phyx2owl.js.
 */

const PHYX2OWL_JS = 'bin/phyx2owl.js';

describe(PHYX2OWL_JS, function () {
  it('should work without any arguments', function () {
    const result = child.spawnSync(PHYX2OWL_JS, [], {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    expect(result.status).to.equal(1);
    expect(result.stdout).to.be.empty;
    expect(result.stderr).to.contain('No input files provided.');
  });
  it('should support `--help`', function () {
    const result = child.spawnSync(PHYX2OWL_JS, ['--help'], {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    expect(result.status).to.equal(0);
    expect(result.stderr).to.be.empty;
    expect(result.stdout).to.contain('phyx2owl.js [files or directories to convert into OWL ontologies]');
  });
  it('should be able to convert `brochu_2003.json`', function () {
    const PHYX_FILE = path.resolve(__dirname, '../examples/brochu_2003.json');
    const OWL_FILE = path.resolve(__dirname, '../examples/brochu_2003.owl');
    const EXPECTED_OWL_FILE = path.resolve(__dirname, '../examples/brochu_2003.jsonld');

    // If there is already a '../examples/brochu_2003.json' file, we should delete it.
    if (fs.existsSync(OWL_FILE)) fs.unlinkSync(OWL_FILE);
    expect(fs.existsSync(OWL_FILE)).to.be.false;

    // Convert brochu_2003.json to brochu_2003.owl.
    // Because of the way in which we test brochu_2003.owl in test/examples.js,
    // we need to set a base URI as well.
    const result = child.spawnSync(PHYX2OWL_JS, [PHYX_FILE, '--base-uri', 'http://example.org/brochu_2003.json#'], {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    expect(result.status).to.equal(0);
    expect(result.stdout).to.contain('1 files converted successfully.');
    expect(result.stderr).to.be.empty;

    expect(fs.existsSync(OWL_FILE), `File ${OWL_FILE} was not generated.`).to.be.true;

    // Make sure that the generated file *looks* like a JSON-LD file.
    const jsonldContent = JSON.parse(fs.readFileSync(OWL_FILE, 'utf8'));
    expect(jsonldContent).to.be.an('object').that.has.any.keys('@context');
    expect(jsonldContent['@context']).to.not.be.empty;

    // Make sure that the generated file is identical to the expected one.
    const expectedContent = JSON.parse(fs.readFileSync(EXPECTED_OWL_FILE, 'utf8'));
    expect(jsonldContent).to.deep.equal(expectedContent);
  });
  it('should be able to convert the entire `test/examples` directory', function () {
    const EXAMPLE_DIR = path.resolve(__dirname, '../examples');
    const jsonFilesInExamples = fs.readdirSync(EXAMPLE_DIR, 'utf8')
      .filter(fileName => fileName.toLowerCase().endsWith('.json'));

    const result = child.spawnSync(PHYX2OWL_JS, [EXAMPLE_DIR], {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    expect(result.status).to.equal(0);
    expect(result.stdout).to.match(/\d+ files converted successfully./);
    expect(result.stderr).to.be.empty;

    const regexMatch = result.stdout.match(/(\d+) files converted successfully./);
    const fileCount = Number(regexMatch[1]);
    expect(fileCount).to.be.greaterThan(0);
    expect(fileCount).to.equal(jsonFilesInExamples.length);

    // Make sure that the generated files *look* like JSON-LD files.
    const jsonldInExamples = fs.readdirSync(EXAMPLE_DIR, 'utf8')
      .filter(fileName => fileName.toLowerCase().endsWith('.owl'))
      .map(owlFilename => JSON.parse(fs.readFileSync(path.resolve(EXAMPLE_DIR, owlFilename), 'utf8')));

    jsonldInExamples.forEach((jsonld) => {
      expect(jsonld).to.be.an('object').that.has.any.keys('@context');
      expect(jsonld['@context']).to.not.be.empty;
    });
  });
  // This is where we should test the recursive directory functionality. However,
  // doing that would require using `test/examples` (which isn't recursive),
  // using `test/` or the root project directory (potentially messing with other
  // test scripts). We could potentially create a separate recursive hierarchy to
  // test this, but that seems unnecessary. So we won't test this functionality
  // for now, but will add a test if we find a replicable bug in the future.
  it('should give an error if no JSON files could be found', function () {
    const result = child.spawnSync(PHYX2OWL_JS, [__dirname], {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    expect(result.status).to.equal(1);
    expect(result.stdout).to.be.empty;
    expect(result.stderr).to.contain('Input files do not exist or consist of directories that do not contain JSON files: ');
  });
});
