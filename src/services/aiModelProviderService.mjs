// Phase 29.5 — AIModelProvider. generateHint() (src/lib/ai/provider.mjs,
// Phase 8, unchanged) is already fully generic — any {system, user} prompt
// in, {text, model}|null out, null meaning "unreachable or unconfigured,
// treat as a normal outcome." This is just the named architectural seam
// the brief asks for, not a reimplementation.
import { generateHint } from '../lib/ai/provider.mjs';

export async function callAiModel(prompt) {
  return generateHint(prompt);
}
