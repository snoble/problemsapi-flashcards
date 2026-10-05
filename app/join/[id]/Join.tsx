'use client';

import { useRouter } from 'next/navigation';

import { joinBoard } from '@/lib/saved';

export default function Join({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  return (
    <button
      className="primary"
      onClick={() => {
        joinBoard({ id, name });
        router.push('/');
      }}
    >
      Join {name}
    </button>
  );
}
