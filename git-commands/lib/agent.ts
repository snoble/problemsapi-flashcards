// The git decks for a learner's own chat agent, over MCP: the agent lists
// the decks, starts one, asks the learner each card, and has every answer
// marked here, as the deck's page does. It is told a card's answer only
// when the learner gives up on it.
import 'server-only';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { learnerAccess, newPull } from 'flashcards-core/problemsapi';
import { post, Refused } from 'flashcards-core/request';
import { json, LearnerChecked, LearnerPull } from 'flashcards-core/schemas';

import { answerOf } from './answers';
import { app } from './flashcards';

// What the agent holds for a deck it started: the deck, the pull's key (for
// a given-up card's answer) and its token (for reading and checking it).
const Session = z.object({ deck: z.string(), key: z.string(), token: z.string() });
const SessionText = z.codec(z.base64url(), json(Session), {
  decode: (text) => Buffer.from(text, 'base64url').toString('utf8'),
  encode: (text) => Buffer.from(text, 'utf8').toString('base64url'),
});

const said = (value: Record<string, unknown>): CallToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(value) }],
  structuredContent: value,
});

// The deck a session names, refused in words the agent can pass on.
function opened(session: string) {
  const parsed = SessionText.safeParse(session);
  const deck = parsed.success ? app.findDeck(parsed.data.deck) : null;
  if (!parsed.success || !deck) throw new Refused('That session is not one start_deck gave. Start a deck again.');
  return { ...parsed.data, deck };
}

// Every tool answers in words: a refusal is a result the agent reads to the
// learner, not a protocol error.
const tool =
  <A>(run: (args: A) => Promise<CallToolResult>) =>
  async (args: A): Promise<CallToolResult> => {
    try {
      return await run(args);
    } catch (e) {
      if (!(e instanceof Refused)) console.error(`agent: ${e instanceof Error ? e.message : String(e)}`);
      const text = e instanceof Refused ? e.message : 'The flashcards service could not do that just now. Try again in a moment.';
      return { content: [{ type: 'text', text }], isError: true };
    }
  };

const instructions = `Git flashcards: you quiz the learner on git and gh commands and this server marks their answers.
Call start_deck with a deck from list_decks. Ask the learner one card at a time, in your own words or as written, and send exactly what they type to check_answer. Never answer a card yourself.
When an answer is not right, say so and let them try again. Call show_answer only when the learner says they give up on a card, then ask that card again at the end of the deck. The deck is done when every card has been answered right.`;

export function agentServer() {
  const server = new McpServer({ name: 'git-flashcards', version: '1.0.0' }, { instructions });

  server.registerTool(
    'list_decks',
    { title: 'List the decks', description: 'The decks of git and gh commands there are to practise.', annotations: { readOnlyHint: true } },
    tool(async () =>
      said({ decks: app.decks.map((d) => ({ deck: d.slug, title: d.title, about: d.intro, cards: d.size })) }),
    ),
  );

  server.registerTool(
    'start_deck',
    {
      title: 'Start a deck',
      description:
        'Deals a fresh deck: its cards, each a situation the learner answers with a command. The answers stay here. Keep the session for check_answer and show_answer.',
      inputSchema: { deck: z.string().describe('A deck from list_decks, such as git-everyday.') },
    },
    tool(async ({ deck: slug }: { deck: string }) => {
      const deck = app.findDeck(slug);
      if (!deck) throw new Refused(`There is no deck called ${slug}. The decks are ${app.decks.map((d) => d.slug).join(', ')}.`);
      const pull = await newPull(deck);
      const { questions } = await post(LearnerPull, `${pull.apiUrl}/learner/pull`, { token: pull.token }, pull.publishableKey);
      return said({
        session: SessionText.encode({ deck: deck.slug, key: pull.key, token: pull.token }),
        title: deck.title,
        cards: questions.map((q) => ({ card: q.id, situation: q.prompt })),
      });
    }),
  );

  server.registerTool(
    'check_answer',
    {
      title: 'Check an answer',
      description: "Marks the learner's answer to one card. A command that does the same thing counts as right.",
      inputSchema: {
        session: z.string().describe('The session start_deck gave.'),
        card: z.string().describe('The card being answered.'),
        answer: z.string().max(40).describe('Exactly what the learner typed.'),
      },
    },
    tool(async ({ session, card, answer }: { session: string; card: string; answer: string }) => {
      const { token } = opened(session);
      const { apiUrl, publishableKey } = learnerAccess();
      const { marks } = await post(LearnerChecked, `${apiUrl}/learner/check`, { token, by_question: [{ question: card, answer }] }, publishableKey);
      const mark = marks.find((m) => m.question === card);
      if (!mark) throw new Refused('That card is not in this deck.');
      return said({ card, right: mark.correct });
    }),
  );

  server.registerTool(
    'show_answer',
    {
      title: 'Show the answer',
      description: 'The command for one card. Only when the learner gives up on it; then ask the card again later.',
      inputSchema: { session: z.string().describe('The session start_deck gave.'), card: z.string().describe('The card given up on.') },
      annotations: { readOnlyHint: true },
    },
    tool(async ({ session, card }: { session: string; card: string }) => {
      const { deck, key } = opened(session);
      const answer = await answerOf(deck, key, card);
      if (answer === null) throw new Refused('That card is not in this deck.');
      return said({ card, answer });
    }),
  );

  return server;
}
