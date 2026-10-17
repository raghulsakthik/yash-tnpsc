// Real copy, not a single rotating line -- enough variety that the same
// message doesn't show up every day. Morning messages are a distinct pool
// (sent once, in the first slot of the day) from the general pool (sent
// through the rest of the day's slots).
//
// WhatsApp and email draw from SEPARATE pools, deliberately worded
// differently -- short, punchy lines for WhatsApp (read in a glance on a
// lock screen); a little more room to breathe for email (subject + body,
// read when she's actually opened her inbox). Same themes throughout:
// the exam as a door to her future, fear/doubt named and set aside, and
// the people who'll be proud of the effort even before they see the result.

export const WHATSAPP_MORNING_MESSAGES = [
  "Good morning. A new day, a clean page -- start it with a few minutes of maths before anything else takes over.",
  "Rise and begin. Every topic you touch today is one more brick toward the exam you're building toward.",
  "Morning. The version of you that clears TNPSC starts with today -- not someday. Open the app and take the first question.",
  "A fresh morning, a fresh shot. Leave yesterday's doubts behind and give today's first hour to learning.",
  "Good morning, Yashika. Today's effort is tomorrow's result -- start with maths while your mind is still sharp.",
  "New day. No pressure to be perfect, just a little progress before the day gets busy.",
  "Morning. Whatever held you back before doesn't get a vote today -- open the app and begin.",
];

export const WHATSAPP_GENERAL_MESSAGES = [
  "This exam isn't just a test -- it's the door to the future you're working for. Ten minutes right now keeps that door open.",
  "Every question you answer today is proof you didn't wait for the 'right moment' -- you made one.",
  "The fear of not being ready fades a little every time you show up and practice. Show up now.",
  "Nobody remembers the days you felt unready -- they remember the day you walked in prepared. Keep building that day.",
  "Whatever doubt is sitting in your head right now, a few solved questions are louder than it.",
  "The people who'll be proud of you later are watching the effort you put in today, even if they can't see it yet.",
  "Small sessions add up to a big result. This one, right now, counts just as much as any other.",
  "You don't need to feel motivated to start -- starting is what makes the motivation show up.",
  "Every topic mastered is one less thing to fear on exam day. Chip away at it now.",
  "The gap between where you are and where you want to be closes one question at a time. Close it a little today.",
  "This is for the version of you a year from now, reading the result with your name on it. Work for her today.",
  "Nobody becomes ready by accident. A few focused minutes now is how 'ready' actually gets built.",
];

export const EMAIL_MORNING_MESSAGES = [
  {
    subject: 'Start today with ten minutes of maths',
    body: "Good morning, Yashika.\n\nBefore the day fills up with everything else it's going to ask of you, give it ten minutes of yours. Not because today has to be perfect -- just because today is the only day you actually get to work with.\n\nOpen the app and take the first question while your mind is still quiet.",
  },
  {
    subject: "Today's page is still blank",
    body: "Good morning.\n\nEvery day you've studied so far is already written -- today is the only page still blank. What goes on it is entirely yours to decide, starting with whether you open the app in the next few minutes.\n\nLet's fill it with something you'll be glad to look back on.",
  },
  {
    subject: 'The exam clears one morning like this at a time',
    body: "Morning, Yashika.\n\nNo single day gets you across TNPSC -- but no single day is skippable either. This one, right now, is one of the mornings that adds up. Start it with maths before anything else gets your attention.\n\nSee you in the app.",
  },
  {
    subject: "Yesterday doesn't get a vote today",
    body: "Good morning.\n\nWhatever yesterday looked like -- a great session or a day you skipped -- it doesn't get to decide what today is. Today decides that. Start it the way you want the rest of it to go: with a few solved questions and a clear head.",
  },
  {
    subject: 'A quiet morning is the best time to begin',
    body: "Good morning, Yashika.\n\nThe house is probably quieter right now than it will be in an hour. That makes this the best window of the whole day to get something real done. Open the app and use it before the noise starts.",
  },
];

export const EMAIL_GENERAL_MESSAGES = [
  {
    subject: 'What this exam actually is',
    body: "This exam isn't really about 200 questions on one paper. It's about the door it opens afterward -- the job, the stability, the version of your life you've been working toward.\n\nEvery session you put in now is a small payment toward that door staying open. Today's is due.",
  },
  {
    subject: "The doubt doesn't need to be gone to start",
    body: "If there's a part of you that doesn't feel ready yet, that's normal -- almost everyone preparing for an exam like this carries some version of that doubt.\n\nThe difference isn't who has the doubt and who doesn't. It's who kept showing up anyway. A few solved questions today is louder than that doubt, even if it doesn't feel that way yet.",
  },
  {
    subject: "People notice the effort before they see the result",
    body: "The people who'll be proud of you on the day the result comes out are, in a quiet way, already watching the work you put in now -- even if they can't see it directly.\n\nThis session isn't invisible. It's part of the story that result is going to tell.",
  },
  {
    subject: 'One less thing to fear on exam day',
    body: "Every topic you genuinely master now is one less thing that can surprise you in the exam hall. That's really what practice is for -- not perfection, just shrinking the list of things that still scare you.\n\nPick one topic today and shrink that list a little.",
  },
  {
    subject: "This is for her, a year from now",
    body: "Picture the version of you reading this result a year from now, with your name on it. She's not asking for a perfect today. She's asking for an honest one -- a real session, not a skipped one.\n\nGive her that today.",
  },
  {
    subject: "Ready isn't a feeling, it's a thing you build",
    body: "You don't have to feel motivated before you start -- that's backwards. Motivation tends to show up after you've already begun, not before.\n\nSo start anyway. Open the app, take one question, and let the motivation catch up.",
  },
];

export function pickMorningMessage() {
  return WHATSAPP_MORNING_MESSAGES[Math.floor(Math.random() * WHATSAPP_MORNING_MESSAGES.length)];
}

export function pickMotivationMessage() {
  return WHATSAPP_GENERAL_MESSAGES[Math.floor(Math.random() * WHATSAPP_GENERAL_MESSAGES.length)];
}

export function pickMorningEmail() {
  return EMAIL_MORNING_MESSAGES[Math.floor(Math.random() * EMAIL_MORNING_MESSAGES.length)];
}

export function pickMotivationEmail() {
  return EMAIL_GENERAL_MESSAGES[Math.floor(Math.random() * EMAIL_GENERAL_MESSAGES.length)];
}

// Local hours (24h) at which a motivational nudge may fire, 6am-11pm.
// The first slot of the day gets the morning-specific message; every
// later slot in the same day draws from the general pool.
export const MOTIVATION_SLOTS = [6, 8, 10, 12, 14, 16, 18, 20, 22];
