/**
 * Phase 21 — PYQ Engine. The one piece of genuine logic this phase needed:
 * turning raw per-topic/per-source attempt counts (question_attempt,
 * unchanged — "PYQs therefore become another evidence source," not a
 * separate one) into a PYQ-vs-authored performance comparison.
 */

/**
 * @param {Array<{topic_id: string, topic_name: string, is_pyq: boolean, attempt_count: number, correct_count: number}>} rows
 * @returns {{overall: {pyq: object, authored: object}, topics: Array<object>}}
 */
export function summarizePyqPerformance(rows) {
  const accuracy = (correct, total) => (total > 0 ? Math.round((correct / total) * 10000) / 100 : null);

  const totals = { pyq: { attemptCount: 0, correctCount: 0 }, authored: { attemptCount: 0, correctCount: 0 } };
  const byTopic = new Map();

  for (const row of rows) {
    const bucket = row.is_pyq ? 'pyq' : 'authored';
    totals[bucket].attemptCount += row.attempt_count;
    totals[bucket].correctCount += row.correct_count;

    if (!byTopic.has(row.topic_id)) {
      byTopic.set(row.topic_id, {
        topicId: row.topic_id,
        topicName: row.topic_name,
        pyq: { attemptCount: 0, correctCount: 0 },
        authored: { attemptCount: 0, correctCount: 0 },
      });
    }
    const topic = byTopic.get(row.topic_id);
    topic[bucket].attemptCount += row.attempt_count;
    topic[bucket].correctCount += row.correct_count;
  }

  const finalizeBucket = (b) => ({ ...b, accuracy: accuracy(b.correctCount, b.attemptCount) });

  return {
    overall: { pyq: finalizeBucket(totals.pyq), authored: finalizeBucket(totals.authored) },
    topics: [...byTopic.values()].map((t) => ({
      topicId: t.topicId,
      topicName: t.topicName,
      pyq: finalizeBucket(t.pyq),
      authored: finalizeBucket(t.authored),
    })),
  };
}
