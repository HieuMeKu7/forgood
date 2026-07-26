// localStorage persistence for decks, settings and match history.

import type { Deck, MatchResult, Settings } from '../engine/types';
import { DEFAULT_SETTINGS } from '../engine/types';

const KEYS = {
  decks: 'fbif:decks',
  settings: 'fbif:settings',
  history: 'fbif:history',
  warning: 'fbif:contentWarningAccepted',
} as const;

function safeGet<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota / private mode */ }
}

export function loadDecks(): Deck[] {
  return safeGet<Deck[]>(KEYS.decks, []);
}

export function saveDecks(decks: Deck[]): void {
  safeSet(KEYS.decks, decks);
}

export function upsertDeck(deck: Deck): Deck[] {
  const decks = loadDecks();
  const idx = decks.findIndex((d) => d.id === deck.id);
  if (idx >= 0) decks[idx] = deck;
  else decks.push(deck);
  saveDecks(decks);
  return decks;
}

export function deleteDeck(id: string): Deck[] {
  const decks = loadDecks().filter((d) => d.id !== id);
  saveDecks(decks);
  return decks;
}

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...safeGet<Partial<Settings>>(KEYS.settings, {}) };
}

export function saveSettings(s: Settings): void {
  safeSet(KEYS.settings, s);
}

export function loadHistory(): MatchResult[] {
  return safeGet<MatchResult[]>(KEYS.history, []);
}

export function addHistory(result: MatchResult): void {
  const history = loadHistory();
  history.unshift(result);
  safeSet(KEYS.history, history.slice(0, 50));
}

export function isWarningAccepted(): boolean {
  return safeGet<boolean>(KEYS.warning, false);
}

export function acceptWarning(): void {
  safeSet(KEYS.warning, true);
}
