'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from './_components/AppShell';
import ActivityGraph from './_components/ActivityGraph';
import ActivityCalendar from './_components/charts/ActivityCalendar';
import StatusPieChart from './_components/charts/StatusPieChart';
import OrbitPreview from './_components/charts/OrbitPreview';
import OnThisDay from './_components/OnThisDay';

// Hardcoded IST, not the browser's local time -- a learner (or a reviewer)
// on a device set to a different timezone would otherwise see "Good
// morning" at 8pm. Matches the same APP_TIMEZONE convention used
// server-side (src/lib/timezone.mjs) for every other date-sensitive thing
// in the app (streaks, the activity calendar, achievement timing).
const IST_HOUR_FORMATTER = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false });
const IST_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Kolkata',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

function istHour() {
  // en-US's 24h format reports midnight as "24", not "0" -- normalize it.
  const h = Number(IST_HOUR_FORMATTER.format(new Date()));
  return h === 24 ? 0 : h;
}

function greeting(hour) {
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

export default function Home() {
  const router = useRouter();
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);
  const [greetingText, setGreetingText] = useState('Good morning');
  const [name, setName] = useState(null);

  useEffect(() => {
    setGreetingText(greeting(istHour()));
  }, []);

  // Admin accounts have no learner data -- there's no daily plan to show
  // them, so they go straight to Profile instead of seeing a plan error.
  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((me) => {
        if (me?.role === 'admin') router.replace('/profile');
      })
      .catch(() => {});
  }, [router]);

  // A learner whose first-login onboarding + placement quiz isn't done yet
  // never sees Home until it is -- existing accounts (Yashika, the dev
  // test account) were back-filled to onboarded=true by the migration, so
  // this only ever fires for a genuinely new learner.
  useEffect(() => {
    fetch('/api/profile', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.onboarded === false) router.replace('/onboarding');
      })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    fetch('/api/profile', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.name) setName(data.name);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/plan/today', { cache: 'no-store' })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.message ?? "Could not load today's plan");
        setPlan(data);
      })
      .catch((err) => setError(err.message));
  }, []);

  const ctaHref =
    plan?.primaryAction === 'MEMORY_ECHO'
      ? '/revision'
      : plan?.topicId
        ? `/practice/${plan.topicId}`
        : '/practice/aptitude.fractions';

  const ctaLabel = plan?.primaryAction === 'MEMORY_ECHO' ? 'Review now' : 'Continue';

  return (
    <AppShell>
      <span className="muted" style={{ fontSize: '0.85rem', letterSpacing: '0.04em' }}>
        {IST_DATE_FORMATTER.format(new Date()).toUpperCase()}
      </span>
      <h1 style={{ marginTop: 14 }}>{greetingText}{name ? `, ${name}` : ''}.</h1>

      {error && (
        <div className="card" style={{ marginTop: 20, background: 'var(--warm-tint)' }}>
          <p>Could not load today&apos;s plan: {error}</p>
        </div>
      )}

      {!error && !plan && <p className="muted" style={{ marginTop: 14 }}>Loading today&apos;s plan…</p>}

      {!error && plan && (
        <div className="card" style={{ marginTop: 20 }}>
          {plan.revisionDue > 0 && plan.primaryAction !== 'MEMORY_ECHO' && (
            <span className="badge badge-revision-due" style={{ marginBottom: 14, display: 'inline-flex' }}>
              {plan.revisionDue} topic{plan.revisionDue === 1 ? '' : 's'} due for review
            </span>
          )}
          <span className="eyebrow" style={{ color: 'var(--warm-accent)', display: 'block' }}>
            {plan.primaryAction === 'MEMORY_ECHO' ? 'Memory echo' : 'Next small win'}
          </span>
          <h2 style={{ marginTop: 10 }}>
            {plan.primaryAction === 'NONE'
              ? 'Ten questions, adapting to you'
              : plan.reason}
          </h2>
          {plan.estimatedMinutes > 0 && (
            <p className="muted" style={{ marginTop: 8 }}>About {plan.estimatedMinutes} minutes.</p>
          )}
          <Link href={ctaHref} className="btn btn-primary" style={{ marginTop: 18 }}>
            {ctaLabel}
          </Link>
        </div>
      )}

      <div className="grid-3" style={{ marginTop: 20 }}>
        <Link href="/tests" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <strong style={{ display: 'block' }}>Weekly test</strong>
          <span className="muted" style={{ fontSize: '0.85rem' }}>25 questions across the full syllabus</span>
        </Link>
        <Link href="/mistakes" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <strong style={{ display: 'block' }}>Review mistakes</strong>
          <span className="muted" style={{ fontSize: '0.85rem' }}>Retry what you've got wrong before</span>
        </Link>
        <Link href="/learn" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <strong style={{ display: 'block' }}>Browse subjects</strong>
          <span className="muted" style={{ fontSize: '0.85rem' }}>See the full syllabus tree</span>
        </Link>
      </div>

      <h2 style={{ marginTop: 36, marginBottom: 4 }}>Your real numbers</h2>
      <p className="muted" style={{ marginBottom: 16 }}>Every chart below is built from your actual attempt history — nothing here is a placeholder.</p>

      <div className="grid-2" style={{ gap: 16, alignItems: 'start' }}>
        <div className="card">
          <span className="eyebrow">Login &amp; activity calendar</span>
          <div style={{ marginTop: 14 }}>
            <ActivityCalendar />
          </div>
        </div>
        <div className="card">
          <span className="eyebrow">Where every topic stands</span>
          <div style={{ marginTop: 14 }}>
            <StatusPieChart />
          </div>
        </div>
        <div className="card">
          <ActivityGraph />
        </div>
        <div className="card">
          <span className="eyebrow">Learning orbit</span>
          <div style={{ marginTop: 14 }}>
            <OrbitPreview />
          </div>
        </div>
      </div>

      <OnThisDay />
    </AppShell>
  );
}
