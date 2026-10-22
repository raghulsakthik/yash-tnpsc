'use client';

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', width: '100vw', overflow: 'hidden', background: '#f9fafb' }}>
      <iframe
        src="/nova-ui/index.html"
        title="NOVA Learning Hub"
        style={{ display: 'block', width: '100%', height: '100vh', border: 0 }}
      />
    </main>
  );
}
