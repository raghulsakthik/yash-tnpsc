import { get, post } from './client';

export const listTests = () => get('/api/tests');
export const startTest = () => post('/api/tests');
export const getTest = (testId) => get(`/api/tests/${testId}`);
export const saveTestAnswer = (testId, payload) => post(`/api/tests/${testId}/answers`, payload);
export const submitTest = (testId) => post(`/api/tests/${testId}/submit`);
