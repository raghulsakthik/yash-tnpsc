import { get } from './client';

export const getDueRevisions = () => get('/api/revision/due');
export const getNextRevisionQuestion = () => get('/api/revision/next');
