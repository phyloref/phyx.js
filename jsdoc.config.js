/*
 * jsdoc configuration. This is a JS file rather than JSON so that the footer can
 * carry the version being documented: the site is published only when a release
 * is, so every page needs to say which release it describes.
 */

const { execFileSync } = require('node:child_process');
const { version } = require('./package.json');

/*
 * The version to print in the footer.
 *
 * `git describe --tags` answers both of the ways this site gets published. A release run checks
 * out the tag, so it returns exactly `v1.2.1`; a manual run from master returns something like
 * `v1.2.1-138-g2cbb006`, which says how far past the last release the build is instead of
 * claiming to be that release.
 *
 * It needs tags, so .github/workflows/docs.yml checks out with `fetch-depth: 0` -- the default
 * shallow clone has none and this falls back. Falling back is also what happens when there is no
 * git at all, as in an npm tarball. Don't reach for `--always` to avoid the fallback: it
 * "succeeds" outside a tagged history by returning a bare commit hash, which is less use in a
 * footer than the version we already know.
 */
function describeVersion() {
  try {
    return execFileSync('git', ['describe', '--tags'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return `v${version}`;
  }
}

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
    footer: `phyx.js ${describeVersion()} — Phyloreference Exchange (Phyx) format library`,
  },
  tags: {
    allowUnknownTags: ['category'],
  },
  plugins: ['plugins/markdown'],
  markdown: {
    idInHeadings: true,
  },
};
