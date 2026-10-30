import { createHash } from 'node:crypto';
import { query } from './db.mjs';

// Reads/writes the shared Google Cloud Storage layer described in
// infra/gcs/provision.sh: one bucket per environment (tnpsc-dev-materials,
// tnpsc-staging-materials, tnpsc-production-materials), shared by the
// retrieval engine, the content-labelling engine, and this platform.
//
// GCS_SERVICE_ACCOUNT_JSON is the tnpsc-platform-sa key (object-viewer
// only -- the platform never writes source/retrieval/processing objects,
// see the IAM matrix in provision.sh). Until it's set, every call here is
// a safe, explicit error rather than a silent no-op -- unlike push/email,
// which degrade gracefully, a missing document really is missing and the
// caller needs to know that, not get an empty success.
const rawServiceAccount = process.env.GCS_SERVICE_ACCOUNT_JSON;
const bucketName = process.env.GCS_BUCKET;
export const gcsConfigured = Boolean(rawServiceAccount && bucketName);

let storagePromise = null;
async function getStorage() {
  if (!gcsConfigured) return null;
  if (!storagePromise) {
    storagePromise = (async () => {
      const { Storage } = await import('@google-cloud/storage');
      const credentials = JSON.parse(rawServiceAccount);
      return new Storage({ credentials, projectId: credentials.project_id });
    })();
  }
  return storagePromise;
}

/**
 * The five pipeline-stage prefixes every bucket uses (see
 * infra/gcs/provision.sh). Source documents are registered under
 * SOURCE; the platform only ever reads from PUBLICATION in practice, even
 * though IAM currently allows broader reads (see the provisioning script's
 * follow-up note about tightening this to a conditional binding).
 */
export const GCS_PREFIX = Object.freeze({
  SOURCE: '01-source',
  RETRIEVAL: '02-retrieval',
  PROCESSING: '03-processing',
  LABELLING: '04-labelling',
  PUBLICATION: '05-publication',
  ARCHIVE: '06-archive',
});

/**
 * SHA-256 of a Buffer, hex-encoded. Pure function, no I/O -- used both to
 * verify an object's integrity against its registered hash and to compute
 * the hash before a first registration.
 * @param {Buffer} buffer
 * @returns {string}
 */
export function sha256Hex(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Downloads an object and verifies its bytes match a known SHA-256 before
 * returning it. Throws rather than returning a mismatched buffer -- a
 * silent hash mismatch here would mean content generation or a learner
 * download could be built on a tampered or corrupted source file.
 * @param {{ bucket: string, objectName: string, sha256: string }} ref
 * @returns {Promise<Buffer>}
 */
export async function downloadVerified({ bucket, objectName, sha256 }) {
  const storage = await getStorage();
  if (!storage) throw new Error('GCS is not configured on the server (missing GCS_SERVICE_ACCOUNT_JSON/GCS_BUCKET)');

  const [buffer] = await storage.bucket(bucket).file(objectName).download();
  const actual = sha256Hex(buffer);
  if (actual !== sha256) {
    throw new Error(`GCS object ${bucket}/${objectName} failed integrity check: expected sha256 ${sha256}, got ${actual}`);
  }
  return buffer;
}

/**
 * Registers a source document already uploaded to GCS (by the retrieval
 * or labelling engine, which hold the write permissions -- this platform
 * does not upload source material itself). Immutable: re-registering the
 * same bucket/object_name/generation is rejected by the database's unique
 * constraint rather than silently updating the row.
 *
 * @param {{
 *   id: string, bucket: string, objectName: string, generation: string,
 *   sha256: string, mimeType: string, byteSize: number,
 *   sourceUrl?: string, examCode?: string, isPyq?: boolean,
 *   registeredBy: string,
 * }} doc
 */
export async function registerSourceDocument(doc) {
  const { rows } = await query(
    `INSERT INTO content_engine_source_document
       (id, bucket, object_name, generation, sha256, mime_type, byte_size,
        source_url, exam_code, is_pyq, registered_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, status, created_at`,
    [
      doc.id,
      doc.bucket,
      doc.objectName,
      doc.generation,
      doc.sha256,
      doc.mimeType,
      doc.byteSize,
      doc.sourceUrl ?? null,
      doc.examCode ?? null,
      Boolean(doc.isPyq),
      doc.registeredBy,
    ]
  );
  return rows[0];
}
