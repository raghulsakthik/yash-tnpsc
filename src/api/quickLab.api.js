import { get, post } from './client';

export const getQuickLabModes = () => get('/api/quick-lab/modes');
export const startQuickLabSession = (mode) => post('/api/quick-lab/session', { mode });
/** @param {{sessionId: string, questionId: string, selectedIndex: number, timeTakenMs: number}} payload */
export const submitQuickLabAttempt = (payload) => post('/api/quick-lab/attempt', payload);
export const completeQuickLabSession = (sessionId) => post(`/api/quick-lab/session/${sessionId}/complete`);
export const getQuickLabResult = (sessionId) => get(`/api/quick-lab/result/${sessionId}`);
