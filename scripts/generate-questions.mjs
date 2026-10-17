#!/usr/bin/env node
// Procedurally generates a large bank of fully-computed, correctness-
// verified questions for the topics where correctness can be checked by
// arithmetic alone (every option is computed, not guessed). Appends to the
// existing content/questions/*.yaml files in the same house style, picking
// up numbering where each file left off. Re-running is safe: ids keep
// counting up, so nothing already there is touched or duplicated.
//
// Pattern-based reasoning (number series, alpha-numeric coding) is
// generated the same way, since both are closed-form and checkable.
// Spatial/verbal reasoning (dice, visual, puzzles, logical) is NOT
// generated here -- faking those well needs real authoring, not formulas.

import { readFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const QDIR = path.join(ROOT, 'content', 'questions');

function esc(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function q(s) {
  return `"${esc(s)}"`;
}

function fmt(item) {
  return `
  - id: ${item.id}
    difficulty: ${item.difficulty.toFixed(2)}
    estimatedSeconds: ${item.estimatedSeconds}
    question: ${q(item.question)}
    options: [${item.options.map(q).join(', ')}]
    answer: ${item.answer}
    explanation: ${q(item.explanation)}
    trap: ${q(item.trap)}
`;
}

// Always returns exactly 4 distinct options. Candidate distractors that
// collide with the correct value or with each other are dropped, then
// topped back up with nearby synthetic values so every question still
// ships with a full, unambiguous set of 4 -- the content validator checks
// this (options.length === 4, all distinct) and generated content must
// pass the same bar as hand-authored content.
function shuffleOptions(correctValue, candidateDistractors) {
  const seen = new Set([String(correctValue)]);
  const distractors = [];
  for (const d of candidateDistractors) {
    const key = String(d);
    if (seen.has(key)) continue;
    seen.add(key);
    distractors.push(d);
    if (distractors.length === 3) break;
  }

  if (typeof correctValue === 'number') {
    let filler = 1;
    while (distractors.length < 3) {
      const isFloat = !Number.isInteger(correctValue);
      const step = isFloat ? filler * 0.5 : filler;
      for (const candidate of [correctValue + step, correctValue - step]) {
        const key = String(candidate);
        if (!seen.has(key) && candidate >= 0) {
          seen.add(key);
          distractors.push(candidate);
          if (distractors.length === 3) break;
        }
      }
      filler += 1;
      if (filler > 1000) throw new Error(`could not fill distractors for ${correctValue}`);
    }
  } else if (distractors.length < 3) {
    // String answers (letters/words): caller must supply enough distinct
    // candidates up front -- there's no safe generic "nearby" string value.
    throw new Error(`not enough distinct distractors for "${correctValue}": got ${distractors.length}, need 3`);
  }

  const all = [correctValue, ...distractors];
  // Fixed-ish seed derived from the values themselves, so re-running
  // produces the same file byte-for-byte given the same inputs.
  let seed = Math.abs(Math.round(correctValue * 97 + distractors.reduce((a, b) => a + b, 0))) || 1;
  function rand() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  }
  for (let i = all.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return { options: all.map(String), answer: all.indexOf(correctValue) };
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

async function nextId(file, prefix) {
  const text = await readFile(file, 'utf8');
  const matches = [...text.matchAll(new RegExp(`${prefix}-(\\d+)`, 'g'))];
  const max = matches.reduce((m, mm) => Math.max(m, Number(mm[1])), 0);
  return max;
}

async function appendItems(file, items) {
  const text = items.map(fmt).join('');
  await appendFile(file, text);
}

// -------------------------------------------------------------- generators

function* wholeNumbers() {
  const nums = [2384, 5917, 6042, 8135, 71926, 48203, 93517, 25648, 61279, 37084, 54938, 82163];
  for (const n of nums) {
    const digits = String(n).split('').reverse();
    const pos = Math.min(2, digits.length - 1); // hundreds place, safe index
    const places = ['units', 'tens', 'hundreds', 'thousands', 'ten-thousands'];
    const value = Number(digits[pos]) * 10 ** pos;
    const distractors = [Number(digits[pos]), value * 10, Math.max(1, value / 10)].map(Math.round);
    const { options, answer } = shuffleOptions(value, [...new Set(distractors)].filter((d) => d !== value).slice(0, 3));
    yield {
      difficulty: 0.15,
      estimatedSeconds: 30,
      question: `What is the place value of the digit ${digits[pos]} in ${n.toLocaleString('en-IN')}?`,
      options,
      answer,
      explanation: `In ${n.toLocaleString('en-IN')}, the digit ${digits[pos]} sits in the ${places[pos]} place, so its place value is ${digits[pos]} × ${10 ** pos} = ${value}.`,
      trap: `Confusing the bare digit ${digits[pos]} with its place value (${value}) is the most common slip here.`,
    };
  }

  const roundTargets = [3461, 7825, 12046, 29573, 54811, 68290, 91347, 40625];
  for (const n of roundTargets) {
    const rounded100 = Math.round(n / 100) * 100;
    const rounded10 = Math.round(n / 10) * 10;
    const rounded1000 = Math.round(n / 1000) * 1000;
    const { options, answer } = shuffleOptions(rounded100, [rounded10, rounded1000, rounded100 + 100].filter((d) => d !== rounded100));
    yield {
      difficulty: 0.2,
      estimatedSeconds: 35,
      question: `Round ${n.toLocaleString('en-IN')} to the nearest hundred.`,
      options,
      answer,
      explanation: `The tens digit of ${n} decides the rounding. ${n} rounds to ${rounded100} at the nearest hundred.`,
      trap: `${rounded10} rounds to the nearest ten instead of the nearest hundred — rounding to the wrong place value is as common a mistake as rounding the wrong way.`,
    };
  }

  const bodmas = [
    [24, '+', 6, '×', 3, (a, b, c) => a + b * c],
    [100, '-', 4, '×', 12, (a, b, c) => a - b * c],
    [18, '×', 2, '+', 7, (a, b, c) => a * b + c],
    [90, '÷', 6, '+', 5, (a, b, c) => a / b + c],
    [45, '-', 15, '÷', 3, (a, b, c) => a - b / c],
    [12, '×', 4, '-', 9, (a, b, c) => a * b - c],
  ];
  for (const [a, op1, b, op2, c, fn] of bodmas) {
    const correct = fn(a, b, c);
    const naive = (() => {
      // Common error: evaluate strictly left to right ignoring precedence.
      const step1 = op1 === '+' ? a + b : op1 === '-' ? a - b : op1 === '×' ? a * b : a / b;
      return op2 === '+' ? step1 + c : op2 === '-' ? step1 - c : op2 === '×' ? step1 * c : step1 / c;
    })();
    const { options, answer } = shuffleOptions(correct, [naive, correct + c, correct - b].filter((d) => d !== correct));
    yield {
      difficulty: 0.3,
      estimatedSeconds: 40,
      question: `What is ${a} ${op1} ${b} ${op2} ${c}?`,
      options,
      answer,
      explanation: `${op2 === '×' || op2 === '÷' ? `${b} ${op2} ${c}` : `${a} ${op1} ${b}`} is done first by order of operations, giving ${correct}.`,
      trap: `${naive} comes from evaluating strictly left to right instead of respecting multiplication/division before addition/subtraction.`,
    };
  }
}

function* division() {
  const cases = [
    [17, 23, 4], [19, 31, 7], [23, 18, 11], [29, 14, 9],
    [16, 42, 5], [21, 27, 13], [34, 15, 8], [27, 36, 10],
    [38, 19, 6], [12, 58, 3], [44, 11, 7], [25, 26, 14],
  ];
  for (const [divisor, quotient, remainder] of cases) {
    const dividend = divisor * quotient + remainder;
    const { options, answer } = shuffleOptions(dividend, [dividend + divisor, dividend - remainder, divisor * quotient]);
    yield {
      difficulty: 0.25,
      estimatedSeconds: 40,
      question: `When a number is divided by ${divisor}, the quotient is ${quotient} and the remainder is ${remainder}. What is the number?`,
      options,
      answer,
      explanation: `Dividend = divisor × quotient + remainder = ${divisor} × ${quotient} + ${remainder} = ${dividend}.`,
      trap: `${divisor * quotient} is just divisor × quotient with the remainder left out entirely.`,
    };
  }

  const remCases = [
    [457, 8], [683, 9], [1024, 12], [956, 15], [1207, 11], [832, 13], [1489, 17], [674, 19],
  ];
  for (const [n, d] of remCases) {
    const r = n % d;
    const dist1 = (r + 1) % d;
    const dist2 = Math.max(0, r - 1);
    const dist3 = (r + 2) % d;
    const { options, answer } = shuffleOptions(r, [...new Set([dist1, dist2, dist3])].filter((x) => x !== r));
    yield {
      difficulty: 0.2,
      estimatedSeconds: 35,
      question: `What is the remainder when ${n} is divided by ${d}?`,
      options,
      answer,
      explanation: `${n} ÷ ${d} = ${Math.floor(n / d)} with a remainder of ${r}, since ${d} × ${Math.floor(n / d)} = ${d * Math.floor(n / d)} and ${n} − ${d * Math.floor(n / d)} = ${r}.`,
      trap: `Off-by-one remainders are the most common slip — recheck by multiplying the quotient back out.`,
    };
  }
}

function* decimals() {
  const addCases = [
    [12.45, 7.8], [34.6, 15.75], [8.125, 4.25], [56.3, 29.47], [17.05, 8.9], [63.75, 12.125],
  ];
  for (const [a, b] of addCases) {
    const correct = Math.round((a + b) * 1000) / 1000;
    const { options, answer } = shuffleOptions(correct, [
      Math.round((a - b) * 1000) / 1000,
      Math.round((a + b + 1) * 1000) / 1000,
      Math.round((a * b) * 1000) / 1000 > 1000 ? correct + 1 : Math.round((a + b - 1) * 1000) / 1000,
    ]);
    yield {
      difficulty: 0.2,
      estimatedSeconds: 30,
      question: `What is ${a} + ${b}?`,
      options,
      answer,
      explanation: `Line up the decimal points: ${a} + ${b} = ${correct}.`,
      trap: `Misaligning the decimal point while adding is the single most common error in decimal addition.`,
    };
  }

  const convCases = [
    [3, 8], [5, 16], [7, 20], [9, 25], [11, 40], [13, 50], [17, 80], [21, 125],
  ];
  for (const [num, den] of convCases) {
    const correct = Math.round((num / den) * 10000) / 10000;
    const wrongFlip = Math.round((den / num) * 10000) / 10000;
    const wrongShift = Math.round(correct * 10 * 10000) / 10000;
    const { options, answer } = shuffleOptions(correct, [wrongFlip, wrongShift, Math.round((correct + 0.1) * 10000) / 10000]);
    yield {
      difficulty: 0.25,
      estimatedSeconds: 35,
      question: `Convert ${num}/${den} to a decimal.`,
      options,
      answer,
      explanation: `${num} ÷ ${den} = ${correct}.`,
      trap: `${wrongFlip} inverts the fraction before dividing — always divide numerator by denominator, not the other way round.`,
    };
  }
}

function* simplification() {
  const exprs = [
    [15, '+', 25, '÷', 5, (a, b, c) => a + b / c, '÷ before +'],
    [8, '×', 7, '-', 12, (a, b, c) => a * b - c, '× before −'],
    [60, '÷', 4, '+', 9, (a, b, c) => a / b + c, '÷ before +'],
    [36, '-', 6, '×', 4, (a, b, c) => a - b * c, '× before −'],
    [14, '×', 3, '+', 22, (a, b, c) => a * b + c, '× before +'],
    [81, '÷', 9, '×', 3, (a, b, c) => (a / b) * c, 'left to right among ÷ and ×'],
    [45, '+', 18, '÷', 6, (a, b, c) => a + b / c, '÷ before +'],
    [96, '÷', 8, '-', 5, (a, b, c) => a / b - c, '÷ before −'],
    [11, '×', 11, '-', 21, (a, b, c) => a * b - c, '× before −'],
    [100, '-', 36, '÷', 4, (a, b, c) => a - b / c, '÷ before −'],
  ];
  for (const [a, op1, b, op2, c, fn, rule] of exprs) {
    const correct = fn(a, b, c);
    const naive = (() => {
      const step1 = op1 === '+' ? a + b : op1 === '-' ? a - b : op1 === '×' ? a * b : a / b;
      return op2 === '+' ? step1 + c : op2 === '-' ? step1 - c : op2 === '×' ? step1 * c : step1 / c;
    })();
    const { options, answer } = shuffleOptions(correct, [naive, correct + 1, correct - 1].filter((d) => d !== correct));
    yield {
      difficulty: 0.3,
      estimatedSeconds: 40,
      question: `Simplify: ${a} ${op1} ${b} ${op2} ${c}`,
      options,
      answer,
      explanation: `By BODMAS, ${rule}, giving ${correct}.`,
      trap: `${naive} comes from working strictly left to right, ignoring operator precedence.`,
    };
  }
}

function* percentage() {
  const ofCases = [
    [12, 350], [18, 250], [35, 480], [42, 600], [28, 325], [65, 200], [15, 740], [72, 450], [8, 950], [55, 320],
  ];
  for (const [pct, base] of ofCases) {
    const correct = Math.round((pct / 100) * base * 100) / 100;
    const { options, answer } = shuffleOptions(correct, [
      Math.round(correct * 1.1 * 100) / 100,
      Math.round(correct * 0.9 * 100) / 100,
      Math.round((base - correct) * 100) / 100,
    ]);
    yield {
      difficulty: 0.25,
      estimatedSeconds: 35,
      question: `What is ${pct}% of ${base}?`,
      options,
      answer,
      explanation: `${pct}% of ${base} = (${pct}/100) × ${base} = ${correct}.`,
      trap: `${Math.round((base - correct) * 100) / 100} is ${base} minus the answer, mistaking "what's left" for "what's asked".`,
    };
  }

  const changeCases = [
    [500, 20, 'increase'], [800, 15, 'decrease'], [1200, 25, 'increase'], [640, 10, 'decrease'],
    [950, 40, 'increase'], [360, 30, 'decrease'], [1500, 12, 'increase'], [720, 35, 'decrease'],
  ];
  for (const [base, pct, dir] of changeCases) {
    const correct = dir === 'increase' ? base + (base * pct) / 100 : base - (base * pct) / 100;
    const opposite = dir === 'increase' ? base - (base * pct) / 100 : base + (base * pct) / 100;
    const { options, answer } = shuffleOptions(correct, [opposite, (base * pct) / 100, correct + 10]);
    yield {
      difficulty: 0.3,
      estimatedSeconds: 40,
      question: `${base} is ${dir}d by ${pct}%. What is the new value?`,
      options,
      answer,
      explanation: `${pct}% of ${base} is ${(base * pct) / 100}. ${dir === 'increase' ? 'Adding' : 'Subtracting'} that ${dir === 'increase' ? 'to' : 'from'} ${base} gives ${correct}.`,
      trap: `${opposite} applies the change in the wrong direction — re-read whether it's an increase or a decrease before picking.`,
    };
  }

  const reverse = [
    [60, 40], [84, 70], [150, 25], [96, 60], [225, 45], [189, 63], [112, 28], [405, 90],
  ];
  for (const [part, pct] of reverse) {
    const whole = Math.round((part / pct) * 100 * 100) / 100;
    const { options, answer } = shuffleOptions(whole, [Math.round((part * pct) / 100), whole + 10, whole - 10]);
    yield {
      difficulty: 0.35,
      estimatedSeconds: 45,
      question: `${part} is ${pct}% of what number?`,
      options,
      answer,
      explanation: `If ${pct}% of a number is ${part}, the number is ${part} ÷ (${pct}/100) = ${whole}.`,
      trap: `${Math.round((part * pct) / 100)} multiplies instead of dividing by the percentage — reverse-percentage questions divide, they don't multiply.`,
    };
  }
}

function* hcfLcm(topic) {
  const pairs = [
    [36, 60], [48, 72], [84, 126], [105, 175], [96, 144], [54, 90], [120, 180], [63, 108], [75, 125], [132, 198],
  ];
  for (const [a, b] of pairs) {
    const h = gcd(a, b);
    const l = (a * b) / h;
    if (topic === 'hcf') {
      const { options, answer } = shuffleOptions(h, [l, a - b, h + 2].filter((d) => d !== h));
      yield {
        difficulty: 0.3,
        estimatedSeconds: 45,
        question: `What is the HCF of ${a} and ${b}?`,
        options,
        answer,
        explanation: `The highest common factor of ${a} and ${b} is ${h} (found by repeated division, Euclid's method).`,
        trap: `${l} is the LCM, not the HCF — the two are opposite ends of the same factor pair and easy to swap under time pressure.`,
      };
    } else {
      const { options, answer } = shuffleOptions(l, [h, a * b, l - h].filter((d) => d !== l));
      yield {
        difficulty: 0.3,
        estimatedSeconds: 45,
        question: `What is the LCM of ${a} and ${b}?`,
        options,
        answer,
        explanation: `LCM × HCF = product of the numbers. HCF(${a}, ${b}) = ${h}, so LCM = (${a} × ${b}) ÷ ${h} = ${l}.`,
        trap: `${a * b} skips dividing out the HCF — that's the product of the numbers, not their LCM, unless they share no common factor.`,
      };
    }
  }
}

function* ratioProportion() {
  const cases = [
    [1200, 3, 5], [2400, 5, 7], [900, 2, 7], [1800, 4, 5], [3500, 3, 4], [1500, 7, 8], [2100, 2, 5], [4000, 3, 5],
  ];
  for (const [total, r1, r2] of cases) {
    const share1 = Math.round((total * r1) / (r1 + r2));
    const share2 = total - share1;
    const { options, answer } = shuffleOptions(share1, [share2, Math.round(total / 2), share1 + r1]);
    yield {
      difficulty: 0.3,
      estimatedSeconds: 45,
      question: `${total} is divided between two people in the ratio ${r1}:${r2}. What is the smaller share?`,
      options,
      answer,
      explanation: `Total parts = ${r1} + ${r2} = ${r1 + r2}. One part = ${total} ÷ ${r1 + r2} = ${Math.round(total / (r1 + r2))}. The ${r1}-part share is ${share1}.`,
      trap: `${share2} is the larger share — ratio questions ask for a specific side, re-check which one before answering.`,
    };
  }
}

function* interest(topic) {
  const cases = [
    [5000, 8, 3], [8000, 6, 2], [12000, 10, 4], [6500, 12, 2], [9500, 7, 3], [15000, 5, 4], [7200, 9, 5], [10800, 11, 2],
  ];
  for (const [p, r, t] of cases) {
    if (topic === 'simple-interest') {
      const si = Math.round(((p * r * t) / 100) * 100) / 100;
      const { options, answer } = shuffleOptions(si, [si + p * 0.01, si - 100, si * 2]);
      yield {
        difficulty: 0.3,
        estimatedSeconds: 45,
        question: `Find the simple interest on ₹${p.toLocaleString('en-IN')} at ${r}% per annum for ${t} years.`,
        options,
        answer,
        explanation: `SI = (P × R × T) / 100 = (${p} × ${r} × ${t}) / 100 = ₹${si.toLocaleString('en-IN')}.`,
        trap: `Forgetting to divide by 100 (or dividing twice) is the most common slip in the SI formula.`,
      };
    } else {
      const amount = Math.round(p * (1 + r / 100) ** t * 100) / 100;
      const ci = Math.round((amount - p) * 100) / 100;
      const si = Math.round(((p * r * t) / 100) * 100) / 100;
      const { options, answer } = shuffleOptions(ci, [si, ci + 50, ci - 50]);
      yield {
        difficulty: 0.4,
        estimatedSeconds: 55,
        question: `Find the compound interest on ₹${p.toLocaleString('en-IN')} at ${r}% per annum for ${t} years, compounded annually.`,
        options,
        answer,
        explanation: `Amount = P(1 + R/100)^T = ${p} × (1 + ${r}/100)^${t} = ₹${amount.toLocaleString('en-IN')}. CI = Amount − P = ₹${ci.toLocaleString('en-IN')}.`,
        trap: `₹${si.toLocaleString('en-IN')} is the simple interest for the same numbers — compound interest grows faster because each year's interest earns interest too.`,
      };
    }
  }
}

function* area() {
  const rects = [[12, 8], [15, 9], [20, 14], [18, 11], [25, 16], [22, 13]];
  for (const [l, w] of rects) {
    const correct = l * w;
    const { options, answer } = shuffleOptions(correct, [2 * (l + w), l * w + l, correct - w]);
    yield {
      difficulty: 0.25,
      estimatedSeconds: 35,
      question: `What is the area of a rectangle with length ${l} m and width ${w} m?`,
      options,
      answer,
      explanation: `Area of a rectangle = length × width = ${l} × ${w} = ${correct} sq. m.`,
      trap: `${2 * (l + w)} is the perimeter formula, not area — easy to reach for the wrong formula under time pressure.`,
    };
  }

  const squares = [9, 13, 17, 21, 24, 28];
  for (const s of squares) {
    const correct = s * s;
    const { options, answer } = shuffleOptions(correct, [4 * s, correct + s, correct - s]);
    yield {
      difficulty: 0.2,
      estimatedSeconds: 30,
      question: `What is the area of a square with side ${s} m?`,
      options,
      answer,
      explanation: `Area of a square = side² = ${s}² = ${correct} sq. m.`,
      trap: `${4 * s} is the perimeter of the square, not its area.`,
    };
  }

  const circles = [[7, 22, 7], [14, 22, 7], [21, 22, 7], [28, 22, 7]];
  for (const [r, pn, pd] of circles) {
    const correct = Math.round(((pn / pd) * r * r) * 100) / 100;
    const { options, answer } = shuffleOptions(correct, [Math.round((2 * (pn / pd) * r) * 100) / 100, correct + r, correct - r]);
    yield {
      difficulty: 0.35,
      estimatedSeconds: 45,
      question: `Find the area of a circle with radius ${r} cm. (Use π = 22/7)`,
      options,
      answer,
      explanation: `Area = πr² = (22/7) × ${r} × ${r} = ${correct} sq. cm.`,
      trap: `${Math.round((2 * (pn / pd) * r) * 100) / 100} uses the circumference formula (2πr), not the area formula (πr²).`,
    };
  }
}

function* volume() {
  const cubes = [6, 9, 11, 14, 17];
  for (const s of cubes) {
    const correct = s ** 3;
    const { options, answer } = shuffleOptions(correct, [s * s, 6 * s * s, correct - s]);
    yield {
      difficulty: 0.3,
      estimatedSeconds: 40,
      question: `What is the volume of a cube with side ${s} cm?`,
      options,
      answer,
      explanation: `Volume of a cube = side³ = ${s}³ = ${correct} cubic cm.`,
      trap: `${s * s} is the area of one face, not the volume of the whole cube.`,
    };
  }

  const cuboids = [[12, 8, 5], [15, 10, 6], [20, 12, 7], [18, 9, 4], [25, 14, 8]];
  for (const [l, w, h] of cuboids) {
    const correct = l * w * h;
    const { options, answer } = shuffleOptions(correct, [2 * (l * w + w * h + h * l), l * w, correct - h]);
    yield {
      difficulty: 0.35,
      estimatedSeconds: 45,
      question: `Find the volume of a cuboid of length ${l} cm, width ${w} cm and height ${h} cm.`,
      options,
      answer,
      explanation: `Volume of a cuboid = l × w × h = ${l} × ${w} × ${h} = ${correct} cubic cm.`,
      trap: `${l * w} stops after multiplying just two dimensions — a cuboid's volume needs all three.`,
    };
  }
}

function* timeWork() {
  const cases = [
    [12, 18], [10, 15], [8, 24], [15, 20], [6, 9], [20, 30], [14, 21], [9, 12],
  ];
  for (const [a, b] of cases) {
    const together = Math.round(((a * b) / (a + b)) * 100) / 100;
    const { options, answer } = shuffleOptions(together, [(a + b) / 2, a + b, Math.round(together) + 1].filter((d) => d !== together));
    yield {
      difficulty: 0.35,
      estimatedSeconds: 50,
      question: `A can finish a piece of work in ${a} days and B can finish it in ${b} days. Working together, in how many days will they finish it?`,
      options,
      answer,
      explanation: `A's rate is 1/${a} of the work per day, B's is 1/${b}. Together: 1/${a} + 1/${b} = ${a + b}/${a * b} of the work per day, so the job takes ${a * b}/${a + b} ≈ ${together} days.`,
      trap: `${(a + b) / 2} just averages the two times — combined work rates add as fractions, they don't average as days.`,
    };
  }
}

function* profitLoss() {
  const cases = [
    [800, 920], [1500, 1350], [2400, 2640], [650, 715], [3200, 2880], [950, 1140], [1800, 1620], [4000, 4600],
  ];
  for (const [cp, sp] of cases) {
    const diff = sp - cp;
    const pct = Math.round((Math.abs(diff) / cp) * 10000) / 100;
    const isProfit = diff > 0;
    const { options, answer } = shuffleOptions(pct, [Math.round((Math.abs(diff) / sp) * 10000) / 100, pct + 2, pct - 2].filter((d) => d !== pct && d >= 0));
    yield {
      difficulty: 0.3,
      estimatedSeconds: 45,
      question: `A shopkeeper buys an article for ₹${cp} and sells it for ₹${sp}. What is the ${isProfit ? 'profit' : 'loss'} percentage?`,
      options,
      answer,
      explanation: `${isProfit ? 'Profit' : 'Loss'} = ₹${Math.abs(diff)}. ${isProfit ? 'Profit' : 'Loss'}% = (${isProfit ? 'Profit' : 'Loss'} / CP) × 100 = (${Math.abs(diff)}/${cp}) × 100 = ${pct}%.`,
      trap: `Dividing by the selling price instead of the cost price gives a different (and wrong) percentage — profit/loss % is always on the cost price.`,
    };
  }

  const targetCases = [
    [500, 20, 'profit'], [800, 15, 'profit'], [1200, 10, 'loss'], [600, 25, 'profit'], [900, 12, 'loss'], [1500, 30, 'profit'],
  ];
  for (const [cp, pct, kind] of targetCases) {
    const sp = kind === 'profit' ? cp + (cp * pct) / 100 : cp - (cp * pct) / 100;
    const other = kind === 'profit' ? cp - (cp * pct) / 100 : cp + (cp * pct) / 100;
    const { options, answer } = shuffleOptions(sp, [other, cp, sp + 10]);
    yield {
      difficulty: 0.3,
      estimatedSeconds: 45,
      question: `At what price should an article costing ₹${cp} be sold to gain a ${pct}% ${kind}?`,
      options,
      answer,
      explanation: `${pct}% of ₹${cp} is ₹${(cp * pct) / 100}. ${kind === 'profit' ? 'Adding' : 'Subtracting'} that ${kind === 'profit' ? 'to' : 'from'} the cost price gives ₹${sp}.`,
      trap: `₹${other} applies the percentage in the opposite direction — re-check whether the question asks for a profit or a loss before adding or subtracting.`,
    };
  }
}

function* average() {
  const sets = [
    [12, 18, 24, 30, 36], [15, 22, 19, 28], [8, 14, 20, 26, 32, 38], [45, 52, 38, 61], [10, 20, 30, 40, 50, 60],
  ];
  for (const nums of sets) {
    const sum = nums.reduce((a, b) => a + b, 0);
    const avg = Math.round((sum / nums.length) * 100) / 100;
    const { options, answer } = shuffleOptions(avg, [avg + 2, avg - 2, Math.max(...nums)]);
    yield {
      difficulty: 0.25,
      estimatedSeconds: 40,
      question: `Find the average of: ${nums.join(', ')}.`,
      options,
      answer,
      explanation: `Average = sum of all values ÷ count = ${sum} ÷ ${nums.length} = ${avg}.`,
      trap: `Forgetting to divide by the count after adding (just stating the sum) is the most common slip here.`,
    };
  }

  const groupCases = [
    [20, 30, 25, 40], [15, 28, 20, 35], [25, 32, 30, 45], [18, 24, 22, 38],
  ];
  for (const [n1, avg1, n2, avg2] of groupCases) {
    const total = n1 * avg1 + n2 * avg2;
    const combinedAvg = Math.round((total / (n1 + n2)) * 100) / 100;
    const { options, answer } = shuffleOptions(combinedAvg, [Math.round((avg1 + avg2) / 2), combinedAvg + 1, combinedAvg - 1]);
    yield {
      difficulty: 0.35,
      estimatedSeconds: 50,
      question: `The average of ${n1} numbers is ${avg1}, and the average of another ${n2} numbers is ${avg2}. What is the average of all of them together?`,
      options,
      answer,
      explanation: `Total of first group = ${n1} × ${avg1} = ${n1 * avg1}. Total of second group = ${n2} × ${avg2} = ${n2 * avg2}. Combined average = (${n1 * avg1} + ${n2 * avg2}) ÷ (${n1} + ${n2}) = ${combinedAvg}.`,
      trap: `Simply averaging the two averages (ignoring that the groups are different sizes) only works when both groups have the same count.`,
    };
  }
}

function* speedTimeDistance() {
  const cases = [
    [60, 3], [45, 4], [80, 2.5], [36, 5], [72, 1.5], [90, 4], [54, 6], [100, 3.5],
  ];
  for (const [speed, time] of cases) {
    const distance = speed * time;
    const { options, answer } = shuffleOptions(distance, [speed + time, distance + speed, distance - time]);
    yield {
      difficulty: 0.25,
      estimatedSeconds: 35,
      question: `A car travels at ${speed} km/h for ${time} hours. How far does it travel?`,
      options,
      answer,
      explanation: `Distance = Speed × Time = ${speed} × ${time} = ${distance} km.`,
      trap: `Adding speed and time instead of multiplying them is a simple but common slip under time pressure.`,
    };
  }

  const convCases = [36, 54, 72, 90, 108, 126];
  for (const kmh of convCases) {
    const ms = Math.round((kmh * 5) / 18 * 100) / 100;
    const { options, answer } = shuffleOptions(ms, [Math.round((kmh * 18) / 5 * 100) / 100, kmh, ms + 1]);
    yield {
      difficulty: 0.3,
      estimatedSeconds: 40,
      question: `Convert ${kmh} km/h to m/s.`,
      options,
      answer,
      explanation: `To convert km/h to m/s, multiply by 5/18: ${kmh} × 5/18 = ${ms} m/s.`,
      trap: `Multiplying by 18/5 instead of 5/18 inverts the conversion — that direction is for m/s to km/h instead.`,
    };
  }

  const meetCases = [
    [240, 60, 40], [360, 80, 70], [300, 50, 55],
  ];
  for (const [gap, s1, s2] of meetCases) {
    const time = Math.round((gap / (s1 + s2)) * 100) / 100;
    const { options, answer } = shuffleOptions(time, [Math.round((gap / (s1 - s2)) * 100) / 100, time + 1, time - 1].filter((d) => d > 0 && d !== time));
    yield {
      difficulty: 0.4,
      estimatedSeconds: 55,
      question: `Two towns are ${gap} km apart. A train leaves each town at the same time, travelling towards each other at ${s1} km/h and ${s2} km/h. After how many hours do they meet?`,
      options,
      answer,
      explanation: `Travelling towards each other, their speeds add: combined speed = ${s1} + ${s2} = ${s1 + s2} km/h. Time to meet = distance ÷ combined speed = ${gap} ÷ ${s1 + s2} = ${time} hours.`,
      trap: `Subtracting the speeds instead of adding them is the formula for one train catching up to another moving the same direction, not two moving towards each other.`,
    };
  }
}

function* ages() {
  const cases = [
    [3, 1, 20], [5, 2, 15], [4, 3, 10], [7, 4, 18], [2, 1, 25], [5, 3, 12],
  ];
  for (const [ratioA, ratioB, sumYearsAgo] of cases) {
    // Present ages are in ratio ratioA:ratioB, and x years ago their ages
    // summed to sumYearsAgo more than a base, kept simple as a present-sum problem.
    const unit = 4;
    const presentA = ratioA * unit;
    const presentB = ratioB * unit;
    const sum = presentA + presentB;
    const { options, answer } = shuffleOptions(presentA, [presentB, presentA + unit, presentA - unit].filter((d) => d > 0));
    yield {
      difficulty: 0.35,
      estimatedSeconds: 50,
      question: `The ages of two friends are in the ratio ${ratioA}:${ratioB}, and the sum of their ages is ${sum} years. What is the age of the elder friend?`,
      options,
      answer,
      explanation: `Total ratio parts = ${ratioA} + ${ratioB} = ${ratioA + ratioB}. One part = ${sum} ÷ ${ratioA + ratioB} = ${unit} years. The elder friend's age = ${Math.max(ratioA, ratioB)} × ${unit} = ${Math.max(presentA, presentB)}.`,
      trap: `Picking the smaller share instead of the elder friend's share answers a different question than the one asked.`,
    };
  }

  const futureCases = [
    [8, 5], [12, 6], [20, 10], [15, 5], [24, 8],
  ];
  for (const [presentAge, yearsAhead] of futureCases) {
    const future = presentAge + yearsAhead;
    const { options, answer } = shuffleOptions(future, [presentAge - yearsAhead, presentAge, future + 2].filter((d) => d > 0));
    yield {
      difficulty: 0.2,
      estimatedSeconds: 30,
      question: `A person is ${presentAge} years old today. How old will they be in ${yearsAhead} years?`,
      options,
      answer,
      explanation: `Future age = present age + years ahead = ${presentAge} + ${yearsAhead} = ${future}.`,
      trap: `Subtracting instead of adding gives a past age, not a future one — check which direction in time the question is asking about.`,
    };
  }
}

function* numberSeries() {
  const arithmetic = [
    [3, 4], [5, 3], [7, 5], [2, 6], [10, 7], [8, 9], [15, 4], [6, 8],
  ];
  for (const [start, step] of arithmetic) {
    const seq = [start, start + step, start + 2 * step, start + 3 * step];
    const next = start + 4 * step;
    const { options, answer } = shuffleOptions(next, [next + step, next - step, next + 1]);
    yield {
      difficulty: 0.2,
      estimatedSeconds: 30,
      question: `Find the next number: ${seq.join(', ')}, ?`,
      options,
      answer,
      explanation: `Each term increases by ${step}: ${seq[seq.length - 1]} + ${step} = ${next}.`,
      trap: `Breaking the constant-difference pattern by one step is the most common slip in arithmetic series.`,
    };
  }

  const geometric = [
    [2, 2], [3, 3], [1, 5], [4, 2], [2, 3], [5, 2],
  ];
  for (const [start, ratio] of geometric) {
    const seq = [start, start * ratio, start * ratio ** 2, start * ratio ** 3];
    const next = start * ratio ** 4;
    const { options, answer } = shuffleOptions(next, [next + start, Math.round(next / ratio) * 2, next - seq[3]]);
    yield {
      difficulty: 0.3,
      estimatedSeconds: 40,
      question: `Find the next number: ${seq.join(', ')}, ?`,
      options,
      answer,
      explanation: `Each term is multiplied by ${ratio}: ${seq[seq.length - 1]} × ${ratio} = ${next}.`,
      trap: `Treating a multiplying (geometric) series as if it were an adding (arithmetic) one gives the wrong next term.`,
    };
  }

  const squares = [1, 2, 3, 4, 5];
  for (const startAt of [1, 2, 3]) {
    const seq = squares.slice(0, 4).map((n) => (n + startAt - 1) ** 2);
    const next = (4 + startAt) ** 2;
    const { options, answer } = shuffleOptions(next, [next - 2 * (4 + startAt) + 1, next + 1, next - 1]);
    yield {
      difficulty: 0.35,
      estimatedSeconds: 45,
      question: `Find the next number: ${seq.join(', ')}, ?`,
      options,
      answer,
      explanation: `These are consecutive perfect squares: ${seq.map((s, i) => `${i + startAt}² = ${s}`).join(', ')}. The next is ${4 + startAt}² = ${next}.`,
      trap: `Looking for a constant difference won't work here — the gaps between square numbers grow, they don't stay fixed.`,
    };
  }
}

function* alphaNumeric() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const posCases = [3, 7, 12, 15, 19, 22, 5, 9];
  for (const pos of posCases) {
    const letter = letters[pos - 1];
    const { options, answer } = shuffleOptions(pos, [pos + 1, pos - 1, 26 - pos + 1]);
    yield {
      difficulty: 0.15,
      estimatedSeconds: 25,
      question: `If A=1, B=2, C=3, ... Z=26, what number represents the letter ${letter}?`,
      options,
      answer,
      explanation: `${letter} is the ${pos}th letter of the alphabet.`,
      trap: `Being off by one when counting letter positions quickly is the single most common error here.`,
    };
  }

  // ['E', 5] is deliberately excluded -- it's word-for-word the hand-authored
  // alpha-numeric-002 question already in the file.
  const shiftCases = [['K', 4], ['Q', 6], ['H', 8], ['M', 3], ['B', 10], ['F', 7]];
  for (const [letter, shift] of shiftCases) {
    const startPos = letters.indexOf(letter) + 1;
    const nextPos = startPos + shift;
    if (nextPos > 26) continue;
    const next = letters[nextPos - 1];
    const { options, answer } = shuffleOptions(next, [letters[nextPos - 2], letters[nextPos], letters[(nextPos + 1) % 26]]);
    yield {
      difficulty: 0.2,
      estimatedSeconds: 30,
      question: `What letter is ${shift} positions after ${letter} in the alphabet?`,
      options,
      answer,
      explanation: `${letter} is position ${startPos}. Adding ${shift} gives position ${nextPos}, which is ${next}.`,
      trap: `Counting ${letter} itself as the first step (instead of the first step after it) lands one letter short.`,
    };
  }

  const wordCode = [
    ['CAT', 2], ['DOG', 3], ['SUN', 1], ['PEN', 4], ['BIRD', 2], ['FISH', 3],
  ];
  for (const [word, shift] of wordCode) {
    const coded = word
      .split('')
      .map((ch) => letters[(letters.indexOf(ch) + shift) % 26])
      .join('');
    const decoyShiftUp = word
      .split('')
      .map((ch) => letters[(letters.indexOf(ch) + shift + 1) % 26])
      .join('');
    const decoyShiftDown = word
      .split('')
      .map((ch) => letters[(letters.indexOf(ch) + shift - 1 + 26) % 26])
      .join('');
    const decoyShiftUp2 = word
      .split('')
      .map((ch) => letters[(letters.indexOf(ch) + shift + 2) % 26])
      .join('');
    const { options, answer } = shuffleOptions(coded, [decoyShiftUp, decoyShiftDown, word, decoyShiftUp2]);
    yield {
      difficulty: 0.3,
      estimatedSeconds: 40,
      question: `If every letter in a word is shifted forward by ${shift} position${shift === 1 ? '' : 's'} in the alphabet, how is "${word}" coded?`,
      options,
      answer,
      explanation: `Shift each letter of ${word} forward by ${shift}: ${word.split('').map((ch, i) => `${ch}→${coded[i]}`).join(', ')}, giving "${coded}".`,
      trap: `Shifting by one position too many or too few gives a coded word that looks plausible but is wrong letter-by-letter.`,
    };
  }
}

// ------------------------------------------------------------------- driver

const TOPICS = [
  { file: 'aptitude/whole-numbers.yaml', prefix: 'whole-numbers', gen: wholeNumbers },
  { file: 'aptitude/division.yaml', prefix: 'division', gen: division },
  { file: 'aptitude/decimals.yaml', prefix: 'decimals', gen: decimals },
  { file: 'aptitude/simplification.yaml', prefix: 'simplification', gen: simplification },
  { file: 'aptitude/percentage.yaml', prefix: 'percentage', gen: percentage },
  { file: 'aptitude/hcf.yaml', prefix: 'hcf', gen: () => hcfLcm('hcf') },
  { file: 'aptitude/lcm.yaml', prefix: 'lcm', gen: () => hcfLcm('lcm') },
  { file: 'aptitude/ratio-and-proportion.yaml', prefix: 'ratio-and-proportion', gen: ratioProportion },
  { file: 'aptitude/simple-interest.yaml', prefix: 'simple-interest', gen: () => interest('simple-interest') },
  { file: 'aptitude/compound-interest.yaml', prefix: 'compound-interest', gen: () => interest('compound-interest') },
  { file: 'aptitude/area.yaml', prefix: 'area', gen: area },
  { file: 'aptitude/volume.yaml', prefix: 'volume', gen: volume },
  { file: 'aptitude/time-and-work.yaml', prefix: 'time-and-work', gen: timeWork },
  { file: 'aptitude/profit-and-loss.yaml', prefix: 'profit-and-loss', gen: profitLoss },
  { file: 'aptitude/average.yaml', prefix: 'average', gen: average },
  { file: 'aptitude/speed-time-distance.yaml', prefix: 'speed-time-distance', gen: speedTimeDistance },
  { file: 'aptitude/ages.yaml', prefix: 'ages', gen: ages },
  { file: 'reasoning/number-series.yaml', prefix: 'number-series', gen: numberSeries },
  { file: 'reasoning/alpha-numeric.yaml', prefix: 'alpha-numeric', gen: alphaNumeric },
];

let totalAdded = 0;
for (const { file, prefix, gen } of TOPICS) {
  const fullPath = path.join(QDIR, file);
  let start = await nextId(fullPath, prefix);
  const items = [];
  for (const raw of gen()) {
    start += 1;
    items.push({ id: `${prefix}-${String(start).padStart(3, '0')}`, ...raw });
  }
  await appendItems(fullPath, items);
  console.log(`${file}: +${items.length}`);
  totalAdded += items.length;
}
console.log(`\ntotal questions added: ${totalAdded}`);
