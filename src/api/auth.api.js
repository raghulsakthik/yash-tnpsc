import { get, post, del } from './client';

export const getAuthStatus = () => get('/api/auth');
export const login = (password) => post('/api/auth', { password });
export const logout = () => del('/api/auth');
