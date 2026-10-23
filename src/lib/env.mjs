const isProduction = process.env.NODE_ENV === 'production';

function required(name) {
  const value = process.env[name];
  if (!value && isProduction) throw new Error(`Missing required environment variable: ${name}`);
  return value ?? '';
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: required('DATABASE_URL'),
  appUrl: process.env.APP_URL ?? '',
  cronSecret: process.env.CRON_SECRET ?? '',
  learnerId: process.env.NOVA_LEARNER_ID ?? process.env.APP_LEARNER_ID ?? '',
  learnerName: process.env.NOVA_LEARNER_NAME ?? 'Learner',
  language: process.env.NOVA_LANGUAGE ?? 'en',
});

export function assertProductionConfig() {
  if (!isProduction) return;
  const requiredKeys = ['DATABASE_URL', 'APP_URL', 'CRON_SECRET'];
  const missing = requiredKeys.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Production configuration incomplete: ${missing.join(', ')}`);
}
