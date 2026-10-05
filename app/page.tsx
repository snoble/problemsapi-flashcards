import Flashcards from './Flashcards';

export default function Home() {
  return (
    <main>
      <p className="brand">
        Built on the <a href="https://problemsapi.com">Problems API</a>
      </p>
      <div className="intro">
        <h1>Times tables flashcards</h1>
        <p>Each deck is 12 cards from the times tables up to 12 × 12. Type your answer and the API checks it.</p>
      </div>
      <Flashcards />
    </main>
  );
}
