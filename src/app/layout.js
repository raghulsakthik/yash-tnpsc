import localFont from 'next/font/local';
import './proto.css';

// Self-hosted instead of next/font/google: the Google Fonts fetch at build
// time was failing outright on GitHub Actions' runners (next/font's loader
// throws on a null network response instead of degrading gracefully), and
// a build that depends on an external network call succeeding is a risk
// worth removing entirely, not just on the CI box it happened to fail on.
// Both are variable fonts -- Google serves one woff2 file covering the
// whole weight range per style, not one file per weight, which is why
// there are only 3 files for 3 weights x 2 styles x 2 families.
const fraunces = localFont({
  src: [
    { path: './_fonts/Fraunces-Normal-Variable.woff2', style: 'normal', weight: '400 600' },
    { path: './_fonts/Fraunces-Italic-Variable.woff2', style: 'italic', weight: '400 600' },
  ],
  variable: '--font-fraunces',
});

const inter = localFont({
  src: [{ path: './_fonts/Inter-Variable.woff2', style: 'normal', weight: '400 700' }],
  variable: '--font-inter',
});

export const metadata = {
  title: 'Yash',
  description: 'A personalised TNPSC prelims practice system.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // She will be on a phone. Let her zoom.
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className={`proto ${fraunces.variable} ${inter.variable}`}>
          {children}
        </div>
      </body>
    </html>
  );
}
