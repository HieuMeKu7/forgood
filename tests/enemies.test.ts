import { describe, it, expect } from 'vitest';
import {
  createBattle, endTurn, validateDeck, previewEnemyIntent,
  buildEnemyDeck, validateEnemySystem, resolveEnemyLoadout,
  applyEnemyModifiers, pickEnemyForSeed, getEnemyById,
  aiChooseAction, applyIntent, aiPickChoice, resolvePendingChoice, runEnemyTurn,
} from '../src/engine';
import { getStatus, findChar } from '../src/engine/battle';
import { ENEMIES, ENEMY_MODIFIERS, ENEMY_PROFILES } from '../src/data/enemies';
import { ENEMY_DECKS } from '../src/data/enemyDecks';
import { SAMPLE_DECKS } from '../src/data/sampleDecks';
import type { EnemyProfileId } from '../src/types/enemy';

const PROFILES: EnemyProfileId[] = ['easy', 'normal', 'hard', 'boss'];

describe('enemy system — data validation', () => {
  it('has exactly 10 enemy definitions with unique ids and unique decks', () => {
    expect(ENEMIES.length).toBe(10);
    expect(new Set(ENEMIES.map((e) => e.id)).size).toBe(10);
    expect(new Set(ENEMIES.map((e) => e.deckId)).size).toBe(10);
  });

  it('every enemy passes system validation with a valid 30-card deck', () => {
    for (const entry of validateEnemySystem()) {
      expect(entry.errors, `${entry.enemyId}: ${entry.errors.join('; ')}`).toEqual([]);
      expect(entry.deckValidation.errors, `${entry.enemyId} deck: ${entry.deckValidation.errors.join('; ')}`).toEqual([]);
    }
    for (const enemy of ENEMIES) {
      const deck = buildEnemyDeck(enemy);
      expect(deck.cardIds.length).toBe(30);
      expect(validateDeck(deck).valid).toBe(true);
    }
  });

  it('all referenced modifiers exist; boss-only modifiers never leak into non-boss profiles', () => {
    for (const enemy of ENEMIES) {
      for (const mid of [...enemy.modifierIds, ...enemy.bossModifierIds]) {
        expect(ENEMY_MODIFIERS[mid], `missing modifier ${mid}`).toBeDefined();
      }
      for (const pid of PROFILES.filter((p) => p !== 'boss')) {
        const loadout = resolveEnemyLoadout(enemy.id, pid);
        expect(loadout.modifiers.some((m) => m.bossOnly)).toBe(false);
      }
    }
  });

  it('has all four profiles with the required AI levels', () => {
    expect(ENEMY_PROFILES.easy.aiLevel).toBe('easy');
    expect(ENEMY_PROFILES.normal.aiLevel).toBe('normal');
    expect(ENEMY_PROFILES.hard.aiLevel).toBe('hard');
    expect(ENEMY_PROFILES.boss.aiLevel).toBe('hard');
    expect(ENEMY_PROFILES.boss.isBoss).toBe(true);
  });

  it('boss profile applies the enemy-specific boss modifiers on top of generic ones', () => {
    const normal = resolveEnemyLoadout('enemy-vy', 'normal');
    const boss = resolveEnemyLoadout('enemy-vy', 'boss');
    const bossIds = boss.modifiers.map((m) => m.id);
    for (const mid of getEnemyById('enemy-vy').bossModifierIds) expect(bossIds).toContain(mid);
    for (const mid of ENEMY_PROFILES.boss.modifierIds) expect(bossIds).toContain(mid);
    expect(normal.modifiers.map((m) => m.id)).not.toContain('boss-vitality');
    expect(boss.displayName).toContain('(Boss)');
  });
});

describe('enemy system — battle integration', () => {
  function makeBossBattle(seed: number) {
    const loadout = resolveEnemyLoadout('enemy-vy', 'boss');
    const state = createBattle({
      playerDeck: SAMPLE_DECKS[0],
      enemyDeck: buildEnemyDeck(loadout.enemy),
      seed,
      aiLevel: loadout.aiLevel,
    });
    applyEnemyModifiers(state, loadout.modifiers);
    return { state, loadout };
  }

  it('applies boss modifiers: hp, ult charge, opening bleed, per-turn mana', () => {
    const { state } = makeBossBattle(99);
    const enemy = state.teams.enemy;
    // boss-vitality +15
    expect(enemy.maxHp).toBe(65);
    expect(enemy.hp).toBe(65);
    // grudge: starting relationship -2
    expect(enemy.relationship).toBe(-2);
    // boss-awakened: 10 ult charge each
    for (const c of enemy.characters) expect(c.ultimateCharge).toBeGreaterThanOrEqual(10);
    // boss-cruel-opening: player starts bleeding 2
    expect(getStatus(state.teams.player, 'bleed')?.stacks).toBe(2);
    // boss-flow: +1 mana at enemy turn start (7+1 = 8)
    endTurn(state); // player -> enemy turn starts
    expect(enemy.mana).toBe(8);
  });

  it('same seed produces identical enemy shuffles and identical intent previews', () => {
    const a = makeBossBattle(4242).state;
    const b = makeBossBattle(4242).state;
    expect(a.teams.enemy.drawPile.map((c) => c.defId)).toEqual(b.teams.enemy.drawPile.map((c) => c.defId));
    expect(a.teams.player.drawPile.map((c) => c.defId)).toEqual(b.teams.player.drawPile.map((c) => c.defId));
    expect(previewEnemyIntent(a)).toEqual(previewEnemyIntent(b));
  });

  it('intent preview is pure: it never mutates the game state', () => {
    const { state } = makeBossBattle(7);
    const before = JSON.stringify(state);
    const intent = previewEnemyIntent(state);
    expect(intent.kind).toBeDefined();
    expect(JSON.stringify(state)).toBe(before);
  });

  it('pickEnemyForSeed is deterministic and never falls back to SAMPLE_DECKS', () => {
    const e1 = pickEnemyForSeed(123456);
    const e2 = pickEnemyForSeed(123456);
    expect(e1.id).toBe(e2.id);
    expect(ENEMIES.some((e) => e.id === e1.id)).toBe(true);
    // enemy decks are their own registry, distinct from sample decks
    expect(SAMPLE_DECKS.some((d) => d.id === ENEMY_DECKS[e1.deckId].id)).toBe(false);
  });

  it('a full battle against an enemy loadout runs to completion deterministically', () => {
    const run = () => {
      const loadout = resolveEnemyLoadout('enemy-truc', 'hard');
      const state = createBattle({
        playerDeck: SAMPLE_DECKS[5], // Yến + Khanh
        enemyDeck: buildEnemyDeck(loadout.enemy),
        seed: 20260726,
        aiLevel: loadout.aiLevel,
      });
      applyEnemyModifiers(state, loadout.modifiers);
      let guard = 0;
      while (state.phase !== 'gameOver' && guard++ < 400) {
        if (state.active === 'player') {
          const intent = aiChooseAction(state);
          applyIntent(state, intent);
          let g2 = 0;
          while (state.pendingChoice && g2++ < 20) resolvePendingChoice(state, aiPickChoice(state));
        } else {
          runEnemyTurn(state);
        }
      }
      expect(state.phase).toBe('gameOver');
      return JSON.stringify({ winner: state.winner, turn: state.turn, hpP: state.teams.player.hp, hpE: state.teams.enemy.hp, log: state.log.length });
    };
    expect(run()).toBe(run());
  }, 60000);
});
