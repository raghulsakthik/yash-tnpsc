import { get } from './client';

export const getTodayPlan = () => get('/api/plan/today');
