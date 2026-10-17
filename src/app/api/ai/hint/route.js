import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../lib/auth.mjs';
import { buildHintContext, buildHintPrompt, buildDeepenPrompt } from '../../../../domain/ai/context.mjs';
import { generateHint } from '../../../../lib/ai/provider.mjs';

export const dynamic = 'force-dynamic';

const RESCUE = 'EXPLANATION';
const DEEPEN = 'DEEPEN';

/**
 * POST /api/ai/hint
 * body: { questionId, selectedIndex, mistakeType, confidence, timeTakenMs }
 *
 * Two modes, picked automatically from the signals already on hand:
 *  - wrong answer -> a rescue explanation from a different angle
 *  - correct but slow or low-confidence -> a "make this automatic" tip
 * Both are cached per (question, type) and reused for every future learner
 * who hits the same situation on the same question -- see the ai_interaction
 * table. Any failure -- no API key, network error, bad response -- returns
 * { available: false } with a normal 200, never an error: the deterministic
 * explanation already on screen is always enough on its own.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ available: false });
  }

  const { questionId, selectedIndex = null, mistakeType = null, confidence = null, timeTakenMs = null } = body;
  if (!questionId) return NextResponse.json({ available: false });

  const learnerId = await requireLearnerId(request);
  if (!learnerId) return NextResponse.json({ available: false });

  try {
    const { rows: questionRows } = await query(
      `SELECT topic_id, prompt, options, answer_index, explanation, estimated_seconds FROM question WHERE id = $1`,
      [questionId]
    );
    if (questionRows.length === 0) return NextResponse.json({ available: false });
    const q = questionRows[0];

    const wasCorrect = selectedIndex === q.answer_index;
    const tookLongerThanExpected = timeTakenMs !== null ? timeTakenMs / 1000 > q.estimated_seconds * 1.5 : null;
    const underconfidentCorrect = wasCorrect && confidence !== null && confidence <= 2;

    // Only worth asking the model when there's something to rescue or
    // reinforce -- a confident, on-time correct answer needs nothing.
    if (wasCorrect && !tookLongerThanExpected && !underconfidentCorrect) {
      return NextResponse.json({ available: false });
    }

    const type = wasCorrect ? DEEPEN : RESCUE;

    const { rows: learnerNameRows } = await query(`SELECT name FROM learner WHERE id = $1`, [learnerId]);
    const learnerName = learnerNameRows[0]?.name ?? 'there';

    const { rows: cached } = await query(
      `SELECT response FROM ai_interaction WHERE question_id = $1 AND type = $2`,
      [questionId, type]
    );
    if (cached.length > 0) {
      // Shared across every learner who hits this question, so her real
      // name is applied fresh here rather than trusted to be baked
      // correctly into cached text generated for whoever asked first.
      return NextResponse.json({ available: true, text: cached[0].response, learnerName, cached: true });
    }

    const [{ rows: topicRows }, { rows: stateRows }, { rows: recentRows }, { rows: missRows }] = await Promise.all([
      query(`SELECT name FROM topic WHERE id = $1`, [q.topic_id]),
      query(
        `SELECT mastery_score::float8 AS mastery_score, attempt_count FROM learner_topic_state
          WHERE learner_id = $1 AND topic_id = $2`,
        [learnerId, q.topic_id]
      ),
      query(
        `SELECT correct FROM question_attempt WHERE learner_id = $1 AND topic_id = $2
          ORDER BY created_at DESC LIMIT 10`,
        [learnerId, q.topic_id]
      ),
      query(
        `SELECT COUNT(*)::int AS n FROM question_attempt
          WHERE learner_id = $1 AND question_id = $2 AND correct = false`,
        [learnerId, questionId]
      ),
    ]);

    const recentAccuracyOnTopic =
      recentRows.length >= 3 ? recentRows.filter((r) => r.correct).length / recentRows.length : null;

    const context = buildHintContext({
      learnerName,
      topicName: topicRows[0]?.name ?? q.topic_id,
      question: q.prompt,
      options: q.options,
      correctIndex: q.answer_index,
      selectedIndex,
      explanation: q.explanation,
      mistakeType,
      masteryScore: stateRows[0]?.mastery_score ?? 0,
      attemptCountOnTopic: stateRows[0]?.attempt_count ?? 0,
      recentAccuracyOnTopic,
      priorMissesOnThisQuestion: missRows[0]?.n ?? 0,
      confidenceLevel: confidence,
      tookLongerThanExpected,
    });

    const prompt = type === DEEPEN ? buildDeepenPrompt(context) : buildHintPrompt(context);
    const result = await generateHint(prompt);
    if (!result) return NextResponse.json({ available: false });

    await query(
      `INSERT INTO ai_interaction (learner_id, topic_id, question_id, type, prompt_context, response, model)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)
       ON CONFLICT (question_id, type) DO NOTHING`,
      [learnerId, q.topic_id, questionId, type, JSON.stringify(context), result.text, result.model]
    );

    return NextResponse.json({ available: true, text: result.text, learnerName, cached: false, type });
  } catch {
    return NextResponse.json({ available: false });
  }
}
