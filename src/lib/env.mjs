const isProduction = process.env.NODE_ENV === 'production';
const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

function required(name) {
  const value = process.env[name];
  if (!value && isProduction && !isBuild) throw new Error(`Missing required environment variable: ${name}`);
  return value ?? '';
}

function optionalNumber(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    if (isProduction && !isBuild) throw new Error(`${name} must be a positive number`);
    return fallback;
  }
  return value;
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: required('DATABASE_URL'),
  appUrl: required('APP_URL'),
  cronSecret: required('CRON_SECRET'),
  learnerId: process.env.NOVA_LEARNER_ID ?? process.env.APP_LEARNER_ID ?? '',
  learnerName: process.env.NOVA_LEARNER_NAME ?? 'Learner',
  language: process.env.NOVA_LANGUAGE ?? 'en',
  dbPoolMax: optionalNumber('DB_POOL_MAX', isProduction ? 10 : 5),
  objectStorageMode: process.env.OBJECT_STORAGE_MODE ?? (isProduction && !isBuild ? 's3' : 'local'),
  s3Bucket: process.env.S3_BUCKET ?? '',
  s3Region: process.env.S3_REGION ?? '',
  s3Endpoint: process.env.S3_ENDPOINT ?? '',
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
  s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
});

export function assertProductionConfig() {
  if (!isProduction || isBuild) return;
  const requiredKeys = ['DATABASE_URL', 'APP_URL', 'CRON_SECRET'];
  const missing = requiredKeys.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Production configuration incomplete: ${missing.join(', ')}`);

  if (!/^https:\/\//.test(env.appUrl)) {
    throw new Error('APP_URL must use HTTPS in production');
  }
  if (env.cronSecret.length < 32) {
    throw new Error('CRON_SECRET must be at least 32 characters in production');
  }
  if (!['s3'].includes(env.objectStorageMode)) {
    throw new Error('OBJECT_STORAGE_MODE must be s3 in production');
  }
  const storageKeys = ['S3_BUCKET', 'S3_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'];
  const missingStorage = storageKeys.filter((key) => !process.env[key]);
  if (missingStorage.length) throw new Error(`Production object storage configuration incomplete: ${missingStorage.join(', ')}`);
}

if (isProduction && !isBuild) assertProductionConfig();
