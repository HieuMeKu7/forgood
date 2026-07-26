// ============================================================
// Custom resolvers for cards/ultimates whose behavior can't be
// expressed by the generic effect DSL. Registered by id; imported
// for side effects by engine/index.ts.
// ============================================================

import { registerResolver } from './registry';
import type { EffectCtx } from './battle';
import {
  allyOf, applyAttack, dealDirect, drawCards, findChar, gainBlock, gainManaCapped,
  gainVouchers, generateCopies, getCardCost, getStatus, healTeam, otherTeamId,
  raiseChoice, resolveEffects, setRel, team, addModifier, foe, maybeFinishCard,
} from './battle';
import type { CardInstance, EffectDef, Face, TeamState } from './types';
import { RULES } from './types';
import { getCardDef, getCharacterCards } from '../data/cards';
import { randInt, randPick, shuffle } from './rng';
import { CHARACTERS } from '../data/characterMeta';

function logInfo(ctx: EffectCtx, text: string): void {
  ctx.state.log.push({ turn: ctx.state.turn, actor: ctx.state.active, kind: 'info', text });
}

function setTurnCost(state: EffectCtx['state'], t: TeamState, inst: CardInstance, cost: number): void {
  inst.turnCost = Math.max(0, Math.min(7, cost));
}

/** Resolve a card's effects "inline" (auto-play, free) — used by moc-16, duy-21. */
function autoPlayCard(ctx: EffectCtx, inst: CardInstance, valuePercent = 100): void {
  const state = ctx.state;
  const t = team(ctx);
  const def = getCardDef(inst.defId);
  const effCharId = inst.copySourceCharId ?? def.characterId;
  t.cardsPlayedThisTurn += 1;
  t.stats.cardsPlayed += 1;
  if (effCharId === 'khanh') t.bladeTempo += 1;
  logInfo(ctx, `Tự động dùng: ${def.name}.`);
  const sub: EffectCtx = {
    state, teamId: t.id, ownerCharId: def.characterId, targetTeamId: otherTeamId(t.id),
    cardDefId: def.id, cardInstanceId: inst.instanceId,
    valuePercent, valueBonus: 0, isCopy: inst.isCopy, copySourceCharId: inst.copySourceCharId,
  };
  const mien = findChar(t, 'mien');
  const effects = def.faces ? def.faces[mien?.face ?? 'white'] : (def.effects ?? []);
  resolveEffects(sub, effects);
  if (def.exhaust || inst.isCopy || inst.isTemp) t.exhaustPile.push(inst);
  else t.discardPile.push(inst);
  t.lastPlayedCharId = effCharId;
  t.lastPlayedCardDefId = def.id;
}

// ------------------------------------------------------------
// VY
// ------------------------------------------------------------

registerResolver('vy-03', (ctx) => {
  const t = team(ctx);
  if (t.hand.length === 0) {
    drawCards(ctx.state, t, 1);
    return;
  }
  raiseChoice(ctx, {
    type: 'handCards',
    prompt: 'Xóa Dấu Vết: chọn 1 lá để bỏ',
    cardInstanceIds: t.hand.filter((c) => !c.protectedFromDiscard).map((c) => c.instanceId),
    min: 1, max: 1,
    contextId: 'vy-03',
  });
});

registerResolver('choice:vy-03', (ctx, params) => {
  const t = team(ctx);
  const sel = (params?.selection ?? {}) as { cardInstanceIds?: number[] };
  const id = sel.cardInstanceIds?.[0];
  const card = t.hand.find((c) => c.instanceId === id);
  if (card) {
    logInfo(ctx, `Bỏ: ${getCardDef(card.defId).name}.`);
    const idx = t.hand.indexOf(card);
    t.hand.splice(idx, 1);
    if (card.isCopy || card.isTemp || getCardDef(card.defId).exhaust) t.exhaustPile.push(card);
    else t.discardPile.push(card);
  }
  const drawn = drawCards(ctx.state, t, 1);
  for (const d of drawn) setTurnCost(ctx.state, t, d, getCardCost(ctx.state, t, d) - 1);
});

registerResolver('vy-12', (ctx) => {
  const t = team(ctx);
  const betrays = t.hand.filter((c) => getCardDef(c.defId).keywords.includes('betray'));
  if (betrays.length === 0) return;
  let best = betrays[0];
  for (const c of betrays) {
    if (getCardCost(ctx.state, t, c) < getCardCost(ctx.state, t, best)) best = c;
  }
  best.retainThisTurn = true;
  logInfo(ctx, `Giữ lại: ${getCardDef(best.defId).name}.`);
});

registerResolver('vy-15', (ctx) => {
  const t = team(ctx);
  const drawn = drawCards(ctx.state, t, 2);
  for (const d of drawn) setTurnCost(ctx.state, t, d, getCardCost(ctx.state, t, d) - 1);
});

registerResolver('ult-vy', (ctx) => {
  applyAttack(ctx, 16, { perNegativeRel: 3 });
  const e = foe(ctx);
  const bleed = getStatus(e, 'bleed');
  if (bleed && ctx.state.phase !== 'gameOver') {
    const total = (bleed.stacks * (bleed.stacks + 1)) / 2;
    logInfo(ctx, `Không Còn Nhân Chứng: kích hoạt toàn bộ Chảy máu (${total} sát thương).`);
    e.statuses = e.statuses.filter((s) => s !== bleed);
    dealDirect(ctx.state, e.id, total, { ignoreBlock: true, label: 'Chảy máu bùng nổ', sourceTeamId: ctx.teamId });
  }
  setRel(ctx.state, team(ctx), 0);
});

// ------------------------------------------------------------
// MỘC
// ------------------------------------------------------------

registerResolver('moc-03', (ctx) => {
  const t = team(ctx);
  const pool = t.characters.flatMap((c) => getCharacterCards(c.characterId).filter((d) => d.baseCost === 1));
  if (pool.length === 0) return;
  const def = randPick(ctx.state, pool);
  const inst: CardInstance = { instanceId: ctx.state.nextInstanceId++, defId: def.id, isTemp: true, tempCost: 0 };
  t.hand.push(inst);
  logInfo(ctx, `Hàng Dùng Thử: nhận ${def.name} (tạm thời, cost 0).`);
});

registerResolver('moc-05', (ctx) => {
  const t = team(ctx);
  const drawn = drawCards(ctx.state, t, 1);
  if (drawn.length > 0 && getCardCost(ctx.state, t, drawn[0]) === 0) {
    logInfo(ctx, 'Át Chủ Bài: lá 0 Mana — rút thêm 1.');
    drawCards(ctx.state, t, 1);
  }
});

registerResolver('moc-08', (ctx) => {
  const t = team(ctx);
  if (t.discardPile.length === 0) { logInfo(ctx, 'Discard trống.'); return; }
  raiseChoice(ctx, {
    type: 'discardCards',
    prompt: 'Nhanh Tay: chọn 1 lá từ discard',
    cardInstanceIds: t.discardPile.map((c) => c.instanceId),
    min: 1, max: 1,
    contextId: 'moc-08',
  });
});

registerResolver('choice:moc-08', (ctx, params) => {
  const t = team(ctx);
  const sel = (params?.selection ?? {}) as { cardInstanceIds?: number[] };
  const id = sel.cardInstanceIds?.[0];
  const card = t.discardPile.find((c) => c.instanceId === id);
  if (!card) return;
  t.discardPile = t.discardPile.filter((c) => c !== card);
  t.hand.push(card);
  setTurnCost(ctx.state, t, card, getCardCost(ctx.state, t, card) - 1);
  logInfo(ctx, `Lấy ${getCardDef(card.defId).name} từ discard (giảm 1 cost lượt này).`);
});

registerResolver('moc-10', (ctx) => {
  const t = team(ctx);
  const lastId = t.lastPlayedCardDefId;
  if (!lastId || lastId === 'moc-10') { logInfo(ctx, 'Không có lá nào để bắt chước.'); return; }
  const def = getCardDef(lastId);
  logInfo(ctx, `Bắt Chước: lặp lại ${def.name} với 50% giá trị.`);
  const sub: EffectCtx = {
    state: ctx.state, teamId: ctx.teamId, ownerCharId: def.characterId, targetTeamId: ctx.targetTeamId,
    targetCharId: ctx.targetCharId, cardDefId: def.id, valuePercent: 50, valueBonus: 0, isRepeat: true,
  };
  const mien = findChar(t, 'mien');
  const effects = def.faces ? def.faces[mien?.face ?? 'white'] : (def.effects ?? []);
  resolveEffects(sub, effects.filter((e) => e.op !== 'custom' || e.id !== 'moc-10'));
});

registerResolver('moc-13', (ctx) => {
  const t = team(ctx);
  const drawn = drawCards(ctx.state, t, 3);
  const costs = shuffle(ctx.state, [0, 2, 4]);
  drawn.forEach((c, i) => setTurnCost(ctx.state, t, c, costs[i] ?? 0));
  logInfo(ctx, `Rút Bài Hoang Dã: cost lượt này ${drawn.map((c, i) => `${getCardDef(c.defId).name}=${costs[i]}`).join(', ')}.`);
});

registerResolver('moc-15', (ctx) => {
  const t = team(ctx);
  const pool = getCharacterCards('moc').filter((d) => d.baseCost === 0);
  for (let i = 0; i < 3; i++) {
    const def = randPick(ctx.state, pool);
    t.hand.push({ instanceId: ctx.state.nextInstanceId++, defId: def.id, isTemp: true, tempCost: 0 });
    logInfo(ctx, `Tung Hứng: nhận ${def.name} (tạm thời).`);
  }
});

registerResolver('moc-16', (ctx) => {
  const t = team(ctx);
  const state = ctx.state;
  const revealed: CardInstance[] = [];
  for (let i = 0; i < 3; i++) {
    if (t.drawPile.length === 0) {
      if (t.discardPile.length === 0) break;
      t.drawPile = shuffle(state, t.discardPile.splice(0));
    }
    const c = t.drawPile.pop();
    if (c) revealed.push(c);
  }
  logInfo(ctx, `Combo Hỗn Loạn: lật ${revealed.map((c) => getCardDef(c.defId).name).join(', ') || '(không có lá)'}.`);
  let budget = 5;
  for (const c of revealed) {
    const cost = getCardCost(state, t, c);
    if (cost <= budget && state.phase !== 'gameOver') {
      budget -= cost;
      autoPlayCard(ctx, c);
    } else {
      t.discardPile.push(c);
      logInfo(ctx, `${getCardDef(c.defId).name} vượt ngân sách — bỏ vào discard.`);
    }
  }
});

registerResolver('moc-18', (ctx) => {
  const t = team(ctx);
  for (const c of t.hand) setTurnCost(ctx.state, t, c, 1);
  addModifier(ctx.state, t, { kind: 'cardLockAfter', amount: 3 });
  logInfo(ctx, 'Viết Lại Luật: mọi lá trên tay tốn 1; sau 3 lá nữa sẽ khóa chơi bài.');
});

registerResolver('moc-21', (ctx) => {
  const t = team(ctx);
  const drawn = drawCards(ctx.state, t, 5);
  for (const d of drawn) setTurnCost(ctx.state, t, d, 1);
  logInfo(ctx, 'Ai Cũng Phản Bội: 5 lá vừa rút tốn 1 Mana lượt này.');
});

registerResolver('ult-moc', (ctx) => {
  const t = team(ctx);
  const need = Math.max(0, 7 - t.hand.length);
  drawCards(ctx.state, t, need);
  for (const c of t.hand) setTurnCost(ctx.state, t, c, 0);
  addModifier(ctx.state, t, { kind: 'cardLockAfter', amount: 4, data: { endTurn: true } });
  logInfo(ctx, 'Luật Là Do Tôi Viết: mọi lá 0 Mana; sau 4 lá nữa lượt kết thúc.');
});

// ------------------------------------------------------------
// KHÔI
// ------------------------------------------------------------

registerResolver('khoi-21', (ctx) => {
  const t = team(ctx);
  const lost = Math.min(20, t.maxHp - t.hp);
  gainBlock(ctx, lost);
});

// ------------------------------------------------------------
// LÂM
// ------------------------------------------------------------

registerResolver('ult-lam', (ctx) => {
  const state = ctx.state;
  const t = team(ctx);
  gainBlock(ctx, 15);
  gainManaCapped(state, t, 3);
  // draw 3 Lâm cards from the draw pile (topmost first)
  let found = 0;
  for (let i = t.drawPile.length - 1; i >= 0 && found < 3; i--) {
    const c = t.drawPile[i];
    if (getCardDef(c.defId).characterId === 'lam') {
      t.drawPile.splice(i, 1);
      t.hand.push(c);
      found++;
    }
  }
  if (found > 0) logInfo(ctx, `Rút ${found} lá Lâm.`);
  addModifier(state, t, { kind: 'costDelta', amount: -1, turns: 0, filter: { charId: 'lam' } });
  addModifier(state, t, { kind: 'attackHealsDefender', amount: 2, turns: 1 });
  logInfo(ctx, 'Bài Lâm giảm 1 cost lượt này; lượt đối thủ sau, đòn nhắm Lâm hồi 2 HP.');
});

// ------------------------------------------------------------
// TRÚC
// ------------------------------------------------------------

registerResolver('ult-truc', (ctx) => {
  const state = ctx.state;
  const t = team(ctx);
  const ally = allyOf(t, 'truc');
  healTeam(state, t, 15, { label: 'Ultimate Trúc' });
  gainBlock(ctx, 20);
  if (ally) {
    ally.statuses.push({ id: 'taunt', stacks: 1, percent: 100, data: { uses: 3, trucUlt: true, fresh: true }, turns: 3 });
    logInfo(ctx, `${CHARACTERS[ally.characterId].name} Taunt 100% cho 3 đòn tiếp theo (mỗi đòn chuyển hướng hồi 5, Trúc gây lại 7).`);
  }
  addModifier(state, t, { kind: 'deathPrevention', uses: 1, turns: 3 });
});

// ------------------------------------------------------------
// YẾN
// ------------------------------------------------------------

registerResolver('yen-12', (ctx) => {
  generateCopies(ctx, 1, { mode: 'random' });
  generateCopies(ctx, 1, { mode: 'random', toDrawPile: true });
});

registerResolver('yen-21', (ctx) => {
  generateCopies(ctx, 2, { mode: 'random', canDuplicate: true, valuePercent: 150 });
  generateCopies(ctx, 2, { mode: 'random', canDuplicate: true });
});

registerResolver('ult-yen', (ctx) => {
  const state = ctx.state;
  const t = team(ctx);
  healTeam(state, t, 12, { label: 'Mở Toàn Bộ Kho' });
  gainBlock(ctx, 15);
  generateCopies(ctx, 3, { mode: 'random', canDuplicate: true, valuePercent: 150 });
  generateCopies(ctx, 2, { mode: 'random', canDuplicate: true });
});

// ------------------------------------------------------------
// KHANH
// ------------------------------------------------------------

registerResolver('khanh-08', (ctx) => {
  const t = team(ctx);
  t.bladeTempo += 1;
  logInfo(ctx, `Không Ngừng Tay: Nhịp Chém = ${t.bladeTempo}.`);
});

registerResolver('reset-tempo', (ctx) => {
  const t = team(ctx);
  t.bladeTempo = 0;
  logInfo(ctx, 'Nhịp Chém về 0.');
});

registerResolver('ult-khanh', (ctx) => {
  const t = team(ctx);
  t.bladeTempo = 9;
  const need = Math.max(0, 7 - t.hand.length);
  drawCards(ctx.state, t, need);
  addModifier(ctx.state, t, { kind: 'ultRepeatAttacks', amount: 50, uses: 4 });
  logInfo(ctx, 'Xay Nát: Nhịp Chém = 9; 4 lá tấn công tiếp theo lặp lại 50% sát thương.');
});

// ------------------------------------------------------------
// DUY
// ------------------------------------------------------------

registerResolver('duy-02', (ctx) => {
  const t = team(ctx);
  const top = t.drawPile.slice(-3).reverse();
  if (top.length === 0) { logInfo(ctx, 'Deck trống.'); return; }
  raiseChoice(ctx, {
    type: 'discardCards',
    prompt: 'Đọc Điều Khoản: chọn 1 lá đặt lên đầu deck (còn lại xuống đáy)',
    cardInstanceIds: top.map((c) => c.instanceId),
    min: 1, max: 1,
    contextId: 'duy-02',
  });
});

registerResolver('choice:duy-02', (ctx, params) => {
  const t = team(ctx);
  const sel = (params?.selection ?? {}) as { cardInstanceIds?: number[] };
  const chosenId = sel.cardInstanceIds?.[0];
  const top = t.drawPile.splice(-3).reverse();
  const chosen = top.find((c) => c.instanceId === chosenId) ?? top[0];
  const rest = top.filter((c) => c !== chosen);
  // rest to bottom, chosen to top
  for (const c of rest) t.drawPile.unshift(c);
  if (chosen) t.drawPile.push(chosen);
  logInfo(ctx, `Đặt ${chosen ? getCardDef(chosen.defId).name : '?'} lên đầu deck.`);
});

registerResolver('duy-04', (ctx) => {
  const t = team(ctx);
  if (t.hand.length === 0) return;
  raiseChoice(ctx, {
    type: 'handCards',
    prompt: 'Mặc Cả: chọn 1 lá giảm 1 cost lượt này',
    cardInstanceIds: t.hand.map((c) => c.instanceId),
    min: 1, max: 1,
    contextId: 'duy-04',
  });
});

registerResolver('choice:duy-04', (ctx, params) => {
  const t = team(ctx);
  const sel = (params?.selection ?? {}) as { cardInstanceIds?: number[] };
  const card = t.hand.find((c) => c.instanceId === sel.cardInstanceIds?.[0]);
  if (card) {
    setTurnCost(ctx.state, t, card, getCardCost(ctx.state, t, card) - 1);
    logInfo(ctx, `${getCardDef(card.defId).name} giảm 1 cost lượt này.`);
  }
});

registerResolver('duy-06', (ctx) => {
  const t = team(ctx);
  const reduced = t.hand.filter((c) => {
    const def = getCardDef(c.defId);
    return getCardCost(ctx.state, t, c) < def.baseCost;
  });
  if (reduced.length === 0) { logInfo(ctx, 'Không có lá nào đang được giảm cost.'); return; }
  raiseChoice(ctx, {
    type: 'handCards',
    prompt: 'Thu Hồi Vốn: chọn 1 lá để hủy giảm cost, nhận lại Phiếu',
    cardInstanceIds: reduced.map((c) => c.instanceId),
    min: 1, max: 1,
    contextId: 'duy-06',
  });
});

registerResolver('choice:duy-06', (ctx, params) => {
  const t = team(ctx);
  const sel = (params?.selection ?? {}) as { cardInstanceIds?: number[] };
  const card = t.hand.find((c) => c.instanceId === sel.cardInstanceIds?.[0]);
  if (!card) return;
  const def = getCardDef(card.defId);
  const current = getCardCost(ctx.state, t, card);
  const refund = Math.min(3, Math.max(0, def.baseCost - current));
  card.turnCost = undefined;
  card.costOverride = undefined;
  card.tempCost = card.isTemp ? card.tempCost : undefined;
  gainVouchers(ctx.state, t, refund);
  logInfo(ctx, `Thu Hồi Vốn: ${def.name} về cost gốc, nhận ${refund} Phiếu.`);
});

registerResolver('duy-07', (ctx) => {
  const t = team(ctx);
  let n = 0;
  for (const c of t.hand) {
    if (getCardDef(c.defId).baseCost <= 2) {
      setTurnCost(ctx.state, t, c, getCardCost(ctx.state, t, c) - 1);
      n++;
    }
  }
  logInfo(ctx, `Giảm Giá Đồng Loạt: ${n} lá giảm 1 cost lượt này.`);
});

registerResolver('duy-08', (ctx) => {
  const t = team(ctx);
  if (t.hand.length === 0) return;
  raiseChoice(ctx, {
    type: 'handCards',
    prompt: 'Mua Bốn Trả Hai: chọn tối đa 4 lá giảm 1 cost',
    cardInstanceIds: t.hand.map((c) => c.instanceId),
    min: 1, max: Math.min(4, t.hand.length),
    contextId: 'duy-08',
  });
});

registerResolver('choice:duy-08', (ctx, params) => {
  const t = team(ctx);
  const sel = (params?.selection ?? {}) as { cardInstanceIds?: number[] };
  for (const id of sel.cardInstanceIds ?? []) {
    const card = t.hand.find((c) => c.instanceId === id);
    if (card) setTurnCost(ctx.state, t, card, getCardCost(ctx.state, t, card) - 1);
  }
  logInfo(ctx, `Giảm 1 cost cho ${sel.cardInstanceIds?.length ?? 0} lá.`);
});

registerResolver('duy-10', (ctx) => {
  const t = team(ctx);
  if (t.hand.length === 0) return;
  raiseChoice(ctx, {
    type: 'handCards',
    prompt: 'Thanh Toán Sau: chọn 1 lá tốn 0 lượt này (trả nợ lượt sau)',
    cardInstanceIds: t.hand.map((c) => c.instanceId),
    min: 1, max: 1,
    contextId: 'duy-10',
  });
});

registerResolver('choice:duy-10', (ctx, params) => {
  const t = team(ctx);
  const sel = (params?.selection ?? {}) as { cardInstanceIds?: number[] };
  const card = t.hand.find((c) => c.instanceId === sel.cardInstanceIds?.[0]);
  if (!card) return;
  const def = getCardDef(card.defId);
  card.turnCost = 0;
  const debt = Math.min(3, Math.ceil(def.baseCost / 2));
  addModifier(ctx.state, t, { kind: 'manaDebtNextTurn', amount: debt });
  logInfo(ctx, `${def.name} tốn 0 lượt này; lượt sau mất ${debt} Mana.`);
});

registerResolver('duy-11', (ctx) => {
  const t = team(ctx);
  let n = 0;
  for (const c of t.hand) {
    const def = getCardDef(c.defId);
    const effCharId = c.copySourceCharId ?? def.characterId;
    if (effCharId !== 'duy' && !c.isCopy) {
      c.costOverride = Math.max(0, (c.costOverride ?? def.cost) - 1);
      n++;
    }
  }
  logInfo(ctx, `Giá Nội Bộ: ${n} lá đồng minh giảm 1 cost đến khi dùng.`);
});

registerResolver('duy-13', (ctx) => {
  const t = team(ctx);
  for (const c of t.hand) {
    const cur = getCardCost(ctx.state, t, c);
    if (cur > 2) setTurnCost(ctx.state, t, c, 2);
  }
  logInfo(ctx, 'Bán Tháo: mọi lá trên tay còn tối đa 2 cost lượt này.');
});

registerResolver('duy-15', (ctx) => {
  const t = team(ctx);
  if (t.hand.length < 2) { logInfo(ctx, 'Không đủ lá để hoán đổi.'); return; }
  raiseChoice(ctx, {
    type: 'handCards',
    prompt: 'Tái Định Giá: chọn 2 lá để hoán đổi cost',
    cardInstanceIds: t.hand.map((c) => c.instanceId),
    min: 2, max: 2,
    contextId: 'duy-15',
  });
});

registerResolver('choice:duy-15', (ctx, params) => {
  const t = team(ctx);
  const sel = (params?.selection ?? {}) as { cardInstanceIds?: number[] };
  const ids = sel.cardInstanceIds ?? [];
  const a = t.hand.find((c) => c.instanceId === ids[0]);
  const b = t.hand.find((c) => c.instanceId === ids[1]);
  if (!a || !b) return;
  const costA = getCardCost(ctx.state, t, a);
  const costB = getCardCost(ctx.state, t, b);
  setTurnCost(ctx.state, t, a, costB);
  setTurnCost(ctx.state, t, b, costA);
  logInfo(ctx, `Hoán đổi cost: ${getCardDef(a.defId).name}↔${getCardDef(b.defId).name}.`);
});

registerResolver('duy-19', (ctx) => {
  const t = team(ctx);
  gainManaCapped(ctx.state, t, 4);
  addModifier(ctx.state, t, { kind: 'manaNextTurn', amount: 4, id: 'duy-debt' });
  logInfo(ctx, 'Vay Nóng: +4 Mana; lượt sau chỉ có 4 Mana.');
});

registerResolver('duy-20', (ctx) => {
  const t = team(ctx);
  const need = Math.max(0, 7 - t.hand.length);
  const drawn = drawCards(ctx.state, t, need);
  for (const d of drawn) setTurnCost(ctx.state, t, d, getCardCost(ctx.state, t, d) - 2);
  logInfo(ctx, 'Xả Kho: lá vừa rút giảm 2 cost lượt này.');
});

registerResolver('duy-21', (ctx) => {
  const t = team(ctx);
  if (t.hand.length === 0) return;
  raiseChoice(ctx, {
    type: 'handCards',
    prompt: 'Thỏa Thuận Không Thể Từ Chối: dùng ngay 1 lá miễn phí (+25% hiệu ứng)',
    cardInstanceIds: t.hand.map((c) => c.instanceId),
    min: 1, max: 1,
    contextId: 'duy-21',
  });
});

registerResolver('choice:duy-21', (ctx, params) => {
  const t = team(ctx);
  const sel = (params?.selection ?? {}) as { cardInstanceIds?: number[] };
  const card = t.hand.find((c) => c.instanceId === sel.cardInstanceIds?.[0]);
  if (!card) return;
  t.hand = t.hand.filter((c) => c !== card);
  autoPlayCard(ctx, card, 125);
  t.vouchers = 0;
  t.vouchersAllyOnly = 0;
  logInfo(ctx, 'Mất toàn bộ Phiếu.');
});

registerResolver('ult-duy', (ctx) => {
  const t = team(ctx);
  gainVouchers(ctx.state, t, 4);
  drawCards(ctx.state, t, 3);
  for (const c of t.hand) setTurnCost(ctx.state, t, c, getCardCost(ctx.state, t, c) - 1);
  addModifier(ctx.state, t, { kind: 'flag', id: 'duy-ult-refund', uses: 3 });
  logInfo(ctx, 'Mọi Thứ Đều Có Thể Thương Lượng: cả tay giảm 1 cost; 3 lá tiếp theo hoàn 1 Mana.');
});

// ------------------------------------------------------------
// MIÊN
// ------------------------------------------------------------

registerResolver('mien-15', (ctx) => {
  const t = team(ctx);
  const amount = Math.floor(t.block / 2);
  gainBlock(ctx, amount);
});

registerResolver('mien-17', (ctx) => {
  const state = ctx.state;
  const t = team(ctx);
  // find the most recent two-faced card played (from the log, excluding mien-17)
  let lastDefId: string | undefined;
  for (let i = state.log.length - 1; i >= 0; i--) {
    const entry = state.log[i];
    if (entry.kind === 'playCard' && entry.cardDefId && entry.cardDefId !== 'mien-17') {
      const d = getCardDef(entry.cardDefId);
      if (d.faces) { lastDefId = d.id; break; }
    }
  }
  if (!lastDefId) { logInfo(ctx, 'Chưa có lá Hai Mặt nào được dùng.'); return; }
  const def = getCardDef(lastDefId);
  const mien = findChar(t, 'mien');
  const face: Face = mien?.face ?? 'white';
  logInfo(ctx, `Cùng Một Cơ Thể: kích hoạt lại ${def.name} (mặt ${face === 'white' ? 'Trắng' : 'Đen'}).`);
  const sub: EffectCtx = {
    state, teamId: ctx.teamId, ownerCharId: 'mien', targetTeamId: ctx.targetTeamId,
    targetCharId: ctx.targetCharId, cardDefId: def.id, valuePercent: 100, valueBonus: 0, isRepeat: true,
  };
  resolveEffects(sub, def.faces![face].filter((e) => e.op !== 'flipFace'));
});

registerResolver('__halfFace', (ctx, params) => {
  const face = (params?.face ?? 'white') as Face;
  const defId = params?.defId as string;
  const def = getCardDef(defId);
  if (!def.faces) return;
  const sub: EffectCtx = { ...ctx, valuePercent: 50, isRepeat: true };
  resolveEffects(sub, def.faces[face].filter((e) => e.op !== 'flipFace'));
});

registerResolver('ult-mien', (ctx) => {
  const t = team(ctx);
  const mien = findChar(t, 'mien');
  if (!mien) return;
  mien.ultimateActiveTurns = 2;
  drawCards(ctx.state, t, 2);
  logInfo(ctx, 'Không Còn Mặt Nạ: trong hai lượt, lá Hai Mặt kích hoạt cả hai mặt 100%.');
});

// keep maybeFinishCard import used (queue continuation happens in battle.ts)
void maybeFinishCard;
void randInt;
