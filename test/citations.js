/*
 * Test citations.
 */

// Require phyx.js, our PHYX library, and Chai for testing.
const chai = require('chai');
const phyx = require('../src');

// We use Chai's Expect API.
const expect = chai.expect;

/*
 * Citation tests check to see if the CitationWrapper works correctly.
 */

describe('CitationWrapper', function() {
  // Some citations to use in testing.
  const citations = [{
    bibliographicCitation: 'Christopher A. Brochu (2003) Phylogenetic approaches toward crocodylian history Annual Review of Earth and Planetary Sciences 31:357--397  fig 1 doi: 10.1146/annurev.earth.31.100901.141308 URL: https://www.annualreviews.org/doi/10.1146/annurev.earth.31.100901.141308',
    citation: {
      type: 'article',
      title: 'Phylogenetic approaches toward crocodylian history',
      authors: [
        {
          name: 'Christopher A. Brochu',
          alternate: ['Brochu, Christopher A.'],
          firstname: 'Christopher',
          middlename: 'A.',
          lastname: 'Brochu',
        },
      ],
      year: 2003,
      figure: 1,
      identifier: [
        {
          type: 'doi',
          id: '10.1146/annurev.earth.31.100901.141308',
        },
      ],
      link: [
        {
          url: 'https://www.annualreviews.org/doi/10.1146/annurev.earth.31.100901.141308',
        },
      ],
      journal: {
        name: 'Annual Review of Earth and Planetary Sciences',
        volume: '31',
        pages: '357--397',
        identifier: [{
          type: 'eISSN',
          id: '1545-4495',
        }],
      },
    },
  }];

  describe('given an empty citation', function() {
    const wrapper = new phyx.CitationWrapper({});

    describe('#constructor', function() {
      it('should return a CitationWrapper', function() {
        expect(wrapper).to.be.an.instanceOf(phyx.CitationWrapper);
      });
    });

    describe('#toString', function() {
      it('should return undefined', function() {
        expect(wrapper.toString()).to.be.undefined;
      });

      it('should be settable by changing the title', function() {
        wrapper.citation.title = 'Title';
        expect(wrapper.toString()).equals('Anonymous (n.d.) Title');
      });
    });
  });

  citations.forEach((test, index) => {
    describe(`for test citation #${index + 1}`, function() {
      const wrapper = new phyx.CitationWrapper(test.citation);

      describe('#constructor', function() {
        it('should return a CitationWrapper', function() {
          expect(wrapper).to.be.an.instanceOf(phyx.CitationWrapper);
        });
      });

      describe('#toString', function() {
        it('should return the expected string', function() {
          expect(wrapper.toString()).to.equal(test.bibliographicCitation);
        });
      });
    });
  });
});
