import { get } from './client';

/** Home's whole view-model — the plan/today + revision/due aggregation. */
export const getHomeOverview = () => get('/api/home/overview');
