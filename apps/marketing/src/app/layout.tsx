import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: 'CulinaryOS — AI-Native Restaurant Operating System',
    template: '%s | CulinaryOS',
  },
  description:
    'The AI-native restaurant operating system. POS, KDS, Online Ordering, KitchenKit, CulinaryOps — one platform for every surface of your kitchen.',
  keywords: ['restaurant POS', 'kitchen display system', 'restaurant software', 'restaurant OS', 'CulinaryOS'],
  openGraph: {
    title: 'CulinaryOS — AI-Native Restaurant Operating System',
    description: 'One platform. Every surface. Any kitchen.',
    url: 'https://culinaryos.io',
    siteName: 'CulinaryOS',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CulinaryOS',
    description: 'The AI-native restaurant operating system.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-[#0f0f0f] text-white antialiased`}>
        <Header />
        <main className="pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
