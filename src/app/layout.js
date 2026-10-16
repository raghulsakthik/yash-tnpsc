import { Fraunces, Inter } from 'next/font/google';
import './proto.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
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
