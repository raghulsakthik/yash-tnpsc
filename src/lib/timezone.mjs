// This app has one real audience: TNPSC candidates in India. "Today"
// means her IST calendar day, not whatever timezone a server happens to
// boot in. Hardcoded explicitly (not left to ambient server/session
// config) so this stays correct on any host -- a cloud Postgres/Node pair
// typically defaults to UTC, which would silently reintroduce the
// off-by-one-day bug this file exists to prevent.
export const APP_TIMEZONE = 'Asia/Kolkata';

const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** 'YYYY-MM-DD' for the given instant (default: now), in IST. en-CA formats dates exactly that way. */
export function dateKeyInAppTimezone(date = new Date()) {
  return dateKeyFormatter.format(date);
}
