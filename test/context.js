/*
 * Validate every JSON-LD context and JSON Schema in context/, published versions included.
 *
 * test/examples.js only exercises context/development/. The versioned directories are the ones
 * published at www.phyloref.org/phyx.js/context/ and dereferenced by Phyx files in the wild, and
 * nothing else checks that they are still valid -- or that nobody has edited one by mistake into
 * something that isn't.
 */

const fs = require('fs');
const path = require('path');

const chai = require('chai');
const jsonld = require('jsonld');

const { makeAjv } = require('./helpers/ajv');

const expect = chai.expect;

const CONTEXT_DIR = path.resolve(__dirname, '../context');

/*
 * Published contexts that the jsonld library cannot process, in either JSON-LD 1.0 or 1.1
 * processing mode (both are tested): they annotate their groups of terms with `_comments` entries whose own value
 * contains a `_comments` key, which is not a valid term definition. A published version must never
 * change, so they stay as they are and are tested to *keep* failing instead -- if one of these
 * starts passing, remove it from this list.
 *
 * In practice this means phyx.js cannot convert a Phyx file that uses one of these contexts.
 */
const KNOWN_INVALID_CONTEXTS = ['v0.1.0', 'v0.2.0'];

/*
 * Published versions that predate the JSON Schema. Every other version must have a schema.json,
 * so a published schema that is deleted or renamed fails the test rather than going untested.
 */
const VERSIONS_WITHOUT_SCHEMA = ['v0.1.0', 'v0.2.0'];

/** Refuse to fetch anything: a context that imports a remote one should not make this test depend on the network. */
async function offlineDocumentLoader(url) {
  throw new Error(`test/context.js tried to fetch ${url}`);
}

/**
 * Process a context by expanding a document that uses it. Expansion creates a term definition for
 * every term in the context, so any invalid term is reported, not just the ones the document uses.
 */
function processContext(context, processingMode = 'json-ld-1.1') {
  return jsonld.expand(
    { '@context': context, '@id': 'http://example.org/test' },
    { documentLoader: offlineDocumentLoader, processingMode },
  );
}

describe('Phyx JSON-LD contexts and JSON Schemas', function () {
  const versions = fs
    .readdirSync(CONTEXT_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();

  it('should find the context versions we expect', function () {
    // A guard against the directory listing quietly matching nothing and this suite passing
    // vacuously, and against a published version being deleted: the version-specific tests below
    // only run for directories that exist. Add each newly published version here.
    const expected = new Set([
      ...KNOWN_INVALID_CONTEXTS,
      ...VERSIONS_WITHOUT_SCHEMA,
      'development',
      'v1.0.0',
      'v1.1.0',
    ]);
    expect(versions).to.include.members([...expected]);
  });

  versions.forEach(function (version) {
    describe(`context/${version}`, function () {
      const contextFile = path.join(CONTEXT_DIR, version, 'phyx.json');
      const schemaFile = path.join(CONTEXT_DIR, version, 'schema.json');

      it('should have a phyx.json with an @context', function () {
        expect(fs.existsSync(contextFile), `${contextFile} is missing`).to.be.true;
        expect(JSON.parse(fs.readFileSync(contextFile, 'utf8'))).to.have.property('@context');
      });

      if (KNOWN_INVALID_CONTEXTS.includes(version)) {
        ['json-ld-1.0', 'json-ld-1.1'].forEach(function (processingMode) {
          it(`should still fail to process as a JSON-LD context in ${processingMode} mode (see KNOWN_INVALID_CONTEXTS)`, async function () {
            const { '@context': context } = JSON.parse(fs.readFileSync(contextFile, 'utf8'));
            let error;
            try {
              await processContext(context, processingMode);
            } catch (err) {
              error = err;
            }
            expect(error, `${version} now processes; remove it from KNOWN_INVALID_CONTEXTS`).to.exist;
            // Pin the documented cause, so a different failure doesn't keep this test passing.
            expect(error.details?.code, error.message).to.equal('invalid term definition');
            expect(error.message).to.include('_comments');
          });
        });
      } else {
        it('should process as a JSON-LD context', async function () {
          const { '@context': context } = JSON.parse(fs.readFileSync(contextFile, 'utf8'));
          await processContext(context);
        });
      }

      if (!VERSIONS_WITHOUT_SCHEMA.includes(version)) {
        it('should have a schema.json that is a valid JSON Schema', function () {
          expect(fs.existsSync(schemaFile), `${schemaFile} is missing`).to.be.true;

          // Ajv's strict-mode warnings (strictTypes, at the time of writing) are silenced here.
          // The development schema's are logged by test/examples.js, which compiles it with the
          // same options. A published schema can't be changed, so warning about it every run
          // achieves nothing -- and a new version is a copy of the development schema, whose
          // warnings were already logged while it was being written.
          const ajv = makeAjv({ logger: false });

          const schema = JSON.parse(fs.readFileSync(schemaFile, 'utf8'));
          expect(ajv.validateSchema(schema), ajv.errorsText(ajv.errors)).to.be.true;
          expect(() => ajv.compile(schema)).to.not.throw();
        });
      }
    });
  });
});
