import Link from 'next/link';

export default function NotFound() {
  return (
    <main>
      <h1>That board does not exist</h1>
      <p>
        Check the invite link, or <Link href="/">make a board of your own</Link>.
      </p>
    </main>
  );
}
