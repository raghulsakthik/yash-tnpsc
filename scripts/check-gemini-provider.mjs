#!/usr/bin/env node
/** Safe live Gemini smoke test. Never prints or persists the API key. */
import { generateJson } from '../src/lib/ai/provider.mjs';

// Load local server-only secrets for developer runs; existing process env wins.
try { process.loadEnvFile('.env.local'); } catch (error) { if (error.code !== 'ENOENT') throw error; }

if (!process.env.GEMINI_API_KEY) {
  console.error('SKIP: GEMINI_API_KEY is not configured. Set it in the server environment, then rerun npm run check:gemini.');
  process.exitCode = 2;
} else {
  const result = await generateJson({
    system: 'Return only strict JSON with exactly two keys: ok (boolean) and label (string). Set ok to true and label to "tnpsc-provider-smoke-test".',
    user: 'Provider connectivity check. Do not add any other fields.',
  });
  if (!result || result.ok !== true || result.label !== 'tnpsc-provider-smoke-test') {
    console.error('FAIL: Gemini responded without the expected validated JSON payload. Inspect server logs for the provider error; the API key is not displayed.');
    process.exitCode = 1;
  } else {
    console.log('PASS: Gemini API key accepted and strict JSON generation returned the expected payload.');
  }
}
