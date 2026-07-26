import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { AILevel, Deck, MatchResult, Settings } from '../engine/types';
import { loadDecks, loadHistory, loadSettings, saveSettings, upsertDeck, deleteDeck as removeDeckStorage, addHistory } from './storage';
import { SAMPLE_DECKS } from '../data/sampleDecks';
import { toSeed } from '../engine/rng';

export type Screen =
  | 'menu' | 'deckBuilder' | 'characters' | 'library'
  | 'history' | 'settings' | 'howto' | 'battle' | 'result';

export interface BattleConfig {
  deck: Deck;
  enemyDeck: Deck;
  seed: number;
  aiLevel: AILevel;
}

export interface AppApi {
  screen: Screen;
  settings: Settings;
  decks: Deck[];
  history: MatchResult[];
  battleConfig?: BattleConfig;
  lastResult?: MatchResult;
  editingDeckId?: string;
  navigate(screen: Screen): void;
  updateSettings(patch: Partial<Settings>): void;
  saveDeck(deck: Deck): void;
  removeDeck(id: string): void;
  editDeck(id?: string): void;
  /** Start a battle. Picks a random sample enemy deck and fresh seed unless given. */
  startBattle(deck: Deck, opts?: { seed?: number; aiLevel?: AILevel; enemyDeck?: Deck }): void;
  /** Called by the battle screen when the match ends. Persists history, shows result. */
  finishBattle(result: MatchResult): void;
  rematch(sameSeed: boolean): void;
}

const AppContext = createContext<AppApi | null>(null);

export function useApp(): AppApi {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp outside provider');
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [screen, setScreen] = useState<Screen>('menu');
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [decks, setDecks] = useState<Deck[]>(() => loadDecks());
  const [history, setHistory] = useState<MatchResult[]>(() => loadHistory());
  const [battleConfig, setBattleConfig] = useState<BattleConfig | undefined>();
  const [lastResult, setLastResult] = useState<MatchResult | undefined>();
  const [editingDeckId, setEditingDeckId] = useState<string | undefined>();

  const navigate = useCallback((s: Screen) => setScreen(s), []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const saveDeckCb = useCallback((deck: Deck) => {
    setDecks(upsertDeck({ ...deck, updatedAt: Date.now() }));
  }, []);

  const removeDeck = useCallback((id: string) => {
    setDecks(removeDeckStorage(id));
  }, []);

  const editDeck = useCallback((id?: string) => {
    setEditingDeckId(id);
    setScreen('deckBuilder');
  }, []);

  const startBattle = useCallback((deck: Deck, opts?: { seed?: number; aiLevel?: AILevel; enemyDeck?: Deck }) => {
    const seed = opts?.seed ?? toSeed(`${Date.now()}-${Math.floor(Math.random() * 1e9)}`);
    let enemyDeck = opts?.enemyDeck;
    if (!enemyDeck) {
      const pool = SAMPLE_DECKS.filter((d) => d.id !== deck.id);
      enemyDeck = pool[seed % pool.length];
    }
    setBattleConfig({ deck, enemyDeck, seed, aiLevel: opts?.aiLevel ?? settings.aiLevel });
    setScreen('battle');
  }, [settings.aiLevel]);

  const finishBattle = useCallback((result: MatchResult) => {
    addHistory(result);
    setHistory(loadHistory());
    setLastResult(result);
    setScreen('result');
  }, []);

  const rematch = useCallback((sameSeed: boolean) => {
    setBattleConfig((prev) => {
      if (!prev) return prev;
      const seed = sameSeed ? prev.seed : toSeed(`${Date.now()}-${Math.floor(Math.random() * 1e9)}`);
      return { ...prev, seed };
    });
    setScreen('battle');
  }, []);

  const api = useMemo<AppApi>(() => ({
    screen, settings, decks, history, battleConfig, lastResult, editingDeckId,
    navigate, updateSettings, saveDeck: saveDeckCb, removeDeck, editDeck, startBattle, finishBattle, rematch,
  }), [screen, settings, decks, history, battleConfig, lastResult, editingDeckId, navigate, updateSettings, saveDeckCb, removeDeck, editDeck, startBattle, finishBattle, rematch]);

  return <AppContext.Provider value={api}>{children}</AppContext.Provider>;
}
