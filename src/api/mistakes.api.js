import { get } from './client';

export const getOpenMistakes = () => get('/api/mistakes/open');
export const getNextMistake = () => get('/api/mistakes/next');
