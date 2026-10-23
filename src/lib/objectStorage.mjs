import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from './env.mjs';

const useS3 = env.objectStorageMode === 's3';
const LOCAL_ROOT = path.join(process.cwd(), 'storage', 'objects');
const client = useS3 ? new S3Client({
  region: env.s3Region,
  endpoint: env.s3Endpoint || undefined,
  forcePathStyle: env.s3ForcePathStyle,
  credentials: { accessKeyId: env.s3AccessKeyId, secretAccessKey: env.s3SecretAccessKey },
}) : null;

function requireS3() {
  if (!useS3 || !client || !env.s3Bucket) throw new Error('S3 object storage is not configured');
}
function localPath(key) { return path.join(LOCAL_ROOT, key); }

export function sha256(buffer) { return createHash('sha256').update(buffer).digest('hex'); }

export async function putObject(key, buffer, contentType = 'application/octet-stream') {
  if (!useS3) {
    const file = localPath(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, buffer);
    return { key, size: buffer.length, sha256: sha256(buffer), contentType };
  }
  requireS3();
  await client.send(new PutObjectCommand({ Bucket: env.s3Bucket, Key: key, Body: buffer, ContentType: contentType }));
  return { key, size: buffer.length, sha256: sha256(buffer), contentType };
}

export async function getObject(key) {
  if (!useS3) return readFile(localPath(key));
  requireS3();
  const response = await client.send(new GetObjectCommand({ Bucket: env.s3Bucket, Key: key }));
  if (!response.Body) throw new Error(`Object ${key} has no body`);
  return Buffer.from(await response.Body.transformToByteArray());
}

export async function deleteObject(key) {
  if (!useS3) { await rm(localPath(key), { force: true }); return; }
  requireS3();
  await client.send(new DeleteObjectCommand({ Bucket: env.s3Bucket, Key: key }));
}

export function contentObjectKey(batchId, fileName) {
  const safe = String(fileName).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-160);
  return `content-processing/${batchId}/${crypto.randomUUID()}-${safe}`;
}

export function isObjectStorageConfigured() {
  return useS3
    ? Boolean(env.s3Bucket && env.s3Region && env.s3AccessKeyId && env.s3SecretAccessKey)
    : true;
}
