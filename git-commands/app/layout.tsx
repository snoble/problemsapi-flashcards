import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import 'flashcards-core/flashcards.css';

export const metadata: Metadata = {
  title: 'Git flashcards',
  description: 'Flashcards of git and gh commands, with questions and answer checks from the Problems API.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
