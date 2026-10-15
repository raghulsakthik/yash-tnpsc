import { get, put } from './client';

export const getNotifications = () => get('/api/notifications');
export const getNotificationPreferences = () => get('/api/notifications/preferences');
export const updateNotificationPreferences = (patch) => put('/api/notifications/preferences', patch);
