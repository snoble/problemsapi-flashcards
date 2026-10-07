'use client';

import { useRouter } from 'next/navigation';

import { joinBoard } from '@/lib/saved';

export default function Join({ id, name, deck, href }: { id: string; name: string; deck: string; href: string }) {
  const router = useRouter();
  return (
    <button
      className="primary"
      onClick={() => {
        joinBoard({ id, name, deck });
        router.push(href);
      }}
    >
      Join {name}
    </button>
  );
}
