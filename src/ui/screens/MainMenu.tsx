import React, { useState } from 'react';
import type { AILevel, Deck } from '../../engine/types';
import { useApp } from '../../store/appStore';
import { SAMPLE_DECKS } from '../../data/sampleDecks';
import { CHARACTERS } from '../../data/characterMeta';
import { validateDeck, generateRandomDeck } from '../../engine/deck';

function deckCharNames(deck: Deck): string {
  return deck.characterIds.map((id) => CHARACTERS[id]?.name ?? id).join(' + ');
}

export function MainMenu(): JSX.Element {
  const app = useApp();
  const [showDeckSelect, setShowDeckSelect] = useState(false);
  const [aiLevel, setAiLevel] = useState<AILevel>(app.settings.aiLevel);

  const savedValidDecks = app.decks.filter((d) => validateDeck(d).valid);

  const start = (deck: Deck) => {
    app.startBattle(deck, { aiLevel });
  };

  const startRandom = () => {
    const now = Date.now();
    const generated = generateRandomDeck(now);
    const deck: Deck = {
      id: 'random-' + now,
      name: 'Deck Ngẫu Nhiên',
      characterIds: generated.characterIds,
      cardIds: generated.cardIds,
      createdAt: now,
      updatedAt: now,
    };
    app.startBattle(deck, { aiLevel });
  };

  return (
    <div className="screen">
      <div className="logo">
        <span className="half-friend">FRIEND</span>
        <span className="half-slash">/</span>
        <span className="half-betray">BETRAYAL</span>
      </div>
      <div className="logo-sub">IS FUN</div>

      <div className="menu-list">
        <button className="primary" onClick={() => setShowDeckSelect((v) => !v)}>New Game</button>

        {showDeckSelect && (
          <div className="panel">
            <div className="row spread" style={{ marginBottom: 10 }}>
              <strong>Chọn deck</strong>
              <label className="row">
                <span className="dim">Độ khó AI</span>
                <select value={aiLevel} onChange={(e) => setAiLevel(e.target.value as AILevel)}>
                  <option value="easy">Dễ</option>
                  <option value="normal">Thường</option>
                  <option value="hard">Khó</option>
                </select>
              </label>
            </div>

            {savedValidDecks.length > 0 && (
              <>
                <div className="dim" style={{ marginBottom: 6 }}>Deck của bạn</div>
                {savedValidDecks.map((deck) => (
                  <button
                    key={deck.id}
                    onClick={() => start(deck)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 6 }}
                  >
                    {deck.name} <span className="dim">— {deckCharNames(deck)}</span>
                  </button>
                ))}
              </>
            )}

            <div className="dim" style={{ margin: '6px 0' }}>Deck mẫu</div>
            {SAMPLE_DECKS.map((deck) => (
              <button
                key={deck.id}
                onClick={() => start(deck)}
                style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 6 }}
              >
                {deck.name} <span className="dim">— {deckCharNames(deck)}</span>
              </button>
            ))}

            <button className="betrayal" onClick={startRandom} style={{ display: 'block', width: '100%', marginTop: 8 }}>
              Deck ngẫu nhiên
            </button>
          </div>
        )}

        <button onClick={() => app.editDeck(undefined)}>Deck Builder</button>
        <button onClick={() => app.navigate('characters')}>Characters</button>
        <button onClick={() => app.navigate('library')}>Card Library</button>
        <button onClick={() => app.navigate('history')}>Match History</button>
        <button onClick={() => app.navigate('settings')}>Settings</button>
        <button onClick={() => app.navigate('howto')}>How to Play</button>
      </div>
    </div>
  );
}
