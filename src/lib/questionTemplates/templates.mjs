import { randInt, pick, placeAnswer } from './rng.mjs';

// Each template is a pure function (rng) -> question fields. The solver
// computes the correct answer directly from the generated parameters, so
// there is no step where an AI "decides" the answer -- distractors are
// built from genuine wrong-method formulas (the same mistakes real
// students make), which doubles as the question's `commonMistake` field
// instead of being random noise around the right number.

function round2(n) {
  return Math.round(n * 100) / 100;
}

function money(n) {
  return `₹${Number.isInteger(n) ? n : round2(n)}`;
}

const percentageOf = {
  topicId: 'aptitude.percentage',
  subtopic: 'percentage-of-a-number',
  questionType: 'calculation',
  skillsRequired: ['percentage', 'multiplication'],
  generate(rng) {
    const base = pick(rng, [50, 80, 120, 150, 160, 200, 240, 250, 300, 400, 500, 600, 800]);
    const pct = pick(rng, [5, 10, 15, 20, 25, 30, 40, 50, 60, 75]);
    const correct = round2((pct / 100) * base);

    // Common mistakes: dividing by the wrong number, or computing
    // (base/pct) instead of (pct/100)*base.
    const wrongDivide = round2(base / pct);
    const wrongAdd = round2(base + pct);
    const wrongHalf = round2(correct / 2);

    const { options, answerIndex } = placeAnswer(rng, String(correct), [
      String(wrongDivide),
      String(wrongAdd),
      String(wrongHalf),
    ]);

    return {
      prompt: `What is ${pct}% of ${base}?`,
      options,
      answerIndex,
      explanation: `${pct}% of ${base} = (${pct}/100) × ${base} = ${correct}.`,
      shortcut: pct % 10 === 0 ? `${pct}% is ${pct / 10} tenths -- ${pct / 10} × ${base / 10} is the fast route.` : null,
      commonMistake: `Dividing ${base} by ${pct} instead of multiplying by ${pct}/100 gives ${wrongDivide}, a common slip.`,
      difficulty: 0.2,
      estimatedSeconds: 30,
    };
  },
};

const percentageChange = {
  topicId: 'aptitude.percentage',
  subtopic: 'percentage-increase-decrease',
  questionType: 'application',
  skillsRequired: ['percentage', 'multiplication'],
  generate(rng) {
    const base = pick(rng, [200, 250, 300, 400, 500, 600, 800, 1000, 1200]);
    const pct = pick(rng, [5, 10, 15, 20, 25, 30, 40, 50]);
    const direction = pick(rng, ['increase', 'decrease']);
    const factor = direction === 'increase' ? 1 + pct / 100 : 1 - pct / 100;
    const correct = round2(base * factor);

    // The classic error: applying the percentage to the NEW value instead
    // of the original, or getting the direction backwards.
    const wrongDirection = round2(base * (direction === 'increase' ? 1 - pct / 100 : 1 + pct / 100));
    const wrongOnlyChange = round2(base * (pct / 100));

    const { options, answerIndex } = placeAnswer(rng, String(correct), [
      String(wrongDirection),
      String(wrongOnlyChange),
      String(round2(correct + pct)),
    ]);

    return {
      prompt: `A value of ${base} is ${direction}d by ${pct}%. Find the new value.`,
      options,
      answerIndex,
      explanation: `${direction === 'increase' ? 'Increasing' : 'Decreasing'} ${base} by ${pct}% = ${base} × ${direction === 'increase' ? `(1 + ${pct}/100)` : `(1 - ${pct}/100)`} = ${correct}.`,
      shortcut: null,
      commonMistake: `Applying the ${pct}% the wrong direction gives ${wrongDirection} -- always re-read whether it's an increase or a decrease before picking the sign.`,
      difficulty: 0.35,
      estimatedSeconds: 40,
    };
  },
};

const profitLoss = {
  topicId: 'aptitude.profit-and-loss',
  subtopic: 'profit-percent',
  questionType: 'application',
  skillsRequired: ['percentage', 'profit-loss'],
  generate(rng) {
    const cp = pick(rng, [200, 250, 300, 400, 500, 600, 750, 800, 1000, 1200]);
    const pct = pick(rng, [5, 8, 10, 12, 15, 20, 25]);
    const isProfit = pick(rng, [true, false]);
    const sp = isProfit ? round2(cp * (1 + pct / 100)) : round2(cp * (1 - pct / 100));

    // Wrong-base mistake: computing the percentage on SP instead of CP.
    const wrongBase = isProfit ? round2(sp * (1 + pct / 100)) : round2(sp * (1 - pct / 100));

    const { options, answerIndex } = placeAnswer(rng, money(sp), [
      money(wrongBase),
      money(round2(cp + pct)),
      money(round2(cp - (isProfit ? -pct : pct))),
    ]);

    return {
      prompt: `A shopkeeper buys an article for ${money(cp)} and sells it at a ${pct}% ${isProfit ? 'profit' : 'loss'}. Find the selling price.`,
      options,
      answerIndex,
      explanation: `SP = CP × (1 ${isProfit ? '+' : '-'} ${pct}/100) = ${money(cp)} × ${isProfit ? 1 + pct / 100 : 1 - pct / 100} = ${money(sp)}.`,
      shortcut: `Profit/loss % is always on the cost price (CP), never the selling price.`,
      commonMistake: `Calculating ${pct}% of the selling price instead of the cost price gives ${money(wrongBase)} -- the percentage always applies to CP.`,
      difficulty: 0.4,
      estimatedSeconds: 50,
    };
  },
};

const simpleInterest = {
  topicId: 'aptitude.simple-interest',
  subtopic: 'si-basic',
  questionType: 'calculation',
  skillsRequired: ['percentage', 'simple-interest'],
  generate(rng) {
    const principal = pick(rng, [1000, 2000, 4000, 5000, 8000, 10000, 12000, 15000, 20000]);
    const rate = pick(rng, [4, 5, 6, 8, 10, 12]);
    const time = randInt(rng, 2, 5);
    const si = round2((principal * rate * time) / 100);

    // Common mistake: forgetting to divide by 100, or using the wrong time.
    const wrongNoHundred = round2(principal * rate * time);
    const wrongTime = round2((principal * rate * (time + 1)) / 100);

    const { options, answerIndex } = placeAnswer(rng, money(si), [
      money(wrongTime),
      money(round2(si / time)),
      money(round2(si * 2)),
    ]);

    return {
      prompt: `Find the simple interest on ${money(principal)} at ${rate}% per annum for ${time} years.`,
      options,
      answerIndex,
      explanation: `SI = (P × R × T) / 100 = (${principal} × ${rate} × ${time}) / 100 = ${money(si)}.`,
      shortcut: `SI grows linearly with time -- SI for 1 year × ${time} also gets you there.`,
      commonMistake: `Using the wrong number of years (e.g. ${time + 1} instead of ${time}) gives ${money(wrongTime)} -- always re-check T against the question.`,
      difficulty: 0.3,
      estimatedSeconds: 45,
    };
  },
};

const compoundInterest = {
  topicId: 'aptitude.compound-interest',
  subtopic: 'ci-basic',
  questionType: 'calculation',
  skillsRequired: ['percentage', 'compound-interest', 'exponents'],
  generate(rng) {
    const principal = pick(rng, [1000, 2000, 4000, 5000, 10000]);
    const rate = pick(rng, [5, 10, 20]);
    const time = randInt(rng, 2, 3);
    const amount = round2(principal * (1 + rate / 100) ** time);
    const ci = round2(amount - principal);

    // Common mistake: computing simple interest instead of compound.
    const wrongSimple = round2((principal * rate * time) / 100);

    const { options, answerIndex } = placeAnswer(rng, money(ci), [
      money(wrongSimple),
      money(round2(ci + rate)),
      money(round2(ci - rate)),
    ]);

    return {
      prompt: `Find the compound interest on ${money(principal)} at ${rate}% per annum for ${time} years, compounded annually.`,
      options,
      answerIndex,
      explanation: `Amount = P(1 + R/100)^T = ${principal} × (1 + ${rate}/100)^${time} = ${money(amount)}. CI = Amount - P = ${money(ci)}.`,
      shortcut: time === 2 ? `For 2 years: CI = P × [2R + R²/100] / 100.` : null,
      commonMistake: `Using the simple-interest formula instead of compounding gives ${money(wrongSimple)} -- CI grows on the previous year's amount, not just the principal.`,
      difficulty: 0.55,
      estimatedSeconds: 60,
    };
  },
};

const ratioShare = {
  topicId: 'aptitude.ratio-and-proportion',
  subtopic: 'dividing-in-a-ratio',
  questionType: 'application',
  skillsRequired: ['ratio', 'division'],
  generate(rng) {
    const a = randInt(rng, 2, 7);
    const b = randInt(rng, 2, 7);
    const unit = pick(rng, [100, 150, 200, 250, 300]);
    const total = (a + b) * unit;
    const shareA = a * unit;

    const wrongHalf = round2(total / 2);
    const wrongSwap = b * unit;

    const { options, answerIndex } = placeAnswer(rng, money(shareA), [
      money(wrongSwap),
      money(wrongHalf),
      money(round2(shareA + unit)),
    ]);

    return {
      prompt: `${money(total)} is divided between two people in the ratio ${a}:${b}. Find the first person's share.`,
      options,
      answerIndex,
      explanation: `Total parts = ${a} + ${b} = ${a + b}. One part = ${total} / ${a + b} = ${unit}. First share = ${a} × ${unit} = ${money(shareA)}.`,
      shortcut: null,
      commonMistake: `Swapping which share goes with which number in the ratio gives ${money(wrongSwap)} -- the first-named person always gets the first-named part.`,
      difficulty: 0.3,
      estimatedSeconds: 40,
    };
  },
};

const averageBasic = {
  topicId: 'aptitude.average',
  subtopic: 'simple-average',
  questionType: 'calculation',
  skillsRequired: ['average', 'addition'],
  generate(rng) {
    const count = randInt(rng, 3, 6);
    const values = Array.from({ length: count }, () => randInt(rng, 10, 100));
    const sum = values.reduce((s, v) => s + v, 0);
    const avg = round2(sum / count);

    const wrongCount = round2(sum / (count - 1));
    const wrongSum = round2((sum + 10) / count);

    const { options, answerIndex } = placeAnswer(rng, String(avg), [
      String(wrongCount),
      String(wrongSum),
      String(round2(avg + 5)),
    ]);

    return {
      prompt: `Find the average of: ${values.join(', ')}.`,
      options,
      answerIndex,
      explanation: `Average = sum / count = ${sum} / ${count} = ${avg}.`,
      shortcut: null,
      commonMistake: `Dividing by the wrong count (e.g. ${count - 1} instead of ${count}) gives ${wrongCount} -- always recount the list before dividing.`,
      difficulty: 0.2,
      estimatedSeconds: 35,
    };
  },
};

const timeWork = {
  topicId: 'aptitude.time-and-work',
  subtopic: 'combined-work',
  questionType: 'application',
  skillsRequired: ['time-and-work', 'fractions', 'lcm'],
  generate(rng) {
    const daysA = pick(rng, [10, 12, 15, 20, 24, 30]);
    const daysB = pick(rng, [10, 12, 15, 20, 24, 30]);
    // Together-days = (A*B)/(A+B), rounded to 2dp -- not every pair gives a
    // clean integer, and that's fine, the explanation still works exactly.
    const together = round2((daysA * daysB) / (daysA + daysB));

    const wrongAverage = round2((daysA + daysB) / 2);
    const wrongSum = daysA + daysB;

    const { options, answerIndex } = placeAnswer(rng, `${together} days`, [
      `${wrongAverage} days`,
      `${wrongSum} days`,
      `${round2(together + 1)} days`,
    ]);

    return {
      prompt: `A can finish a work in ${daysA} days and B can finish it in ${daysB} days. Working together, how long will they take?`,
      options,
      answerIndex,
      explanation: `Combined rate = 1/${daysA} + 1/${daysB} per day. Together time = (${daysA} × ${daysB}) / (${daysA} + ${daysB}) = ${together} days.`,
      shortcut: `Together-days = product / sum of the two individual days -- memorize this form, it saves re-deriving the fraction every time.`,
      commonMistake: `Averaging the two times gives ${wrongAverage} days -- work rates add, not the day-counts themselves.`,
      difficulty: 0.5,
      estimatedSeconds: 55,
    };
  },
};

export const TEMPLATES = {
  'percentage-of-a-number': percentageOf,
  'percentage-change': percentageChange,
  'profit-loss-sp': profitLoss,
  'simple-interest-basic': simpleInterest,
  'compound-interest-basic': compoundInterest,
  'ratio-share': ratioShare,
  'average-basic': averageBasic,
  'time-work-combined': timeWork,
};
