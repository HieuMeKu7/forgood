import type { CardDef, CharacterId } from '../engine/types';
import { anCards } from './characters/an';
import { vyCards } from './characters/vy';
import { mocCards } from './characters/moc';
import { khoiCards } from './characters/khoi';
import { lamCards } from './characters/lam';
import { trucCards } from './characters/truc';
import { yenCards } from './characters/yen';
import { khanhCards } from './characters/khanh';
import { duyCards } from './characters/duy';
import { mienCards } from './characters/mien';

export const CHARACTER_CARDS: Record<CharacterId, CardDef[]> = {
  an: anCards,
  vy: vyCards,
  moc: mocCards,
  khoi: khoiCards,
  lam: lamCards,
  truc: trucCards,
  yen: yenCards,
  khanh: khanhCards,
  duy: duyCards,
  mien: mienCards,
};

export const ALL_CARDS: Record<string, CardDef> = {};
for (const cards of Object.values(CHARACTER_CARDS)) {
  for (const c of cards) ALL_CARDS[c.id] = c;
}

export const CARD_LIST: CardDef[] = Object.values(ALL_CARDS);

export function getCardDef(id: string): CardDef {
  const def = ALL_CARDS[id];
  if (!def) throw new Error(`Unknown card id: ${id}`);
  return def;
}

export function getCharacterCards(characterId: CharacterId): CardDef[] {
  return CHARACTER_CARDS[characterId];
}
