// Required unit tests — FRIEND/BETRAYAL IS FUN (25 rules from test-spec)
// NOTE: import '../src/engine' first — it registers custom resolvers.
import { describe, it, expect } from 'vitest';
import {
  createBattle, playCard, endTurn, canPlayCard, useUltimate,
  resolvePendingChoice, aiPickChoice,
} from '../src/engine';
import {
  changeRel, addTeamStatus, addCharStatus, gainManaCapped, gainVouchers,
  generateCopies, applyAttack, findChar, getStatus,
} from '../src/engine/battle';
import type { EffectCtx } from '../src/engine/battle';
import { getCardDef, CHARACTER_CARDS } from '../src/data/cards';
import { SAMPLE_DECKS } from '../src/data/sampleDecks';
import { validateDeck } from '../src/engine/deck';
import type { CharacterId, Deck, GameState } from '../src/engine/types';

function deckOf(a: CharacterId, b: CharacterId): Deck {
  // any 30 cards of the two chars; validity is NOT enforced by createBattle
  const cards = [...CHARACTER_CARDS[a].slice(0, 15), ...CHARACTER_CARDS[b].slice(0, 15)].map((c) => c.id);
  return { id: 't', name: 't', characterIds: [a, b], cardIds: cards, createdAt: 0, updatedAt: 0 };
}

function battle(pa: CharacterId, pb: CharacterId, ea: CharacterId, eb: CharacterId, seed = 1): GameState {
  return createBattle({ playerDeck: deckOf(pa, pb), enemyDeck: deckOf(ea, eb), seed, aiLevel: 'easy' });
}

/** Player-side attack context for direct applyAttack calls. */
function atkCtx(state: GameState, ownerCharId: CharacterId, targetCharId: CharacterId): EffectCtx {
  return {
    state, teamId: 'player', ownerCharId, targetTeamId: 'enemy', targetCharId,
    valuePercent: 100, valueBonus: 0,
  } as EffectCtx;
}

/** Push a specific card instance into the player's hand; returns its instanceId. */
function give(state: GameState, defId: string, extra?: Partial<{ isCopy: boolean; copySourceCharId: CharacterId }>): number {
  const instanceId = state.nextInstanceId++;
  state.teams.player.hand.push({ instanceId, defId, ...extra });
  return instanceId;
}

function drain(state: GameState): void {
  let g = 0;
  while (state.pendingChoice && g++ < 30) resolvePendingChoice(state, aiPickChoice(state));
}

describe('rules', () => {
  it('01 relationship clamps at -5/+5', () => {
    const state = battle('an', 'khoi', 'vy', 'moc');
    const t = state.teams.player;
    changeRel(state, t, +99);
    expect(t.relationship).toBe(5);
    changeRel(state, t, -99);
    expect(t.relationship).toBe(-5);
  });

  it('02 block absorbs damage correctly (block 5, hp 50, hit 8 -> block 0, hp 47)', () => {
    const state = battle('an', 'khoi', 'vy', 'moc');
    const enemy = state.teams.enemy;
    enemy.block = 5;
    enemy.hp = 50;
    applyAttack(atkCtx(state, 'an', 'vy'), 8);
    expect(enemy.block).toBe(0);
    expect(enemy.hp).toBe(47);
  });

  it('03 bleed ticks at end of turn, pierces block, loses one stack', () => {
    const state = battle('an', 'khoi', 'vy', 'moc');
    const t = state.teams.player;
    addTeamStatus(state, t, 'bleed', 3);
    t.block = 4; // bleed must pierce this
    expect(state.active).toBe('player');
    const hpBefore = t.hp;
    endTurn(state);
    expect(t.hp).toBe(hpBefore - 3);
    expect(t.block).toBe(4); // untouched: bleed ignores block
    expect(getStatus(t, 'bleed')?.stacks).toBe(2);
  });

  it('04 taunt redirect uses seeded RNG: identical seeds give identical outcomes', () => {
    const run = (): string => {
      const state = battle('an', 'khoi', 'vy', 'moc', 12345);
      const enemy = state.teams.enemy;
      const vy = findChar(enemy, 'vy')!;
      addCharStatus(state, enemy, vy, 'taunt', { percent: 50 });
      for (let i = 0; i < 10; i++) {
        applyAttack(atkCtx(state, 'an', 'moc'), 3); // fresh ctx per card
      }
      return state.log.map((l) => l.text).join('\n');
    };
    const a = run();
    const b = run();
    expect(a).toBe(b);
    // sanity: the 50% taunt actually fired at least once, so the comparison is meaningful
    expect(a).toContain('Taunt 50%');
  });

  it('05 multi-hit card consumes exactly one taunt use', () => {
    const state = battle('moc', 'khoi', 'vy', 'an');
    const enemy = state.teams.enemy;
    const vy = findChar(enemy, 'vy')!;
    addCharStatus(state, enemy, vy, 'taunt', { percent: 100, turns: 1, uses: 2 });
    const iid = give(state, 'moc-07'); // 3-hit attack
    playCard(state, iid, 'an'); // aimed at the OTHER char
    drain(state);
    const taunt = vy.statuses.find((s) => s.id === 'taunt');
    expect(taunt, 'taunt should survive with 1 use left').toBeDefined();
    expect(taunt?.data?.uses).toBe(1);
  });

  it('06 overload counts pre-block damage (Lam behind 50 block still gains noise)', () => {
    const state = battle('an', 'khoi', 'lam', 'vy');
    const enemy = state.teams.enemy;
    enemy.block = 50;
    applyAttack(atkCtx(state, 'an', 'lam'), 8);
    expect(findChar(enemy, 'lam')!.noise).toBe(1);
    expect(enemy.hp).toBe(50); // fully blocked
  });

  it('07 bleed damage does not generate noise for Lam', () => {
    const state = battle('lam', 'vy', 'an', 'khoi');
    const t = state.teams.player;
    addTeamStatus(state, t, 'bleed', 5);
    expect(state.active).toBe('player');
    endTurn(state); // bleed ticks at end of Lam team's turn
    expect(findChar(t, 'lam')!.noise).toBe(0);
  });

  it('08 copies come only from ally originals with base cost 0', () => {
    const state = battle('yen', 'khanh', 'vy', 'moc');
    const ctx: EffectCtx = {
      state, teamId: 'player', ownerCharId: 'yen', targetTeamId: 'enemy',
      valuePercent: 100, valueBonus: 0,
    } as EffectCtx;
    generateCopies(ctx, 5, { mode: 'random' });
    const copies = state.teams.player.hand.filter((c) => c.isCopy);
    expect(copies.length).toBe(5);
    for (const c of copies) {
      expect(getCardDef(c.defId).baseCost).toBe(0);
      expect(c.copySourceCharId).toBe('khanh');
    }
  });

  it('09 cards discounted to 0 are not copyable — pool is defined by baseCost only', () => {
    const state = battle('yen', 'khanh', 'vy', 'moc');
    const t = state.teams.player;
    // simulate a discount that makes cost-1+ khanh cards playable for 0
    t.modifiers.push({ kind: 'costDelta', amount: -5, filter: { charId: 'khanh' } });
    const ctx: EffectCtx = {
      state, teamId: 'player', ownerCharId: 'yen', targetTeamId: 'enemy',
      valuePercent: 100, valueBonus: 0,
    } as EffectCtx;
    generateCopies(ctx, 10, { mode: 'random' });
    const copies = t.hand.filter((c) => c.isCopy);
    expect(copies.length).toBeGreaterThan(0);
    for (const c of copies) {
      expect(getCardDef(c.defId).baseCost, `${c.defId} has baseCost > 0 — must not be in copy pool`).toBe(0);
    }
  });

  it('10 playing a copy charges the original owner +4 ultimate', () => {
    const state = battle('yen', 'khanh', 'vy', 'moc');
    const khanh = findChar(state.teams.player, 'khanh')!;
    const before = khanh.ultimateCharge;
    const iid = give(state, 'khanh-01', { isCopy: true, copySourceCharId: 'khanh' });
    playCard(state, iid, 'vy');
    drain(state);
    expect(khanh.ultimateCharge).toBe(before + 4);
  });

  it('11 playing a copy does not charge Yen', () => {
    const state = battle('yen', 'khanh', 'vy', 'moc');
    const yen = findChar(state.teams.player, 'yen')!;
    expect(yen.ultimateCharge).toBe(0);
    const iid = give(state, 'khanh-01', { isCopy: true, copySourceCharId: 'khanh' });
    playCard(state, iid, 'vy');
    drain(state);
    expect(yen.ultimateCharge).toBe(0);
  });

  it('12 Duy ultimate charges by mana actually paid, not printed cost', () => {
    const state = battle('duy', 'an', 'vy', 'moc');
    const t = state.teams.player;
    const duy = findChar(t, 'duy')!;
    expect(duy.ultimateCharge).toBe(0);
    const iid = give(state, 'duy-12'); // baseCost 3
    t.mana = 2;
    t.vouchers = 1;
    t.vouchersAllyOnly = 0;
    playCard(state, iid);
    drain(state);
    expect(duy.ultimateCharge).toBe(2); // 2 mana paid, 1 covered by voucher
  });

  it('13 vouchers cap at 6', () => {
    const state = battle('an', 'khoi', 'vy', 'moc');
    const t = state.teams.player;
    gainVouchers(state, t, 10);
    expect(t.vouchers + t.vouchersAllyOnly).toBe(6);
  });

  it('14 blade tempo resets at end of turn', () => {
    const state = battle('khanh', 'yen', 'vy', 'moc');
    const t = state.teams.player;
    t.bladeTempo = 7;
    endTurn(state);
    expect(t.bladeTempo).toBe(0);
  });

  it('15 a copy of a Khanh card increases blade tempo', () => {
    const state = battle('yen', 'khanh', 'vy', 'moc');
    const t = state.teams.player;
    const before = t.bladeTempo;
    const iid = give(state, 'khanh-01', { isCopy: true, copySourceCharId: 'khanh' });
    playCard(state, iid, 'vy');
    drain(state);
    expect(t.bladeTempo).toBe(before + 1);
  });

  it('16 a multi-hit card increases blade tempo exactly once', () => {
    const state = battle('khanh', 'yen', 'vy', 'moc');
    const t = state.teams.player;
    const before = t.bladeTempo;
    const iid = give(state, 'khanh-11'); // 3 hits
    playCard(state, iid, 'vy');
    drain(state);
    expect(t.bladeTempo).toBe(before + 1);
  });

  it('17 mask break triggers at most once per turn', () => {
    const state = battle('mien', 'an', 'vy', 'moc');
    const t = state.teams.player;
    const mien = findChar(t, 'mien')!;
    mien.face = 'white';
    mien.flipsThisTurn = 3;
    mien.maskBreakUsedThisTurn = false;
    const iid1 = give(state, 'mien-02'); // twoFaced, cost 0
    const iid2 = give(state, 'mien-02');
    playCard(state, iid1, 'vy');
    drain(state);
    expect(mien.maskBreakUsedThisTurn).toBe(true);
    playCard(state, iid2, 'vy');
    drain(state);
    const breaks = state.log.filter((l) => l.text.includes('VỠ MẶT NẠ'));
    expect(breaks.length).toBe(1);
  });

  it('18 ultimate can be used only once per battle', () => {
    const state = battle('an', 'vy', 'moc', 'khoi');
    const t = state.teams.player;
    const an = findChar(t, 'an')!;
    t.hp = 30;
    an.ultimateCharge = 20;
    an.ultimateReady = true;
    useUltimate(state, 'an');
    drain(state);
    expect(t.hp).toBe(42); // healed 12
    const hpAfterFirst = t.hp;
    useUltimate(state, 'an');
    drain(state);
    expect(an.ultimateUsed).toBe(true);
    expect(t.hp).toBe(hpAfterFirst); // no second heal
  });

  it('19 cannot play more than 14 cards per turn', () => {
    const state = battle('an', 'khoi', 'vy', 'moc');
    const t = state.teams.player;
    t.cardsPlayedThisTurn = 14;
    const card = t.hand[0];
    expect(card).toBeDefined();
    expect(canPlayCard(state, t, card).ok).toBe(false);
  });

  it('20 no more than 10 copies in hand', () => {
    const state = battle('yen', 'khanh', 'vy', 'moc');
    const ctx: EffectCtx = {
      state, teamId: 'player', ownerCharId: 'yen', targetTeamId: 'enemy',
      valuePercent: 100, valueBonus: 0,
    } as EffectCtx;
    generateCopies(ctx, 12, { mode: 'random', canDuplicate: true });
    const copies = state.teams.player.hand.filter((c) => c.isCopy);
    expect(copies.length).toBeLessThanOrEqual(10);
  });

  it('21 mana never exceeds 10', () => {
    const state = battle('an', 'khoi', 'vy', 'moc');
    const t = state.teams.player;
    t.mana = 8;
    t.manaRefundedThisTurn = 0;
    gainManaCapped(state, t, 5);
    expect(t.mana).toBe(10);
  });

  it('22 mana refunds cap at 5 per turn', () => {
    const state = battle('an', 'khoi', 'vy', 'moc');
    const t = state.teams.player;
    t.mana = 0;
    t.manaRefundedThisTurn = 0;
    gainManaCapped(state, t, 3);
    expect(t.mana).toBe(3);
    gainManaCapped(state, t, 3);
    expect(t.mana).toBe(5); // second call only adds 2
    gainManaCapped(state, t, 2);
    expect(t.mana).toBe(5); // third call adds 0
  });

  it('23 deck must have exactly 30 cards', () => {
    const base = SAMPLE_DECKS[0];
    const v29 = validateDeck({ characterIds: base.characterIds, cardIds: base.cardIds.slice(0, 29) });
    expect(v29.valid).toBe(false);
    const v30 = validateDeck(base);
    expect(v30.valid).toBe(true);
  });

  it('24 deck must contain at least one card of each team character', () => {
    // 30 cards, all An's, but the team lists two characters
    const cardIds = CHARACTER_CARDS.an.slice(0, 15).flatMap((c) => [c.id, c.id]);
    expect(cardIds.length).toBe(30);
    const v = validateDeck({ characterIds: ['an', 'vy'], cardIds });
    expect(v.valid).toBe(false);
    expect(v.errors.some((e) => e.includes('mỗi nhân vật'))).toBe(true);
  });

  it('25 max 2 copies of any card', () => {
    const an = CHARACTER_CARDS.an;
    const cardIds = [an[0].id, an[0].id, an[0].id, ...an.slice(1, 15).flatMap((c) => [c.id, c.id]).slice(0, 27)];
    expect(cardIds.length).toBe(30);
    const v = validateDeck({ characterIds: ['an'], cardIds });
    expect(v.valid).toBe(false);
    expect(v.errors.some((e) => e.includes('tối đa'))).toBe(true);
  });
});
