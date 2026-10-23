import nodemailer from 'nodemailer';
import { query } from './db.mjs';

export const emailConfigured = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD
);

let transporter = null;
function getTransporter() {
  if (!emailConfigured) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
  }
  return transporter;
}

/**
 * Sends an email to whatever address the learner has set as notify_email.
 * Throws a clear, specific error rather than failing silently -- unlike
 * push (many devices, one failing is fine), email has exactly one
 * destination, so a failure here is always worth surfacing.
 *
 * @param {string} learnerId
 * @param {{ subject: string, text: string, html?: string }} message
 */
export async function sendEmailToLearner(learnerId, message) {
  if (!emailConfigured) {
    throw new Error('Email is not configured on the server (missing SMTP_* env vars)');
  }

  const { rows } = await query(`SELECT notify_email FROM learner_profile WHERE learner_id = $1`, [learnerId]);
  const to = rows[0]?.notify_email;
  if (!to) {
    throw new Error('No notification email address is set yet');
  }

  await getTransporter().sendMail({
    from: process.env.SMTP_USER,
    to,
    subject: message.subject,
    text: message.text,
    html: message.html ?? `<p>${message.text}</p>`,
  });

  return { to };
}

/**
 * Sends a password reset email directly to the account's login address --
 * unlike sendEmailToLearner, this never reads notify_email (reset
 * delivery can't depend on an opt-in preference that may be unset).
 */
export async function sendPasswordResetEmail(to, token) {
  if (!emailConfigured) {
    throw new Error('Email is not configured on the server (missing SMTP_* env vars)');
  }
  const resetUrl = `${process.env.APP_BASE_URL ?? ''}/reset-password?token=${encodeURIComponent(token)}`;
  await getTransporter().sendMail({
    from: process.env.SMTP_USER,
    to,
    subject: 'Reset your YASH password',
    text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
    html: `<p>Reset your password by clicking <a href="${resetUrl}">this link</a>.</p><p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
  });
  return { to };
}
