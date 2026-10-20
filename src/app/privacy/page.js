export const metadata = {
  title: 'Privacy Policy — Yash',
  description: 'What Yash collects, why, and how it is used.',
};

export default function Privacy() {
  return (
    <main className="shell-main narrow" style={{ margin: '0 auto', paddingTop: 48 }}>
      <span className="eyebrow">Privacy Policy</span>
      <h1 style={{ marginTop: 10 }}>Yash</h1>
      <p className="muted" style={{ marginTop: 10 }}>Last updated 20 October 2026.</p>

      <p style={{ marginTop: 24 }}>
        Yash is a personalised TNPSC exam-preparation app. This page explains what information it collects,
        why, and how it is used. There is no advertising in Yash and no data is sold to anyone.
      </p>

      <h2 style={{ marginTop: 32 }}>What we collect</h2>
      <ul style={{ marginTop: 12, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <li><strong>Account details</strong> — your name, email address, and a securely hashed password. We never store your password in plain text.</li>
        <li><strong>Learning activity</strong> — the questions you answer, how long you take, your confidence ratings, test results, and the mastery/progress data calculated from these, so the app can adapt to you.</li>
        <li><strong>Contact details for reminders</strong> — if you choose to turn on email, WhatsApp, or browser push notifications, we store the email address, WhatsApp number, or device subscription you provide, solely to send the reminders you asked for.</li>
        <li><strong>Exam proctoring recordings</strong> — only during a proctored test, and only if you consent at that time: camera and screen recordings, plus events like tab switches or fullscreen exits, so your test attempt can be reviewed.</li>
        <li><strong>Basic usage events</strong> — timestamps of logins, streaks, and feature use, to show you your own activity history (e.g. your login calendar) and to improve the app.</li>
      </ul>

      <h2 style={{ marginTop: 32 }}>How we use it</h2>
      <ul style={{ marginTop: 12, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <li>To run the core app: show your progress, pick your next question, grade your tests, and schedule revision.</li>
        <li>To send reminders through whichever channel(s) you opt into (email, WhatsApp, or push) — never more than what you asked for, and you can turn any of them off at any time in your profile settings.</li>
        <li>To generate an AI-written study hint or an alternate explanation, when you ask for one. Only the specific question, your answer, and your first name (if you're logged in) are sent to the AI provider (Google Gemini) for that single request — never your email, phone number, or full activity history.</li>
        <li>To review a proctored test, if you took one, for the purpose the test was set for.</li>
      </ul>

      <h2 style={{ marginTop: 32 }}>Third parties we use</h2>
      <ul style={{ marginTop: 12, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <li><strong>Meta WhatsApp Business Cloud API</strong> — only if you add a WhatsApp number for reminders, to deliver those messages.</li>
        <li><strong>Google Gemini API</strong> — only when you request an AI hint or explanation, as described above.</li>
        <li><strong>Email delivery (SMTP)</strong> — only if you add an email address for reminders.</li>
        <li><strong>Firebase Cloud Messaging / Web Push</strong> — only if you enable push notifications on Android or in your browser.</li>
        <li><strong>Vercel</strong> (hosting) and <strong>Neon</strong> (database) — the infrastructure the app and its data run on.</li>
      </ul>
      <p className="muted" style={{ marginTop: 10 }}>
        None of these receive more than the minimum needed to do the one job described above, and none of them
        are used for advertising.
      </p>

      <h2 style={{ marginTop: 32 }}>Your choices</h2>
      <ul style={{ marginTop: 12, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <li>Turn off email, WhatsApp, or push reminders at any time from your Profile page — this immediately stops those messages.</li>
        <li>Ask us to delete your account and all associated data by contacting us at the email below.</li>
      </ul>

      <h2 style={{ marginTop: 32 }}>Data retention</h2>
      <p style={{ marginTop: 12 }}>
        Your account and learning data are kept for as long as your account exists, so your progress is never
        lost between sessions. If you ask us to delete your account, we remove your personal data and learning
        history from our active database.
      </p>

      <h2 style={{ marginTop: 32 }}>Contact</h2>
      <p style={{ marginTop: 12 }}>
        Questions about this policy, or a request to access or delete your data, can be sent to{' '}
        <a href="mailto:vijaysakthi67@gmail.com">vijaysakthi67@gmail.com</a>.
      </p>
    </main>
  );
}
