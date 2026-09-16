/*
 * Validate our documentation: the prose Markdown tracked in this repository, and -- when it has
 * been built -- the site that jsdoc generates into site/.
 *
 * Most of what can go wrong with the docs build is silent: jsdoc and the theme report success and
 * the page just comes out wrong. The checks here are the mechanical half of the gotchas listed in
 * docs/Documentation.md, so that a regression fails a test instead of waiting for someone to
 * notice it on the published site.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'chai';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteDir = path.join(repoRoot, 'site');

/*
 * The sub-path the site is served under. jsdoc writes root-relative links, so every internal
 * href starts with this; see the basePath check below for why it has to match owlterms.js.
 */
const BASE_PATH = '/phyx.js';

/** owlterms.js is CommonJS, so it is read out of a child process rather than imported here. */
const { PHYX_CONTEXT_JSON } = JSON.parse(
  execFileSync('node', ['-p', 'JSON.stringify(require("./src/utils/owlterms.js"))'], {
    cwd: repoRoot,
    encoding: 'utf8',
  }),
);

/** Markdown files tracked in git, with symlinks (CLAUDE.md -> AGENTS.md) collapsed. */
function trackedMarkdown() {
  const files = execFileSync('git', ['ls-files', '*.md'], { cwd: repoRoot, encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);

  const byRealPath = new Map();
  for (const file of files) byRealPath.set(fs.realpathSync(path.join(repoRoot, file)), file);
  return [...byRealPath.values()].sort();
}

/**
 * The GitHub-flavoured anchors a Markdown document offers, derived from its ATX headings the way
 * GitHub derives them: lowercase, punctuation dropped, spaces to hyphens. Close enough to catch a
 * heading that has been renamed or deleted, which is the failure we care about.
 */
function anchorsIn(markdown) {
  const anchors = new Set();
  for (const [, heading] of markdown.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)) {
    anchors.add(
      heading
        .replace(/`/g, '')
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-'),
    );
  }
  return anchors;
}

/** Every link target in a document: inline `[x](y)` plus reference definitions `[x]: y`. */
function linkTargets(markdown) {
  return [
    ...[...markdown.matchAll(/\[[^\]]*\]\(<?([^)>\s]+)/g)].map(m => m[1]),
    ...[...markdown.matchAll(/^\s*\[[^\]^]+\]:\s*<?(\S+?)>?\s*$/gm)].map(m => m[1]),
  ];
}

describe('Documentation prose', function () {
  const markdownFiles = trackedMarkdown();

  it('should track the Markdown files we expect to check', function () {
    // A guard against the glob quietly matching nothing and this whole suite passing vacuously.
    expect(markdownFiles).to.include('docs/Documentation.md');
    expect(markdownFiles.length).to.be.at.least(5);
  });

  /*
   * These files cross-reference each other heavily -- AGENTS.md and RELEASE.md both link into
   * docs/Documentation.md#publishing, and tutorials/README.md links to the file itself. Renaming a
   * heading is the easy way to break that without noticing.
   */
  markdownFiles.forEach(function (file) {
    describe(file, function () {
      const markdown = fs.readFileSync(path.join(repoRoot, file), 'utf8');

      it('should only link to files and anchors that exist', function () {
        const ownAnchors = anchorsIn(markdown);

        for (const target of linkTargets(markdown)) {
          if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target)) continue; // external, checked elsewhere

          if (target.startsWith('#')) {
            expect(ownAnchors, `${file}: link to missing anchor ${target}`).to.include(
              target.slice(1).toLowerCase(),
            );
            continue;
          }

          const [relativePath, fragment] = target.split('#');
          const resolved = path.resolve(path.dirname(path.join(repoRoot, file)), relativePath);
          expect(fs.existsSync(resolved), `${file}: link to missing file ${target}`).to.be.true;

          if (fragment && resolved.endsWith('.md')) {
            const anchors = anchorsIn(fs.readFileSync(resolved, 'utf8'));
            expect(anchors, `${file}: link to missing anchor ${target}`).to.include(
              fragment.toLowerCase(),
            );
          }
        }
      });

      /*
       * A reference-style link whose definition has gone renders as literal `[text]` -- valid
       * Markdown, so nothing complains, it just stops being a link. Our pages lean on the shortcut
       * form (`[Building the documentation site]` with the definition at the foot of the file),
       * and a bare `[text]` is indistinguishable from prose that happens to use brackets.
       *
       * So this checks the other direction: every definition must be referenced. Renaming either
       * half of a pair leaves the definition orphaned, which is unambiguous.
       */
      it('should use every reference-style link definition it declares', function () {
        const definitions = [...markdown.matchAll(/^\s*\[([^\]^]+)\]:/gm)].map(m => m[1]);
        const body = markdown.replace(/^\s*\[[^\]^]+\]:.*$/gm, '');

        for (const label of definitions) {
          const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          expect(
            new RegExp(`\\[${escaped}\\]`, 'i').test(body),
            `${file}: link definition [${label}] is never referenced`,
          ).to.be.true;
        }
      });

      /* The full `[text][label]` form, where an undefined label is unambiguously a mistake. */
      it('should define every reference-style link it uses', function () {
        const defined = new Set(
          [...markdown.matchAll(/^\s*\[([^\]^]+)\]:/gm)].map(m => m[1].toLowerCase()),
        );

        for (const [, text, label] of markdown.matchAll(/\[([^\]^]+)\]\[([^\]]*)\]/g)) {
          const wanted = (label || text).toLowerCase();
          expect(defined, `${file}: undefined reference [${wanted}]`).to.include(wanted);
        }
      });
    });
  });
});

/*
 * The published JSON-LD context is served off the docs site, at the IRI owlterms.js hardcodes and
 * every published Phyx file dereferences. postdocs copies context/ into site/, and the only reason
 * that is enough is that basePath matches the sub-path in the IRI. Two of our own test fixtures
 * dereference this URL, so breaking it breaks `npm test` as well as the site.
 *
 * These need no build, so they run on every `npm test`.
 */
describe('Documentation configuration', function () {
  it('should serve the published context from the site sub-path', function () {
    const { pathname } = new URL(PHYX_CONTEXT_JSON);
    expect(
      pathname.startsWith(`${BASE_PATH}/`),
      `${PHYX_CONTEXT_JSON} is not served from ${BASE_PATH}/`,
    ).to.be.true;
  });

  /*
   * Checked against the config directly rather than inferred from the built pages: the internal
   * link check below only looks at hrefs beginning with BASE_PATH, so a wrong basePath makes it
   * inspect nothing and pass. This is the assertion that fails instead.
   */
  it('should point opts.basePath at that same sub-path', function () {
    const basePath = execFileSync('node', ['-p', 'require("./jsdoc.config.js").opts.basePath'], {
      cwd: repoRoot,
      encoding: 'utf8',
    }).trim();

    expect(basePath).to.equal(BASE_PATH);
  });
});

/*
 * The rest of this file needs a built site. `npm run docs` is a minute of work and most test runs
 * have no reason to pay it, so these are skipped unless site/ is already there -- CI builds the
 * docs before running the tests, so it always checks them.
 */
describe('Generated documentation site', function () {
  const built = fs.existsSync(path.join(siteDir, 'index.html'));

  before(function () {
    /*
     * Skipping locally is a convenience; skipping in CI would mean a green run that checked
     * nothing, so there it is a failure instead. The workflow builds the docs before the tests.
     */
    if (!built && process.env.CI) {
      throw new Error('site/ has not been built; run `npm run docs` before the tests');
    }
    if (!built) this.skip();
  });

  /** Every generated HTML page, relative to site/. */
  function pages() {
    const found = [];
    (function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.html')) found.push(path.relative(siteDir, full));
      }
    })(siteDir);
    return found.sort();
  }

  /*
   * jsdoc has no notion of an accessor pair: documenting both halves of a getter/setter publishes
   * the property twice, with two elements sharing one HTML id. `@ignore` on the setter does NOT
   * suppress it under jsdoc 4 + clean-jsdoc-theme v5 -- the tag is accepted and the member is
   * published anyway -- so the setters carry `@private` instead. This test is what tells us if
   * that stops working too.
   */
  it('should not publish an element id twice on any page', function () {
    const offenders = [];

    for (const page of pages()) {
      const html = fs.readFileSync(path.join(siteDir, page), 'utf8');
      const seen = new Set();
      const duplicated = new Set();

      for (const [, id] of html.matchAll(/\sid="([^"]+)"/g)) {
        if (seen.has(id)) duplicated.add(id);
        seen.add(id);
      }

      if (duplicated.size > 0) offenders.push(`${page}: ${[...duplicated].sort().join(', ')}`);
    }

    expect(offenders, `duplicate ids:\n  ${offenders.join('\n  ')}`).to.be.empty;
  });

  /*
   * opts.basePath has to match the sub-path Pages serves us under. Get it wrong and every link and
   * asset on the site 404s, which no amount of "the build succeeded" will tell you.
   */
  it('should resolve every internal link and asset it emits', function () {
    const broken = [];

    for (const page of pages()) {
      const html = fs.readFileSync(path.join(siteDir, page), 'utf8');

      for (const [, target] of html.matchAll(/(?:href|src)="([^"#?]+)/g)) {
        if (!target.startsWith(`${BASE_PATH}/`)) continue;

        const resolved = path.join(siteDir, target.slice(BASE_PATH.length + 1));
        const exists =
          fs.existsSync(resolved) || fs.existsSync(path.join(resolved, 'index.html'));
        if (!exists) broken.push(`${page} -> ${target}`);
      }
    }

    expect(broken, `dead internal links:\n  ${broken.join('\n  ')}`).to.be.empty;
  });

  /*
   * sectionOrder lists our own categories instead of jsdoc's `Classes`, so a class with no
   * `@category` is published but unreachable from the navigation. The same thing happens when a
   * class's doc comment sits above the imports rather than immediately above the class: jsdoc
   * gives it a page but never reads the tags as the class's own. `strict` catches neither.
   */
  describe('navigation', function () {
    /** The classes jsdoc is pointed at, read from the source rather than assumed. */
    function documentedClasses() {
      const excluded = ['src/index.js', 'src/utils/owlterms.js'];
      const sources = execFileSync('git', ['ls-files', 'src/*.js', 'src/**/*.js'], {
        cwd: repoRoot,
        encoding: 'utf8',
      })
        .trim()
        .split('\n')
        .filter(file => file && !excluded.includes(file));

      const classes = [];
      for (const file of sources) {
        const source = fs.readFileSync(path.join(repoRoot, file), 'utf8');
        for (const [, name] of source.matchAll(/^class\s+(\w+)/gm)) classes.push({ file, name });
      }
      return classes;
    }

    const home = built ? fs.readFileSync(path.join(siteDir, 'index.html'), 'utf8') : '';

    documentedClasses().forEach(function ({ file, name }) {
      it(`should publish ${name} and link to it from the sidebar`, function () {
        const slug = name.toLowerCase();

        expect(
          fs.existsSync(path.join(siteDir, slug, 'index.html')),
          `${name} (${file}) has no page; is its doc comment directly above the class?`,
        ).to.be.true;

        expect(
          home.includes(`${BASE_PATH}/${slug}`),
          `${name} (${file}) is published but not in the navigation; is it missing @category?`,
        ).to.be.true;
      });
    });
  });

  /*
   * The published JSON-LD context is served off this site, at the IRI owlterms.js hardcodes and
   * every published Phyx file dereferences. postdocs copies context/ into site/, and the only
   * reason that is enough is that basePath matches the sub-path in the IRI. Two of our own test
   * fixtures dereference this URL, so breaking it breaks `npm test` as well as the site.
   */
  describe('published JSON-LD context', function () {
    it('should have been copied into the site by postdocs', function () {
      const contextPath = PHYX_CONTEXT_JSON.split(`${BASE_PATH}/`)[1];
      const resolved = path.join(siteDir, contextPath);

      expect(fs.existsSync(resolved), `${contextPath} is missing from site/`).to.be.true;
      expect(fs.statSync(resolved).size, `${contextPath} is empty`).to.be.above(0);
    });
  });

  /*
   * jsdoc.config.js builds the footer from `git describe`, falling back to package.json when there
   * are no tags to describe against. Either way a version has to reach the page: a describeVersion()
   * that threw past its catch, or returned empty, would publish a footer reading "phyx.js  --" and
   * nothing else would say so.
   */
  it('should print a version in the footer', function () {
    const home = fs.readFileSync(path.join(siteDir, 'index.html'), 'utf8');
    expect(home).to.match(/phyx\.js v[0-9]/);
  });
});
