import './globals.css';

export const metadata = {
  title: 'NOVA',
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
      <body>{children}</body>
    </html>
  );
}
