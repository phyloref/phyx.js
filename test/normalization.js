/*
 * Test normalization on examples/correct/normalization files.
 */

const fs = require('fs');
const path = require('path');

const chai = require('chai');

const phyx = require('../src');

const expect = chai.expect;

/**
 * When making the comparisons, we need to remove the `@id`s which would otherwise be different
 * between the phylorefs being compared.
 *
 * @param phyloref The phyloref whose '@id' needs to be removed.
 */
function removeId(phyloref) {
  // Shallow copy the phyloref.
  const copiedPhyloref = Object.assign({}, phyloref);
  // Delete the '@id'.
  delete copiedPhyloref['@id'];
  return copiedPhyloref;
}


/**
 * Test whether normalization of phyloreferences and phylogenies work as expected.
 * This test does not cover Phyx normalization.
 */

describe('Phyloref and phylogeny normalization', function () {
  describe('Test all normalization Phyx files', function () {
    /*
     * Normalization Phyx files consist of a number of phyloreferences and phylogenies. We can
     * test them by confirming:
     * - every phyloref or phylogeny should be DIFFERENT from every other.
     * - every phyloref or phylogeny whose `@id` ends with `_same` should be IDENTICAL to
     *   every other phyloref or phylogeny whose `@id` ends with `_same` after NORMALIZATION (to
     *   test non-same phyloref or phylogeny files, they should be placed in different files).
     * - every phyloref or phylogeny whose `@id` ends with `_different` should be DIFFERENT to
     *   every phyloref or phylogeny whose `@id` ends with `_same` even after NORMALIZATION.
     */
    const normalizationExamples = fs
      .readdirSync(path.resolve(__dirname, './examples/correct/normalization'))
      .filter(filename => filename.endsWith('.json'));

    normalizationExamples.forEach((example) => {
      const basename = path.resolve(__dirname, './examples/correct/normalization', path.parse(example).name);
      const jsonFilename = `${basename}.json`;

      describe(`Normalization test file '${example}'`, function () {
        const phyxDoc = JSON.parse(fs.readFileSync(jsonFilename));
        const phylorefs = phyxDoc.phylorefs || [];
        const samePhylorefs = phylorefs.filter(p => (p['@id'] || '').endsWith('_same'));
        const differentPhylorefs = phylorefs.filter(p => (p['@id'] || '').endsWith('_different'));

        // We don't need phylogeny normalization yet, so there's no point in testing them.
        describe('Test phylogenies', function () {
          it("These tests have not yet been implemented since we don't have an urgent need for them.");
        });

        // So we only focus on phyloreference normalization.
        describe('Test phyloreferences', function () {
          it('should have multiple same phyloreferences for testing', function () {
            expect(samePhylorefs).to.not.be.empty;
          });

          // No two phyloreferences in a normalization file should be deeply identical to each
          // other, otherwise the test will be pointless.
          phylorefs.forEach((phyloref1) => {
            phylorefs.forEach((phyloref2) => {
              if (phyloref1 === phyloref2) return;
              expect(removeId(phyloref1))
                .to
                .not
                .deep
                .equal(removeId(phyloref2),
                  'No two phyloreferences in a single normalization file should be identical.');
            });
          });

          // Every pair of `_same` phyloreferences should be different.
          samePhylorefs.forEach((phyloref1) => {
            samePhylorefs.forEach((phyloref2) => {
              if (phyloref1 === phyloref2) return;
              expect(
                removeId(phyx.PhylorefWrapper.normalize(phyloref1))
              )
                .to
                .deep
                .equal(
                  removeId(phyx.PhylorefWrapper.normalize(phyloref2)),
                  `Expected phyloref ${phyloref1['@id']} to deeply equal ${phyloref2['@id']} `
                  + 'after normalization'
                );
            });
          });

          // Every pair of `_different` phyloreferences should be different from every `_same`
          // phyloreference, even after normalization.
          differentPhylorefs.forEach((phyloref1) => {
            samePhylorefs.forEach((phyloref2) => {
              if (phyloref1 === phyloref2) return;
              expect(
                removeId(phyx.PhylorefWrapper.normalize(phyloref1))
              )
                .to
                .not
                .deep
                .equal(
                  removeId(phyx.PhylorefWrapper.normalize(phyloref2)),
                  `Expected phyloref ${phyloref1['@id']} to not deeply equal ${phyloref2['@id']} `
                  + 'after normalization'
                );
            });
          });
        });
      });
    });
  });
});
