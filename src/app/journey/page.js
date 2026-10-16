import AppShell from '../_components/AppShell';
import JourneyTabs from './JourneyTabs';

export default function Journey() {
  return (
    <AppShell>
      <span className="eyebrow">Journey</span>
      <h1 style={{ marginTop: 10 }}>Where you started, where you are</h1>
      <p className="muted" style={{ marginTop: 10 }}>Where every topic you&apos;ve touched actually stands.</p>
      <JourneyTabs />
    </AppShell>
  );
}
