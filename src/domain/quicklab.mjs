// Quick Lab question generators. Unlike the exam question bank, these never
// run out -- each call produces a fresh, randomly-parameterized question
// with a verified-correct answer, so "content" here is infinite by
// construction rather than something that needs to keep being authored.

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

function buildOptions(correct, distractorPool) {
  const seen = new Set([String(correct)]);
  const distractors = [];
  for (const d of distractorPool) {
    const key = String(d);
    if (seen.has(key)) continue;
    seen.add(key);
    distractors.push(d);
    if (distractors.length === 3) break;
  }
  if (typeof correct === 'number') {
    let step = 1;
    while (distractors.length < 3) {
      for (const c of [correct + step, Math.max(0, correct - step)]) {
        const key = String(c);
        if (!seen.has(key)) {
          seen.add(key);
          distractors.push(c);
          if (distractors.length === 3) break;
        }
      }
      step += 1;
    }
  } else if (distractors.length < 3) {
    throw new Error(`not enough distinct distractors for "${correct}"`);
  }
  const options = [correct, ...distractors];
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = randInt(0, i);
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { options: options.map(String), correctIndex: options.indexOf(correct) };
}

function quickMath() {
  const op = pick(['+', '-', '×']);
  let a;
  let b;
  let correct;
  if (op === '+') {
    a = randInt(12, 98);
    b = randInt(12, 98);
    correct = a + b;
  } else if (op === '-') {
    a = randInt(30, 99);
    b = randInt(10, a - 1);
    correct = a - b;
  } else {
    a = randInt(2, 12);
    b = randInt(2, 12);
    correct = a * b;
  }
  const { options, correctIndex } = buildOptions(correct, [correct + 1, correct - 1, correct + 10, correct - 10]);
  return { prompt: `${a} ${op} ${b}`, hint: 'Pure arithmetic — no tricks, just speed.', options, correctIndex };
}

function numberRush() {
  const a = randInt(100, 999);
  const b = randInt(10, 99);
  const op = pick(['+', '-']);
  const correct = op === '+' ? a + b : a - b;
  const { options, correctIndex } = buildOptions(correct, [correct + 10, correct - 10, correct + 1]);
  return { prompt: `${a} ${op} ${b}`, hint: 'Bigger numbers, same two operations.', options, correctIndex };
}

function percentageRush() {
  const shapes = ['of', 'increase', 'reverse'];
  const shape = pick(shapes);
  if (shape === 'of') {
    const pct = pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 75]);
    const base = randInt(4, 40) * 10;
    const correct = Math.round((pct / 100) * base);
    const { options, correctIndex } = buildOptions(correct, [Math.round(correct * 1.1), Math.round(correct * 0.9), base - correct]);
    return { prompt: `${pct}% of ${base}`, hint: 'Of: multiply the percentage, as a fraction, by the base.', options, correctIndex };
  }
  if (shape === 'increase') {
    const base = randInt(10, 90) * 10;
    const pct = pick([10, 20, 25, 50]);
    const correct = base + (base * pct) / 100;
    const { options, correctIndex } = buildOptions(correct, [base - (base * pct) / 100, base, correct + 10]);
    return { prompt: `${base} increased by ${pct}%`, hint: 'Increase: add the percentage of the base back onto the base.', options, correctIndex };
  }
  const pct = pick([20, 25, 40, 50]);
  const part = randInt(2, 20) * pct;
  const correct = Math.round((part / pct) * 100);
  const { options, correctIndex } = buildOptions(correct, [Math.round((part * pct) / 100), correct + 10, correct - 10]);
  return { prompt: `${part} is ${pct}% of what number?`, hint: 'Reverse: divide by the percentage, not multiply.', options, correctIndex };
}

function fractionLab() {
  const mode = pick(['compare', 'simplify']);
  if (mode === 'compare') {
    const n1 = randInt(1, 8);
    const d1 = randInt(n1 + 1, 12);
    const n2 = randInt(1, 8);
    const d2 = randInt(n2 + 1, 12);
    const v1 = n1 / d1;
    const v2 = n2 / d2;
    const frac1 = `${n1}/${d1}`;
    const frac2 = `${n2}/${d2}`;
    const correct = v1 === v2 ? 'Equal' : v1 > v2 ? frac1 : frac2;
    const distractorPool =
      v1 === v2
        ? [frac1, frac2, 'Cannot tell', `${n1 + 1}/${d1}`]
        : [correct === frac1 ? frac2 : frac1, 'Equal', 'Cannot tell'];
    const { options, correctIndex } = buildOptions(correct, distractorPool);
    return { prompt: `Which is larger: ${n1}/${d1} or ${n2}/${d2}?`, hint: 'Cross-multiply to compare without finding a common denominator.', options, correctIndex };
  }
  const base = randInt(2, 9);
  const factor = randInt(2, 6);
  const n = base * factor;
  const d = base * factor * randInt(2, 3);
  const g = gcd(n, d);
  const correct = `${n / g}/${d / g}`;
  const { options, correctIndex } = buildOptions(correct, [
    `${n}/${d}`,
    `${n / g + 1}/${d / g}`,
    `${n / g}/${d / g + 1}`,
    `${n / g}/${d / g * 2}`,
  ]);
  return { prompt: `Simplify ${n}/${d} to its lowest terms.`, hint: 'Divide top and bottom by their HCF.', options, correctIndex };
}

function missingNumber() {
  const kind = pick(['arithmetic', 'geometric']);
  if (kind === 'arithmetic') {
    const start = randInt(2, 15);
    const step = randInt(2, 9);
    const seq = [start, start + step, start + 2 * step, start + 3 * step];
    const correct = start + 4 * step;
    const { options, correctIndex } = buildOptions(correct, [correct + step, correct - step, correct + 1]);
    return { prompt: `${seq.join(', ')}, ?`, hint: 'Find the constant difference between terms.', options, correctIndex };
  }
  const start = pick([1, 2, 3]);
  const ratio = pick([2, 3]);
  const seq = [start, start * ratio, start * ratio ** 2, start * ratio ** 3];
  const correct = start * ratio ** 4;
  const { options, correctIndex } = buildOptions(correct, [correct + start, correct - seq[3], Math.round(correct / ratio) * 2]);
  return { prompt: `${seq.join(', ')}, ?`, hint: 'Find the constant multiplier between terms.', options, correctIndex };
}

function memoryMath() {
  const digits = Array.from({ length: randInt(3, 5) }, () => randInt(1, 9));
  const correct = digits.reduce((a, b) => a + b, 0);
  const { options, correctIndex } = buildOptions(correct, [correct + 1, correct - 1, correct + 2]);
  return {
    prompt: `Remember: ${digits.join(' ')}`,
    revealPrompt: 'What was the sum of those digits?',
    hint: 'Hold all the digits in your head, then add them once they vanish.',
    options,
    correctIndex,
    memorize: true,
  };
}

const FORMULA_FACTS = [
  { term: 'Simple Interest', correct: 'SI = (P × R × T) / 100', wrong: ['SI = P × R × T', 'SI = P(1 + R/100)^T', 'SI = P + R + T'] },
  { term: 'Compound Interest (amount)', correct: 'A = P(1 + R/100)^T', wrong: ['A = P + (P × R × T)/100', 'A = P × R × T', 'A = P(1 + RT/100)'] },
  { term: 'Area of a rectangle', correct: 'length × width', wrong: ['2 × (length + width)', 'length + width', '2 × length × width'] },
  { term: 'Area of a circle', correct: 'π × r²', wrong: ['2 × π × r', 'π × d', '2 × π × r²'] },
  { term: 'Volume of a cube', correct: 'side³', wrong: ['6 × side²', 'side²', '4 × side'] },
  { term: 'Volume of a cuboid', correct: 'length × width × height', wrong: ['2 × (l + w + h)', 'length × width', '(l × w × h) / 2'] },
  { term: 'LCM × HCF', correct: 'product of the two numbers', wrong: ['sum of the two numbers', 'difference of the two numbers', 'always 1'] },
  { term: 'Time and Work (together)', correct: '(A × B) / (A + B) days', wrong: ['(A + B) / 2 days', 'A + B days', '(A − B) days'] },
  { term: 'Percentage of a number', correct: '(percentage / 100) × number', wrong: ['percentage × number', 'number / percentage', 'percentage + number'] },
  { term: 'Converting a fraction to a percentage', correct: '(numerator / denominator) × 100', wrong: ['numerator × denominator', 'denominator / numerator', '(numerator × 100) + denominator'] },
];

function formulaMatch() {
  const fact = pick(FORMULA_FACTS);
  const { options, correctIndex } = buildOptions(fact.correct, fact.wrong);
  return { prompt: `What is the formula for: ${fact.term}?`, hint: 'One of these four is the real formula; the rest are near-miss distractors.', options, correctIndex };
}

const GENERATORS = {
  'quick-math': quickMath,
  'number-rush': numberRush,
  'percentage-rush': percentageRush,
  'fraction-lab': fractionLab,
  'missing-number': missingNumber,
  'memory-math': memoryMath,
  'formula-match': formulaMatch,
};

export function generateQuestion(mode) {
  const gen = GENERATORS[mode];
  if (!gen) return null;
  return gen();
}

export const QUICK_LAB_MODES = Object.keys(GENERATORS);
