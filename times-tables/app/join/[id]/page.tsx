import { JoinPage } from 'flashcards-core/pages';

import { app } from '@/lib/flashcards';

export default async function Join({ params }: PageProps<'/join/[id]'>) {
  return <JoinPage app={app} id={(await params).id} />;
}
