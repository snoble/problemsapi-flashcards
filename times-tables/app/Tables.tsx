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
            {play.result === 'right' && `Right! ${play.card.prompt} ${play.answer.trim()}`}
            {play.result === 'unread' && 'Type a number.'}
          </Mark>
          <Moves play={play} />
        </>
      )}
    </Deck>
  );
}
