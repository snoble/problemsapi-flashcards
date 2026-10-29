'use client';

import Deck, { AnswerBox, Mark, Moves, useDeck } from 'flashcards-core/Flashcards';
import type { Card, DeckView, Pull } from 'flashcards-core/schemas';
import katex from 'katex';

// The question's LaTeX, typeset with KaTeX, or its words when it has none.
function Question({ card }: { card: Card }) {
  if (card.type === 'text' || card.latex == null)
    return (
      <p className="question" data-testid="question" data-prompt={card.prompt}>
        {card.prompt}
      </p>
    );
  const html = katex.renderToString(card.latex, { throwOnError: false });
  return <p className="question" data-testid="question" data-prompt={card.prompt} dangerouslySetInnerHTML={{ __html: html }} />;
}

// The card's fact with its answer in place: the blank of "3 × _ = 18"
// filled in, or the answer after "7 × 8 =". The answer was marked right, so
// it is a number, and shows as one (06 as 6).
const solved = (prompt: string, answer: string) =>
  prompt.includes('_') ? prompt.replace('_', answer) : `${prompt} ${answer}`;

// Practice against the clock: the answer is typed on a number pad, and a
// card never shows its answer.
export default function Tables({ deck, firstPull }: { deck: DeckView; firstPull: Promise<Pull | null> }) {
  const play = useDeck(deck, firstPull);
  return (
    <Deck play={play}>
      {play.card && (
        <>
          <Question card={play.card} />
          <AnswerBox play={play} inputMode="numeric" />
          <Mark play={play}>
            {play.result === 'right' && `Right! ${solved(play.card.prompt, String(Number(play.answer)))}`}
            {play.result === 'unread' && 'Type a number.'}
          </Mark>
          <Moves play={play} />
        </>
      )}
    </Deck>
  );
}
