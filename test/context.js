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
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const jsonld = require('jsonld');

const expect = chai.expect;

const CONTEXT_DIR = path.resolve(__dirname, '../context');

/*
 * Published contexts that the jsonld library cannot process, in either JSON-LD 1.0 or 1.1
 * processing mode: they annotate their groups of terms with `_comments` entries whose own value
 * contains a `_comments` key, which is not a valid term definition. A published version must never
 * change, so they stay as they are and are tested to *keep* failing instead -- if one of these
 * starts passing, remove it from this list.
 *
 * In practice this means phyx.js cannot convert a Phyx file that uses one of these contexts.
 */
const KNOWN_INVALID_CONTEXTS = ['v0.1.0', 'v0.2.0'];

/** Refuse to fetch anything: a context that imports a remote one should not make this test depend on the network. */
async function offlineDocumentLoader(url) {
  throw new Error(`test/context.js tried to fetch ${url}`);
}

/**
 * Process a context by expanding a document that uses it. Expansion creates a term definition for
 * every term in the context, so any invalid term is reported, not just the ones the document uses.
 */
function processContext(context) {
  return jsonld.expand(
    { '@context': context, '@id': 'http://example.org/test' },
    { documentLoader: offlineDocumentLoader },
  );
}

describe('Phyx JSON-LD contexts and JSON Schemas', function () {
  const versions = fs
    .readdirSync(CONTEXT_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();

  it('should find the context versions we expect', function () {
    // A guard against the directory listing quietly matching nothing and this suite passing vacuously.
    expect(versions).to.include.members(['development', 'v1.0.0', 'v1.1.0']);
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
        it('should still fail to process as a JSON-LD context (see KNOWN_INVALID_CONTEXTS)', async function () {
          const { '@context': context } = JSON.parse(fs.readFileSync(contextFile, 'utf8'));
          let error;
          try {
            await processContext(context);
          } catch (err) {
            error = err;
          }
          expect(error, `${version} now processes; remove it from KNOWN_INVALID_CONTEXTS`).to.exist;
          expect(error.message).to.include('_comments');
        });
      } else {
        it('should process as a JSON-LD context', async function () {
          const { '@context': context } = JSON.parse(fs.readFileSync(contextFile, 'utf8'));
          await processContext(context);
        });
      }

      // Only v1.0.0 onwards publish a schema.
      if (fs.existsSync(schemaFile)) {
        it('should have a schema.json that is a valid JSON Schema', function () {
          // The same options test/examples.js validates our examples with. Its strictTypes
          // warnings are already logged there, so they are not repeated here.
          const ajv = new Ajv({ allErrors: true, logger: false });
          addFormats(ajv);

          const schema = JSON.parse(fs.readFileSync(schemaFile, 'utf8'));
          expect(ajv.validateSchema(schema), ajv.errorsText(ajv.errors)).to.be.true;
          expect(() => ajv.compile(schema)).to.not.throw();
        });
      }
    });
  });
});
