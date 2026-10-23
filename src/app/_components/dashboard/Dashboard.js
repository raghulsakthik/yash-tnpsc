'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import styles from './Dashboard.module.css';

const nav = [
  ['⌂', 'Home', '/'], ['▤', 'Courses', '/courses'], ['☆', 'Bookmarks', '/bookmarks'], ['▣', 'Learn', '/learn'],
  ['◉', 'Practice', '/practice'], ['⌁', 'Quick Lab', '/quick-lab'], ['◫', 'PYQs', '/pyqs'],
  ['✓', 'Tests', '/tests'], ['↗', 'Journey', '/journey'],
];

function unitHref(u) {
  if (u.unitType === 'TEST') return `/tests/weekly?unit=${encodeURIComponent(u.id)}`;
  if (u.topicId && u.unitType === 'CONCEPT') return `/lesson/${u.topicId}?unit=${encodeURIComponent(u.id)}`;
  if (u.topicId && u.unitType === 'PYQ') return `/pyqs/${u.topicId}?unit=${encodeURIComponent(u.id)}`;
  if (u.topicId) return `/practice/${u.topicId}?unit=${encodeURIComponent(u.id)}`;
  return '/learn';
}
function level(count) { return !count ? '' : count <= 2 ? styles.level1 : count <= 6 ? styles.level2 : count <= 12 ? styles.level3 : styles.level4; }

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard', { cache: 'no-store' }),
      fetch('/api/plan/today', { cache: 'no-store' }),
    ]).then(async ([a, b]) => {
      const da = await a.json();
      if (!a.ok) throw new Error(da.message || 'Dashboard data unavailable');
      const db = b.ok ? await b.json() : null;
      setData({ ...da, plan: db });
    }).catch(e => setError(e.message));
  }, []);

  const heatmap = useMemo(() => data?.activity?.heatmap || [], [data]);
  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : h < 21 ? 'Good Evening' : 'Good Night'; })();

  if (error) return <div className={styles.dashboard}><main className={styles.centerState}><h2>Dashboard unavailable</h2><p>{error}</p><Link href="/login" className={styles.primary}>Sign in</Link></main></div>;
  if (!data) return <div className={styles.dashboard}><main className={styles.centerState}>Loading your learning workspace…</main></div>;

  const c = data.curriculum;
  const pct = c?.progress?.percentage || 0;
  const next = data.currentUnits?.[0];
  const name = data.learner?.name || 'Yashika';
  const planHref = data.plan?.topicId ? `/practice/${data.plan.topicId}` : next ? unitHref(next) : '/learn';

  return <div className={styles.dashboard}>
    <aside className={styles.sidebar}>
      <div className={styles.userHead}><div className={styles.avatarLarge}>{name[0]}</div><div><b>{name}</b><small>Student · Pro Learner</small></div></div>
      <div className={styles.sectionLabel}>Learning Menu</div>
      <nav className={styles.nav}>{nav.map(([icon, label, href]) => <Link key={href} href={href} className={href === '/' ? styles.active : ''}><span>{icon}</span>{label}{label === 'Bookmarks' && data.bookmarkCount > 0 ? <em>{data.bookmarkCount}</em> : null}</Link>)}</nav>
      <div className={styles.sideBottom}><div className={styles.sectionLabel}>Account</div><Link href="/notifications">● Notifications</Link><Link href="/profile">⚙ Settings &amp; Profile</Link></div>
    </aside>

    <div className={styles.workspace}>
      <header className={styles.topbar}>
        <div className={styles.greeting}><h1>{greeting}, {name} <span>✨</span></h1><label>● On Track · Day {c?.day?.number || 1}</label></div>
        <div className={styles.actions}>
          <button className={styles.searchButton} onClick={() => setSearch(v => !v)}>⌕ &nbsp; Search lessons, PYQs, topics…</button>
          <Link href="/notifications" className={styles.iconButton}>♢</Link><Link href="/profile" className={styles.avatar}>{name[0]}</Link>
        </div>
      </header>
      {search && <div className={styles.searchPop}><b>Search YASH</b><p>Find lessons, concepts, PYQs and practice questions.</p><Link href="/search" className={styles.primary}>Open Search →</Link></div>}

      <main className={styles.main}>
        <div className={styles.overview}>
          <section className={styles.overviewCard}><span className={styles.cardIcon}>▣</span><label>ACTIVE TRACK</label><small>Current Course</small><h3>{c?.name || 'TNPSC Group 2'}</h3><footer><span>{pct}% Completed</span><b>{c?.progress?.completed || 0} / {c?.progress?.total || 0} Units</b></footer></section>
          <section className={styles.overviewCard}><span className={styles.fire}>♨</span><label>STREAK</label><small>Learning Practice</small><h3>{data.streak || 0} Day Streak</h3><footer><span>Questions today</span><b>{data.activity.todayQuestions}</b></footer></section>
          <section className={styles.overviewCard}><span className={styles.teal}>⌁</span><label>ADAPTIVE PATH</label><small>Current Level</small><h3>{c?.phase?.name || 'Foundation'}</h3><footer><span>Weekly objective</span><b>Week {c?.week?.number || 1}</b></footer></section>
        </div>

        <section className={styles.continueCard}>
          <div className={styles.cardHeader}><div><span className={styles.tag}>IN PROGRESS</span><small> · Adaptive next step</small><h2>Continue Learning</h2></div><Link href="/journey">View journey →</Link></div>
          <div className={styles.continueGrid}>
            <div className={styles.learningVisual}><span>{c?.day?.title || 'Current learning day'}</span><div className={styles.play}>▶</div><small>{c?.day?.purpose || 'Learn, practise, test and improve.'}</small></div>
            <div className={styles.learningBody}><label>{c?.phase?.name || 'TNPSC Group 2'} · Week {c?.week?.number || 1}</label><h2>{next?.title || c?.week?.objective || 'Continue your adaptive learning path'}</h2><p>{next?.topicName ? `${next.topicName} · ${next.unitType.replaceAll('_', ' ')}` : c?.day?.purpose}</p><div className={styles.progressRow}><span>Curriculum completion</span><b>{pct}%</b></div><div className={styles.progress}><span style={{ width: `${pct}%` }}/></div><div className={styles.buttonRow}><Link href={planHref} className={styles.primary}>Continue →</Link><Link href="/learn" className={styles.secondary}>View syllabus</Link></div></div>
          </div>
        </section>

        <div className={styles.columns}>
          <div className={styles.leftStack}>
            <section className={styles.card}><div className={styles.cardHeader}><div><span className={styles.eyebrow}>TODAY'S LEARNING QUEUE</span><h2>Your next actions</h2></div><Link href="/learn">Full curriculum →</Link></div><div className={styles.queue}>{(data.currentUnits || []).map((u, i) => <div className={styles.queueItem} key={u.id}><div><b>{i + 1}. {u.title}</b><small>{u.topicName || u.unitType.replaceAll('_', ' ')} · {u.estimatedMinutes} min</small></div><Link href={unitHref(u)} className={styles.secondary}>{u.progressStatus === 'COMPLETED' ? 'Done' : 'Start'}</Link></div>)}</div></section>
            <section className={styles.card}><span className={styles.eyebrow}>LEARNING ACTIVITY</span><div className={styles.metrics}><div><strong>{data.activity.todayQuestions}</strong><small>Questions today</small></div><div><strong>{data.activity.activeDays}</strong><small>Active days / year</small></div><div><strong>{data.activity.totalQuestions}</strong><small>Questions solved</small></div></div><div className={styles.heatmap}>{heatmap.map(d => <span key={d.date} className={level(d.count)} title={`${d.date}: ${d.count} questions`}/>)}</div></section>
            <section className={styles.card}><span className={styles.eyebrow}>PROGRESS BY SUBJECT</span><div className={styles.subjects}>{data.subjects.map(s => <div className={styles.subject} key={s.id}><div><b>{s.name}</b><strong>{s.mastery}%</strong></div><div className={styles.miniProgress}><span style={{ width: `${Math.min(100, s.mastery)}%` }}/></div><small>{s.attemptedTopics}/{s.topicCount} topics attempted · {s.attempts} questions</small></div>)}</div></section>
          </div>

          <aside className={styles.rightStack}>
            <section className={styles.card}><div className={styles.rank}><div className={styles.rankRing}>{pct}%</div><div><b>{name}</b><small>{c?.phase?.name || 'Learner'} · Level {c?.phase?.level || 1}</small></div></div><div className={styles.rightMetrics}><div><strong>{data.activity.totalQuestions}</strong><small>Questions</small></div><div><strong>{data.activity.activeDays}</strong><small>Active days</small></div></div><div className={styles.progressRow}><span>Course completion</span><b>{pct}%</b></div><div className={styles.progress}><span style={{ width: `${pct}%` }}/></div></section>
            <section className={styles.card}><span className={styles.eyebrow}>EARNED BADGES</span><div className={styles.badges}>{data.badges.length ? data.badges.map(b => <div className={styles.badge} key={b.id}><div>{b.icon || '◆'}</div><b>{b.name}</b><small>Verified achievement</small></div>) : <p>No badges yet — complete learning actions to unlock one.</p>}</div><Link href="/achievements" className={styles.textLink}>View all →</Link></section>
            <section className={styles.card}><span className={styles.eyebrow}>FOCUS AREAS</span><p className={styles.help}>YASH uses measured mastery to focus your next practice.</p>{data.weakTopics.length ? data.weakTopics.map(w => <div className={styles.weak} key={w.topicId}><span><b>{w.topicName}</b><small>{w.subjectName} · {w.attempts} attempts</small></span><strong>{w.mastery}%</strong></div>) : <p>No weak-topic signal yet. Start practising to generate one.</p>}</section>
          </aside>
        </div>
      </main>
      <nav className={styles.mobileNav}>{nav.slice(0, 5).map(([icon, label, href]) => <Link key={href} href={href} className={href === '/' ? styles.active : ''}><span>{icon}</span>{label}</Link>)}</nav>
    </div>
  </div>;
}
