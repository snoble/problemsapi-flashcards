import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import 'katex/dist/katex.min.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Times Tables Flashcards',
  description: 'Times-table flashcards to 12 x 12, with questions and answer checks from the Problems API.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
