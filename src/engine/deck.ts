import type { CharacterId, Deck, DeckValidation } from './types';
import { RULES } from './types';
import { CHARACTER_CARDS, getCardDef } from '../data/cards';
import { mulberry32Next, toSeed } from './rng';

export function validateDeck(deck: Pick<Deck, 'characterIds' | 'cardIds'>): DeckValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const chars = deck.characterIds;

  if (chars.length < 1 || chars.length > 2) errors.push('Tổ đội phải có 1–2 nhân vật.');
  if (new Set(chars).size !== chars.length) errors.push('Không thể chọn trùng nhân vật.');
  if (deck.cardIds.length !== RULES.DECK_SIZE) errors.push(`Deck phải có đúng ${RULES.DECK_SIZE} lá (hiện có ${deck.cardIds.length}).`);

  const counts = new Map<string, number>();
  for (const id of deck.cardIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const [id, count] of counts) {
    let def;
    try { def = getCardDef(id); } catch { errors.push(`Lá không tồn tại: ${id}.`); continue; }
    if (count > RULES.MAX_COPIES_PER_CARD) errors.push(`${def.name}: tối đa ${RULES.MAX_COPIES_PER_CARD} bản (hiện có ${count}).`);
    if (!chars.includes(def.characterId)) errors.push(`${def.name} không thuộc nhân vật trong tổ đội.`);
  }
  for (const c of chars) {
    if (!deck.cardIds.some((id) => { try { return getCardDef(id).characterId === c; } catch { return false; } })) {
      errors.push(`Deck cần ít nhất 1 lá của mỗi nhân vật trong tổ đội.`);
      break;
    }
  }
  // curve warnings
  const totalCost = deck.cardIds.reduce((s, id) => { try { return s + getCardDef(id).cost; } catch { return s; } }, 0);
  const avg = deck.cardIds.length > 0 ? totalCost / deck.cardIds.length : 0;
  if (avg > 4) warnings.push('Mana curve rất cao — có thể thiếu lá rẻ đầu trận.');
  if (avg < 1) warnings.push('Mana curve rất thấp — thiếu finisher.');
  return { valid: errors.length === 0, errors, warnings };
}

/** Build a random valid 30-card deck (seeded, deterministic). */
export function generateRandomDeck(seedInput: string | number, characterIds?: CharacterId[]): Pick<Deck, 'characterIds' | 'cardIds'> {
  let rng = toSeed(seedInput);
  const next = () => { const r = mulberry32Next(rng); rng = r.state; return r.value; };
  const allChars = Object.keys(CHARACTER_CARDS) as CharacterId[];
  let chars: CharacterId[];
  if (characterIds && characterIds.length > 0) chars = characterIds.slice(0, 2);
  else {
    const a = allChars[Math.floor(next() * allChars.length)];
    let b = allChars[Math.floor(next() * allChars.length)];
    while (b === a) b = allChars[Math.floor(next() * allChars.length)];
    chars = [a, b];
  }
  const cardIds: string[] = [];
  const counts = new Map<string, number>();
  // ensure at least one card of each char
  for (const c of chars) {
    const pool = CHARACTER_CARDS[c];
    const pick = pool[Math.floor(next() * pool.length)];
    cardIds.push(pick.id);
    counts.set(pick.id, 1);
  }
  const combined = chars.flatMap((c) => CHARACTER_CARDS[c]);
  let guard = 0;
  while (cardIds.length < RULES.DECK_SIZE && guard++ < 2000) {
    const pick = combined[Math.floor(next() * combined.length)];
    const cur = counts.get(pick.id) ?? 0;
    if (cur >= RULES.MAX_COPIES_PER_CARD) continue;
    counts.set(pick.id, cur + 1);
    cardIds.push(pick.id);
  }
  return { characterIds: chars, cardIds };
}

export function manaCurve(cardIds: string[]): number[] {
  const curve = new Array(8).fill(0);
  for (const id of cardIds) {
    try { curve[Math.min(7, getCardDef(id).cost)] += 1; } catch { /* ignore */ }
  }
  return curve;
}
