// Static mock data for the NOVA prototype. No API calls, nothing persists.

export const learner = {
  name: 'Yash',
  exam: 'TNPSC Group 2 · CCSE-II',
  since: '1 September',
  streak: 12,
  longestStreak: 14,
  level: 12,
  xp: 1420,
  totalLearning: '31h',
  questionsSolved: 1284,
  topicsMastered: 9,
  pyqsCompleted: 148,
  testsCompleted: 4,
};

export const subjects = [
  { slug: 'mathematics', name: 'Mathematics', topics: 19, mastered: 4, revisionDue: 2, mastery: 68, status: 'learning', continueLabel: 'Continue Fractions' },
  { slug: 'aptitude', name: 'Aptitude & Mental Ability', topics: 14, mastered: 2, mastery: 41, status: 'improving' },
  { slug: 'general-tamil', name: 'General Tamil', topics: 22, mastered: 9, mastery: 74, status: 'near-mastery' },
  { slug: 'science', name: 'Science', topics: 18, mastered: 5, revisionDue: 1, mastery: 61, status: 'revision-due' },
  { slug: 'polity', name: 'Polity', topics: 16, mastered: 2, mastery: 48, status: 'practising' },
  { slug: 'history', name: 'History', topics: 20, mastered: 3, mastery: 35, status: 'learning' },
  { slug: 'geography', name: 'Geography', topics: 15, mastered: 1, mastery: 12, status: 'not-started' },
  { slug: 'economics', name: 'Economics', topics: 12, mastered: 0, mastery: 0, status: 'not-started' },
  { slug: 'general-studies', name: 'General Studies', topics: 24, mastered: 6, mastery: 57, status: 'retained' },
  { slug: 'current-affairs', name: 'Current Affairs', topics: null, mastery: 29, status: 'practising', note: 'Updated weekly · 8 new this week' },
];

export const mathematicsPath = [
  { n: 1, slug: 'number-system', name: 'Number System', state: 'mastered', note: 'Mastered · retained at 30 days' },
  { n: 2, slug: 'basic-operations', name: 'Basic Operations', state: 'mastered', note: 'Mastered' },
  { n: 3, slug: 'bodmas', name: 'BODMAS', state: 'mastered', note: 'Mastered' },
  { n: 4, slug: 'factors-multiples', name: 'Factors & Multiples', state: 'mastered', note: 'Mastered' },
  { n: 5, slug: 'hcf-lcm', name: 'HCF and LCM', state: 'revision-due', note: 'Revision due · Memory Echo ready' },
  { n: 6, slug: 'fractions', name: 'Fractions', state: 'in-progress', note: 'In progress · 72% · lesson 3 of 8' },
  { n: 7, slug: 'decimals', name: 'Decimals', state: 'locked', note: 'Opens when Fractions reaches 80%' },
  { n: 8, slug: 'percentages', name: 'Percentages', state: 'locked', note: 'Needs Fractions and Decimals' },
];

export const stillAhead = ['Average', 'Profit & Loss', 'Simple Interest', 'Compound Interest', 'Time & Work', 'Time & Distance', 'Problems on Ages', 'Data Interpretation'];

export const fractionsTopic = {
  name: 'Fractions',
  status: 'Near mastery · 72%',
  lesson: 'Lesson 3 of 8',
  mastery: 72,
  dimensions: [
    { label: 'Concept understanding', value: 84 },
    { label: 'Accuracy', value: 81 },
    { label: 'Speed', value: 63, weak: true },
    { label: 'Retention', value: 72 },
    { label: 'Consistency', value: 88 },
  ],
  restsOn: [
    { name: 'Division', done: true },
    { name: 'Factors & Multiples', done: true },
    { name: 'HCF and LCM', done: false, note: 'needs a review' },
  ],
  reviewStops: [
    { label: 'Learned', date: '4 Oct', done: true },
    { label: '1 day', done: true },
    { label: '3 days', done: true },
    { label: '7 days', current: true, note: 'in 3 days' },
    { label: '14 days', done: false },
    { label: '30 days', done: false },
  ],
};

export const practiceQuestion = {
  topic: 'Percentage',
  index: 4,
  total: 10,
  difficulty: 'Easy',
  time: '00:18',
  question: 'What is 25% of 200?',
  options: [
    { letter: 'A', text: '25' },
    { letter: 'B', text: '40' },
    { letter: 'C', text: '50' },
    { letter: 'D', text: '75' },
  ],
  correct: 'C',
  steps: [
    { label: 'Per cent just means "out of a hundred".', math: '25% = 25/100' },
    { label: 'Of means multiply.', math: '25/100 × 200' },
    { label: 'Simplify before multiplying.', math: '1/4 × 200 = 50' },
  ],
  answer: '50',
};

export const revisionDue = [
  { name: 'Percentage', badge: 'Third review', progress: 74, note: 'Last studied 6 days ago. Retention is predicted to drop below 70% in about two days.' },
  { name: 'Indian Constitution', badge: 'Second review', progress: 58, note: 'Last studied 12 days ago. Two articles were missed on the previous attempt.' },
  { name: 'HCF and LCM', badge: 'Memory Echo', progress: 41, note: 'Three weeks untouched, and it sits underneath Fractions.', highlight: true },
];

export const comingUp = [
  { name: 'Fractions', when: 'in 3 days · 7-day checkpoint' },
  { name: 'BODMAS', when: 'in 5 days · 30-day checkpoint' },
  { name: 'Tamil grammar · case endings', when: 'in 6 days · 14-day checkpoint' },
];

export const mistakes = [
  {
    tag: 'Conceptual',
    topic: 'Percentage',
    seen: 'Seen 3 times',
    question: 'A shirt costs ₹800 after a 20% discount. What was the original price?',
    you: '₹960',
    answer: '₹1,000',
    where: 'You added 20% to ₹800. But the discount was taken off the original price, not off ₹800 — so ₹800 is the 80%, and you divide rather than multiply. ₹800 ÷ 0.8 = ₹1,000.',
    mistakeType: 'Reversed the base',
    restsOn: 'Percentage of a whole',
    lastAttempt: '9 October',
    nextReview: 'Today',
  },
  { tag: 'Calculation', topic: 'Time & Work', question: 'If 3 workers finish a wall in 12 days, how long do 4 take?', meta: 'seen twice · next review in 2 days' },
  { tag: 'Calculation', topic: 'Fractions', question: 'Simplify 18/24 to its lowest terms', meta: 'seen once · next review in 4 days' },
  { tag: 'Misread', topic: 'Polity', question: 'Which article of the Constitution covers the right to equality?', meta: 'seen twice · due today' },
  { tag: 'Time', topic: 'Average', question: 'Find the average of the first ten odd numbers', meta: 'ran out of time · seen once · next review in 6 days' },
];

export const quickLabModes = [
  { slug: 'quick-math', name: 'Quick Math', desc: 'Addition, subtraction, multiplication and division rushes. Ten modes, one tap each.', stat: 'Best 41 correct · 6.2s average' },
  { slug: 'number-rush', name: 'Number Rush', desc: 'Timed number challenges that climb in difficulty while your combo holds.', stat: 'Best combo 34 · personal record' },
  { slug: 'percentage-rush', name: 'Percentage Rush', desc: 'Of, increase, decrease, and reverse. The four shapes TNPSC keeps asking for.', stat: 'Best 92% · recommended today', recommended: true },
  { slug: 'fraction-lab', name: 'Fraction Lab', desc: 'Compare, simplify, convert. Shown as shapes first, numbers second.', stat: 'New · no score yet' },
  { slug: 'memory-math', name: 'Memory Math', desc: 'Hold four numbers in your head, then answer. Trains working memory, not arithmetic.', stat: 'Best span 6 digits' },
  { slug: 'formula-match', name: 'Formula Match', desc: 'Formula to concept to worked example. Covers maths, science, polity and economics.', stat: 'Best 18 of 20' },
  { slug: 'missing-number', name: 'Missing Number', desc: 'Find the pattern, complete the sequence. Difficulty follows your hit rate.', stat: 'Best streak 12' },
];

export const quickLabRound = {
  mode: 'Percentage Rush',
  level: 3,
  combo: 5,
  timeLeft: '0:47',
  question: '15% of 240',
  hint: 'Answered in 4.1s last time you saw this shape',
  options: ['30', '36', '42', '48'],
  prev: { label: '25% of 160 → 40', time: '3.2 seconds · fastest' },
};

export const quickLabResult = {
  title: 'Faster than last time',
  subtitle: 'Your average answer came down from 8.4 to 5.6 seconds, with accuracy holding.',
  stats: [
    { label: 'accuracy', value: '92%' },
    { label: 'average answer', value: '5.6s' },
    { label: 'fastest', value: '3.2s' },
    { label: 'best combo', value: '×7' },
    { label: 'XP', value: '+40' },
  ],
  rounds: [
    { label: '25% of 160', time: '3.2s · fastest', correct: true },
    { label: '15% of 240', time: '4.8s', correct: true },
    { label: '840 is 60% of what?', time: '9.1s · the reverse shape again', correct: false },
    { label: '20% increase from 400', time: '6.0s', correct: true },
  ],
};

export const pyqStats = { attempted: 148, correct: 99, incorrect: 49, accuracy: '67%', avgTime: '71s' };

export const pyqByTopic = [
  { topic: 'Percentage', value: 88 },
  { topic: 'Number System', value: 81 },
  { topic: 'Fractions', value: 70 },
  { topic: 'Average', value: 64 },
  { topic: 'Ratio', value: 52 },
  { topic: 'Time & Work', value: 44 },
  { topic: 'Profit & Loss', value: 31 },
];

export const pyqQuestion = {
  exam: 'TNPSC Group 2 · 2024',
  ref: 'Paper I · Question 63',
  difficulty: 'Moderate',
  repeat: 'Asked again in 2019',
  index: 7,
  total: 34,
  question: 'A tank is 3/5 full. After 30 litres are drawn out, it is 1/3 full. What is the capacity of the tank?',
  options: [
    { letter: 'A', text: '90 litres' },
    { letter: 'B', text: '100 litres', chosen: true },
    { letter: 'C', text: '112.5 litres', correct: true },
    { letter: 'D', text: '125 litres' },
  ],
  steps: [
    { label: 'The 30 litres is the difference between the two fractions.', math: '3/5 − 1/3' },
    { label: 'Common denominator first — this is the step that was skipped.', math: '9/15 − 5/15 = 4/15' },
    { label: 'So 4/15 of the tank is 30 litres.', math: '30 ÷ 4/15 = 30 × 15/4 = 112.5' },
  ],
};

export const tests = {
  weekly: { week: 3, questions: 50, minutes: 60, sections: ['Mathematics 20', 'General Tamil 15', 'Science 15'] },
  options: [
    { name: 'Quick test', desc: '10 questions, 12 minutes. Good for a lunch break.', meta: 'Taken 6 times' },
    { name: 'Subject test', desc: '25 questions from one subject, exam weighting.', meta: 'Best: 19/25 Mathematics' },
    { name: 'Chapter test', desc: '15 questions on a single chapter you choose.', meta: 'Taken 4 times' },
    { name: 'Full mock', desc: 'The real thing. 100 questions, 150 minutes, no pausing.', meta: 'Not attempted yet' },
  ],
  previous: [
    { name: 'Weekly test · Week 2', date: '7 October', score: '38 / 50' },
    { name: 'Subject test · Mathematics', date: '4 October', score: '19 / 25' },
    { name: 'Weekly test · Week 1', date: '30 September', score: '31 / 50' },
    { name: 'Chapter test · Number System', date: '26 September', score: '13 / 15' },
  ],
  trend: [62, 76, 84],
};

export const testQuestion = {
  index: 7,
  total: 50,
  section: 'Mathematics',
  question: 'A sum of money doubles itself in 8 years at simple interest. In how many years will it triple?',
  options: [
    { letter: 'A', text: '12 years' },
    { letter: 'B', text: '16 years' },
    { letter: 'C', text: '20 years' },
    { letter: 'D', text: '24 years' },
  ],
  answered: 6,
  marked: 1,
  notVisited: 43,
  sections: [
    { name: 'Mathematics', range: '1-20' },
    { name: 'General Tamil', range: '21-35' },
    { name: 'Science', range: '36-50' },
  ],
};

export const testResult = {
  week: 3,
  score: 42,
  total: 50,
  accuracy: '88%',
  vsLastWeek: '+11',
  perQuestion: '42s',
  bySubject: [
    { name: 'Mathematics', score: 18, total: 20 },
    { name: 'General Tamil', score: 12, total: 15 },
    { name: 'Science', score: 12, total: 15 },
  ],
  strong: 'Number system, BODMAS, Tamil grammar, basic physics',
  needsWork: 'Percentage (reverse), ratio, one chemistry definition',
  time: { fast: 31, normal: 13, slow: 6 },
  confidence: [
    { label: 'Sure and right', value: 36 },
    { label: 'Unsure but right', value: 6 },
    { label: 'Sure but wrong', value: 5 },
    { label: 'Unsure and wrong', value: 3 },
  ],
};

export const journeyOrbit = [
  { name: 'Fractions', ring: 'learning', angle: 90 },
  { name: 'Number system', ring: 'mastered', angle: 70 },
  { name: 'Decimals', ring: 'unmet', angle: 50 },
  { name: 'Ratio', ring: 'unmet', angle: 150 },
  { name: 'Time & Work', ring: 'unmet', angle: 20 },
  { name: 'Factors', ring: 'struggling', angle: 220 },
  { name: 'BODMAS', ring: 'mastered', angle: 260 },
  { name: 'HCF / LCM', ring: 'drifting', angle: 300 },
  { name: 'Percentage', ring: 'struggling', angle: 250 },
  { name: 'Profit & Loss', ring: 'unmet', angle: 270 },
  { name: 'Interest', ring: 'unmet', angle: 190 },
];

export const knowledgeGarden = [
  { name: 'Number system', height: 90, state: 'mastered' },
  { name: 'BODMAS', height: 85, state: 'mastered' },
  { name: 'Fractions', height: 55, state: 'learning' },
  { name: 'HCF / LCM', height: 40, state: 'drifting' },
  { name: 'Percentage', height: 25, state: 'struggling' },
  { name: 'Decimals', height: 5, state: 'unmet' },
];

export const personalRecords = [
  { label: 'Longest streak', value: '14 days' },
  { label: 'Highest test score', value: '84%' },
  { label: 'Fastest correct answer', value: '3.2s' },
  { label: 'Most questions in a day', value: '68' },
  { label: 'Most improved topic', value: 'Fractions' },
  { label: 'Best retained', value: 'BODMAS' },
];

export const storySoFar = [
  { date: '1 September', title: 'Started at the beginning', note: 'Placement check put you at the number system.', color: 'muted' },
  { date: '12 September', title: 'First topic mastered — Number System', note: 'Eleven days from restart to a topic that holds at the 30-day review.', color: 'success' },
  { date: '24 September', title: 'Seven-day learning streak', note: 'Seven consecutive days of real work.', color: 'warm' },
];

export const milestones = {
  streak: { current: 12, longest: 14, freezesLeft: 2, secondary: { practice: 9, revision: 5, weekly: '5 of 6' } },
  earned: [
    { name: 'First steps', note: 'Completed your first lesson', date: '1 September' },
    { name: 'Foundation builder', note: 'Five mathematics topics mastered', date: '3 October' },
    { name: 'Consistent learner', note: 'Seven-day learning streak', date: '24 September' },
    { name: 'Strong foundation', note: 'Core arithmetic mastered and retained', date: '6 October' },
    { name: 'Test ready', note: 'Completed your first full TNPSC test', date: '7 October' },
    { name: 'PYQ explorer', note: 'First 50 previous-year questions', date: '10 October' },
  ],
  inProgress: [
    { name: 'Speed builder', note: '50 timed questions solved', progress: 74, meta: '37 of 50 · 13 to go' },
    { name: 'Memory keeper', note: '20 concepts retained at 30 days', progress: 45, meta: '9 of 20 · the slow one, by design' },
    { name: '90% test score', note: 'A weekly test at 90 or above', progress: 93, meta: 'Best so far 84% · close' },
  ],
  ahead: [
    { name: 'Mathematics foundation', note: 'All nineteen foundational topics mastered' },
    { name: 'Thirty-day streak', note: 'A month of genuine daily learning' },
    { name: 'Exam ready', note: 'A full mock paper above 70%' },
  ],
};

export const weeklyReview = {
  week: 3,
  dateRange: '8–14 October',
  minutes: 186,
  questions: 214,
  accuracy: '81%',
  mastered: 2,
  pyqs: 34,
  days: '6/6',
  improved: [
    { name: 'Fractions', from: '58%', to: '72%' },
    { name: 'Percentage speed', from: '63%', to: '71%' },
    { name: 'Test score', from: '31', to: '42 of 50' },
    { name: 'General Tamil', from: '69%', to: '74%' },
  ],
  slipped: [
    { name: 'HCF and LCM', note: 'retention 41%' },
    { name: 'Profit & Loss (PYQ)', note: '31% accuracy' },
    { name: 'Science', note: 'untouched this week' },
  ],
  nextFocus: {
    title: 'Close fractions, rescue HCF, then open percentages properly.',
    plan: [
      { range: 'Monday–Tuesday', note: 'Decimal conversion, then the fraction chapter test' },
      { range: 'Wednesday', note: 'HCF and LCM reteach — it sits under everything next' },
      { range: 'Thursday–Saturday', note: 'Percentages from the start, plus profit & loss PYQs' },
    ],
  },
};

export const notifications = [
  { group: 'Today', items: [
    { title: 'HCF and LCM is fading', note: 'One question now will tell us if it held. About 40 seconds.', time: '7:02 pm', unread: true },
    { title: 'Your session is planned', note: 'Fractions, 18 minutes. Starts where you left off.', time: '6:45 pm', unread: true },
  ]},
  { group: 'Yesterday', items: [
    { title: 'Percentage speed improved', note: 'From 63% to 71% after one Quick Lab round.', time: '8:20 pm' },
    { title: 'Weekly test unlocked', note: '50 questions, ready when you are.', time: '9:00 am' },
  ]},
  { group: 'This week', items: [
    { title: 'Milestone: Foundation builder', note: 'Five mathematics topics mastered.', time: 'Monday' },
    { title: 'Streak freeze used', note: 'Thursday was covered. One freeze left this month.', time: 'Thursday' },
  ]},
];

export const onboardingChoices = {
  exams: [
    { name: 'Group 2 · CCSE-II', note: 'Prelims and mains · graduate level' },
    { name: 'Group 2A', note: 'Non-interview posts' },
    { name: 'Group 4', note: 'SSLC level · single paper' },
    { name: 'Group 1', note: 'Prelims, mains and interview' },
  ],
};

export const placementCheck = {
  index: 4,
  total: 12,
  question: 'Which is larger: 3/4 or 0.7?',
  options: [
    { letter: 'A', text: '3/4' },
    { letter: 'B', text: '0.7' },
    { letter: 'C', text: 'They are equal' },
    { letter: 'D', text: 'Not sure yet', note: 'fine to pick' },
  ],
};

export const placementResult = {
  title: 'Start at the number system.',
  subtitle: 'Not because you need to, but because fractions will feel easy once it is solid. 30 minutes a day, evenings, Sundays off.',
  found: [
    { label: 'Number sense', value: 82 },
    { label: 'Fractions and decimals', value: 46 },
    { label: 'Percentages', value: 30 },
    { label: 'General Tamil', value: 71 },
  ],
  weeks: [
    { week: 1, note: 'Number system, operations, BODMAS' },
    { week: 2, note: 'Factors, HCF and LCM, start of fractions' },
    { week: 3, note: 'Fractions, decimals and the first weekly test' },
    { week: 4, note: 'Percentages, with Tamil grammar alongside' },
  ],
};
