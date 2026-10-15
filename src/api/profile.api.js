import { get, put } from './client';

export const getProfile = () => get('/api/profile');
export const updateProfile = (patch) => put('/api/profile', patch);
export const exportProfileUrl = '/api/profile/export';
