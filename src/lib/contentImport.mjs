export class ContentImportError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export function resolveMcqLanguage(question, defaultLanguage = 'en') {
  const language = String(question?.language ?? defaultLanguage).toLowerCase();
  if (!['ta', 'en'].includes(language)) {
    throw new ContentImportError('INVALID_LANGUAGE', 'Question language must be ta or en.');
  }
  return language;
}
