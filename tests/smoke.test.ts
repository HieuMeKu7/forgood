import { describe, it, expect } from 'vitest';
import { createBattle, endTurn, playCard, canPlayCard, runEnemyTurn, aiChooseAction, applyIntent, resolvePendingChoice, aiPickChoice } from '../src/engine';
import { SAMPLE_DECKS } from '../src/data/sampleDecks';
import { validateDeck } from '../src/engine/deck';
import { CARD_LIST } from '../src/data/cards';

describe('smoke', () => {
  it('has 210 cards across 10 characters', () => {
    expect(CARD_LIST.length).toBe(210);
  });

  it('all sample decks are valid', () => {
    for (const d of SAMPLE_DECKS) {
      const v = validateDeck(d);
      expect(v.errors, `${d.name}: ${v.errors.join('; ')}`).toEqual([]);
      expect(d.cardIds.length).toBe(30);
    }
  });

  it('plays full AI-vs-AI battles to completion for every deck pair without crashing', () => {
    for (let i = 0; i < SAMPLE_DECKS.length; i++) {
      const playerDeck = SAMPLE_DECKS[i];
      const enemyDeck = SAMPLE_DECKS[(i + 1) % SAMPLE_DECKS.length];
      const state = createBattle({ playerDeck, enemyDeck, seed: 1234 + i, aiLevel: 'normal' });
      let guard = 0;
      while (state.phase !== 'gameOver' && guard++ < 400) {
        if (state.active === 'player') {
          // player driven by AI too (self-play)
          const intent = aiChooseAction(state);
          applyIntent(state, intent);
          let g2 = 0;
          while (state.pendingChoice && g2++ < 20) resolvePendingChoice(state, aiPickChoice(state));
        } else {
          runEnemyTurn(state);
        }
      }
      expect(state.phase, `deck pair ${playerDeck.name} vs ${enemyDeck.name} did not finish (turn ${state.turn})`).toBe('gameOver');
      expect(state.winner).toBeDefined();
    }
  }, 60000);

  it('same seed reproduces the same battle', () => {
    const run = () => {
      const state = createBattle({ playerDeck: SAMPLE_DECKS[0], enemyDeck: SAMPLE_DECKS[1], seed: 777, aiLevel: 'hard' });
      let guard = 0;
      while (state.phase !== 'gameOver' && guard++ < 300) {
        const intent = aiChooseAction(state);
        applyIntent(state, intent);
        let g2 = 0;
        while (state.pendingChoice && g2++ < 20) resolvePendingChoice(state, aiPickChoice(state));
      }
      return JSON.stringify({ hp1: state.teams.player.hp, hp2: state.teams.enemy.hp, turn: state.turn, winner: state.winner, logLen: state.log.length });
    };
    expect(run()).toBe(run());
  }, 60000);

  it('basic manual play works', () => {
    const state = createBattle({ playerDeck: SAMPLE_DECKS[0], enemyDeck: SAMPLE_DECKS[1], seed: 42, aiLevel: 'easy' });
    expect(state.teams.player.hand.length).toBe(5);
    expect(state.teams.player.mana).toBe(7);
    const playable = state.teams.player.hand.filter((c) => canPlayCard(state, state.teams.player, c).ok);
    if (playable.length > 0) {
      playCard(state, playable[0].instanceId, state.teams.enemy.characters[0].characterId);
      let g = 0;
      while (state.pendingChoice && g++ < 10) resolvePendingChoice(state, aiPickChoice(state));
      expect(state.teams.player.stats.cardsPlayed).toBeGreaterThan(0);
    }
    endTurn(state);
    expect(state.active).toBe('enemy');
  });
});
