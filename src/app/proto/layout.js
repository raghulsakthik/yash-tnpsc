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
  title: 'NOVA — prototype',
};

export default function ProtoLayout({ children }) {
  return (
    <div className={`proto ${fraunces.variable} ${inter.variable}`}>
      {children}
    </div>
  );
}
