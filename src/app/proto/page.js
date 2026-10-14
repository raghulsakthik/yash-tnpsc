import Link from 'next/link';

const groups = [
  {
    name: 'Group A — Core',
    links: [
      ['/proto/landing', 'Landing'],
      ['/proto/login', 'Login'],
      ['/proto/register', 'Register'],
      ['/proto/onboarding', 'Onboarding'],
      ['/proto/placement', 'Placement Assessment'],
    ],
  },
  {
    name: 'Group B — Learning',
    links: [
      ['/proto/home', 'Home'],
      ['/proto/learn', 'Learn'],
      ['/proto/learn/mathematics', 'Subject (Mathematics)'],
      ['/proto/learn/mathematics/fractions', 'Topic (Fractions)'],
      ['/proto/lesson/fractions', 'Lesson'],
      ['/proto/practice/percentage', 'Practice'],
      ['/proto/revision', 'Revision'],
    ],
  },
  {
    name: 'Group C — Practice',
    links: [
      ['/proto/quick-lab', 'Quick Lab'],
      ['/proto/pyqs', 'PYQs'],
      ['/proto/pyqs/fractions', 'PYQ Question'],
      ['/proto/mistakes', 'Mistakes'],
    ],
  },
  {
    name: 'Group D — Assessment',
    links: [
      ['/proto/tests', 'Tests'],
      ['/proto/tests/instructions', 'Test Instructions'],
      ['/proto/tests/weekly', 'Test Interface'],
      ['/proto/tests/weekly/result', 'Test Result'],
      ['/proto/tests/weekly/review', 'Test Review'],
    ],
  },
  {
    name: 'Group E — Progress',
    links: [
      ['/proto/journey', 'Journey'],
      ['/proto/milestones', 'Milestones'],
      ['/proto/weekly-review', 'Weekly Review'],
      ['/proto/notifications', 'Notifications'],
      ['/proto/profile', 'Profile / Settings'],
    ],
  },
];

export default function ProtoIndex() {
  return (
    <main className="shell-main narrow" style={{ paddingTop: 48 }}>
      <p className="eyebrow">NOVA prototype</p>
      <h1>Twenty-six screens, mock data only</h1>
      <p className="muted" style={{ marginTop: 10 }}>
        Nothing on this site calls the backend. Every number is hardcoded. Use this
        page to jump to any screen.
      </p>

      {groups.map((g) => (
        <div key={g.name} style={{ marginTop: 36 }}>
          <h3 style={{ marginBottom: 14 }}>{g.name}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {g.links.map(([href, label]) => (
              <Link key={href} href={href} className="card" style={{
                padding: '14px 18px', display: 'flex', justifyContent: 'space-between',
                textDecoration: 'none', alignItems: 'center',
              }}>
                <span>{label}</span>
                <span className="muted">{href} →</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
