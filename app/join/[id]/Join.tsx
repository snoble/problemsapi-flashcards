'use client';

import { useRouter } from 'next/navigation';

import { joinBoard } from '@/lib/saved';

export default function Join({ id, name, deck }: { id: string; name: string; deck: string }) {
  const router = useRouter();
  return (
    <button
      className="primary"
      onClick={() => {
        joinBoard({ id, name, deck });
        router.push(`/d/${encodeURIComponent(deck)}`);
      }}
    >
      Join {name}
    </button>
  );
}
