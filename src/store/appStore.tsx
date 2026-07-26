import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { AILevel, Deck, MatchResult, Settings } from '../engine/types';
import type { EnemyModifier, EnemyProfileId } from '../types/enemy';
import { loadDecks, loadHistory, loadSettings, saveSettings, upsertDeck, deleteDeck as removeDeckStorage, addHistory } from './storage';
import { toSeed } from '../engine/rng';
import { buildEnemyDeck, pickEnemyForSeed, resolveEnemyLoadout } from '../engine/enemyDeckBuilder';

export type Screen =
  | 'menu' | 'deckBuilder' | 'characters' | 'library'
  | 'history' | 'settings' | 'howto' | 'battle' | 'result' | 'enemySelect';

export interface BattleConfig {
  deck: Deck;
  enemyDeck: Deck;
  seed: number;
  aiLevel: AILevel;
  /** data-driven Enemy System */
  enemyId?: string;
  profileId?: EnemyProfileId;
  enemyName?: string;
  modifiers?: EnemyModifier[];
}

export interface AppApi {
  screen: Screen;
  settings: Settings;
  decks: Deck[];
  history: MatchResult[];
  battleConfig?: BattleConfig;
  lastResult?: MatchResult;
  editingDeckId?: string;
  /** deck picked on the menu, awaiting enemy selection */
  pendingDeck?: Deck;
  navigate(screen: Screen): void;
  updateSettings(patch: Partial<Settings>): void;
  saveDeck(deck: Deck): void;
  removeDeck(id: string): void;
  editDeck(id?: string): void;
  /** Menu flow: pick a player deck, then choose an enemy on the enemy-select screen. */
  selectDeckForBattle(deck: Deck): void;
  /** Start a battle against a data-driven enemy. When enemyId is omitted,
   * a deterministic enemy is picked from the seed (never a raw SAMPLE_DECK). */
  startBattle(deck: Deck, opts?: { seed?: number; aiLevel?: AILevel; enemyDeck?: Deck; enemyId?: string; profileId?: EnemyProfileId }): void;
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

function profileFromAiLevel(level: AILevel): EnemyProfileId {
  return level; // 'easy' | 'normal' | 'hard' map 1:1; boss is opt-in via enemy select
}

export function AppProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [screen, setScreen] = useState<Screen>('menu');
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [decks, setDecks] = useState<Deck[]>(() => loadDecks());
  const [history, setHistory] = useState<MatchResult[]>(() => loadHistory());
  const [battleConfig, setBattleConfig] = useState<BattleConfig | undefined>();
  const [lastResult, setLastResult] = useState<MatchResult | undefined>();
  const [editingDeckId, setEditingDeckId] = useState<string | undefined>();
  const [pendingDeck, setPendingDeck] = useState<Deck | undefined>();

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

  const selectDeckForBattle = useCallback((deck: Deck) => {
    setPendingDeck(deck);
    setScreen('enemySelect');
  }, []);

  const startBattle = useCallback((deck: Deck, opts?: { seed?: number; aiLevel?: AILevel; enemyDeck?: Deck; enemyId?: string; profileId?: EnemyProfileId }) => {
    const seed = opts?.seed ?? toSeed(`${Date.now()}-${Math.floor(Math.random() * 1e9)}`);
    if (opts?.enemyDeck) {
      // explicit enemy deck (tests / power users) — no enemy definition attached
      setBattleConfig({ deck, enemyDeck: opts.enemyDeck, seed, aiLevel: opts.aiLevel ?? settings.aiLevel });
    } else {
      const enemyId = opts?.enemyId ?? pickEnemyForSeed(seed).id;
      const profileId = opts?.profileId ?? profileFromAiLevel(opts?.aiLevel ?? settings.aiLevel);
      const loadout = resolveEnemyLoadout(enemyId, profileId);
      setBattleConfig({
        deck,
        enemyDeck: buildEnemyDeck(loadout.enemy),
        seed,
        aiLevel: loadout.aiLevel,
        enemyId,
        profileId,
        enemyName: loadout.displayName,
        modifiers: loadout.modifiers,
      });
    }
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
    screen, settings, decks, history, battleConfig, lastResult, editingDeckId, pendingDeck,
    navigate, updateSettings, saveDeck: saveDeckCb, removeDeck, editDeck,
    selectDeckForBattle, startBattle, finishBattle, rematch,
  }), [screen, settings, decks, history, battleConfig, lastResult, editingDeckId, pendingDeck,
    navigate, updateSettings, saveDeckCb, removeDeck, editDeck, selectDeckForBattle, startBattle, finishBattle, rematch]);

  return <AppContext.Provider value={api}>{children}</AppContext.Provider>;
}
