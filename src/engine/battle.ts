// ============================================================
// FRIEND/BETRAYAL IS FUN — battle engine
// Turn flow, damage/block/heal pipelines, taunt, statuses,
// passives, ultimates and the data-driven effect interpreter.
// UI never mutates GameState directly — it calls the exported
// functions here. All randomness goes through the seeded RNG
// stored inside GameState.
// ============================================================

import type {
  AILevel, CardDef, CardInstance, CharacterId, CombatantState, Cond, Deck,
  EffectDef, Face, GameState, ModifierDef, PendingChoice, Phase, StatusId,
  StatusInstance, TeamId, TeamState,
} from './types';
import { RULES } from './types';
import { rand, randInt, randPercent, randPick, shuffle, toSeed } from './rng';
import { customResolvers } from './registry';
import { getCardDef, getCharacterCards } from '../data/cards';
import { CHARACTERS } from '../data/characterMeta';

// ------------------------------------------------------------
// Effect context
// ------------------------------------------------------------

export interface EffectCtx {
  state: GameState;
  teamId: TeamId;
  ownerCharId: CharacterId;
  targetTeamId: TeamId;
  /** chosen enemy char id for single-target attacks */
  targetCharId?: CharacterId;
  cardDefId?: string;
  cardInstanceId?: number;
  isUltimate?: boolean;
  valuePercent: number;
  valueBonus: number;
  /** taunt resolved once per card */
  tauntResolved?: boolean;
  redirected?: boolean;
  finalTargetCharId?: CharacterId;
  reactionsDone?: boolean;
  exposeNextHitConsumed?: boolean;
  forceFriendship?: boolean;
  isRepeat?: boolean;
  repeatDamageOnly?: boolean;
  face?: Face;
  isCopy?: boolean;
  copySourceCharId?: CharacterId;
}

export function team(ctx: EffectCtx): TeamState { return ctx.state.teams[ctx.teamId]; }
export function foe(ctx: EffectCtx): TeamState { return ctx.state.teams[ctx.targetTeamId]; }
export function otherTeamId(id: TeamId): TeamId { return id === 'player' ? 'enemy' : 'player'; }

export function findChar(t: TeamState, id: CharacterId): CombatantState | undefined {
  return t.characters.find((c) => c.characterId === id);
}
export function allyOf(t: TeamState, id: CharacterId): CombatantState | undefined {
  return t.characters.find((c) => c.characterId !== id);
}

function log(state: GameState, kind: GameState['log'][number]['kind'], text: string, extra?: Partial<GameState['log'][number]>): void {
  state.log.push({ turn: state.turn, actor: state.active, kind, text, ...extra });
}

let animCounter = 1;
function anim(state: GameState, type: GameState['animationEvents'][number]['type'], teamId: TeamId, value?: number, characterId?: CharacterId): void {
  state.animationEvents.push({ id: animCounter++, type, teamId, value, characterId });
  if (state.animationEvents.length > 30) state.animationEvents.splice(0, state.animationEvents.length - 30);
}

// ------------------------------------------------------------
// Status & modifier helpers
// ------------------------------------------------------------

export function getStatus(holder: { statuses: StatusInstance[] }, id: StatusId): StatusInstance | undefined {
  return holder.statuses.find((s) => s.id === id);
}

export function addTeamStatus(state: GameState, t: TeamState, id: StatusId, stacks = 1, turns?: number, uses?: number): void {
  applyStatusWithReflect(state, t, { id, stacks, turns, uses });
}

function applyStatusWithReflect(state: GameState, t: TeamState, s: { id: StatusId; stacks: number; turns?: number; uses?: number }): void {
  const isDebuff = s.id === 'weak' || s.id === 'expose' || s.id === 'bleed' || s.id === 'humiliate' || s.id === 'exposeNextHit';
  if (isDebuff) {
    const reflect = takeModifier(t, 'reflectDebuff');
    if (reflect) {
      const other = state.teams[otherTeamId(t.id)];
      log(state, 'status', `Lá Bài Đảo Chiều phản lại ${statusName(s.id)} về đội ${teamName(other.id)}!`);
      rawAddStatus(state, other, s);
      return;
    }
  }
  rawAddStatus(state, t, s);
}

function rawAddStatus(state: GameState, t: TeamState, s: { id: StatusId; stacks: number; turns?: number; uses?: number }): void {
  const existing = getStatus(t, s.id);
  const fresh = state.active === t.id;
  if (existing) {
    if (s.id === 'humiliate') existing.stacks = Math.min(RULES.HUMILIATE_CAP, existing.stacks + s.stacks);
    else if (s.id === 'bleed') existing.stacks += s.stacks;
    else {
      existing.stacks = Math.max(existing.stacks, s.stacks);
      if (s.turns !== undefined) existing.turns = Math.max(existing.turns ?? 0, s.turns);
      if (s.uses !== undefined) existing.data = { ...existing.data, uses: Math.max(Number(existing.data?.uses ?? 0), s.uses) };
    }
    if (fresh && existing.turns !== undefined) existing.data = { ...existing.data, fresh: true };
  } else {
    const inst: StatusInstance = { id: s.id, stacks: Math.min(s.stacks, s.id === 'humiliate' ? RULES.HUMILIATE_CAP : Infinity), turns: s.turns, data: {} };
    if (s.uses !== undefined) inst.data = { uses: s.uses };
    if (fresh && s.turns !== undefined) inst.data = { ...inst.data, fresh: true };
    t.statuses.push(inst);
  }
  log(state, 'status', `Đội ${teamName(t.id)} nhận ${statusName(s.id)}${s.stacks > 1 ? ` ${s.stacks}` : ''}.`);
  anim(state, 'status', t.id);
}

export function addCharStatus(state: GameState, t: TeamState, char: CombatantState, id: StatusId, opts: { stacks?: number; turns?: number; percent?: number; uses?: number; trucUlt?: boolean }): void {
  const existing = char.statuses.find((s) => s.id === id);
  const fresh = state.active === t.id;
  const data: Record<string, unknown> = {};
  if (opts.uses !== undefined) data.uses = opts.uses;
  if (opts.trucUlt) data.trucUlt = true;
  if (fresh) data.fresh = true;
  if (existing) {
    existing.stacks = Math.max(existing.stacks, opts.stacks ?? 1);
    existing.percent = Math.max(existing.percent ?? 0, opts.percent ?? existing.percent ?? 0) || existing.percent;
    if (opts.percent !== undefined) existing.percent = Math.max(existing.percent ?? 0, opts.percent);
    if (opts.turns !== undefined) existing.turns = Math.max(existing.turns ?? 0, opts.turns);
    existing.data = { ...existing.data, ...data };
  } else {
    char.statuses.push({ id, stacks: opts.stacks ?? 1, turns: opts.turns, percent: opts.percent, data });
  }
  const name = CHARACTERS[char.characterId].name;
  if (id === 'taunt') log(state, 'status', `${name} nhận Taunt ${opts.percent}%.`);
  else if (id === 'counter') log(state, 'status', `${name} nhận Phản đòn ${opts.stacks}.`);
}

export function addModifier(state: GameState, t: TeamState, mod: ModifierDef): void {
  const m: ModifierDef = { ...mod, data: { ...mod.data } };
  if (state.active === t.id && m.turns !== undefined) m.data = { ...m.data, fresh: true };
  t.modifiers.push(m);
}

/** Find first matching modifier, decrement uses (remove at 0), return it. */
export function takeModifier(t: TeamState, kind: ModifierDef['kind'], pred?: (m: ModifierDef) => boolean): ModifierDef | undefined {
  const idx = t.modifiers.findIndex((m) => m.kind === kind && (!pred || pred(m)));
  if (idx < 0) return undefined;
  const m = t.modifiers[idx];
  if (m.uses !== undefined) {
    m.uses -= 1;
    if (m.uses <= 0) t.modifiers.splice(idx, 1);
  }
  return m;
}

export function peekModifier(t: TeamState, kind: ModifierDef['kind'], pred?: (m: ModifierDef) => boolean): ModifierDef | undefined {
  return t.modifiers.find((m) => m.kind === kind && (!pred || pred(m)));
}

function modifierMatchesCard(m: ModifierDef, def: CardDef, inst: CardInstance | undefined, ownerCharId: CharacterId, t: TeamState): boolean {
  const f = m.filter;
  if (!f) return true;
  const effCharId = inst?.copySourceCharId ?? def.characterId;
  if (f.charId === 'owner' && effCharId !== ownerCharId) return false;
  if (f.charId && f.charId !== 'owner' && f.charId !== 'ally') {
    if (effCharId !== f.charId) return false;
  }
  if (f.charId === 'ally') {
    // "ally" from the modifier creator's perspective: stored in data.creatorCharId
    const creator = m.data?.creatorCharId as CharacterId | undefined;
    if (creator && effCharId === creator) return false;
    if (!t.characters.some((c) => c.characterId === effCharId)) return false;
  }
  if (f.keyword && !def.keywords.includes(f.keyword)) return false;
  if (f.cardType && !def.types.includes(f.cardType)) return false;
  if (f.costAtLeast !== undefined && def.baseCost < f.costAtLeast) return false;
  if (f.costAtMost !== undefined && def.baseCost > f.costAtMost) return false;
  if (f.zeroCost && def.baseCost !== 0) return false;
  if (f.isCopy !== undefined && Boolean(inst?.isCopy) !== f.isCopy) return false;
  return true;
}

function statusName(id: StatusId): string {
  switch (id) {
    case 'weak': return 'Yếu';
    case 'expose': return 'Lộ sơ hở';
    case 'exposeNextHit': return 'Lộ sơ hở (đòn tiếp theo)';
    case 'bleed': return 'Chảy máu';
    case 'counter': return 'Phản đòn';
    case 'taunt': return 'Taunt';
    case 'humiliate': return 'Làm Nhục';
  }
}

function teamName(id: TeamId): string { return id === 'player' ? 'bạn' : 'địch'; }

// ------------------------------------------------------------
// Conditions
// ------------------------------------------------------------

export function isFriendship(t: TeamState): boolean { return t.relationship >= RULES.FRIENDSHIP_AT; }
export function isBetrayal(t: TeamState): boolean { return t.relationship <= RULES.BETRAYAL_AT; }

export function checkCond(ctx: EffectCtx, cond: Cond): boolean {
  const t = team(ctx);
  const e = foe(ctx);
  const state = ctx.state;
  switch (cond.kind) {
    case 'relAtLeast': return t.relationship >= cond.value;
    case 'relAtMost': return t.relationship <= cond.value;
    case 'relIs': return t.relationship === cond.value;
    case 'friendship': return isFriendship(t) || Boolean(ctx.forceFriendship);
    case 'betrayal': return isBetrayal(t);
    case 'hpAtMost': return t.hp <= cond.value;
    case 'hpBelowPercent': return t.hp < (t.maxHp * cond.value) / 100;
    case 'enemyHpAtMost': return e.hp <= cond.value;
    case 'targetNoBlock': return e.block <= 0;
    case 'targetHasBlock': return e.block > 0;
    case 'selfHasBlock': return t.block > 0;
    case 'ownerHasTaunt': {
      const c = findChar(t, ctx.ownerCharId);
      return Boolean(c && c.statuses.some((s) => s.id === 'taunt'));
    }
    case 'allyHasTaunt': {
      const a = allyOf(t, ctx.ownerCharId);
      return Boolean(a && a.statuses.some((s) => s.id === 'taunt'));
    }
    case 'targetExposed': return Boolean(getStatus(e, 'expose') || getStatus(e, 'exposeNextHit'));
    case 'targetWeak': return Boolean(getStatus(e, 'weak'));
    case 'prevCardAlly': {
      if (!t.lastPlayedCharId) return false;
      const currentChar = ctx.copySourceCharId ?? ctx.ownerCharId;
      return t.lastPlayedCharId !== currentChar && t.characters.some((c) => c.characterId === t.lastPlayedCharId);
    }
    case 'cardsPlayedAtLeast': return t.cardsPlayedThisTurn - 1 >= cond.value; // exclude current card
    case 'ownerHitLastEnemyTurn': {
      const c = findChar(t, ctx.ownerCharId);
      return Boolean(c && c.hitsTakenLastEnemyTurn > 0);
    }
    case 'tookAttackDamage': return t.characters.some((c) => c.hitsTakenLastEnemyTurn > 0);
    case 'noiseLastTurnAtLeast': {
      const c = t.characters.find((ch) => ch.characterId === 'lam');
      return Boolean(c && c.noiseLastTurn >= cond.value);
    }
    case 'noiseManaAtLeast': {
      const c = t.characters.find((ch) => ch.characterId === 'lam');
      return Boolean(c && c.manaFromNoiseThisTurn >= cond.value);
    }
    case 'enemyBleeding': return Boolean(getStatus(e, 'bleed'));
    case 'enemyBlockBroken': return Boolean(e.turnFlags['blockBroken']);
    case 'allyLostHpLastTurn': {
      const a = allyOf(t, ctx.ownerCharId);
      return Boolean(a && a.hpLostLastEnemyTurn > 0);
    }
    case 'humiliateAtLeast': {
      const s = getStatus(e, 'humiliate');
      return Boolean(s && s.stacks >= cond.value);
    }
    case 'random': return randPercent(state, cond.percent);
    case 'manaExactly': return t.mana === cond.value;
    case 'faceIs': {
      const c = findChar(t, ctx.ownerCharId);
      return c?.face === cond.value;
    }
  }
}

// ------------------------------------------------------------
// Value scaling
// ------------------------------------------------------------

function scaled(ctx: EffectCtx, value: number): number {
  const v = Math.floor((value * ctx.valuePercent) / 100) + ctx.valueBonus;
  return Math.max(0, v);
}

// ------------------------------------------------------------
// Damage pipeline
// ------------------------------------------------------------

/** Direct damage (counters, bleed, passives). No taunt, no reactions, no overload. */
export function dealDirect(state: GameState, targetTeamId: TeamId, amount: number, opts?: { ignoreBlock?: boolean; label?: string; sourceTeamId?: TeamId }): number {
  const t = state.teams[targetTeamId];
  let remaining = amount;
  let blocked = 0;
  if (!opts?.ignoreBlock && t.block > 0) {
    blocked = Math.min(t.block, remaining);
    t.block -= blocked;
    remaining -= blocked;
    if (t.block === 0 && blocked > 0) t.turnFlags['blockBroken'] = 1;
  }
  const hpLoss = Math.min(t.hp, remaining);
  t.hp -= hpLoss;
  t.stats.damageTaken += blocked + hpLoss;
  if (opts?.sourceTeamId) state.teams[opts.sourceTeamId].stats.damageDealt += blocked + hpLoss;
  if (opts?.label) log(state, 'damage', `${opts.label}: ${amount} sát thương lên đội ${teamName(targetTeamId)}${blocked ? ` (${blocked} bị Giáp chặn)` : ''}.`, { value: amount });
  anim(state, 'hit', targetTeamId, blocked + hpLoss);
  checkDefeat(state, t);
  return hpLoss;
}

function overloadThresholds(t: TeamState): number[] {
  return peekModifier(t, 'overloadLowThreshold') ? [6, 12, 18] : [8, 16, 24];
}

function accumulateOverload(state: GameState, defTeam: TeamState, defChar: CombatantState, preBlockDamage: number): void {
  if (defChar.characterId !== 'lam') return;
  let amount = preBlockDamage;
  const bonus = takeModifier(defTeam, 'overloadBonus');
  if (bonus) amount += bonus.amount ?? 0;
  defChar.overloadDamage += amount;
  const thresholds = overloadThresholds(defTeam);
  const crossed = thresholds.filter((th) => defChar.overloadDamage >= th).length;
  const extraMod = takeModifier(defTeam, 'overloadExtraNoise');
  if (extraMod) defChar.overloadExtra += 1;
  const newNoise = Math.min(3, crossed + defChar.overloadExtra);
  if (newNoise > defChar.noise) {
    log(state, 'passive', `Quá Tải: Lâm tích ${newNoise} Nhiễu (đã nhận ${defChar.overloadDamage} sát thương trước Giáp).`);
  }
  defChar.noise = newNoise;
}

interface AttackOpts {
  hits?: number;
  randomMin?: number;
  randomMax?: number;
  perNegativeRel?: number;
  perNoise?: number;
  perCardPlayed?: number;
  maxTotal?: number;
  hitPerCardPlayed?: boolean;
  maxHits?: number;
  ignoreBlock?: number;
  breakBlockFirst?: number;
  bonusBreakIfBlock?: number;
  selfTeamLoseHp?: number;
  noTempoBonus?: boolean;
  tempoPercentPerHit?: number;
  doubleOrHalf?: boolean;
  percentOfEnemyBlock?: number;
  aoe?: boolean;
}

function tempoBonus(t: TeamState): number {
  if (t.bladeTempo >= 9) return 7;
  if (t.bladeTempo >= 6) return 4;
  if (t.bladeTempo >= 3) return 2;
  return 0;
}

function resolveTaunt(ctx: EffectCtx): void {
  if (ctx.tauntResolved) return;
  ctx.tauntResolved = true;
  const state = ctx.state;
  const defTeam = foe(ctx);
  const intended = ctx.targetCharId ?? defTeam.characters[0]?.characterId;
  ctx.finalTargetCharId = intended;
  // Collect taunt holders
  const holders = defTeam.characters.filter((c) => c.statuses.some((s) => s.id === 'taunt'));
  if (holders.length === 0) return;
  // pick highest percent; tie -> seeded rng
  let best: CombatantState[] = [];
  let bestPct = -1;
  for (const h of holders) {
    const st = h.statuses.find((s) => s.id === 'taunt')!;
    const pct = st.percent ?? 0;
    if (pct > bestPct) { bestPct = pct; best = [h]; }
    else if (pct === bestPct) best.push(h);
  }
  const holder = best.length === 1 ? best[0] : randPick(state, best);
  const st = holder.statuses.find((s) => s.id === 'taunt')!;
  // consume a use per single-target attack card checked (if uses-limited)
  const uses = st.data?.uses as number | undefined;
  const isUlt = Boolean(st.data?.trucUlt);
  if (uses !== undefined) {
    st.data = { ...st.data, uses: uses - 1 };
  }
  if (holder.characterId !== intended && randPercent(state, st.percent ?? 0)) {
    ctx.redirected = true;
    ctx.finalTargetCharId = holder.characterId;
    log(state, 'info', `Taunt ${st.percent}%: đòn đánh bị kéo sang ${CHARACTERS[holder.characterId].name}.`);
    if (isUlt) st.data = { ...st.data, redirectedNow: true };
  }
  if (uses !== undefined && uses - 1 <= 0) {
    holder.statuses = holder.statuses.filter((s) => s !== st);
    if (isUlt) {
      // Trúc ult over: ally loses 5 HP but not below 1
      const loss = Math.min(5, Math.max(0, defTeam.hp - 1));
      defTeam.hp -= loss;
      log(state, 'info', `Ultimate của Trúc kết thúc: đồng minh mất ${loss} HP.`);
    }
  }
}

/** Full attack-card damage resolution. Returns total damage inflicted (block+hp). */
export function applyAttack(ctx: EffectCtx, value: number, opts: AttackOpts = {}): number {
  const state = ctx.state;
  const atkTeam = team(ctx);
  const defTeam = foe(ctx);
  if (!opts.aoe) resolveTaunt(ctx);
  else if (!ctx.finalTargetCharId) ctx.finalTargetCharId = ctx.targetCharId ?? defTeam.characters[0]?.characterId;
  const defChar = ctx.finalTargetCharId ? findChar(defTeam, ctx.finalTargetCharId) : defTeam.characters[0];

  // block manipulation before damage
  if (opts.breakBlockFirst) {
    const broken = Math.min(defTeam.block, opts.breakBlockFirst);
    if (broken > 0) {
      defTeam.block -= broken;
      log(state, 'info', `Phá ${broken} Giáp.`);
      if (defTeam.block === 0) defTeam.turnFlags['blockBroken'] = 1;
    }
  }
  if (opts.bonusBreakIfBlock && defTeam.block > 0) {
    const broken = Math.min(defTeam.block, opts.bonusBreakIfBlock);
    defTeam.block -= broken;
    log(state, 'info', `Phá thêm ${broken} Giáp.`);
    if (defTeam.block === 0) defTeam.turnFlags['blockBroken'] = 1;
  }

  // hits
  let hits = opts.hits ?? 1;
  if (opts.hitPerCardPlayed) {
    hits = Math.min(opts.maxHits ?? 10, Math.max(0, atkTeam.cardsPlayedThisTurn - 1));
    if (hits === 0) { log(state, 'info', 'Chưa dùng lá nào trước đó — không có đòn nào.'); return 0; }
  }

  // card-level flat bonuses consumed once, applied to first hit
  let firstHitBonus = 0;
  const cardDef = ctx.cardDefId ? getCardDef(ctx.cardDefId) : undefined;
  if (!ctx.isRepeat && cardDef) {
    for (const kind of ['damageBonus', 'damageOrHealBonus', 'damageOrBlockBonus'] as const) {
      const m = takeModifier(atkTeam, kind, (mm) => modifierMatchesCard(mm, cardDef, undefined, ctx.ownerCharId, atkTeam));
      if (m) firstHitBonus += m.amount ?? 0;
    }
    // Vy passive: first Betray card each turn
    if (cardDef.keywords.includes('betray') && findChar(atkTeam, 'vy') && !atkTeam.turnFlags['vyPassive']) {
      atkTeam.turnFlags['vyPassive'] = 1;
      const bonus = isBetrayal(atkTeam) ? 4 : 2;
      firstHitBonus += bonus;
      log(state, 'passive', `Nụ Cười Giả Tạo: +${bonus} sát thương.`);
    }
    // Miên black-face passive: first attack card each turn +3
    const mien = findChar(atkTeam, 'mien');
    if (mien && mien.face === 'black' && (ctx.copySourceCharId ?? cardDef.characterId) === 'mien' && !atkTeam.turnFlags['mienBlackPassive']) {
      atkTeam.turnFlags['mienBlackPassive'] = 1;
      firstHitBonus += 3;
      log(state, 'passive', `Mặt Đen: +3 sát thương.`);
    }
    // Trúc rage
    if ((ctx.copySourceCharId ?? cardDef.characterId) === 'truc' && atkTeam.trucRage === 'active') {
      firstHitBonus += 5;
    }
  }

  // tempo (Khanh)
  const ownerIsKhanh = (ctx.copySourceCharId ?? ctx.ownerCharId) === 'khanh' || (cardDef && (ctx.copySourceCharId ?? cardDef.characterId) === 'khanh');
  const tBonus = !opts.noTempoBonus && ownerIsKhanh ? tempoBonus(atkTeam) : 0;

  // expose-next-hit consumed at card level
  let exposeBoost = Boolean(getStatus(defTeam, 'expose'));
  if (!exposeBoost && !ctx.exposeNextHitConsumed) {
    const st = getStatus(defTeam, 'exposeNextHit');
    if (st) {
      defTeam.statuses = defTeam.statuses.filter((s) => s !== st);
      ctx.exposeNextHitConsumed = true;
      exposeBoost = true;
    }
  } else if (ctx.exposeNextHitConsumed) {
    exposeBoost = true;
  }
  const weak = Boolean(getStatus(atkTeam, 'weak'));

  // incoming damage reduction: first matching hit of the card
  let reduction = 0;
  if (!ctx.isRepeat) {
    const m = takeModifier(defTeam, 'incomingDamageReduction', (mm) => {
      if (mm.filter?.targetCharId && mm.filter.targetCharId !== (ctx.finalTargetCharId ?? '')) return false;
      return true;
    });
    if (m) reduction = m.amount ?? 0;
  }

  let total = 0;
  let doubleOrHalfRoll: number | undefined;
  const lamCounted = { done: false };
  for (let h = 0; h < hits; h++) {
    let amt: number;
    if (opts.randomMin !== undefined && opts.randomMax !== undefined) amt = randInt(state, opts.randomMin, opts.randomMax);
    else amt = value;
    if (opts.percentOfEnemyBlock) amt = Math.floor((defTeam.block * opts.percentOfEnemyBlock) / 100);
    amt = scaled(ctx, amt);
    if (opts.perNegativeRel && atkTeam.relationship < 0) amt += opts.perNegativeRel * Math.abs(atkTeam.relationship);
    if (opts.perNoise) {
      const lam = findChar(atkTeam, 'lam');
      if (lam) amt += opts.perNoise * lam.noiseLastTurn;
    }
    if (opts.perCardPlayed) amt += opts.perCardPlayed * Math.max(0, atkTeam.cardsPlayedThisTurn - 1);
    if (opts.maxTotal !== undefined) amt = Math.min(amt, opts.maxTotal);
    if (opts.doubleOrHalf) {
      if (doubleOrHalfRoll === undefined) doubleOrHalfRoll = rand(state) < 0.5 ? 2 : 0.5;
      amt = Math.floor(amt * doubleOrHalfRoll);
    }
    if (h === 0) amt += firstHitBonus;
    if (tBonus) {
      if (opts.tempoPercentPerHit !== undefined) amt += Math.floor((tBonus * opts.tempoPercentPerHit) / 100);
      else if (h === 0) amt += tBonus;
    }
    if (weak) amt = Math.floor(amt * (1 - RULES.WEAK_PERCENT / 100));
    if (exposeBoost) amt = Math.floor(amt * (1 + RULES.EXPOSE_PERCENT / 100));
    if (h === 0 && reduction) amt = Math.max(0, amt - reduction);

    // Lâm overload: pre-block damage from attack cards targeting Lâm
    if (defChar && !lamCounted.done) accumulateOverload(state, defTeam, defChar, amt);
    if (defChar && lamCounted.done && defChar.characterId === 'lam') {
      // subsequent hits still add pre-block damage (single card, but total counts)
      defChar.overloadDamage += amt;
      const thresholds = overloadThresholds(defTeam);
      const crossed = thresholds.filter((th) => defChar.overloadDamage >= th).length;
      defChar.noise = Math.min(3, crossed + defChar.overloadExtra);
    }
    lamCounted.done = true;

    // block application
    let remaining = amt;
    let blocked = 0;
    const effectiveBlock = Math.max(0, defTeam.block - (opts.ignoreBlock ?? 0));
    if (effectiveBlock > 0 && remaining > 0) {
      blocked = Math.min(effectiveBlock, remaining);
      defTeam.block -= blocked;
      remaining -= blocked;
      if (defTeam.block === 0) defTeam.turnFlags['blockBroken'] = 1;
      // Khôi ult: return 50% of broken block
      const ret = peekModifier(defTeam, 'blockBreakReturn');
      if (ret && blocked > 0) {
        const back = Math.floor((blocked * (ret.amount ?? 50)) / 100);
        if (back > 0) {
          log(state, 'passive', `Lời Thề Không Thể Phá: phản lại ${back} sát thương.`);
          dealDirect(state, atkTeam.id, back, { sourceTeamId: defTeam.id });
        }
      }
    } else if (opts.ignoreBlock && defTeam.block > 0 && remaining > 0) {
      // damage passes under the ignored block portion
    }
    // pierce negate: first HP-damage through block becomes 0
    if (remaining > 0) {
      const neg = takeModifier(defTeam, 'blockPierceNegate');
      if (neg) {
        log(state, 'passive', `Không Được Qua: sát thương xuyên Giáp bị vô hiệu.`);
        remaining = 0;
      }
    }
    const hpLoss = Math.min(defTeam.hp, remaining);
    defTeam.hp -= hpLoss;
    if (defChar) defChar.hpLostThisEnemyTurn += hpLoss;
    total += blocked + hpLoss;
    if (amt > 0) anim(state, 'hit', defTeam.id, blocked + hpLoss, defChar?.characterId);
    // lethal / death prevention
    if (defTeam.hp <= 0) {
      const prev = takeModifier(defTeam, 'deathPrevention');
      if (prev) {
        defTeam.hp = 1;
        log(state, 'info', `Đội ${teamName(defTeam.id)} sống sót với 1 HP nhờ hiệu ứng bảo vệ!`);
        if (defChar?.isMeatShield) triggerTrucRage(state, defTeam);
      } else {
        checkDefeat(state, defTeam);
        break;
      }
    }
  }

  atkTeam.stats.damageDealt += total;
  defTeam.stats.damageTaken += total;
  if (ctx.cardDefId) {
    atkTeam.stats.damageByCard[ctx.cardDefId] = (atkTeam.stats.damageByCard[ctx.cardDefId] ?? 0) + total;
  }
  const targetName = defChar ? CHARACTERS[defChar.characterId].name : 'đội địch';
  log(state, 'damage', `Gây ${total} sát thương lên ${targetName}${hits > 1 ? ` (${hits} đòn)` : ''}.`, { value: total, cardDefId: ctx.cardDefId });

  // once-per-card reactions
  if (!ctx.reactionsDone && defChar && state.phase !== 'gameOver') {
    ctx.reactionsDone = true;
    runOnHitReactions(ctx, defChar, total);
  }
  if (defChar) defChar.hitsTakenThisEnemyTurn += 1;

  if (opts.selfTeamLoseHp) {
    loseHp(state, atkTeam, opts.selfTeamLoseHp);
  }
  return total;
}

function triggerTrucRage(state: GameState, t: TeamState): void {
  if (!findChar(t, 'truc') || t.trucPassiveDisabled) return;
  t.trucRage = 'pending';
  t.trucPassiveDisabled = true;
  log(state, 'passive', `Bia Thịt gục — Trúc nổi Cuồng Nộ: +5 sát thương lượt sau, mất hồi máu nội tại.`);
}

function runOnHitReactions(ctx: EffectCtx, defChar: CombatantState, totalDamage: number): void {
  const state = ctx.state;
  const atkTeam = team(ctx);
  const defTeam = foe(ctx);
  // Counter (once per attacking card)
  const counter = defChar.statuses.find((s) => s.id === 'counter');
  if (counter && totalDamage >= 0) {
    log(state, 'passive', `${CHARACTERS[defChar.characterId].name} Phản đòn ${counter.stacks}!`);
    dealDirect(state, atkTeam.id, counter.stacks, { sourceTeamId: defTeam.id });
  }
  // Trúc meat shield heal on redirected attacks
  if (ctx.redirected && defChar.isMeatShield && findChar(defTeam, 'truc') && !defTeam.trucPassiveDisabled) {
    const hpLost = defChar.hpLostThisEnemyTurn > 0;
    let heal = 3 + (hpLost ? 1 : 0);
    heal = Math.min(heal, Math.max(0, RULES.MEAT_SHIELD_HEAL_CAP - defTeam.meatShieldHealThisTurn));
    if (heal > 0) {
      defTeam.meatShieldHealThisTurn += heal;
      healTeam(state, defTeam, heal, { label: 'Bia Thịt Của Tao' });
    }
  }
  // Trúc ult redirect: heal 5 + Trúc deals 7
  const ultTaunt = defChar.statuses.find((s) => s.id === 'taunt' && s.data?.trucUlt && s.data?.redirectedNow);
  if (ultTaunt) {
    ultTaunt.data = { ...ultTaunt.data, redirectedNow: false };
    healTeam(state, defTeam, 5, { label: 'Ultimate Trúc' });
    log(state, 'passive', `Trúc trừng phạt: gây 7 sát thương.`);
    dealDirect(state, atkTeam.id, 7, { sourceTeamId: defTeam.id });
  }
  // Lâm ult: attacks targeting Lâm heal defender 2
  if (defChar.characterId === 'lam') {
    const m = peekModifier(defTeam, 'attackHealsDefender');
    if (m) healTeam(state, defTeam, m.amount ?? 2, { label: 'Biến Nhiễu Thành Năng Lượng' });
  }
  // flag-based reactions (Trúc cards, Lâm cards)
  for (const id of ['truc-07', 'truc-11', 'truc-16', 'truc-18', 'truc-20'] as const) {
    const m = defTeam.modifiers.find((mm) => mm.kind === 'flag' && mm.id === id);
    if (!m) continue;
    const isAllyHit = defChar.characterId !== 'truc';
    if (!isAllyHit) continue;
    if (id === 'truc-07') { healTeam(state, defTeam, 3, { label: 'Đẩy Ra Chịu Đòn' }); consumeFlag(defTeam, m); }
    if (id === 'truc-11') {
      const healed = Math.min(8, Math.floor(defChar.hpLostThisEnemyTurn * 0.5));
      if (healed > 0) healTeam(state, defTeam, healed, { label: 'Chịu Cho Quen' });
      consumeFlag(defTeam, m);
    }
    if (id === 'truc-16') { log(state, 'passive', 'Vật Sở Hữu Của Tao: Trúc gây lại 5.'); dealDirect(state, atkTeam.id, 5, { sourceTeamId: defTeam.id }); }
    if (id === 'truc-18' && ctx.redirected) { healTeam(state, defTeam, 4, { label: 'Lôi Nó Ra Giữa Sân' }); }
    if (id === 'truc-20') { gainBlockRaw(state, defTeam, 2); healTeam(state, defTeam, 3, { label: 'Bao Cát Biết Đi' }); }
  }
  if (defChar.characterId === 'lam') {
    const m = defTeam.modifiers.find((mm) => mm.kind === 'flag' && mm.id === 'lam-21');
    if (m && !defTeam.turnFlags['lam21Used']) {
      defTeam.turnFlags['lam21Used'] = 1;
      gainBlockRaw(state, defTeam, 5);
      m.data = { ...m.data, drawNextTurn: true };
      log(state, 'passive', 'Tôi Vẫn Ở Đây: Lâm nhận 5 Giáp, rút 1 đầu lượt sau.');
      if (m.uses !== undefined) { m.uses -= 1; if (m.uses <= 0) defTeam.modifiers = defTeam.modifiers.filter((mm) => mm !== m); }
    }
  }
}

function consumeFlag(t: TeamState, m: ModifierDef): void {
  if (m.uses !== undefined) {
    m.uses -= 1;
    if (m.uses <= 0) t.modifiers = t.modifiers.filter((mm) => mm !== m);
  } else {
    t.modifiers = t.modifiers.filter((mm) => mm !== m);
  }
}

export function loseHp(state: GameState, t: TeamState, amount: number): void {
  // self damage never kills (floors at 1 HP) and never triggers Overload
  const loss = Math.min(amount, Math.max(0, t.hp - 1));
  t.hp -= loss;
  t.stats.damageTaken += loss;
  if (loss > 0) log(state, 'damage', `Đội ${teamName(t.id)} tự mất ${loss} HP.`, { value: loss });
}

// ------------------------------------------------------------
// Block & heal pipelines
// ------------------------------------------------------------

function gainBlockRaw(state: GameState, t: TeamState, amount: number): void {
  t.block += amount;
  t.stats.blockGained += amount;
  anim(state, 'block', t.id, amount);
}

export function gainBlock(ctx: EffectCtx, amount: number, opts?: { fromCard?: boolean }): number {
  const state = ctx.state;
  const t = team(ctx);
  let amt = scaled(ctx, amount);
  const cardDef = ctx.cardDefId ? getCardDef(ctx.cardDefId) : undefined;
  // block bonus modifiers
  if (opts?.fromCard !== false) {
    const m = takeModifier(t, 'blockBonus');
    if (m) amt += m.amount ?? 0;
    const m2 = takeModifier(t, 'damageOrBlockBonus', (mm) => !cardDef || modifierMatchesCard(mm, cardDef, undefined, ctx.ownerCharId, t));
    if (m2) amt += m2.amount ?? 0;
  }
  // Miên white passive
  const mien = findChar(t, 'mien');
  if (mien && mien.face === 'white' && cardDef && (ctx.copySourceCharId ?? cardDef.characterId) === 'mien' && !t.turnFlags['mienWhitePassive']) {
    t.turnFlags['mienWhitePassive'] = 1;
    amt += 2;
    log(state, 'passive', `Mặt Trắng: +2.`);
  }
  // Khôi passive: first block gain each turn
  if (findChar(t, 'khoi') && !t.turnFlags['khoiPassive'] && amt > 0) {
    t.turnFlags['khoiPassive'] = 1;
    const bonus = t.hp <= 20 ? 5 : 3;
    amt += bonus;
    log(state, 'passive', `Tường Thành: +${bonus} Giáp.`);
  }
  // humiliate: -1 per stack
  const hum = getStatus(t, 'humiliate');
  if (hum) amt = Math.max(0, amt - hum.stacks);
  // percent reduction (Bịt Miệng)
  const pct = peekModifier(t, 'blockGainPercent');
  if (pct) amt = Math.floor((amt * (pct.amount ?? 100)) / 100);
  // per-card cap (Tao Đang Nói Chuyện)
  const cap = peekModifier(t, 'blockGainCapPerCard');
  if (cap) {
    const already = t.turnFlags['blockThisCard'] ?? 0;
    amt = Math.max(0, Math.min(amt, (cap.amount ?? 8) - already));
  }
  t.turnFlags['blockThisCard'] = (t.turnFlags['blockThisCard'] ?? 0) + amt;
  gainBlockRaw(state, t, amt);
  log(state, 'block', `Đội ${teamName(t.id)} nhận ${amt} Giáp.`, { value: amt });
  return amt;
}

export function healTeam(state: GameState, t: TeamState, amount: number, opts?: { label?: string }): number {
  let amt = amount;
  const hum = getStatus(t, 'humiliate');
  if (hum) amt = Math.max(0, amt - hum.stacks);
  const healed = Math.min(amt, t.maxHp - t.hp);
  t.hp += healed;
  t.stats.healingDone += healed;
  if (healed > 0) {
    log(state, 'heal', `${opts?.label ? opts.label + ': ' : ''}Đội ${teamName(t.id)} hồi ${healed} HP.`, { value: healed });
    anim(state, 'heal', t.id, healed);
  }
  return healed;
}

export function healFromCard(ctx: EffectCtx, amount: number): number {
  const state = ctx.state;
  const t = team(ctx);
  let amt = scaled(ctx, amount);
  const cardDef = ctx.cardDefId ? getCardDef(ctx.cardDefId) : undefined;
  const m = takeModifier(t, 'healBonus');
  if (m) amt += m.amount ?? 0;
  const m2 = takeModifier(t, 'damageOrHealBonus', (mm) => !cardDef || modifierMatchesCard(mm, cardDef, undefined, ctx.ownerCharId, t));
  if (m2) amt += m2.amount ?? 0;
  const mien = findChar(t, 'mien');
  if (mien && mien.face === 'white' && cardDef && (ctx.copySourceCharId ?? cardDef.characterId) === 'mien' && !t.turnFlags['mienWhitePassive']) {
    t.turnFlags['mienWhitePassive'] = 1;
    amt += 2;
    log(state, 'passive', `Mặt Trắng: +2.`);
  }
  return healTeam(state, t, amt);
}

// ------------------------------------------------------------
// Relationship
// ------------------------------------------------------------

export function changeRel(state: GameState, t: TeamState, delta: number): void {
  const before = t.relationship;
  t.relationship = Math.max(RULES.REL_MIN, Math.min(RULES.REL_MAX, t.relationship + delta));
  logRelChange(state, t, before);
}

export function setRel(state: GameState, t: TeamState, value: number): void {
  const before = t.relationship;
  t.relationship = Math.max(RULES.REL_MIN, Math.min(RULES.REL_MAX, value));
  logRelChange(state, t, before);
}

function logRelChange(state: GameState, t: TeamState, before: number): void {
  if (t.relationship === before) return;
  log(state, 'rel', `Quan hệ đội ${teamName(t.id)}: ${before} → ${t.relationship}.`, { value: t.relationship });
  if (t.relationship >= RULES.FRIENDSHIP_AT && before < RULES.FRIENDSHIP_AT) log(state, 'info', `Đội ${teamName(t.id)} bước vào FRIENDSHIP.`);
  if (t.relationship <= RULES.BETRAYAL_AT && before > RULES.BETRAYAL_AT) log(state, 'info', `Đội ${teamName(t.id)} rơi vào BETRAYAL.`);
}

// ------------------------------------------------------------
// Mana
// ------------------------------------------------------------

export function gainManaCapped(state: GameState, t: TeamState, amount: number): number {
  // in-turn mana gains/refunds cap at 5 per turn
  const allowed = Math.max(0, Math.min(amount, RULES.MANA_REFUND_CAP - t.manaRefundedThisTurn));
  const gained = Math.min(allowed, RULES.MANA_CAP - t.mana);
  t.mana += gained;
  t.manaRefundedThisTurn += allowed;
  if (gained > 0) log(state, 'info', `Đội ${teamName(t.id)} nhận ${gained} Mana.`);
  return gained;
}

export function gainVouchers(state: GameState, t: TeamState, amount: number, allyOnly = false): void {
  const total = t.vouchers + t.vouchersAllyOnly;
  const allowed = Math.min(amount, RULES.VOUCHER_CAP - total);
  if (allowed <= 0) return;
  if (allyOnly) t.vouchersAllyOnly += allowed;
  else t.vouchers += allowed;
  log(state, 'info', `Đội ${teamName(t.id)} nhận ${allowed} Phiếu${allyOnly ? ' (chỉ cho lá đồng minh)' : ''}.`);
}

// ------------------------------------------------------------
// Cards: draw / discard / copies
// ------------------------------------------------------------

export function drawCards(state: GameState, t: TeamState, count: number): CardInstance[] {
  const drawn: CardInstance[] = [];
  for (let i = 0; i < count; i++) {
    if (t.drawPile.length === 0) {
      if (t.discardPile.length === 0) break;
      t.drawPile = shuffle(state, t.discardPile.splice(0));
      log(state, 'info', `Xáo discard pile thành draw pile mới (${t.drawPile.length} lá).`);
    }
    const card = t.drawPile.pop()!;
    t.hand.push(card);
    drawn.push(card);
  }
  if (drawn.length > 0) log(state, 'draw', `Đội ${teamName(t.id)} rút ${drawn.length} lá.`, { value: drawn.length });
  return drawn;
}

export function discardFromHand(state: GameState, t: TeamState, inst: CardInstance): void {
  const idx = t.hand.indexOf(inst);
  if (idx < 0) return;
  if (inst.protectedFromDiscard) {
    log(state, 'info', `${getCardDef(inst.defId).name} được bảo vệ, không thể bị bỏ.`);
    return;
  }
  t.hand.splice(idx, 1);
  if (inst.isCopy || inst.isTemp || getCardDef(inst.defId).exhaust) t.exhaustPile.push(inst);
  else t.discardPile.push(inst);
}

export function copiesInHand(t: TeamState): number {
  return t.hand.filter((c) => c.isCopy).length;
}

/** Create Bản Sao copies of the ally's base-0-cost original cards (Yến mechanic). */
export function generateCopies(ctx: EffectCtx, count: number, opts: { mode: 'random' | 'choose' | 'distinct'; canDuplicate?: boolean; valuePenalty?: number; valuePercent?: number; fixedDefId?: string; toDrawPile?: boolean }): number {
  const state = ctx.state;
  const t = team(ctx);
  const ally = allyOf(t, 'yen');
  if (!ally) { log(state, 'info', 'Không có đồng minh để sao chép.'); return 0; }
  const pool = getCharacterCards(ally.characterId).filter((c) => c.baseCost === 0);
  if (pool.length === 0) { log(state, 'info', 'Đồng minh không có lá 0-cost nguyên bản.'); return 0; }
  let made = 0;
  const usedIds = new Set<string>();
  for (let i = 0; i < count; i++) {
    if (!opts.toDrawPile && copiesInHand(t) >= RULES.MAX_COPY_CARDS_IN_HAND) {
      log(state, 'info', `Đã đạt giới hạn ${RULES.MAX_COPY_CARDS_IN_HAND} Bản Sao trên tay.`);
      break;
    }
    let def: CardDef;
    if (opts.fixedDefId) def = getCardDef(opts.fixedDefId);
    else if (opts.mode === 'distinct') {
      const avail = pool.filter((c) => !usedIds.has(c.id));
      def = avail.length > 0 ? randPick(state, avail) : randPick(state, pool);
    } else def = randPick(state, pool);
    usedIds.add(def.id);
    const inst: CardInstance = {
      instanceId: state.nextInstanceId++,
      defId: def.id,
      isCopy: true,
      copySourceCharId: ally.characterId,
      valuePercent: opts.valuePercent,
      valueBonus: opts.valuePenalty ? -opts.valuePenalty : undefined,
    };
    if (opts.toDrawPile) t.drawPile.push(inst);
    else t.hand.push(inst);
    made++;
    log(state, 'info', `Sinh Bản Sao: ${def.name}${opts.toDrawPile ? ' (lên đầu deck)' : ''}.`);
  }
  return made;
}

// ------------------------------------------------------------
// Choices
// ------------------------------------------------------------

export function raiseChoice(ctx: EffectCtx, choice: Omit<PendingChoice, 'contextId'> & { contextId: string }): void {
  ctx.state.pendingChoice = choice;
  // stash the ctx for the resolver
  ctx.state.pendingChoice.data = {
    ...choice.data,
    ctx: serializeCtx(ctx),
  };
}

function serializeCtx(ctx: EffectCtx): Record<string, unknown> {
  const { state: _s, ...rest } = ctx;
  return rest as unknown as Record<string, unknown>;
}

function reviveCtx(state: GameState, data: Record<string, unknown>): EffectCtx {
  return { ...(data as unknown as Omit<EffectCtx, 'state'>), state } as EffectCtx;
}

// ------------------------------------------------------------
// Effect interpreter
// ------------------------------------------------------------

export function resolveEffects(ctx: EffectCtx, effects: EffectDef[]): void {
  const state = ctx.state;
  for (let i = 0; i < effects.length; i++) {
    if (state.phase === 'gameOver') return;
    if (state.pendingChoice) {
      // suspended mid-list: queue the remainder
      state.pendingQueue = state.pendingQueue ?? [];
      state.pendingQueue.push({ effects: effects.slice(i), ctx: serializeCtx(ctx) as never });
      return;
    }
    resolveOne(ctx, effects[i]);
  }
  if (state.pendingChoice) return; // last effect raised a choice — nothing left to queue
}

function resolveOne(ctx: EffectCtx, eff: EffectDef): void {
  const state = ctx.state;
  const t = team(ctx);
  if (ctx.repeatDamageOnly && eff.op !== 'damage' && eff.op !== 'if') return;
  switch (eff.op) {
    case 'damage': {
      const { op: _op, value, ...opts } = eff;
      applyAttack(ctx, value ?? 0, opts);
      break;
    }
    case 'block':
      gainBlock(ctx, eff.value);
      break;
    case 'heal':
      healFromCard(ctx, eff.value);
      break;
    case 'healEnemy':
      healTeam(state, foe(ctx), scaled(ctx, eff.value), { label: 'Hồi cho đối thủ' });
      break;
    case 'loseHp':
      loseHp(state, t, eff.value);
      break;
    case 'rel': {
      if (eff.invert) setRel(state, t, -t.relationship);
      else if (eff.set !== undefined) setRel(state, t, eff.set);
      else if (eff.setRandomOf) setRel(state, t, randPick(state, eff.setRandomOf));
      else if (eff.atLeast !== undefined) { if (t.relationship < eff.atLeast) setRel(state, t, eff.atLeast); }
      else if (eff.atMost !== undefined) { if (t.relationship > eff.atMost) setRel(state, t, eff.atMost); }
      else if (eff.delta !== undefined) changeRel(state, t, eff.delta);
      break;
    }
    case 'draw':
      if (eff.upTo !== undefined) {
        const need = Math.max(0, eff.upTo - t.hand.length);
        drawCards(state, t, need);
      } else {
        drawCards(state, t, eff.count ?? 1);
      }
      break;
    case 'discardRandom': {
      for (let i = 0; i < eff.count; i++) {
        let pool = t.hand.filter((c) => !c.protectedFromDiscard);
        if (eff.filterCharId === 'ally') {
          pool = pool.filter((c) => (c.copySourceCharId ?? getCardDef(c.defId).characterId) !== ctx.ownerCharId);
        } else if (eff.filterCharId) {
          pool = pool.filter((c) => getCardDef(c.defId).characterId === eff.filterCharId);
        }
        if (pool.length === 0) break;
        const card = randPick(state, pool);
        log(state, 'info', `Bỏ ngẫu nhiên: ${getCardDef(card.defId).name}.`);
        discardFromHand(state, t, card);
      }
      break;
    }
    case 'discardChoose': {
      if (t.hand.length === 0) break;
      raiseChoice(ctx, {
        type: 'handCards',
        prompt: `Chọn ${eff.count} lá để bỏ`,
        cardInstanceIds: t.hand.filter((c) => !c.protectedFromDiscard).map((c) => c.instanceId),
        min: Math.min(eff.count, t.hand.length),
        max: Math.min(eff.count, t.hand.length),
        contextId: 'discard-choose',
      });
      break;
    }
    case 'discardFriendCards': {
      const friends = t.hand.filter((c) => getCardDef(c.defId).keywords.includes('friend'));
      for (const c of friends) discardFromHand(state, t, c);
      if (friends.length > 0) log(state, 'info', `Bỏ ${friends.length} lá Friend trên tay.`);
      break;
    }
    case 'status': {
      const targetTeam = eff.target === 'enemyTeam' ? foe(ctx) : t;
      if (eff.status === 'taunt' || eff.status === 'counter') {
        let char: CombatantState | undefined;
        if (eff.target === 'ownerChar') char = findChar(t, ctx.ownerCharId);
        else if (eff.target === 'ally') char = allyOf(t, ctx.ownerCharId) ?? findChar(t, ctx.ownerCharId);
        else if (eff.target === 'targetChar') char = ctx.finalTargetCharId ? findChar(foe(ctx), ctx.finalTargetCharId) : undefined;
        else char = findChar(t, ctx.ownerCharId);
        if (char) {
          const holderTeam = eff.target === 'targetChar' ? foe(ctx) : t;
          addCharStatus(state, holderTeam, char, eff.status, { stacks: eff.stacks, turns: eff.turns ?? 1, percent: eff.percent, uses: eff.uses });
        }
      } else {
        addTeamStatus(state, targetTeam, eff.status, eff.stacks ?? 1, eff.turns, eff.uses);
      }
      break;
    }
    case 'bleed':
      addTeamStatus(state, foe(ctx), 'bleed', scaled(ctx, eff.stacks));
      break;
    case 'triggerBleed': {
      const e = foe(ctx);
      const st = getStatus(e, 'bleed');
      if (st) {
        log(state, 'info', `Kích hoạt Chảy máu: ${st.stacks} sát thương.`);
        dealDirect(state, e.id, st.stacks, { ignoreBlock: true, label: 'Chảy máu', sourceTeamId: t.id });
        if (eff.reduceStacks !== false) {
          st.stacks -= 1;
          if (st.stacks <= 0) e.statuses = e.statuses.filter((s) => s !== st);
        }
      }
      break;
    }
    case 'cleanse': {
      const target = eff.from === 'enemyTeam' ? foe(ctx) : t;
      cleanse(state, target, eff.what);
      break;
    }
    case 'gainMana':
      gainManaCapped(state, t, eff.amount);
      break;
    case 'gainVouchers':
      gainVouchers(state, t, eff.amount, eff.allyOnly);
      break;
    case 'modifier': {
      const target = eff.target === 'enemyTeam' ? foe(ctx) : t;
      const mod = { ...eff.mod, data: { ...eff.mod.data, creatorCharId: ctx.ownerCharId } };
      addModifier(state, target, mod);
      break;
    }
    case 'generateCopies':
      if (eff.mode === 'choose') {
        const ally = allyOf(t, 'yen');
        const pool = ally ? getCharacterCards(ally.characterId).filter((c) => c.baseCost === 0) : [];
        if (pool.length === 0) { log(state, 'info', 'Không có lá 0-cost để sao chép.'); break; }
        raiseChoice(ctx, {
          type: 'cardDefs',
          prompt: 'Chọn lá 0-cost để sao chép',
          cardDefIds: pool.map((c) => c.id),
          min: 1, max: 1,
          contextId: 'copy-choose',
          data: { count: eff.count },
        });
      } else {
        generateCopies(ctx, eff.count, { mode: eff.mode, canDuplicate: eff.canDuplicate, valuePenalty: eff.valuePenalty });
      }
      break;
    case 'flipFace':
      flipFace(state, t, ctx);
      break;
    case 'if':
      if (checkCond(ctx, eff.cond)) resolveEffects(ctx, eff.then);
      else if (eff.else) resolveEffects(ctx, eff.else);
      break;
    case 'choose': {
      raiseChoice(ctx, {
        type: 'option',
        prompt: eff.prompt,
        options: eff.options.map((o, index) => ({ label: o.label, index })),
        min: 1, max: 1,
        contextId: 'choose-op',
        data: { options: eff.options, bothChancePercent: eff.bothChancePercent },
      });
      break;
    }
    case 'random': {
      const totalWeight = eff.options.reduce((s, o) => s + (o.weight ?? 1), 0);
      let roll = rand(state) * totalWeight;
      for (const o of eff.options) {
        roll -= o.weight ?? 1;
        if (roll < 0) { resolveEffects(ctx, o.effects); break; }
      }
      break;
    }
    case 'custom': {
      const fn = customResolvers.get(eff.id);
      if (fn) fn(ctx, eff.params);
      else log(state, 'info', `(Thiếu resolver: ${eff.id})`);
      break;
    }
  }
}

export function cleanse(state: GameState, t: TeamState, what: 'debuff' | 'buff' | 'weakOrExpose'): void {
  if (what === 'weakOrExpose') {
    const st = getStatus(t, 'weak') ?? getStatus(t, 'expose') ?? getStatus(t, 'exposeNextHit');
    if (st) {
      t.statuses = t.statuses.filter((s) => s !== st);
      log(state, 'status', `Xóa ${statusName(st.id)} khỏi đội ${teamName(t.id)}.`);
    }
    return;
  }
  if (what === 'debuff') {
    const debuffs: StatusId[] = ['weak', 'expose', 'exposeNextHit', 'bleed', 'humiliate'];
    for (const id of debuffs) {
      const st = getStatus(t, id);
      if (st) {
        t.statuses = t.statuses.filter((s) => s !== st);
        log(state, 'status', `Xóa ${statusName(id)} khỏi đội ${teamName(t.id)}.`);
        return;
      }
    }
    return;
  }
  // buff: remove a positive team modifier or char counter/taunt
  const buffIdx = t.modifiers.findIndex((m) => m.kind !== 'flag' && m.kind !== 'manaDebtNextTurn' && m.kind !== 'manaNextTurn');
  if (buffIdx >= 0) {
    const m = t.modifiers.splice(buffIdx, 1)[0];
    log(state, 'status', `Xóa một buff (${m.kind}) của đội ${teamName(t.id)}.`);
    return;
  }
  for (const c of t.characters) {
    const st = c.statuses.find((s) => s.id === 'counter' || s.id === 'taunt');
    if (st) {
      c.statuses = c.statuses.filter((s) => s !== st);
      log(state, 'status', `Xóa ${statusName(st.id)} của ${CHARACTERS[c.characterId].name}.`);
      return;
    }
  }
  log(state, 'info', 'Không có buff nào để xóa.');
}

// ------------------------------------------------------------
// Miên faces
// ------------------------------------------------------------

export function flipFace(state: GameState, t: TeamState, ctx?: EffectCtx): void {
  const mien = findChar(t, 'mien');
  if (!mien) return;
  if (mien.ultimateActiveTurns && mien.ultimateActiveTurns > 0) return; // ult: no auto flip
  mien.face = mien.face === 'white' ? 'black' : 'white';
  mien.flipsThisTurn = (mien.flipsThisTurn ?? 0) + 1;
  log(state, 'info', `Miên Lật Mặt → ${mien.face === 'white' ? 'Trắng' : 'Đen'} (lần ${mien.flipsThisTurn} trong lượt).`);
  anim(state, 'flip', t.id, undefined, 'mien');
  // passive: max 4 flip triggers per turn
  if ((mien.flipsThisTurn ?? 0) <= 4) {
    if (mien.face === 'white') healTeam(state, t, 1, { label: 'Không Ai Biết Tao Là Ai' });
    else {
      log(state, 'passive', 'Không Ai Biết Tao Là Ai: gây 2 sát thương.');
      dealDirect(state, otherTeamId(t.id), 2, { sourceTeamId: t.id });
    }
  }
  void ctx;
}

// ------------------------------------------------------------
// Cost computation & playability
// ------------------------------------------------------------

export function getCardCost(state: GameState, t: TeamState, inst: CardInstance): number {
  const def = getCardDef(inst.defId);
  if (inst.isCopy) return 0;
  let cost: number;
  if (inst.turnCost !== undefined) cost = inst.turnCost;
  else {
    cost = inst.tempCost ?? inst.costOverride ?? def.cost;
    if (def.costCondition) {
      const ctx: EffectCtx = {
        state, teamId: t.id, ownerCharId: def.characterId, targetTeamId: otherTeamId(t.id), valuePercent: 100, valueBonus: 0,
      };
      if (checkCond(ctx, def.costCondition.cond)) cost = Math.min(cost, def.costCondition.cost);
    }
  }
  const effCharId = inst.copySourceCharId ?? def.characterId;
  for (const m of t.modifiers) {
    if (m.kind === 'costDelta' && modifierMatchesCard(m, def, inst, effCharId, t)) cost += m.amount ?? 0;
    if (m.kind === 'friendCardDiscount' && def.keywords.includes('friend') && !t.turnFlags['friendDiscountUsed']) cost += m.amount ?? -1;
    if (m.kind === 'firstCharCardDiscount' && !t.turnFlags[`firstCard-${effCharId}`]) cost += -(m.amount ?? 2);
  }
  return Math.max(0, Math.min(7, cost));
}

export function canPlayCard(state: GameState, t: TeamState, inst: CardInstance): { ok: boolean; reason?: string } {
  if (state.phase === 'gameOver') return { ok: false, reason: 'Trận đấu đã kết thúc.' };
  if (state.pendingChoice) return { ok: false, reason: 'Đang chờ lựa chọn.' };
  if (t.id !== state.active) return { ok: false, reason: 'Chưa đến lượt.' };
  if (t.cardsPlayedThisTurn >= RULES.MAX_CARDS_PER_TURN) return { ok: false, reason: `Đã dùng tối đa ${RULES.MAX_CARDS_PER_TURN} lá trong lượt.` };
  const maxMod = peekModifier(t, 'maxCardsThisTurn');
  if (maxMod && t.cardsPlayedThisTurn >= (maxMod.amount ?? 5)) return { ok: false, reason: `Cắt Giảm Ngân Sách: tối đa ${maxMod.amount} lá lượt này.` };
  if (t.turnFlags['cardLock']) return { ok: false, reason: 'Đã bị khóa chơi bài lượt này.' };
  const def = getCardDef(inst.defId);
  if (def.id === 'duy-19' && t.modifiers.some((m) => m.kind === 'manaNextTurn' || m.kind === 'manaDebtNextTurn')) {
    return { ok: false, reason: 'Không thể Vay Nóng khi đang có Nợ.' };
  }
  const cost = getCardCost(state, t, inst);
  const vouchersUsable = t.vouchers + (isAllyCardForVouchers(t, inst) ? t.vouchersAllyOnly : 0);
  if (cost > t.mana + vouchersUsable) return { ok: false, reason: 'Không đủ Mana.' };
  return { ok: true };
}

function isAllyCardForVouchers(t: TeamState, inst: CardInstance): boolean {
  const effCharId = inst.copySourceCharId ?? getCardDef(inst.defId).characterId;
  return effCharId !== 'duy' && t.characters.some((c) => c.characterId === effCharId);
}

// ------------------------------------------------------------
// Play card
// ------------------------------------------------------------

export function playCard(state: GameState, instanceId: number, targetCharId?: CharacterId): void {
  const t = state.teams[state.active];
  const inst = t.hand.find((c) => c.instanceId === instanceId);
  if (!inst) return;
  const check = canPlayCard(state, t, inst);
  if (!check.ok) { log(state, 'info', check.reason ?? 'Không thể chơi lá này.'); return; }
  const def = getCardDef(inst.defId);
  const effCharId = inst.copySourceCharId ?? def.characterId;

  // pay cost
  const cost = getCardCost(state, t, inst);
  let manaPaid = 0;
  if (cost > 0) {
    manaPaid = Math.min(cost, t.mana);
    let shortfall = cost - manaPaid;
    if (shortfall > 0) {
      // vouchers cover the shortfall — ally-only first when applicable
      if (isAllyCardForVouchers(t, inst)) {
        const useAlly = Math.min(shortfall, t.vouchersAllyOnly);
        t.vouchersAllyOnly -= useAlly;
        shortfall -= useAlly;
      }
      const useNormal = Math.min(shortfall, t.vouchers);
      t.vouchers -= useNormal;
      shortfall -= useNormal;
      if (shortfall > 0) return; // shouldn't happen (canPlayCard checked)
      log(state, 'info', `Dùng Phiếu bù ${cost - manaPaid} Mana.`);
    }
    t.mana -= manaPaid;
    // consume one-use costDelta modifiers that applied
    for (const m of [...t.modifiers]) {
      if (m.kind === 'costDelta' && m.uses !== undefined && modifierMatchesCard(m, def, inst, effCharId, t)) {
        m.uses -= 1;
        if (m.uses <= 0) t.modifiers = t.modifiers.filter((mm) => mm !== m);
      }
    }
  }
  if (peekModifier(t, 'friendCardDiscount') && def.keywords.includes('friend')) t.turnFlags['friendDiscountUsed'] = 1;
  t.turnFlags[`firstCard-${effCharId}`] = 1;

  // ultimate charge
  if (inst.isCopy) {
    const owner = findChar(t, inst.copySourceCharId!);
    if (owner && owner.characterId !== 'yen') chargeUltimate(state, t, owner, RULES.COPY_MANA_VALUE);
  } else if (def.manaValue !== undefined) {
    const owner = findChar(t, def.characterId);
    if (owner) chargeUltimate(state, t, owner, def.manaValue);
  } else if (manaPaid > 0) {
    const owner = findChar(t, def.characterId);
    if (owner) chargeUltimate(state, t, owner, manaPaid);
  }

  // Duy passive: first base-cost>=4 card each turn refunds 1 mana
  if (findChar(t, 'duy') && def.baseCost >= 4 && !t.turnFlags['duyRefund']) {
    t.turnFlags['duyRefund'] = 1;
    log(state, 'passive', 'Khách Quen Thân Thiết: hoàn 1 Mana.');
    gainManaCapped(state, t, 1);
  }
  // Duy ult refund: first 3 cards refund 1 each
  const duyUltRefund = t.modifiers.find((m) => m.kind === 'flag' && m.id === 'duy-ult-refund');
  if (duyUltRefund && manaPaid > 0) {
    gainManaCapped(state, t, 1);
    consumeFlag(t, duyUltRefund);
  }
  // refundNext modifier
  if (manaPaid > 0) {
    const rm = takeModifier(t, 'refundNext', (m) => modifierMatchesCard(m, def, inst, effCharId, t));
    if (rm) {
      log(state, 'info', `Hoàn Tiền: +${rm.amount ?? 2} Mana.`);
      gainManaCapped(state, t, rm.amount ?? 2);
    }
  }

  // counters
  t.cardsPlayedThisTurn += 1;
  t.turnFlags['blockThisCard'] = 0;
  if (def.types.includes('attack')) t.attackCardsPlayedThisTurn += 1;
  if (inst.isCopy) t.copiesPlayedThisTurn += 1;

  // remove from hand, mark for finalize (inPlay is a clone-safe holding zone)
  t.hand = t.hand.filter((c) => c !== inst);
  t.inPlay.push(inst);
  state.pendingFinalize = { teamId: t.id, instanceId };

  log(state, 'playCard', `${teamName(t.id) === 'bạn' ? 'Bạn' : 'Địch'} dùng ${def.name}${inst.isCopy ? ' (Bản Sao)' : ''} (cost ${cost}).`, { cardDefId: def.id, characterId: effCharId });

  // Mộc trò points: any card played for 0 actual cost
  if (cost === 0 && findChar(t, 'moc')) {
    t.trickPoints += 1;
    if (t.trickPoints >= 3) {
      t.trickPoints = 0;
      log(state, 'passive', 'Ba Trò Là Đủ: +1 Mana, rút 1.');
      gainManaCapped(state, t, 1);
      drawCards(state, t, 1);
    }
  }
  // Khanh tempo (copies count too; once per card)
  if (effCharId === 'khanh') {
    t.bladeTempo += 1;
  }
  // An passive: first Friend card each turn creates block
  const ctx: EffectCtx = {
    state, teamId: t.id, ownerCharId: def.characterId, targetTeamId: otherTeamId(t.id),
    targetCharId, cardDefId: def.id, cardInstanceId: instanceId,
    valuePercent: inst.valuePercent ?? 100, valueBonus: inst.valueBonus ?? 0,
    isCopy: inst.isCopy, copySourceCharId: inst.copySourceCharId,
  };
  // forceFriendship consumption
  if (def.keywords.includes('friend')) {
    const m = takeModifier(t, 'forceFriendship');
    if (m) ctx.forceFriendship = true;
  }
  if (def.keywords.includes('friend') && findChar(t, 'an') && !t.turnFlags['anPassive']) {
    t.turnFlags['anPassive'] = 1;
    const bonus = isFriendship(t) || ctx.forceFriendship ? 3 : 2;
    log(state, 'passive', `Có Tớ Đây: +${bonus} Giáp.`);
    gainBlock({ ...ctx, cardDefId: undefined }, bonus, { fromCard: false });
  }
  // Trúc passive: first Bully card each turn → assign meat shield
  if (def.keywords.includes('bully') && findChar(t, 'truc') && !t.turnFlags['trucPassive']) {
    t.turnFlags['trucPassive'] = 1;
    const ally = allyOf(t, 'truc');
    if (ally) {
      ally.isMeatShield = true;
      const taunt = ally.statuses.find((s) => s.id === 'taunt');
      if (!taunt || (taunt.percent ?? 0) < 60) {
        addCharStatus(state, t, ally, 'taunt', { percent: 60, turns: 1 });
      }
      log(state, 'passive', `Bia Thịt Của Tao: ${CHARACTERS[ally.characterId].name} trở thành Bia Thịt (Taunt ≥60%).`);
    }
  }
  // Yến copy passive
  if (inst.isCopy && findChar(t, 'yen')) {
    if (t.copiesPlayedThisTurn <= 3) {
      const owner = findChar(t, inst.copySourceCharId!);
      log(state, 'passive', `Hậu Cần Hoàn Hảo: +2 Giáp cho ${owner ? CHARACTERS[owner.characterId].name : 'đồng minh'}, hồi 1 HP.`);
      gainBlockRaw(state, t, 2);
      healTeam(state, t, 1);
      if (t.copiesPlayedThisTurn === 1) drawCards(state, t, 1);
    }
    // copy value bonus modifiers
    const cvb = takeModifier(t, 'copyValueBonus');
    if (cvb) ctx.valueBonus += cvb.amount ?? 0;
    const cab = takeModifier(t, 'copyAttackBonus');
    if (cab) ctx.valueBonus += cab.amount ?? 0;
    const cbb = takeModifier(t, 'copyBlockBonus');
    if (cbb && def.effects?.some((e) => e.op === 'block')) ctx.valueBonus += cbb.amount ?? 0;
  }
  // zero-cost card bonus (Tăng Nhịp)
  if (def.baseCost === 0 && !inst.isCopy) {
    const m = takeModifier(t, 'zeroCostCardBonus');
    if (m) ctx.valueBonus += m.amount ?? 0;
  }

  // resolve effects (twoFaced → face logic)
  const effects = getEffectsForCard(state, t, def, ctx);
  resolveEffects(ctx, effects);
  maybeFinishCard(state);
}

function getEffectsForCard(state: GameState, t: TeamState, def: CardDef, ctx: EffectCtx): EffectDef[] {
  if (!def.faces) return def.effects ?? [];
  const mien = findChar(t, 'mien');
  const face: Face = mien?.face ?? 'white';
  ctx.face = face;
  t.turnFlags['lastMienCard'] = 1;
  state.teams[t.id].lastPlayedCardDefId = def.id;
  const ultActive = Boolean(mien?.ultimateActiveTurns && mien.ultimateActiveTurns > 0);
  if (ultActive) {
    // both faces at 100%; face chosen after (choice raised in finalize)
    const other: Face = face === 'white' ? 'black' : 'white';
    return [...def.faces[face], ...def.faces[other]];
  }
  const maskBreak = (mien?.flipsThisTurn ?? 0) >= 3 && !mien?.maskBreakUsedThisTurn;
  if (maskBreak && mien) {
    mien.maskBreakUsedThisTurn = true;
    log(state, 'passive', 'VỠ MẶT NẠ: kích hoạt cả hai mặt (mặt kia 50%)!');
    anim(state, 'glitch', t.id, undefined, 'mien');
    const other: Face = face === 'white' ? 'black' : 'white';
    const halved: EffectDef[] = [{ op: 'custom', id: '__halfFace', params: { face: other, defId: def.id } }];
    return [...def.faces[face], ...halved];
  }
  return def.faces[face];
}

export function maybeFinishCard(state: GameState): void {
  if (state.pendingChoice) return;
  if (state.pendingQueue && state.pendingQueue.length > 0) return;
  const fin = state.pendingFinalize;
  if (!fin) return;
  state.pendingFinalize = undefined;
  const t = state.teams[fin.teamId];
  const inst = t.inPlay.find((c) => c.instanceId === fin.instanceId);
  if (!inst) return;
  t.inPlay = t.inPlay.filter((c) => c !== inst);
  const def = getCardDef(inst.defId);
  const effCharId = inst.copySourceCharId ?? def.characterId;

  // Khanh ult: repeat attack cards at 50%
  if (def.types.includes('attack') && state.phase !== 'gameOver') {
    const m = takeModifier(t, 'ultRepeatAttacks');
    if (m) {
      log(state, 'passive', 'Xay Nát: lặp lại đòn với 50% sát thương.');
      const rctx: EffectCtx = {
        state, teamId: t.id, ownerCharId: def.characterId, targetTeamId: otherTeamId(t.id),
        cardDefId: def.id, valuePercent: 50, valueBonus: 0, isRepeat: true, repeatDamageOnly: true,
        isCopy: inst.isCopy, copySourceCharId: inst.copySourceCharId,
      };
      resolveEffects(rctx, def.effects ?? (def.faces ? def.faces[findChar(t, 'mien')?.face ?? 'white'] : []));
    }
  }
  // copyEcho (Chạy Lại Quy Trình)
  if (inst.isCopy && state.phase !== 'gameOver') {
    const m = takeModifier(t, 'copyEcho');
    if (m) {
      const ctx: EffectCtx = { state, teamId: t.id, ownerCharId: 'yen', targetTeamId: otherTeamId(t.id), valuePercent: 100, valueBonus: 0 };
      log(state, 'passive', 'Chạy Lại Quy Trình: tạo thêm một Bản Sao cùng loại.');
      generateCopies(ctx, 1, { mode: 'random', fixedDefId: inst.defId });
    }
  }
  // duy-16: next card creates a temp duplicate
  if (!inst.isTemp && state.phase !== 'gameOver') {
    const m = t.modifiers.find((mm) => mm.kind === 'flag' && mm.id === 'duy-16');
    if (m && m.data?.creatorCardPlayed) {
      consumeFlag(t, m);
      const dup: CardInstance = {
        instanceId: state.nextInstanceId++,
        defId: inst.defId,
        isTemp: true,
        tempCost: Math.ceil(def.baseCost / 2),
      };
      t.hand.push(dup);
      log(state, 'info', `Mua Một Tặng Một: tạo bản tạm của ${def.name} (cost ${dup.tempCost}).`);
    } else if (m && !m.data?.creatorCardPlayed) {
      m.data = { ...m.data, creatorCardPlayed: true };
    }
  }

  // move to discard/exhaust
  if (def.exhaust || inst.isCopy || inst.isTemp) t.exhaustPile.push(inst);
  else t.discardPile.push(inst);

  t.lastPlayedCharId = effCharId;
  t.lastPlayedCardDefId = def.id;
  t.stats.cardsPlayed += 1;

  // Miên ult: choose face after each two-faced card
  const mien = findChar(t, 'mien');
  if (def.faces && mien?.ultimateActiveTurns && mien.ultimateActiveTurns > 0 && state.phase !== 'gameOver') {
    state.pendingChoice = {
      type: 'option',
      prompt: 'Không Còn Mặt Nạ: chọn mặt cho Miên',
      options: [{ label: 'Mặt Trắng', index: 0 }, { label: 'Mặt Đen', index: 1 }],
      min: 1, max: 1,
      contextId: 'mien-face',
      data: { teamId: t.id },
    };
  }

  // cardLockAfter countdown (Mộc)
  const lockMod = peekModifier(t, 'cardLockAfter');
  if (lockMod) {
    lockMod.amount = (lockMod.amount ?? 0) - 1;
    if (lockMod.amount <= 0) {
      t.modifiers = t.modifiers.filter((m) => m !== lockMod);
      if (lockMod.data?.endTurn) {
        log(state, 'info', 'Luật Là Do Tôi Viết: hết hạn — kết thúc lượt!');
        t.turnFlags['forceEndTurn'] = 1;
      } else {
        log(state, 'info', 'Viết Lại Luật: khóa chơi bài phần còn lại của lượt.');
        t.turnFlags['cardLock'] = 1;
      }
    }
  }
  checkDefeat(state, state.teams[otherTeamId(t.id)]);
  checkDefeat(state, t);
}

export function chargeUltimate(state: GameState, t: TeamState, char: CombatantState, amount: number): void {
  if (char.ultimateUsed) return;
  const def = CHARACTERS[char.characterId].ultimate;
  char.ultimateCharge = Math.min(def.charge, char.ultimateCharge + amount);
  if (char.ultimateCharge >= def.charge && !char.ultimateReady) {
    char.ultimateReady = true;
    log(state, 'info', `⚡ Ultimate của ${CHARACTERS[char.characterId].name} đã sẵn sàng: ${def.name}!`);
  }
}

// ------------------------------------------------------------
// Ultimates
// ------------------------------------------------------------

export function useUltimate(state: GameState, characterId: CharacterId, targetCharId?: CharacterId): void {
  if (state.phase === 'gameOver' || state.pendingChoice) return;
  const t = state.teams[state.active];
  const char = findChar(t, characterId);
  if (!char || char.ultimateUsed || !char.ultimateReady) return;
  const def = CHARACTERS[characterId].ultimate;
  char.ultimateUsed = true;
  char.ultimateReady = false;
  t.stats.ultimatesUsed.push(def.id);
  log(state, 'ultimate', `💥 ULTIMATE — ${CHARACTERS[characterId].name}: ${def.name}!`, { characterId });
  anim(state, 'ultimate', t.id, undefined, characterId);
  const ctx: EffectCtx = {
    state, teamId: t.id, ownerCharId: characterId, targetTeamId: otherTeamId(t.id),
    targetCharId, isUltimate: true, valuePercent: 100, valueBonus: 0, cardDefId: undefined,
  };
  if (def.customId) {
    const fn = customResolvers.get(def.customId);
    if (fn) fn(ctx);
    else log(state, 'info', `(Thiếu resolver ultimate: ${def.customId})`);
  } else if (def.effects) {
    resolveEffects(ctx, def.effects);
  }
  maybeFinishCard(state);
  checkDefeat(state, state.teams[otherTeamId(t.id)]);
}

// ------------------------------------------------------------
// Pending choice resolution
// ------------------------------------------------------------

export interface ChoiceSelection {
  optionIndex?: number;
  cardInstanceIds?: number[];
  cardDefIds?: string[];
}

export function resolvePendingChoice(state: GameState, sel: ChoiceSelection): void {
  const choice = state.pendingChoice;
  if (!choice) return;
  state.pendingChoice = undefined;
  const data = choice.data ?? {};
  const ctxData = data.ctx as Record<string, unknown> | undefined;
  const ctx = ctxData ? reviveCtx(state, ctxData) : undefined;

  switch (choice.contextId) {
    case 'choose-op': {
      if (!ctx) break;
      const options = data.options as { label: string; effects: EffectDef[] }[];
      const idx = Math.max(0, Math.min(options.length - 1, sel.optionIndex ?? 0));
      resolveEffects(ctx, options[idx].effects);
      const bothPct = data.bothChancePercent as number | undefined;
      if (bothPct && randPercent(state, bothPct)) {
        const other = options[1 - idx];
        if (other) {
          log(state, 'info', `May mắn! Kích hoạt thêm: ${other.label}.`);
          resolveEffects(ctx, other.effects);
        }
      }
      break;
    }
    case 'discard-choose': {
      if (!ctx) break;
      const t = team(ctx);
      for (const id of sel.cardInstanceIds ?? []) {
        const card = t.hand.find((c) => c.instanceId === id);
        if (card) {
          log(state, 'info', `Bỏ: ${getCardDef(card.defId).name}.`);
          discardFromHand(state, t, card);
        }
      }
      break;
    }
    case 'copy-choose': {
      if (!ctx) break;
      const defId = sel.cardDefIds?.[0] ?? (choice.cardDefIds ?? [])[0];
      const count = (data.count as number) ?? 1;
      generateCopies(ctx, count, { mode: 'choose', fixedDefId: defId });
      break;
    }
    case 'mien-face': {
      const teamId = data.teamId as TeamId;
      const t = state.teams[teamId];
      const mien = findChar(t, 'mien');
      if (mien) {
        mien.face = (sel.optionIndex ?? 0) === 0 ? 'white' : 'black';
        log(state, 'info', `Miên chọn ${mien.face === 'white' ? 'Mặt Trắng' : 'Mặt Đen'}.`);
      }
      break;
    }
    default: {
      // custom resolver continuation: '<resolverId>#stage'
      const fn = customResolvers.get(`choice:${choice.contextId}`);
      if (fn && ctx) fn(ctx, { selection: sel as unknown, choiceData: data });
      break;
    }
  }
  // continue queued effects
  processQueue(state);
}

export function processQueue(state: GameState): void {
  while (!state.pendingChoice && state.pendingQueue && state.pendingQueue.length > 0) {
    const frame = state.pendingQueue.shift()!;
    const ctx = reviveCtx(state, frame.ctx as unknown as Record<string, unknown>);
    resolveEffects(ctx, frame.effects);
  }
  maybeFinishCard(state);
}

// ------------------------------------------------------------
// Turn flow
// ------------------------------------------------------------

function tickDownStatuses(state: GameState, t: TeamState): void {
  // end of t's turn: decrement turn-scoped statuses & modifiers
  for (const holder of [t, ...t.characters] as { statuses: StatusInstance[] }[]) {
    for (const s of [...holder.statuses]) {
      if (s.turns === undefined) continue;
      // turns:0 = this-turn-only, removed unconditionally at end of holder's turn
      if (s.turns > 0 && s.data?.fresh) { s.data = { ...s.data, fresh: false }; continue; }
      s.turns -= 1;
      if (s.turns <= 0) holder.statuses = holder.statuses.filter((x) => x !== s);
    }
  }
  for (const m of [...t.modifiers]) {
    if (m.turns === undefined) continue;
    if (m.turns > 0 && m.data?.fresh) { m.data = { ...m.data, fresh: false }; continue; }
    m.turns -= 1;
    if (m.turns <= 0) t.modifiers = t.modifiers.filter((x) => x !== m);
  }
  // humiliate: -1 stack at end of each of the holder's turns
  const hum = getStatus(t, 'humiliate');
  if (hum) {
    hum.stacks -= 1;
    if (hum.stacks <= 0) t.statuses = t.statuses.filter((s) => s !== hum);
  }
}

export function endTurn(state: GameState): void {
  if (state.phase === 'gameOver' || state.pendingChoice) return;
  const t = state.teams[state.active];
  const e = state.teams[otherTeamId(state.active)];

  // discard hand except retain
  for (const c of [...t.hand]) {
    const def = getCardDef(c.defId);
    if (def.retain || c.retainThisTurn) { c.retainThisTurn = false; continue; }
    t.hand = t.hand.filter((x) => x !== c);
    if (c.isCopy || c.isTemp || def.exhaust) t.exhaustPile.push(c);
    else t.discardPile.push(c);
  }
  // clear per-turn cost mods
  for (const zone of [t.hand, t.drawPile, t.discardPile]) {
    for (const c of zone) { c.turnCost = undefined; c.protectedFromDiscard = false; }
  }

  // bleed ticks at end of the bleeding team's turn
  const bleed = getStatus(t, 'bleed');
  if (bleed) {
    log(state, 'status', `Chảy máu: đội ${teamName(t.id)} mất ${bleed.stacks} HP.`);
    dealDirect(state, t.id, bleed.stacks, { ignoreBlock: true, label: 'Chảy máu' });
    bleed.stacks -= 1;
    if (bleed.stacks <= 0) t.statuses = t.statuses.filter((s) => s !== bleed);
  }
  if ((state.phase as Phase) === 'gameOver') return;

  tickDownStatuses(state, t);
  t.bladeTempo = 0;
  t.turnFlags = {};
  if (t.trucRage === 'active') t.trucRage = 'spent';

  // Miên ult countdown
  const mien = findChar(t, 'mien');
  if (mien?.ultimateActiveTurns) {
    mien.ultimateActiveTurns -= 1;
    if (mien.ultimateActiveTurns <= 0) {
      mien.face = rand(state) < 0.5 ? 'white' : 'black';
      log(state, 'info', `Không Còn Mặt Nạ kết thúc — Miên nhận mặt ngẫu nhiên: ${mien.face === 'white' ? 'Trắng' : 'Đen'}.`);
    }
  }

  log(state, 'endTurn', `— Kết thúc lượt của ${teamName(t.id) === 'bạn' ? 'bạn' : 'địch'} —`);
  startTurn(state, e.id);
}

export function startTurn(state: GameState, teamId: TeamId): void {
  if (state.phase === 'gameOver') return;
  state.active = teamId;
  const t = state.teams[teamId];
  if (teamId === 'player') state.turn += 1;

  // block reset (keep-block effects first)
  let keepPct = 0;
  for (const m of t.modifiers) if (m.kind === 'keepBlockPercent') keepPct = Math.max(keepPct, m.amount ?? 0);
  const kept = Math.floor((t.block * keepPct) / 100);
  if (t.block > 0 && kept > 0) log(state, 'info', `Giữ lại ${kept} Giáp đầu lượt.`);
  t.block = kept;

  // mana
  let mana: number = RULES.MANA_PER_TURN;
  for (const m of [...t.modifiers]) {
    if (m.kind === 'manaNextTurn') { mana = Math.min(mana, m.amount ?? RULES.MANA_PER_TURN); t.modifiers = t.modifiers.filter((x) => x !== m); }
  }
  for (const m of [...t.modifiers]) {
    if (m.kind === 'manaDebtNextTurn') { mana = Math.max(0, mana - (m.amount ?? 0)); log(state, 'info', `Thanh Toán Sau: -${m.amount} Mana.`); t.modifiers = t.modifiers.filter((x) => x !== m); }
  }
  for (const m of [...t.modifiers]) {
    if (m.kind === 'manaGainNextTurn') { mana += m.amount ?? 1; t.modifiers = t.modifiers.filter((x) => x !== m); }
  }
  // Lâm noise conversion
  const lam = findChar(t, 'lam');
  if (lam) {
    const bonus = Math.min(3, lam.noise);
    if (bonus > 0) log(state, 'passive', `Quá Tải: +${bonus} Mana từ ${bonus} Nhiễu.`);
    mana += bonus;
    lam.noiseLastTurn = lam.noise;
    lam.manaFromNoiseThisTurn = bonus;
    lam.noise = 0;
    lam.overloadDamage = 0;
    lam.overloadExtra = 0;
  }
  // permanent enemy-modifier mana bonus (Enemy System)
  for (const m of t.modifiers) {
    if (m.kind === 'flag' && m.id === 'perma-mana') mana += m.amount ?? 0;
  }
  t.mana = Math.min(RULES.MANA_CAP, mana);
  t.manaRefundedThisTurn = 0;

  // vouchers (Duy passive)
  if (findChar(t, 'duy')) gainVouchers(state, t, 1);

  // per-turn resets
  t.cardsPlayedThisTurn = 0;
  t.copiesPlayedThisTurn = 0;
  t.attackCardsPlayedThisTurn = 0;
  t.turnFlags = {};
  for (const c of t.characters) {
    c.hitsTakenLastEnemyTurn = c.hitsTakenThisEnemyTurn;
    c.hitsTakenThisEnemyTurn = 0;
    c.hpLostLastEnemyTurn = c.hpLostThisEnemyTurn;
    c.hpLostThisEnemyTurn = 0;
    c.flipsThisTurn = 0;
    c.maskBreakUsedThisTurn = false;
  }
  // enemy-turn heal caps reset when the OTHER team starts (i.e. our defensive turn begins)
  const e = state.teams[otherTeamId(teamId)];
  e.meatShieldHealThisTurn = 0;

  // Trúc rage activation
  if (t.trucRage === 'pending') {
    t.trucRage = 'active';
    log(state, 'passive', 'Cuồng Nộ: Trúc +5 sát thương lượt này.');
  }

  // draw
  let draw = RULES.HAND_DRAW;
  for (const m of [...t.modifiers]) {
    if (m.kind === 'drawDelta') {
      if (m.data?.fresh) continue;
      draw += m.amount ?? 0;
      t.modifiers = t.modifiers.filter((x) => x !== m);
    }
  }
  // permanent enemy-modifier draw bonus (Enemy System)
  for (const m of t.modifiers) {
    if (m.kind === 'flag' && m.id === 'perma-draw') draw += m.amount ?? 0;
  }
  // lam-08 / lam-21 stored draws
  for (const m of [...t.modifiers]) {
    if (m.kind === 'flag' && (m.id === 'lam-08' || m.id === 'lam-21') && m.data?.drawNextTurn) {
      draw += 1;
      m.data = { ...m.data, drawNextTurn: false };
      if (m.id === 'lam-08') t.modifiers = t.modifiers.filter((x) => x !== m);
    }
  }
  log(state, 'startTurn', `=== Lượt ${state.turn} — ${teamName(teamId) === 'bạn' ? 'BẠN' : 'ĐỊCH'} (Mana ${t.mana}) ===`);

  // Kiệt Sức (fatigue): from turn 25, each team loses (turn-24) HP at turn start
  // so no battle can stall forever. Ignores block.
  if (state.turn >= 25) {
    const fatigue = state.turn - 24;
    log(state, 'info', `Kiệt Sức: đội ${teamName(teamId)} mất ${fatigue} HP.`);
    dealDirect(state, teamId, fatigue, { ignoreBlock: true, label: 'Kiệt Sức' });
    if ((state.phase as Phase) === 'gameOver') return;
  }

  drawCards(state, t, draw);
}

// lam-08: mark when block fully broken during enemy turn
export function noteBlockBroken(state: GameState, t: TeamState): void {
  const m = t.modifiers.find((mm) => mm.kind === 'flag' && mm.id === 'lam-08');
  if (m) m.data = { ...m.data, drawNextTurn: true };
}

function checkDefeat(state: GameState, t: TeamState): void {
  if (state.phase === 'gameOver') return;
  if (t.hp <= 0) {
    t.hp = 0;
    state.phase = 'gameOver';
    state.winner = otherTeamId(t.id);
    log(state, state.winner === 'player' ? 'victory' : 'defeat', state.winner === 'player' ? '🏆 BẠN THẮNG!' : '💀 BẠN THUA!');
  }
}

// ------------------------------------------------------------
// Battle setup
// ------------------------------------------------------------

function makeCombatant(characterId: CharacterId, teamId: TeamId): CombatantState {
  return {
    characterId, teamId,
    ultimateCharge: 0, ultimateUsed: false, ultimateReady: false,
    statuses: [],
    overloadDamage: 0, noise: 0, overloadExtra: 0, noiseLastTurn: 0, manaFromNoiseThisTurn: 0,
    hitsTakenLastEnemyTurn: 0, hitsTakenThisEnemyTurn: 0,
    hpLostThisEnemyTurn: 0, hpLostLastEnemyTurn: 0,
    face: characterId === 'mien' ? undefined : undefined,
    flipsThisTurn: 0,
    maskBreakUsedThisTurn: false,
  };
}

function makeTeam(id: TeamId, deck: Deck, state: { nextInstanceId: number }): TeamState {
  const characters = deck.characterIds.map((cid) => makeCombatant(cid, id));
  const drawPile: CardInstance[] = deck.cardIds.map((defId) => ({ instanceId: state.nextInstanceId++, defId }));
  return {
    id, hp: RULES.TEAM_HP, maxHp: RULES.TEAM_HP, block: 0, relationship: 0,
    mana: 0, manaRefundedThisTurn: 0, vouchers: 0, vouchersAllyOnly: 0,
    trickPoints: 0, bladeTempo: 0,
    characters, drawPile, hand: [], discardPile: [], exhaustPile: [], inPlay: [],
    statuses: [], modifiers: [],
    cardsPlayedThisTurn: 0, copiesPlayedThisTurn: 0, attackCardsPlayedThisTurn: 0,
    turnFlags: {}, meatShieldHealThisTurn: 0,
    stats: { damageDealt: 0, damageTaken: 0, healingDone: 0, blockGained: 0, cardsPlayed: 0, ultimatesUsed: [], damageByCard: {} },
  };
}

export function createBattle(cfg: { playerDeck: Deck; enemyDeck: Deck; seed: number | string; aiLevel: AILevel }): GameState {
  const seed = toSeed(cfg.seed);
  const counter = { nextInstanceId: 1 };
  const state: GameState = {
    seed,
    rngState: seed,
    turn: 0,
    phase: 'playerTurn',
    active: 'player',
    teams: {
      player: makeTeam('player', cfg.playerDeck, counter),
      enemy: makeTeam('enemy', cfg.enemyDeck, counter),
    },
    log: [],
    nextInstanceId: counter.nextInstanceId,
    aiLevel: cfg.aiLevel,
    animationEvents: [],
  };
  // fix nextInstanceId reference
  state.nextInstanceId = counter.nextInstanceId;
  shuffle(state, state.teams.player.drawPile);
  shuffle(state, state.teams.enemy.drawPile);
  // Miên starting face is random
  for (const tid of ['player', 'enemy'] as TeamId[]) {
    const mien = findChar(state.teams[tid], 'mien');
    if (mien) {
      mien.face = rand(state) < 0.5 ? 'white' : 'black';
      log(state, 'info', `Miên (${teamName(tid)}) bắt đầu với ${mien.face === 'white' ? 'Mặt Trắng' : 'Mặt Đen'}.`);
    }
  }
  log(state, 'info', `Trận đấu bắt đầu — seed ${seed}. AI: ${cfg.aiLevel}.`);
  startTurn(state, 'player');
  return state;
}

/** Clone a game state for AI simulation (plain data, structuredClone-safe). */
export function cloneState(state: GameState): GameState {
  return structuredClone(state);
}
