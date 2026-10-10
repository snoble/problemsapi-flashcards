import { headers } from 'next/headers';
import Link from 'next/link';

import { Brand } from 'flashcards-core/pages';

import { app } from '@/lib/flashcards';

export default async function Home() {
  const sent = await headers();
  const agentUrl = `${sent.get('x-forwarded-proto') ?? 'http'}://${sent.get('host')}/mcp`;
  return (
    <main>
      <Brand />
      <div className="intro">
        <h1>Git flashcards</h1>
        <p>Pick a deck. Each card describes a situation; type the command for it. The Problems API checks your answers.</p>
      </div>
      <ul className="decks">
        {app.decks.map((d) => (
          <li key={d.slug}>
            <Link href={app.path(d)}>
              <strong>{d.title}</strong>
              <span>{d.intro}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="hint">
        Or practise with your own chat agent: add <code>{agentUrl}</code> as an MCP connector, and it
        asks you the cards while this app checks your answers.
      </p>
    </main>
  );
}
