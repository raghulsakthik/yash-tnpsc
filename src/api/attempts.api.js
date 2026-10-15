import { post } from './client';

/** @param {{attemptId: string, questionId: string, selectedIndex: number|null, timeTakenMs: number, confidence?: number|null, mode?: string}} payload */
export const submitAttempt = (payload) => post('/api/attempts', payload);
