import { get } from './client';

/** The full syllabus tree joined with mastery/revision/recommendation. No UI reads this yet — see src/app/api/learn/overview/route.js. */
export const getLearnOverview = () => get('/api/learn/overview');
