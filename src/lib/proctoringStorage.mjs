/**
 * Where proctoring recordings actually live: local disk, under
 * storage/proctoring/<testId>/<stream>.webm. Chunks from the browser's
 * MediaRecorder arrive one at a time during the test and are appended to
 * the same file in order -- a WebM stream recorded continuously by one
 * MediaRecorder instance can be reassembled by plain binary concatenation
 * of its ondataavailable blobs, so no video processing/muxing is needed
 * here, just appendFile.
 *
 * IMPORTANT -- this is local-disk storage, which only works for a
 * single-instance deployment with a persistent filesystem. It will NOT
 * survive a serverless host (Vercel, etc.) where the filesystem is
 * ephemeral and requests can land on different instances. Real deployment
 * needs object storage (S3, R2, ...) instead -- swap that in here without
 * touching the API routes that call these functions, since they only know
 * about testId/stream, not the storage mechanism.
 */

import { mkdir, appendFile, stat, open } from 'node:fs/promises';
import path from 'node:path';
import { createReadStream } from 'node:fs';

const STORAGE_ROOT = path.join(process.cwd(), 'storage', 'proctoring');

function sessionDir(testId) {
  return path.join(STORAGE_ROOT, testId);
}

function streamPath(testId, stream) {
  if (stream !== 'camera' && stream !== 'screen') {
    throw new Error(`Invalid proctoring stream "${stream}"`);
  }
  return path.join(sessionDir(testId), `${stream}.webm`);
}

export async function appendChunk(testId, stream, buffer) {
  const dir = sessionDir(testId);
  await mkdir(dir, { recursive: true });
  await appendFile(streamPath(testId, stream), buffer);
}

export async function getRecordingStats(testId, stream) {
  try {
    const s = await stat(streamPath(testId, stream));
    return { exists: true, size: s.size };
  } catch {
    return { exists: false, size: 0 };
  }
}

/** Opens the file for streaming playback; caller is responsible for closing it via the returned stream's lifecycle. */
export async function openRecordingStream(testId, stream, range) {
  const filePath = streamPath(testId, stream);
  const fileStat = await stat(filePath);
  if (range) {
    const fh = await open(filePath, 'r');
    await fh.close();
    return { size: fileStat.size, nodeStream: createReadStream(filePath, range) };
  }
  return { size: fileStat.size, nodeStream: createReadStream(filePath) };
}
