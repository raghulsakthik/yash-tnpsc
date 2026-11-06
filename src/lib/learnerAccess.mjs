/** True only for an active-session account whose platform role is STUDENT. */
export function isLearnerAccount(user) {
  return Boolean(user && user.role === 'STUDENT' && typeof user.id === 'string' && user.id.length > 0);
}
