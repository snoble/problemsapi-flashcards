'use client';

import Deck, { AnswerBox, Mark, Moves, useDeck } from 'flashcards-core/Flashcards';
import { post } from 'flashcards-core/request';
import type { Card, DeckView, Pull } from 'flashcards-core/schemas';
import { z } from 'zod';

const Revealed = z.object({ answer: z.string() });

// A typed command is taken as typed: no capitals, corrections or spelling marks.
const asTyped = { autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false, maxLength: 40 } as const;

// Each card asks for a git or gh command. A learner who gives up is shown
// the answer by this app's server, which holds the secret key.
export default function Commands({ deck, firstPull }: { deck: DeckView; firstPull: Promise<Pull | null> }) {
  const play = useDeck(deck, firstPull);
  const answerOf = async (pull: Pull, card: Card) =>
    (await post(Revealed, '/api/deck/answer', { deck: deck.slug, key: pull.key, question: card.id })).answer;
  return (
    <Deck play={play}>
      {play.card && (
        <>
          <p className="question words" data-testid="question" data-prompt={play.card.prompt}>
            {play.card.prompt}
          </p>
          <AnswerBox play={play} {...asTyped} />
          <Mark play={play}>
            {play.result === 'right' && 'Right!'}
            {play.result === 'shown' && (
              <>
                The answer is <strong data-testid="answer">{play.shown}</strong>. It comes back later, and counts as a mistake.
              </>
            )}
          </Mark>
          <Moves play={play}>
            <button key="reveal" onClick={() => play.giveUp(answerOf)} disabled={play.busy}>
              Show answer
            </button>
          </Moves>
        </>
      )}
    </Deck>
  );
}
