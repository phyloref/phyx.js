/*
 * Test the tutorial staging used to generate our documentation.
 */

import { expect } from 'chai';
import { stripFrontmatter } from '../tutorials/build.mjs';

/*
 * Our tutorial sources carry pandoc frontmatter for the PDF build, which would
 * be rendered as text on the website. The heading below it is left alone --
 * the theme doesn't render one for tutorial or prose pages.
 */
describe('stripFrontmatter', function () {
  it('should remove pandoc frontmatter but keep the heading below it', function () {
    expect(stripFrontmatter('---\ntitle: Something\nauthor: Someone\n---\n# Something\n\nBody.\n'))
      .to.equal('# Something\n\nBody.\n');
  });

  it('should leave a document without frontmatter alone', function () {
    const markdown = '# Changelog\n\nAll notable changes.\n';
    expect(stripFrontmatter(markdown)).to.equal(markdown);
  });

  it('should not mistake a horizontal rule further down for frontmatter', function () {
    const markdown = '# Title\n\n---\n\nBody.\n';
    expect(stripFrontmatter(markdown)).to.equal(markdown);
  });
});
