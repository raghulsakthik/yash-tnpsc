import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db.mjs';
import { requireLearnerId } from '../../../../../lib/auth.mjs';
import { getLesson } from '../../../../../domain/lessons.mjs';
import { buildAlternateExplanationPrompt } from '../../../../../domain/ai/context.mjs';
import { generateHint } from '../../../../../lib/ai/provider.mjs';

export const dynamic = 'force-dynamic';

const TYPE = 'ALTERNATE_EXPLANATION';

/**
 * POST /api/lesson/:topic/explain
 *
 * A second angle on a concept she's already read once -- cached per topic
 * (not per learner) in the same ai_interaction table the question hints
 * use, since the alternate explanation of a fixed concept doesn't vary by
 * who's asking.
 */
export async function POST(request, { params }) {
  const { topic } = await params;

  const learnerId = await requireLearnerId(request);
  if (!learnerId) {
    return NextResponse.json({ available: false });
  }

  const lesson = getLesson(topic);
  if (!lesson) return NextResponse.json({ available: false });

  try {
    const { rows: learnerRows } = await query(`SELECT name FROM learner WHERE id = $1`, [learnerId]);
    const learnerName = learnerRows[0]?.name ?? 'there';

    const { rows: cached } = await query(
      `SELECT response FROM ai_interaction WHERE learner_id = $1 AND topic_id = $2 AND type = $3 AND question_id IS NULL`,
      [learnerId, topic, TYPE]
    );
    if (cached.length > 0) {
      // The cached text is scoped to the current learner and topic,
      // so her name is applied fresh here rather than trusted to have been
      // baked into the cached text by the model for the right person.
      return NextResponse.json({ available: true, text: cached[0].response, learnerName, cached: true });
    }

    const context = {
      learnerName,
      topicName: lesson.title,
      concept: lesson.concept,
      examplePrompt: lesson.example.problem,
    };

    const result = await generateHint(buildAlternateExplanationPrompt(context));
    if (!result) return NextResponse.json({ available: false });

    await query(
      `INSERT INTO ai_interaction (learner_id, topic_id, question_id, type, prompt_context, response, model)
       VALUES ($1,$2,NULL,$3,$4::jsonb,$5,$6)
       ON CONFLICT (learner_id, topic_id, type) WHERE question_id IS NULL DO NOTHING`,
      [learnerId, topic, TYPE, JSON.stringify(context), result.text, result.model]
    );

    return NextResponse.json({ available: true, text: result.text, learnerName, cached: false });
  } catch {
    return NextResponse.json({ available: false });
  }
}
