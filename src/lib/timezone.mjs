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

const hourFormatter = new Intl.DateTimeFormat('en-US', { timeZone: APP_TIMEZONE, hour: 'numeric', hour12: false });

/**
 * The hour (0-23) for the given instant, in IST -- the same correctness
 * reason as dateKeyInAppTimezone: `Date#getHours()` reads the server's
 * local clock, which is IST on a dev machine but UTC on most cloud hosts
 * (Vercel included). Any "is it evening yet" / "which 2-hourly slot" check
 * must go through this, not getHours() directly.
 */
export function hourInAppTimezone(date = new Date()) {
  const h = Number(hourFormatter.format(date));
  return h === 24 ? 0 : h; // en-US's 24h format reports midnight as "24"
}
