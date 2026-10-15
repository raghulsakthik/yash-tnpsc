import { post } from './client';

/** @param {{questionId: string, selectedIndex?: number|null, mistakeType?: string|null}} payload */
export const getHint = (payload) => post('/api/ai/hint', payload);
