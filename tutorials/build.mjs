#!/usr/bin/env node

/*
 * Stages the Markdown files we want jsdoc to publish as tutorials into
 * tutorials/build/, which jsdoc.json points at as `opts.tutorials`.
 *
 * jsdoc turns *every* Markdown file in its tutorial directory into a page, so we
 * cannot point it at tutorials/ directly: that directory also holds the Jupyter
 * notebooks, their generated Markdown/PDF, and a README meant for GitHub. On top
 * of that, clean-jsdoc-theme renders its own <h2> from the tutorial title, so a
 * source file's own leading heading (and any pandoc YAML frontmatter, which jsdoc
 * renders as literal text) has to come off on the way through.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = path.join(repoRoot, 'tutorials', 'build');
const tutorialsDir = path.join(buildDir, 'tutorials');
const docsDir = path.join(buildDir, 'docs');

/** The tutorials to publish, in the order they should appear in the sidebar. */
const TUTORIALS = [
  { name: 'Introduction', title: 'Introduction to phyx.js', source: 'tutorials/Introduction.md' },
];

/**
 * Prose pages that aren't tutorials. These go into the theme's docs directory
 * so they get their own sidebar section instead of sitting under Tutorials.
 */
const DOCS = [
  { name: 'changelog', title: 'Changelog', source: 'CHANGELOG.md' },
  // Published at /context/, alongside the context files themselves, which
  // postdocs copies in beside this page. Its relative links resolve to them.
  {
    name: 'context',
    title: 'JSON-LD Context and JSON Schema for Phyx',
    source: 'context/README.md',
  },
];

/**
 * Remove a leading YAML frontmatter block, which is pandoc metadata for the PDF
 * build and would otherwise be rendered as text. The page's own level-one
 * heading stays: the theme renders a heading of its own for API pages, but
 * tutorial and prose pages take theirs from the Markdown.
 */
export function stripFrontmatter(markdown) {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n/, '');
}

/** Read a source file, failing loudly rather than dropping a page silently. */
function readSource(source) {
  const sourcePath = path.join(repoRoot, source);
  if (!fs.existsSync(sourcePath)) {
    console.error(`Missing source: ${source}`);
    process.exit(1);
  }
  return stripFrontmatter(fs.readFileSync(sourcePath, 'utf8'));
}

function build() {
  fs.rmSync(buildDir, { recursive: true, force: true });
  fs.mkdirSync(tutorialsDir, { recursive: true });
  fs.mkdirSync(docsDir, { recursive: true });

  const config = {};
  for (const { name, title, source } of TUTORIALS) {
    fs.writeFileSync(path.join(tutorialsDir, `${name}.md`), readSource(source));
    config[name] = { title };
  }
  fs.writeFileSync(
    path.join(tutorialsDir, 'tutorials.json'),
    `${JSON.stringify(config, null, 2)}\n`,
  );

  // The theme takes each doc page's title from its frontmatter.
  for (const { name, title, source } of DOCS) {
    fs.writeFileSync(
      path.join(docsDir, `${name}.md`),
      `---\ntitle: ${title}\n---\n\n${readSource(source)}`,
    );
  }
}

// Only build when run as a script, so tests can import stripLeadingTitle().
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build();
}
