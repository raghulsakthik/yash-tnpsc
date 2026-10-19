import { lookupWords } from './dictionaryApi.mjs';

export class VocabularyGenerationError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const MIN_WORDS = 4; // need at least 4 real definitions to build 3 honest distractors

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Turns a word list into real vocabulary MCQs -- every option is a real
 * dictionary definition (the correct one for the asked word, the
 * distractors are other words' real definitions from the same batch), not
 * invented text. Also returns one short study-note resource summarizing
 * the batch.
 *
 * @param {string[]} words
 * @returns {Promise<{questions: Array<object>, resource: object, skipped: string[]}>}
 */
export async function generateVocabularyContent(words) {
  const unique = [...new Set(words.map((w) => w.trim()).filter(Boolean))];
  if (unique.length < MIN_WORDS) {
    throw new VocabularyGenerationError('TOO_FEW_WORDS', `At least ${MIN_WORDS} words are needed to build honest wrong-answer options.`);
  }

  const entries = await lookupWords(unique);
  const skipped = unique.filter((w) => !entries.some((e) => e.word.toLowerCase() === w.toLowerCase()));

  if (entries.length < MIN_WORDS) {
    throw new VocabularyGenerationError(
      'TOO_FEW_FOUND',
      `Only ${entries.length} of ${unique.length} words were found in the dictionary -- need at least ${MIN_WORDS}.`
    );
  }

  const questions = entries.map((entry, i) => {
    const otherDefs = entries.filter((_, j) => j !== i).map((e) => e.definition);
    const distractors = shuffle(otherDefs).slice(0, 3);
    const options = shuffle([entry.definition, ...distractors]);
    const answerIndex = options.indexOf(entry.definition);

    return {
      id: `vocab-${entry.word.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      question: `What does "${entry.word}" (${entry.partOfSpeech}) mean?`,
      options,
      answer: answerIndex,
      explanation: entry.example
        ? `"${entry.word}": ${entry.definition} Example: "${entry.example}"`
        : `"${entry.word}": ${entry.definition}`,
      source: 'dictionaryapi.dev',
    };
  });

  const resource = {
    title: `Vocabulary: ${entries.map((e) => e.word).join(', ')}`,
    body: entries.map((e) => `${e.word} (${e.partOfSpeech}) -- ${e.definition}`).join('\n\n'),
  };

  return { questions, resource, skipped };
}
