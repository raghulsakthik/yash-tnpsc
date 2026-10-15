import { get } from './client';

export const getNextQuestion = (topicId) => get(`/api/questions/next?topic=${topicId}`);
