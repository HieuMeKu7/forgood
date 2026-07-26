// ============================================================
// Enemy loadout resolution: EnemyDefinition + EnemyProfile
// → battle-ready deck, AI level and stat modifiers.
// The battle AI runtime itself stays in src/engine/ai.ts.
// ============================================================

import type { AILevel, Deck, DeckValidation, GameState } from './types';
import { RULES } from './types';
import type { EnemyDefinition, EnemyLoadout, EnemyModifier, EnemyProfileId } from '../types/enemy';
import { ENEMIES, ENEMY_MODIFIERS, ENEMY_PROFILES, getEnemyDef } from '../data/enemies';
import { ENEMY_DECKS } from '../data/enemyDecks';
import { validateDeck } from './deck';
import { addTeamStatus, chargeUltimate, gainVouchers, setRel } from './battle';
import { mulberry32Next, toSeed } from './rng';

export function getEnemyById(id: string): EnemyDefinition {
  const def = getEnemyDef(id);
  if (!def) throw new Error(`Unknown enemy id: ${id}`);
  return def;
}

/** The enemy's dedicated 30-card deck (validated). */
export function buildEnemyDeck(enemy: EnemyDefinition): Deck {
  const deck = ENEMY_DECKS[enemy.deckId];
  if (!deck) throw new Error(`Enemy ${enemy.id} references missing deck ${enemy.deckId}`);
  const v = validateDeck(deck);
  if (!v.valid) throw new Error(`Enemy deck ${deck.id} invalid: ${v.errors.join('; ')}`);
  if (deck.characterIds.join(',') !== enemy.characterIds.join(',')) {
    throw new Error(`Enemy ${enemy.id} characters do not match deck ${deck.id}`);
  }
  return deck;
}

/** Validate every enemy entry + deck; used by tests and dev checks. */
export function validateEnemySystem(): { enemyId: string; deckValidation: DeckValidation; errors: string[] }[] {
  return ENEMIES.map((enemy) => {
    const errors: string[] = [];
    const deck = ENEMY_DECKS[enemy.deckId];
    const deckValidation = deck ? validateDeck(deck) : { valid: false, errors: ['missing deck'], warnings: [] };
    if (!deck) errors.push(`Deck ${enemy.deckId} không tồn tại.`);
    else if (deck.characterIds.join(',') !== enemy.characterIds.join(',')) errors.push('Nhân vật deck không khớp enemy.');
    for (const mid of [...enemy.modifierIds, ...enemy.bossModifierIds]) {
      if (!ENEMY_MODIFIERS[mid]) errors.push(`Modifier không tồn tại: ${mid}`);
    }
    for (const mid of enemy.modifierIds) {
      if (ENEMY_MODIFIERS[mid]?.bossOnly) errors.push(`Modifier boss-only nằm trong modifierIds thường: ${mid}`);
    }
    return { enemyId: enemy.id, deckValidation, errors };
  });
}

/** Resolve enemy + profile into everything a battle needs. */
export function resolveEnemyLoadout(enemyId: string, profileId: EnemyProfileId): EnemyLoadout {
  const enemy = getEnemyById(enemyId);
  const profile = ENEMY_PROFILES[profileId];
  if (!profile) throw new Error(`Unknown enemy profile: ${profileId}`);
  const modifierIds = [
    ...profile.modifierIds,
    ...enemy.modifierIds,
    ...(profile.isBoss ? enemy.bossModifierIds : []),
  ];
  const modifiers = [...new Set(modifierIds)].map((id) => {
    const m = ENEMY_MODIFIERS[id];
    if (!m) throw new Error(`Unknown enemy modifier: ${id}`);
    return m;
  });
  return {
    enemy,
    profile,
    aiLevel: profile.aiLevel,
    modifiers,
    displayName: profile.isBoss ? `${enemy.name} (Boss)` : enemy.name,
  };
}

/** Pick a deterministic enemy from a seed (fallback when none chosen). */
export function pickEnemyForSeed(seed: number | string): EnemyDefinition {
  const { value } = mulberry32Next(toSeed(seed));
  return ENEMIES[Math.floor(value * ENEMIES.length)];
}

/** Apply resolved enemy modifiers to a freshly created battle state.
 * Deterministic: pure stat mutations, no RNG. */
export function applyEnemyModifiers(state: GameState, modifiers: EnemyModifier[]): void {
  const enemy = state.teams.enemy;
  const player = state.teams.player;
  for (const mod of modifiers) {
    const e = mod.effects;
    if (e.hpBonus) {
      enemy.maxHp = Math.max(10, enemy.maxHp + e.hpBonus);
      enemy.hp = Math.max(1, Math.min(enemy.maxHp, enemy.hp + e.hpBonus));
    }
    if (e.startingBlock) {
      enemy.block += e.startingBlock;
      enemy.stats.blockGained += e.startingBlock;
    }
    if (e.startingRelationship !== undefined) setRel(state, enemy, e.startingRelationship);
    if (e.manaPerTurn) enemy.modifiers.push({ kind: 'flag', id: 'perma-mana', amount: e.manaPerTurn });
    if (e.drawPerTurn) enemy.modifiers.push({ kind: 'flag', id: 'perma-draw', amount: e.drawPerTurn });
    if (e.startingUltCharge) {
      for (const c of enemy.characters) chargeUltimate(state, enemy, c, e.startingUltCharge);
    }
    if (e.startingVouchers) gainVouchers(state, enemy, Math.min(e.startingVouchers, RULES.VOUCHER_CAP));
    if (e.openingBleedOnPlayer) addTeamStatus(state, player, 'bleed', e.openingBleedOnPlayer);
    state.log.push({
      turn: state.turn, actor: 'enemy', kind: 'info',
      text: `Modifier địch: ${mod.name} — ${mod.description}`,
    });
  }
}
