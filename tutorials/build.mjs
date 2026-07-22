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

/** The tutorials to publish, in the order they should appear in the sidebar. */
const TUTORIALS = [
  { name: 'Introduction', title: 'Introduction to phyx.js', source: 'tutorials/Introduction.md' },
  { name: 'CHANGELOG', title: 'Changelog', source: 'CHANGELOG.md' },
];

/**
 * Remove a leading YAML frontmatter block and a leading level-one heading, both
 * of which would be displayed on top of the title the theme already renders.
 */
export function stripLeadingTitle(markdown) {
  return markdown
    .replace(/^---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n/, '')
    .replace(/^\s*#[^#\n]*\r?\n/, '');
}

function build() {
  fs.rmSync(buildDir, { recursive: true, force: true });
  fs.mkdirSync(buildDir, { recursive: true });

  const config = {};
  for (const { name, title, source } of TUTORIALS) {
    const sourcePath = path.join(repoRoot, source);
    if (!fs.existsSync(sourcePath)) {
      console.error(`Missing tutorial source: ${source}`);
      process.exit(1);
    }

    fs.writeFileSync(
      path.join(buildDir, `${name}.md`),
      stripLeadingTitle(fs.readFileSync(sourcePath, 'utf8')),
    );
    config[name] = { title };
  }

  fs.writeFileSync(path.join(buildDir, 'tutorials.json'), `${JSON.stringify(config, null, 2)}\n`);
}

// Only build when run as a script, so tests can import stripLeadingTitle().
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build();
}
