// ============================================================
// AI opponent — three levels.
//  easy:   random legal plays, heals when low.
//  normal: lethal check, defensive priorities, per-character synergy.
//  hard:   2-step lookahead over cloned states with an eval function.
// The AI never inspects the player's draw pile order.
// ============================================================

import type { AIIntent, AILevel, CardInstance, CharacterId, EffectDef, GameState, TeamId, TeamState } from './types';
import { RULES } from './types';
import {
  canPlayCard, cloneState, endTurn, findChar, getCardCost, getStatus, playCard,
  resolvePendingChoice, useUltimate, peekModifier, otherTeamId,
} from './battle';
import type { ChoiceSelection } from './battle';
import { getCardDef } from '../data/cards';
import { CHARACTERS } from '../data/characterMeta';

// ------------------------------------------------------------
// Effect introspection (rough numeric estimates for scoring)
// ------------------------------------------------------------

interface EffectEstimate { damage: number; block: number; heal: number; draw: number; relDelta: number; debuff: number }

function estimateEffects(effects: EffectDef[] | undefined, depth = 0): EffectEstimate {
  const est: EffectEstimate = { damage: 0, block: 0, heal: 0, draw: 0, relDelta: 0, debuff: 0 };
  if (!effects || depth > 4) return est;
  for (const e of effects) {
    switch (e.op) {
      case 'damage': {
        const hits = e.hits ?? 1;
        const avg = e.randomMin !== undefined && e.randomMax !== undefined ? (e.randomMin + e.randomMax) / 2 : (e.value ?? 0);
        est.damage += avg * hits;
        break;
      }
      case 'block': est.block += e.value; break;
      case 'heal': est.heal += e.value; break;
      case 'bleed': est.damage += e.stacks * 1.5; break;
      case 'draw': est.draw += e.count ?? 1; break;
      case 'rel': est.relDelta += e.delta ?? 0; break;
      case 'status': if (e.status === 'weak' || e.status === 'expose') est.debuff += 3; break;
      case 'if': {
        const a = estimateEffects(e.then, depth + 1);
        const b = estimateEffects(e.else, depth + 1);
        est.damage += Math.max(a.damage, b.damage) * 0.85;
        est.block += Math.max(a.block, b.block) * 0.85;
        est.heal += Math.max(a.heal, b.heal) * 0.85;
        est.draw += Math.max(a.draw, b.draw);
        est.debuff += Math.max(a.debuff, b.debuff);
        break;
      }
      case 'choose': {
        for (const o of e.options) {
          const s = estimateEffects(o.effects, depth + 1);
          est.damage = Math.max(est.damage, est.damage + s.damage * 0.9);
          est.block = Math.max(est.block, est.block + s.block * 0.9);
          est.heal = Math.max(est.heal, est.heal + s.heal * 0.9);
        }
        break;
      }
      case 'random': {
        let d = 0, bl = 0, h = 0;
        for (const o of e.options) { const s = estimateEffects(o.effects, depth + 1); d += s.damage; bl += s.block; h += s.heal; }
        est.damage += d / e.options.length;
        est.block += bl / e.options.length;
        est.heal += h / e.options.length;
        break;
      }
      default: break;
    }
  }
  return est;
}

export function estimateCard(inst: CardInstance, face?: 'white' | 'black'): EffectEstimate {
  const def = getCardDef(inst.defId);
  if (def.faces) return estimateEffects(def.faces[face ?? 'white']);
  return estimateEffects(def.effects);
}

// ------------------------------------------------------------
// Target selection
// ------------------------------------------------------------

function pickTarget(state: GameState, me: TeamState, foeTeam: TeamState): CharacterId | undefined {
  if (foeTeam.characters.length <= 1) return foeTeam.characters[0]?.characterId;
  // Avoid feeding Lâm's overload when he's set up (Dồn Nén / Chạm Ngưỡng / big block)
  const lam = findChar(foeTeam, 'lam');
  if (lam) {
    const setUp = foeTeam.modifiers.some((m) => m.kind === 'overloadExtraNoise' || m.kind === 'overloadLowThreshold' || m.kind === 'overloadBonus')
      || foeTeam.block >= 10;
    if (setUp) {
      const other = foeTeam.characters.find((c) => c.characterId !== 'lam');
      if (other) return other.characterId;
    }
  }
  // Prefer the non-taunt char (taunt may redirect anyway, but reduce guaranteed triggers)
  const nonTaunt = foeTeam.characters.find((c) => !c.statuses.some((s) => s.id === 'taunt'));
  return (nonTaunt ?? foeTeam.characters[0]).characterId;
}

// ------------------------------------------------------------
// Ultimate decisions
// ------------------------------------------------------------

function shouldUseUltimate(state: GameState, me: TeamState, charId: CharacterId): boolean {
  const foeTeam = state.teams[otherTeamId(me.id)];
  switch (charId) {
    case 'an': return me.hp <= 34 || foeTeam.hp <= 12;
    case 'vy': {
      const bleed = getStatus(foeTeam, 'bleed');
      const dmg = 16 + 3 * Math.max(0, -me.relationship) + (bleed ? (bleed.stacks * (bleed.stacks + 1)) / 2 : 0);
      return dmg >= foeTeam.hp + foeTeam.block || me.relationship <= -2 || foeTeam.hp <= 26;
    }
    case 'moc': return me.mana <= 3 || me.hand.length <= 3;
    case 'khoi': return me.hp <= 30;
    case 'lam': return me.mana <= 4 || me.hp <= 30;
    case 'truc': return me.hp <= 28;
    case 'yen': return true;
    case 'khanh': return me.hand.filter((c) => getCardDef(c.defId).types.includes('attack')).length >= 2;
    case 'duy': return me.hand.length >= 3;
    case 'mien': return true;
  }
}

// ------------------------------------------------------------
// Choice auto-resolution (AI turns and simulations)
// ------------------------------------------------------------

export function aiPickChoice(state: GameState): ChoiceSelection {
  const choice = state.pendingChoice;
  if (!choice) return {};
  const me = state.teams[state.active];
  const foeTeam = state.teams[otherTeamId(state.active)];

  if (choice.type === 'option') {
    if (choice.contextId === 'mien-face') {
      return { optionIndex: foeTeam.hp <= 25 || me.hp > 35 ? 1 : 0 };
    }
    const options = (choice.data?.options ?? []) as { label: string; effects: EffectDef[] }[];
    if (options.length > 0) {
      let bestIdx = 0;
      let bestScore = -Infinity;
      options.forEach((o, i) => {
        const est = estimateEffects(o.effects);
        const hpDeficit = me.maxHp - me.hp;
        const score = est.damage * (foeTeam.hp <= 20 ? 2 : 1)
          + est.heal * (hpDeficit > 15 ? 1.6 : 0.5)
          + est.block * 0.8
          + est.relDelta * relPreference(me);
        if (score > bestScore) { bestScore = score; bestIdx = i; }
      });
      return { optionIndex: bestIdx };
    }
    return { optionIndex: 0 };
  }

  const ids = choice.cardInstanceIds ?? [];
  const cards = ids
    .map((id) => me.hand.find((c) => c.instanceId === id) ?? me.discardPile.find((c) => c.instanceId === id) ?? me.drawPile.find((c) => c.instanceId === id))
    .filter((c): c is CardInstance => Boolean(c));

  const byCost = (dir: 1 | -1) => [...cards].sort((a, b) => dir * (getCardDef(a.defId).baseCost - getCardDef(b.defId).baseCost));

  switch (choice.contextId) {
    case 'discard-choose':
    case 'vy-03': {
      // dump the most expensive card we likely can't afford
      const pick = byCost(-1)[0];
      return { cardInstanceIds: pick ? [pick.instanceId] : ids.slice(0, choice.min) };
    }
    case 'moc-08':
    case 'duy-02': {
      const pick = byCost(1)[0];
      return { cardInstanceIds: pick ? [pick.instanceId] : ids.slice(0, choice.min) };
    }
    case 'duy-04':
    case 'duy-08':
    case 'duy-10':
    case 'duy-21': {
      const sorted = byCost(-1);
      return { cardInstanceIds: sorted.slice(0, choice.max).map((c) => c.instanceId) };
    }
    case 'duy-15': {
      const sorted = byCost(-1);
      if (sorted.length >= 2) return { cardInstanceIds: [sorted[0].instanceId, sorted[sorted.length - 1].instanceId] };
      return { cardInstanceIds: ids.slice(0, 2) };
    }
    default:
      if (choice.type === 'cardDefs') {
        const defIds = choice.cardDefIds ?? [];
        let best = defIds[0];
        let bestScore = -Infinity;
        for (const d of defIds) {
          const est = estimateEffects(getCardDef(d).effects);
          const s = est.damage + est.block * 0.7 + est.heal * 0.7 + est.draw * 2;
          if (s > bestScore) { bestScore = s; best = d; }
        }
        return { cardDefIds: best ? [best] : [] };
      }
      return { cardInstanceIds: ids.slice(0, choice.min) };
  }
}

function relPreference(me: TeamState): number {
  // teams with Vy/Trúc want negative rel; An wants positive
  const hasVy = Boolean(findChar(me, 'vy')) || Boolean(findChar(me, 'truc'));
  const hasAn = Boolean(findChar(me, 'an'));
  if (hasVy && !hasAn) return -1.2;
  if (hasAn && !hasVy) return 1.2;
  return 0;
}

// ------------------------------------------------------------
// Card scoring (normal AI)
// ------------------------------------------------------------

function scoreCard(state: GameState, me: TeamState, inst: CardInstance): number {
  const def = getCardDef(inst.defId);
  const foeTeam = state.teams[otherTeamId(me.id)];
  const mien = findChar(me, 'mien');
  const est = estimateCard(inst, mien?.face);
  const cost = getCardCost(state, me, inst);
  const hpDeficit = me.maxHp - me.hp;
  const threatened = me.hp <= 20;
  const enemyLow = foeTeam.hp + foeTeam.block <= 18;

  let score = 0;
  score += est.damage * (enemyLow ? 2.2 : 1.0);
  score += est.block * (threatened ? 1.8 : 0.7);
  score += est.heal * (hpDeficit > 12 ? 1.7 : hpDeficit > 4 ? 0.8 : 0.05);
  score += est.draw * 1.5;
  score += est.debuff;
  score += est.relDelta * relPreference(me);
  score -= cost * 0.35;

  // character synergy nudges
  if (def.keywords.includes('friend') && findChar(me, 'an') && me.relationship < RULES.REL_MAX) score += 1;
  if (def.keywords.includes('betray') && findChar(me, 'vy') && me.relationship > RULES.REL_MIN) score += 1;
  if (def.keywords.includes('bully') && findChar(me, 'truc') && !me.turnFlags['trucPassive']) score += 2;
  if (inst.isCopy) score += 2.5; // copies are free value + ult charge
  if (def.characterId === 'yen' && def.effects?.some((e) => e.op === 'generateCopies')) score += 2;
  if (def.characterId === 'khanh') score += Math.min(3, me.bladeTempo * 0.4);
  if (def.characterId === 'duy' && def.effects?.some((e) => e.op === 'gainVouchers') && me.vouchers + me.vouchersAllyOnly >= RULES.VOUCHER_CAP - 1) score -= 2;
  if (def.characterId === 'moc' && def.baseCost === 0) score += 0.8; // trò points
  return score;
}

// ------------------------------------------------------------
// Intent selection
// ------------------------------------------------------------

export function aiChooseAction(state: GameState): AIIntent {
  const me = state.teams[state.active];
  const level: AILevel = state.aiLevel;
  if (me.turnFlags['forceEndTurn']) return { kind: 'endTurn' };

  const playable = me.hand.filter((c) => canPlayCard(state, me, c).ok);
  const readyUlts = me.characters.filter((c) => c.ultimateReady && !c.ultimateUsed);

  if (level === 'easy') return easyIntent(state, me, playable, readyUlts.map((c) => c.characterId));
  if (level === 'normal') return normalIntent(state, me, playable, readyUlts.map((c) => c.characterId));
  return hardIntent(state, me, playable, readyUlts.map((c) => c.characterId));
}

function easyIntent(state: GameState, me: TeamState, playable: CardInstance[], ults: CharacterId[]): AIIntent {
  const foeTeam = state.teams[otherTeamId(me.id)];
  // knows to heal when low
  if (me.hp <= 15) {
    const heal = playable.find((c) => getCardDef(c.defId).types.includes('heal'));
    if (heal) return { kind: 'playCard', cardInstanceId: heal.instanceId, targetCharId: foeTeam.characters[0]?.characterId };
  }
  if (ults.length > 0 && me.hp <= 25) return { kind: 'ultimate', ultimateCharId: ults[0] };
  if (playable.length === 0) return { kind: 'endTurn' };
  // seeded-random pick (deterministic per state)
  const idx = Math.abs(state.rngState) % playable.length;
  const card = playable[idx];
  return { kind: 'playCard', cardInstanceId: card.instanceId, targetCharId: pickTarget(state, me, foeTeam) };
}

function normalIntent(state: GameState, me: TeamState, playable: CardInstance[], ults: CharacterId[]): AIIntent {
  const foeTeam = state.teams[otherTeamId(me.id)];
  // ultimates first when sensible
  for (const u of ults) {
    if (shouldUseUltimate(state, me, u)) return { kind: 'ultimate', ultimateCharId: u, targetCharId: pickTarget(state, me, foeTeam) };
  }
  if (playable.length === 0) return { kind: 'endTurn' };
  // lethal check: total affordable damage vs enemy hp+block
  const mien = findChar(me, 'mien');
  const totalDamage = playable.reduce((s, c) => s + estimateCard(c, mien?.face).damage, 0);
  const lethal = totalDamage >= foeTeam.hp + foeTeam.block;
  let best: CardInstance | undefined;
  let bestScore = -Infinity;
  for (const c of playable) {
    let s = scoreCard(state, me, c);
    if (lethal) s += estimateCard(c, mien?.face).damage * 1.5;
    if (s > bestScore) { bestScore = s; best = c; }
  }
  if (!best || bestScore < -1) return { kind: 'endTurn' };
  return { kind: 'playCard', cardInstanceId: best.instanceId, targetCharId: pickTarget(state, me, foeTeam), score: bestScore };
}

// ------------------------------------------------------------
// Hard AI: 2-step lookahead on cloned states
// ------------------------------------------------------------

function evaluate(state: GameState, teamId: TeamId): number {
  const me = state.teams[teamId];
  const en = state.teams[otherTeamId(teamId)];
  if (en.hp <= 0) return 100000;
  if (me.hp <= 0) return -100000;
  let score = me.hp * 3.2 - en.hp * 4 + me.block * 0.6 - en.block * 0.6;
  score += me.characters.reduce((s, c) => s + (c.ultimateUsed ? 0 : c.ultimateCharge * 0.25), 0);
  score += me.hand.length * 0.6 + me.mana * 0.3;
  if (getStatus(en, 'weak')) score += 2.5;
  if (getStatus(en, 'expose')) score += 2.5;
  const bleed = getStatus(en, 'bleed');
  if (bleed) score += bleed.stacks * 1.2;
  if (getStatus(me, 'weak')) score -= 2.5;
  score += Math.abs(me.relationship) * Math.abs(relPreference(me));
  score += (me.vouchers + me.vouchersAllyOnly) * 0.4;
  return score;
}

function enumerateIntents(state: GameState, me: TeamState): AIIntent[] {
  const foeTeam = state.teams[otherTeamId(me.id)];
  const intents: AIIntent[] = [];
  for (const c of me.characters) {
    if (c.ultimateReady && !c.ultimateUsed) intents.push({ kind: 'ultimate', ultimateCharId: c.characterId, targetCharId: pickTarget(state, me, foeTeam) });
  }
  const seen = new Set<string>();
  for (const c of me.hand) {
    if (!canPlayCard(state, me, c).ok) continue;
    const key = c.defId + (c.isCopy ? '+c' : '');
    if (seen.has(key)) continue; // identical cards → same outcome
    seen.add(key);
    const def = getCardDef(c.defId);
    if (def.targetType === 'enemy' && foeTeam.characters.length > 1) {
      for (const target of foeTeam.characters) {
        intents.push({ kind: 'playCard', cardInstanceId: c.instanceId, targetCharId: target.characterId });
      }
    } else {
      intents.push({ kind: 'playCard', cardInstanceId: c.instanceId, targetCharId: pickTarget(state, me, foeTeam) });
    }
  }
  intents.push({ kind: 'endTurn' });
  return intents;
}

export function applyIntent(state: GameState, intent: AIIntent): void {
  if (intent.kind === 'endTurn') { endTurn(state); return; }
  if (intent.kind === 'ultimate' && intent.ultimateCharId) {
    useUltimate(state, intent.ultimateCharId, intent.targetCharId);
  } else if (intent.kind === 'playCard' && intent.cardInstanceId !== undefined) {
    playCard(state, intent.cardInstanceId, intent.targetCharId);
  }
  // auto-resolve any raised choices
  let guard = 0;
  while (state.pendingChoice && guard++ < 20) {
    resolvePendingChoice(state, aiPickChoice(state));
  }
}

function hardIntent(state: GameState, me: TeamState, playable: CardInstance[], ults: CharacterId[]): AIIntent {
  void playable; void ults;
  const intents = enumerateIntents(state, me);
  if (intents.length === 1) return intents[0];

  // quick pre-score to prune
  const quick = intents.map((intent) => {
    if (intent.kind === 'endTurn') return { intent, q: -0.5 };
    if (intent.kind === 'ultimate') return { intent, q: 6 };
    const inst = me.hand.find((c) => c.instanceId === intent.cardInstanceId)!;
    return { intent, q: scoreCard(state, me, inst) };
  });
  quick.sort((a, b) => b.q - a.q);
  const top = quick.slice(0, 6);

  let best: AIIntent = top[0].intent;
  let bestScore = -Infinity;
  for (const { intent } of top) {
    let score: number;
    try {
      const sim = cloneState(state);
      applyIntent(sim, intent);
      score = evaluate(sim, me.id);
      // second step: best follow-up
      if (intent.kind !== 'endTurn' && sim.phase !== 'gameOver' && sim.active === me.id) {
        const followUps = enumerateIntents(sim, sim.teams[me.id]).slice(0, 5);
        let bestFollow = 0;
        for (const f of followUps) {
          try {
            const sim2 = cloneState(sim);
            applyIntent(sim2, f);
            const s2 = evaluate(sim2, me.id) - score;
            if (s2 > bestFollow) bestFollow = s2;
          } catch { /* ignore broken sim branches */ }
        }
        score += bestFollow * 0.8;
      }
    } catch {
      score = -1000;
    }
    if (score > bestScore) { bestScore = score; best = intent; }
  }
  return { ...best, score: bestScore };
}

// ------------------------------------------------------------
// Headless enemy turn (tests / instant mode)
// ------------------------------------------------------------

export function runEnemyTurn(state: GameState, maxActions = 40): void {
  let guard = 0;
  while (state.phase !== 'gameOver' && state.active === 'enemy' && guard++ < maxActions) {
    const intent = aiChooseAction(state);
    applyIntent(state, intent);
    if (intent.kind === 'endTurn') break;
  }
  if (state.phase !== 'gameOver' && state.active === 'enemy') endTurn(state);
}
