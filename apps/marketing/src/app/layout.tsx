import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import './globals.css';

const title = 'CulinaryOS | Open-source hospitality technology';
const description = 'CulinaryOS builds open-source software and equipment for hospitality and foodservice, starting with restaurants and food trucks.';

export const metadata: Metadata = {
  title: { default: title, template: '%s | CulinaryOS' },
  description,
  openGraph: { title, description, siteName: 'CulinaryOS', type: 'website' },
  twitter: { card: 'summary', title, description },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans bg-[#0f0f0f] text-white antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
