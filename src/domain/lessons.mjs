// Real lesson content for every topic the engine actually serves questions
// for (the apt.foundation / apt.aptitude / apt.reasoning chapters). One
// concept explanation plus one fully worked example per topic -- short
// by design, since the real practice happens in /practice, not here.

export const LESSONS = {
  'aptitude.whole-numbers': {
    title: 'Place value and order of operations',
    concept:
      'Every digit in a number has a place value based on its position: units, tens, hundreds, and so on, each ten times the one before it. When a sum mixes operations, multiplication and division are done before addition and subtraction, and anything in brackets is done first of all.',
    example: {
      problem: 'What is 24 + 6 × 3?',
      steps: ['Multiplication first: 6 × 3 = 18', 'Then add: 24 + 18 = 42'],
      answer: '42',
    },
    tip: 'Reading left to right and doing the operations in the order they appear (instead of by precedence) is the single most common mistake at this level.',
  },
  'aptitude.division': {
    title: 'Dividend, divisor, quotient and remainder',
    concept:
      'Dividend = Divisor × Quotient + Remainder. This one relationship is the whole topic — most division word problems are really asking you to rearrange it for the piece you don\'t have yet.',
    example: {
      problem: 'A number divided by 12 gives a quotient of 7 and a remainder of 5. What is the number?',
      steps: ['Dividend = divisor × quotient + remainder', '= 12 × 7 + 5', '= 84 + 5'],
      answer: '89',
    },
    tip: 'Forgetting to add the remainder back on after multiplying divisor × quotient is the most common slip.',
  },
  'aptitude.fractions': {
    title: 'Parts of a whole',
    concept:
      'A fraction describes part of a whole: the denominator (bottom) says how many equal pieces the whole is cut into, the numerator (top) says how many of those pieces you have. To compare or combine fractions with different denominators, first bring them to a common denominator.',
    example: {
      problem: 'Which is larger: 3/4 or 5/8?',
      steps: ['Common denominator is 8', '3/4 = 6/8', 'Compare 6/8 and 5/8'],
      answer: '3/4 is larger',
    },
    tip: 'Comparing numerators directly without a common denominator (saying 5 > 3, so 5/8 is bigger) ignores that the pieces are different sizes.',
  },
  'aptitude.decimals': {
    title: 'Decimals are fractions in disguise',
    concept:
      'A decimal is just a fraction with a power of 10 as its denominator. To convert a fraction to a decimal, divide the numerator by the denominator. To add or subtract decimals, line up the decimal points before doing the arithmetic.',
    example: {
      problem: 'Convert 7/20 to a decimal.',
      steps: ['Divide: 7 ÷ 20', '= 0.35'],
      answer: '0.35',
    },
    tip: 'Misaligning the decimal point when adding or subtracting is the most common error — always stack the numbers so the points line up.',
  },
  'aptitude.simplification': {
    title: 'BODMAS, carefully',
    concept:
      'Simplification problems are solved strictly by order of operations: Brackets, Of (multiplication expressed as "of"), Division and Multiplication (left to right), then Addition and Subtraction (left to right).',
    example: {
      problem: 'Simplify: 36 − 6 × 4',
      steps: ['Multiplication before subtraction: 6 × 4 = 24', '36 − 24'],
      answer: '12',
    },
    tip: 'Working strictly left to right instead of respecting precedence is the one mistake that explains almost every wrong answer here.',
  },
  'aptitude.percentage': {
    title: 'Percentage is "out of 100"',
    concept:
      'A percentage is a fraction with 100 as its denominator. "X% of Y" means (X/100) × Y. An increase or decrease by X% means adding or subtracting that amount from the original. A reverse-percentage question ("A is X% of what number?") is solved by dividing, not multiplying.',
    example: {
      problem: '420 is increased by 15%. What is the new value?',
      steps: ['15% of 420 = (15/100) × 420 = 63', 'Add it back: 420 + 63'],
      answer: '483',
    },
    tip: 'On a reverse-percentage question, multiplying instead of dividing is the most common error — "A is X% of what number" always divides A by the percentage.',
  },
  'aptitude.hcf': {
    title: 'Highest Common Factor',
    concept:
      'The HCF of two numbers is the largest number that divides both exactly. Find it by repeated division (Euclid\'s method): divide the larger by the smaller, then keep replacing the larger with the remainder until the remainder is 0 — the last non-zero divisor is the HCF.',
    example: {
      problem: 'Find the HCF of 48 and 18.',
      steps: ['48 ÷ 18 = 2 remainder 12', '18 ÷ 12 = 1 remainder 6', '12 ÷ 6 = 2 remainder 0'],
      answer: '6',
    },
    tip: 'Mixing up HCF with LCM is the most common slip — HCF is always the smaller of the two, since it has to divide both numbers.',
  },
  'aptitude.lcm': {
    title: 'Lowest Common Multiple',
    concept:
      'The LCM of two numbers is the smallest number that both divide into exactly. It is linked to the HCF by one formula: LCM × HCF = the product of the two numbers — so once you have the HCF, the LCM is one division away.',
    example: {
      problem: 'Find the LCM of 12 and 18, given their HCF is 6.',
      steps: ['LCM × HCF = product of the numbers', 'LCM × 6 = 12 × 18 = 216', 'LCM = 216 ÷ 6'],
      answer: '36',
    },
    tip: 'Multiplying the two numbers together and forgetting to divide out the HCF gives a number much bigger than the true LCM.',
  },
  'aptitude.ratio-and-proportion': {
    title: 'Splitting a total by ratio',
    concept:
      'A ratio like 3:5 splits a total into 3 + 5 = 8 equal parts. Find the value of one part by dividing the total by the sum of the ratio terms, then multiply by however many parts each share gets.',
    example: {
      problem: '₹2,400 is divided between two people in the ratio 5:3. What is the larger share?',
      steps: ['Total parts: 5 + 3 = 8', 'One part: 2400 ÷ 8 = 300', 'Larger share: 5 × 300'],
      answer: '₹1,500',
    },
    tip: 'Dividing the total by only one of the ratio numbers instead of their sum is the most common mistake.',
  },
  'aptitude.simple-interest': {
    title: 'Simple Interest',
    concept:
      'Simple interest is calculated on the original principal only, every year: SI = (P × R × T) / 100, where P is principal, R is the rate per annum, and T is time in years.',
    example: {
      problem: 'Find the simple interest on ₹8,000 at 9% per annum for 3 years.',
      steps: ['SI = (P × R × T) / 100', '= (8000 × 9 × 3) / 100'],
      answer: '₹2,160',
    },
    tip: 'Forgetting to divide by 100 (or dividing by it twice) is the single most common arithmetic slip in this formula.',
  },
  'aptitude.compound-interest': {
    title: 'Compound Interest',
    concept:
      'Compound interest earns interest on the interest already earned, not just the original principal. Amount after T years: A = P(1 + R/100)^T. The compound interest itself is A − P, and it is always a little more than the simple interest for the same P, R and T.',
    example: {
      problem: 'Find the amount on ₹5,000 at 10% per annum for 2 years, compounded annually.',
      steps: ['A = P(1 + R/100)^T', '= 5000 × (1.10)²', '= 5000 × 1.21'],
      answer: '₹6,050',
    },
    tip: 'Applying the rate only once instead of compounding it year over year quietly turns a CI question into an SI one — check the exponent matches the number of years.',
  },
  'aptitude.area': {
    title: 'Area of common shapes',
    concept:
      'Area measures the surface a shape covers. Rectangle: length × width. Square: side². Circle: π × radius² (use π = 22/7 unless told otherwise). Don\'t confuse area with perimeter — perimeter is the distance around the edge, area is the space inside.',
    example: {
      problem: 'Find the area of a rectangle 18 m long and 11 m wide.',
      steps: ['Area = length × width', '= 18 × 11'],
      answer: '198 sq. m',
    },
    tip: 'Reaching for the perimeter formula (2 × (l + w)) when the question asks for area is a very common slip under time pressure.',
  },
  'aptitude.volume': {
    title: 'Volume of common solids',
    concept:
      'Volume measures the space inside a solid. Cube: side³. Cuboid: length × width × height. Each dimension gets multiplied in, unlike area, which only uses two.',
    example: {
      problem: 'Find the volume of a cuboid 10 cm long, 6 cm wide and 4 cm high.',
      steps: ['Volume = length × width × height', '= 10 × 6 × 4'],
      answer: '240 cubic cm',
    },
    tip: 'Multiplying only two of the three dimensions (stopping at the base area) is the most common mistake — a cuboid always needs all three.',
  },
  'aptitude.time-and-work': {
    title: 'Combining work rates',
    concept:
      'If A can finish a job in "a" days, A does 1/a of the job per day. When two people work together, their daily rates add as fractions: 1/a + 1/b. The number of days to finish together is the reciprocal of that sum, which works out to (a × b) / (a + b).',
    example: {
      problem: 'A can finish a job in 12 days, B in 18 days. Working together, how many days will it take?',
      steps: ['Combined rate: 1/12 + 1/18 = 3/36 + 2/36 = 5/36 of the job per day', 'Days needed = 36/5'],
      answer: '7.2 days',
    },
    tip: 'Averaging the two individual times (as if (12+18)/2 were the answer) is the most common wrong approach — work rates add as fractions, not as days.',
  },
  'aptitude.profit-and-loss': {
    title: 'Profit and loss are on the cost price',
    concept:
      'Profit or loss is always expressed as a percentage of the cost price (CP), never the selling price (SP). Profit% = (SP − CP)/CP × 100, and loss% is the same with CP − SP. To find a selling price that hits a target profit or loss, add or subtract that percentage of the CP.',
    example: {
      problem: 'A shopkeeper buys a fan for ₹1,200 and sells it for ₹1,380. What is the profit percentage?',
      steps: ['Profit = 1380 − 1200 = ₹180', 'Profit% = (Profit / CP) × 100 = (180/1200) × 100'],
      answer: '15%',
    },
    tip: 'Dividing by the selling price instead of the cost price gives a different, wrong percentage — always divide by CP.',
  },
  'aptitude.average': {
    title: 'Average is the total shared equally',
    concept:
      'Average = sum of all values ÷ how many values there are. When combining two groups with different averages, find each group\'s total first (count × average), add the totals, then divide by the combined count — simply averaging the two averages only works if the groups are the same size.',
    example: {
      problem: 'The average of 10 numbers is 25, and the average of another 15 numbers is 35. What is the average of all 25 numbers together?',
      steps: ['Total of first group = 10 × 25 = 250', 'Total of second group = 15 × 35 = 525', 'Combined average = (250 + 525) ÷ 25'],
      answer: '31',
    },
    tip: 'Averaging the two averages directly ((25+35)/2 = 30) ignores that the groups have different sizes, and gives a slightly wrong answer.',
  },
  'aptitude.speed-time-distance': {
    title: 'Distance = Speed × Time',
    concept:
      'One formula covers almost everything here: Distance = Speed × Time. To convert km/h to m/s, multiply by 5/18 (and by 18/5 to go the other way). When two objects move towards each other, their speeds add; when one chases another in the same direction, their speeds subtract.',
    example: {
      problem: 'A train travels at 72 km/h. What is its speed in m/s?',
      steps: ['Multiply by 5/18 to convert km/h to m/s', '72 × 5/18'],
      answer: '20 m/s',
    },
    tip: 'Mixing up the conversion factor (using 18/5 instead of 5/18) silently flips the answer to the wrong unit direction.',
  },
  'aptitude.ages': {
    title: 'Ages move forward at the same rate',
    concept:
      'Age problems are ratio or simple-algebra problems in disguise. If two ages are in a given ratio, treat the ratio parts as "x years" each and use the given total or difference to solve for x. Every person\'s age increases by the same number each year, which is what makes "in N years" or "N years ago" problems solvable.',
    example: {
      problem: 'Two cousins have ages in the ratio 3:2, and their ages add up to 35 years. How old is the elder cousin?',
      steps: ['Total ratio parts = 3 + 2 = 5', 'One part = 35 ÷ 5 = 7 years', 'Elder cousin\'s age = 3 × 7'],
      answer: '21 years',
    },
    tip: 'Forgetting that "N years ago" or "N years from now" shifts both people\'s ages by the same amount (not just one of them) is the most common setup mistake.',
  },
  'reasoning.logical': {
    title: 'Reading the statement exactly',
    concept:
      'Logical reasoning questions reward reading a statement exactly as written and following only what it actually says — not what sounds plausible or what you already know to be generally true. Build the conclusion strictly from the given premises.',
    example: {
      problem: 'All pens are tools. Some tools are red. Can we conclude "some pens are red"?',
      steps: ['The red tools are not confirmed to be the same tools that are pens', 'The overlap is not guaranteed by the two statements given'],
      answer: 'No — it cannot be concluded',
    },
    tip: 'Importing outside knowledge or "common sense" into a logic question instead of using only the given statements is the most common trap.',
  },
  'reasoning.puzzles': {
    title: 'Organise clues before solving',
    concept:
      'Seating/ranking/grouping puzzles become manageable once every clue is written down in one place — a row, a grid, or a simple list — before trying to place anyone. Place the most restrictive clues (exact positions) first, then work out the relative ones.',
    example: {
      problem: 'Five people sit in a row. Clue: "D sits immediately to the right of C" and "C sits at the leftmost end." Where does D sit?',
      steps: ['C is fixed at position 1 (leftmost)', '"immediately to the right of C" means position 2'],
      answer: 'Position 2',
    },
    tip: 'Trying to hold every clue in your head at once instead of writing them into a grid is the main reason these questions feel harder than they are.',
  },
  'reasoning.dice': {
    title: 'Opposite faces never show together',
    concept:
      'On a standard die, when two faces are seen in the same view, they can never be opposite each other. Use this rule across multiple positions of the same die (or a net) to work out which face is opposite which.',
    example: {
      problem: 'In two positions of the same die, face "2" is seen next to "4" in one and next to "6" in another. Which number is definitely NOT opposite "2"?',
      steps: ['If 2 and 4 are seen together, they are not opposite', 'If 2 and 6 are seen together, they are not opposite either'],
      answer: 'Neither 4 nor 6 is opposite 2',
    },
    tip: 'Assuming the face opposite a given number is always "7 minus it" (true only for a die numbered 1–6 in the standard way) doesn\'t hold once a die is relettered or reused across positions — only use pairs actually observed.',
  },
  'reasoning.visual': {
    title: 'Track one change at a time',
    concept:
      'Pattern-completion and mirror/figure questions are solved by isolating exactly one thing that changes between frames (rotation, a shaded part, a count of sides) and applying that same single change to find the missing frame.',
    example: {
      problem: 'A sequence of shapes rotates 90° clockwise each step. What is the 5th shape if the 1st points up?',
      steps: ['After 4 rotations of 90°, the shape is back to its starting orientation (360° total)', 'The 5th shape is one more 90° turn from the start'],
      answer: 'Pointing right (90° clockwise from up)',
    },
    tip: 'Looking for two changes at once (rotation AND shading, say) when only one is actually varying is what makes these look harder than they are.',
  },
  'reasoning.alpha-numeric': {
    title: 'Alphabet position is a fixed fact',
    concept:
      'A = 1, B = 2, ... Z = 26 is a fixed, memorizable fact. Coding questions shift every letter of a word forward or backward by the same number of positions — work out the shift from one worked letter, then apply it to the rest.',
    example: {
      problem: 'If every letter is shifted forward by 3 positions, how is "CAT" coded?',
      steps: ['C (3) → F (6)', 'A (1) → D (4)', 'T (20) → W (23)'],
      answer: '"FDW"',
    },
    tip: 'Being off by one position when counting the shift (counting the starting letter itself as the first step) is the most common slip.',
  },
  'reasoning.number-series': {
    title: 'Find the rule, not just the pattern',
    concept:
      'Number series questions follow one of a few standard rules: a constant difference (arithmetic), a constant multiplier (geometric), consecutive squares/cubes, or an alternating combination of two rules. Check the gap between the first few terms before guessing the next one.',
    example: {
      problem: 'Find the next number: 3, 6, 12, 24, ?',
      steps: ['Each term is double the one before it (a geometric series, ratio 2)', '24 × 2'],
      answer: '48',
    },
    tip: 'Assuming every series is "add a constant" when the real rule is multiplication (or squares) gives a next term that is close, but wrong.',
  },
};

export function getLesson(topicId) {
  return LESSONS[topicId] ?? null;
}
