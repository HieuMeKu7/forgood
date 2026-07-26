// ============================================================
// Data-driven Enemy System types.
// EnemyDefinition entries live in src/data/enemies.ts, their decks
// in src/data/enemyDecks.ts; src/engine/enemyDeckBuilder.ts resolves
// an enemy + profile into a battle-ready loadout. The battle AI
// runtime stays in src/engine/ai.ts.
// ============================================================

import type { AILevel, CharacterId } from '../engine/types';

export type EnemyProfileId = 'easy' | 'normal' | 'hard' | 'boss';

/** Stat effects an enemy modifier can apply at battle start. */
export interface EnemyModifierEffects {
  /** extra max HP for the enemy team (can be negative, floor 10) */
  hpBonus?: number;
  /** block granted at battle start (persists until the enemy's first turn) */
  startingBlock?: number;
  /** starting relationship value (clamped -5..+5) */
  startingRelationship?: number;
  /** permanent extra mana at each enemy turn start (still capped at 10) */
  manaPerTurn?: number;
  /** permanent extra cards drawn at each enemy turn start */
  drawPerTurn?: number;
  /** ultimate charge granted to every enemy character at battle start */
  startingUltCharge?: number;
  /** starting vouchers (only meaningful for teams with Duy) */
  startingVouchers?: number;
  /** Bleed stacks inflicted on the PLAYER team at battle start */
  openingBleedOnPlayer?: number;
}

export interface EnemyModifier {
  id: string;
  name: string;
  description: string;
  effects: EnemyModifierEffects;
  /** boss modifiers are only legal on the boss profile */
  bossOnly?: boolean;
}

export interface EnemyProfile {
  id: EnemyProfileId;
  name: string;
  description: string;
  /** AI runtime level used for this profile (boss runs on 'hard') */
  aiLevel: AILevel;
  /** generic modifiers this profile applies to every enemy */
  modifierIds: string[];
  /** boss profile additionally applies each enemy's own bossModifierIds */
  isBoss?: boolean;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  title: string;
  /** flavor text — 18+ tone preserved */
  description: string;
  characterIds: CharacterId[];
  /** deck id resolved through src/data/enemyDecks.ts */
  deckId: string;
  /** character whose avatar fronts the enemy in the selection screen */
  portraitCharId: CharacterId;
  /** modifiers always applied for this enemy, on every profile */
  modifierIds: string[];
  /** extra modifiers applied only on the boss profile */
  bossModifierIds: string[];
  /** free-form hints surfaced in the selection screen */
  aiHints: string[];
}

/** Battle-ready result of resolving an enemy + profile. */
export interface EnemyLoadout {
  enemy: EnemyDefinition;
  profile: EnemyProfile;
  aiLevel: AILevel;
  modifiers: EnemyModifier[];
  /** display name, e.g. "Nữ Hoàng Dối Trá (Boss)" */
  displayName: string;
}

/** Telegraphed enemy intent shown to the player during their turn. */
export interface EnemyIntentView {
  kind: 'attack' | 'defense' | 'heal' | 'support' | 'ultimate';
  label: string;
  value?: number;
}
