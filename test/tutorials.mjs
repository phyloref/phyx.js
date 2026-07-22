/*
 * Test the tutorial staging used to generate our documentation.
 */

import { expect } from 'chai';
import { stripLeadingTitle } from '../tutorials/build.mjs';

/*
 * clean-jsdoc-theme renders its own heading from the tutorial title, so
 * stripLeadingTitle() removes the heading (and pandoc frontmatter) that the
 * source file carries for the benefit of GitHub and PDF readers.
 */
describe('stripLeadingTitle', function () {
  it('should remove pandoc frontmatter followed by a level-one heading', function () {
    expect(stripLeadingTitle('---\ntitle: Something\nauthor: Someone\n---\n# Something\n\nBody.\n'))
      .to.equal('\nBody.\n');
  });

  it('should remove a level-one heading with no frontmatter', function () {
    expect(stripLeadingTitle('# Changelog\nAll notable changes.\n'))
      .to.equal('All notable changes.\n');
  });

  it('should leave documents without a leading heading alone', function () {
    const markdown = 'Body text.\n\n## A subheading\n\n# Not leading.\n';
    expect(stripLeadingTitle(markdown)).to.equal(markdown);
  });
});
