/*
 * jsdoc configuration. This is a JS file rather than JSON so that the footer can
 * carry the version being documented: the site is published only when a release
 * is, so every page needs to say which release it describes.
 */

const { version } = require('./package.json');

module.exports = {
  source: {
    include: ['./src'],
    exclude: ['./src/index.js', './src/utils/owlterms.js'],
    includePattern: '\\.js$',
  },
  opts: {
    destination: './site',
    recurse: true,
    readme: './README.md',
    template: './node_modules/clean-jsdoc-theme/dist',
    tutorials: './tutorials/build/tutorials',
    docs: './tutorials/build/docs',
    defaultDocGroup: 'About',
    siteName: '@phyloref/phyx.js',
    siteUrl: 'https://www.phyloref.org/phyx.js',
    basePath: '/phyx.js',
    strict: true,
    sectionOrder: ['Tutorials', 'Wrappers', 'Matchers', 'Utilities', 'About'],
    menu: [
      {
        title: 'GitHub',
        link: 'https://github.com/phyloref/phyx.js',
      },
      {
        title: 'npm',
        link: 'https://www.npmjs.com/package/@phyloref/phyx',
      },
    ],
    footer: `phyx.js v${version} — Phyloreference Exchange (Phyx) format library`,
  },
  tags: {
    allowUnknownTags: ['category'],
  },
  plugins: ['plugins/markdown'],
  markdown: {
    idInHeadings: true,
  },
};
