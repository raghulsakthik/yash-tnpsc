import { get } from './client';

/** @param {{mode: 'topic'|'weak-areas'|'previously-wrong', topicId?: string}} params */
export const getNextPyq = ({ mode, topicId }) => {
  const qs = new URLSearchParams({ mode });
  if (topicId) qs.set('topic', topicId);
  return get(`/api/pyqs/next?${qs.toString()}`);
};

export const getPyqsOverview = () => get('/api/pyqs/overview');
