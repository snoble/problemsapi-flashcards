import { notFound, redirect } from 'next/navigation';

import { app } from '@/lib/flashcards';

// Links from when this app served several decks lead to the front page.
export default async function OldDeckLink({ params }: PageProps<'/d/[slug]'>) {
  if (!app.findDeck((await params).slug)) notFound();
  redirect('/');
}
