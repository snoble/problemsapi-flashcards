import Link from 'next/link';

export default function NotFound() {
  return (
    <main>
      <h1>There is no such deck</h1>
      <p>
        <Link href="/">See the decks</Link>.
      </p>
    </main>
  );
}
