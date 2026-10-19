// A seeded PRNG so a template run is reproducible (needed for tests and
// for re-generating a rejected batch without silently changing params).
// mulberry32 -- small, fast, good enough statistical quality for MCQ
// distractor generation, no dependency pulled in for it.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// Shuffles the correct answer into a random option slot and returns both
// the shuffled options and the index it landed on -- every template uses
// this instead of hand-placing the answer, so option order never leaks
// "the answer is always option A" the way a careless generator can.
export function placeAnswer(rng, correctText, distractorTexts) {
  const options = [...distractorTexts];
  const answerIndex = randInt(rng, 0, options.length);
  options.splice(answerIndex, 0, correctText);
  return { options, answerIndex };
}
