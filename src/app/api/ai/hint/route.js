import { NextResponse } from 'next/server';
import { query, LEARNER_ID } from '../../../../lib/db.mjs';
import { buildHintContext, buildHintPrompt } from '../../../../domain/ai/context.mjs';
import { generateHint } from '../../../../lib/ai/provider.mjs';

export const dynamic = 'force-dynamic';

const TYPE = 'EXPLANATION';

/**
 * POST /api/ai/hint
 * body: { questionId, selectedIndex, mistakeType }
 *
 * On-demand only — never called automatically. Checks the ai_interaction
 * cache first (one generated explanation per question is reused for every
 * future learner who gets it wrong the same way). Any failure — no API key,
 * network error, bad response — returns { available: false } with a normal
 * 200, never an error: the deterministic explanation already on screen is
 * always enough on its own.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ available: false });
  }

  const { questionId, selectedIndex = null, mistakeType = null } = body;
  if (!questionId) return NextResponse.json({ available: false });

  try {
    const { rows: cached } = await query(
      `SELECT response FROM ai_interaction WHERE question_id = $1 AND type = $2`,
      [questionId, TYPE]
    );
    if (cached.length > 0) {
      return NextResponse.json({ available: true, text: cached[0].response, cached: true });
    }

    const { rows: questionRows } = await query(
      `SELECT topic_id, prompt, options, answer_index, explanation FROM question WHERE id = $1`,
      [questionId]
    );
    if (questionRows.length === 0) return NextResponse.json({ available: false });
    const q = questionRows[0];

    const [{ rows: learnerRows }, { rows: topicRows }, { rows: stateRows }] = await Promise.all([
      query(`SELECT name FROM learner WHERE id = $1`, [LEARNER_ID]),
      query(`SELECT name FROM topic WHERE id = $1`, [q.topic_id]),
      query(
        `SELECT mastery_score::float8 AS mastery_score FROM learner_topic_state
          WHERE learner_id = $1 AND topic_id = $2`,
        [LEARNER_ID, q.topic_id]
      ),
    ]);

    const context = buildHintContext({
      learnerName: learnerRows[0]?.name ?? 'the learner',
      topicName: topicRows[0]?.name ?? q.topic_id,
      question: q.prompt,
      options: q.options,
      correctIndex: q.answer_index,
      selectedIndex,
      explanation: q.explanation,
      mistakeType,
      masteryScore: stateRows[0]?.mastery_score ?? 0,
    });

    const result = await generateHint(buildHintPrompt(context));
    if (!result) return NextResponse.json({ available: false });

    await query(
      `INSERT INTO ai_interaction (learner_id, topic_id, question_id, type, prompt_context, response, model)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)
       ON CONFLICT (question_id, type) DO NOTHING`,
      [LEARNER_ID, q.topic_id, questionId, TYPE, JSON.stringify(context), result.text, result.model]
    );

    return NextResponse.json({ available: true, text: result.text, cached: false });
  } catch {
    return NextResponse.json({ available: false });
  }
}
