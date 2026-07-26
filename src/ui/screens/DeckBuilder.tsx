import React, { useMemo, useState } from 'react';
import type { CardType, CharacterId, Deck } from '../../engine/types';
import { RULES } from '../../engine/types';
import { useApp } from '../../store/appStore';
import { CHARACTERS, CHARACTER_ORDER } from '../../data/characterMeta';
import { CHARACTER_CARDS, getCardDef } from '../../data/cards';
import { SAMPLE_DECKS } from '../../data/sampleDecks';
import { generateRandomDeck, manaCurve, validateDeck } from '../../engine/deck';
import { CardView } from '../CardView';
import { CharacterAvatar } from '../CharacterAvatar';

const CARD_TYPES: { value: CardType; label: string }[] = [
  { value: 'attack', label: 'Tấn công' },
  { value: 'defense', label: 'Phòng thủ' },
  { value: 'heal', label: 'Hồi phục' },
  { value: 'support', label: 'Hỗ trợ' },
];

interface LoadedDeck {
  id?: string;
  createdAt?: number;
  name: string;
  chars: CharacterId[];
  cardIds: string[];
}

export function DeckBuilder(): JSX.Element {
  const app = useApp();

  const initial = useMemo<LoadedDeck>(() => {
    if (app.editingDeckId) {
      const own = app.decks.find((d) => d.id === app.editingDeckId);
      if (own) {
        return { id: own.id, createdAt: own.createdAt, name: own.name, chars: [...own.characterIds], cardIds: [...own.cardIds] };
      }
      const sample = SAMPLE_DECKS.find((d) => d.id === app.editingDeckId);
      if (sample) {
        // clone as a new deck — a fresh id is assigned on save
        return { name: sample.name, chars: [...sample.characterIds], cardIds: [...sample.cardIds] };
      }
    }
    return { name: '', chars: [], cardIds: [] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [deckId, setDeckId] = useState<string | undefined>(initial.id);
  const [createdAt, setCreatedAt] = useState<number | undefined>(initial.createdAt);
  const [name, setName] = useState(initial.name);
  const [chars, setChars] = useState<CharacterId[]>(initial.chars);
  const [cardIds, setCardIds] = useState<string[]>(initial.cardIds);

  const [filterChar, setFilterChar] = useState<CharacterId | 'all'>('all');
  const [filterCost, setFilterCost] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState('');

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const id of cardIds) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [cardIds]);

  const pool = useMemo(() => {
    const q = search.trim().toLowerCase();
    return chars
      .filter((c) => filterChar === 'all' || filterChar === c)
      .flatMap((c) => CHARACTER_CARDS[c])
      .filter((def) => {
        if (filterCost !== 'all') {
          const cost = Number(filterCost);
          if (cost === 7 ? def.cost < 7 : def.cost !== cost) return false;
        }
        if (filterType !== 'all' && !def.types.includes(filterType as CardType)) return false;
        if (q) {
          const hay = `${def.name} ${def.description} ${def.keywords.join(' ')}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
  }, [chars, filterChar, filterCost, filterType, search]);

  const validation = useMemo(() => validateDeck({ characterIds: chars, cardIds }), [chars, cardIds]);
  const curve = useMemo(() => manaCurve(cardIds), [cardIds]);
  const curveMax = Math.max(1, ...curve);

  const entries = useMemo(
    () => [...counts.entries()]
      .map(([id, n]) => ({ def: getCardDef(id), n }))
      .sort((a, b) => a.def.cost - b.def.cost || a.def.name.localeCompare(b.def.name, 'vi')),
    [counts],
  );

  const toggleChar = (c: CharacterId): void => {
    if (chars.includes(c)) {
      setChars(chars.filter((x) => x !== c));
      setCardIds(cardIds.filter((id) => getCardDef(id).characterId !== c));
      if (filterChar === c) setFilterChar('all');
    } else if (chars.length < 2) {
      setChars([...chars, c]);
    }
  };

  const addCard = (id: string): void => {
    if (cardIds.length >= RULES.DECK_SIZE) return;
    if ((counts.get(id) ?? 0) >= RULES.MAX_COPIES_PER_CARD) return;
    setCardIds([...cardIds, id]);
  };

  const removeOne = (id: string): void => {
    const idx = cardIds.indexOf(id);
    if (idx >= 0) setCardIds([...cardIds.slice(0, idx), ...cardIds.slice(idx + 1)]);
  };

  const loadDeck = (deck: Deck, keepId: boolean): void => {
    setDeckId(keepId ? deck.id : undefined);
    setCreatedAt(keepId ? deck.createdAt : undefined);
    setName(deck.name);
    setChars([...deck.characterIds]);
    setCardIds([...deck.cardIds]);
    setFilterChar('all');
  };

  const buildDeck = (): Deck => {
    const now = Date.now();
    return {
      id: deckId ?? `deck-${now}`,
      name: name.trim(),
      characterIds: chars,
      cardIds,
      createdAt: createdAt ?? now,
      updatedAt: now,
    };
  };

  const save = (): void => {
    app.saveDeck(buildDeck());
    app.navigate('menu');
  };

  const randomize = (): void => {
    const gen = generateRandomDeck(Date.now(), chars.length > 0 ? chars : undefined);
    setChars(gen.characterIds);
    setCardIds(gen.cardIds);
    setFilterChar('all');
  };

  const playNow = (): void => {
    if (!validation.valid) return;
    app.selectDeckForBattle(buildDeck());
  };

  return (
    <div className="screen">
      <button className="back-btn" onClick={() => app.navigate('menu')}>← Menu</button>
      <h1 className="page-title">Deck Builder</h1>

      <div className="builder">
        <div>
          <div className="dim">Chọn tối đa 2 nhân vật cho tổ đội:</div>
          <div className="char-select">
            {CHARACTER_ORDER.map((c) => {
              const meta = CHARACTERS[c];
              const chosen = chars.includes(c);
              return (
                <div key={c} className={`char-select-item${chosen ? ' chosen' : ''}`} onClick={() => toggleChar(c)}>
                  <CharacterAvatar characterId={c} size={48} glow={chosen} />
                  <span>{meta.name}</span>
                </div>
              );
            })}
          </div>

          {chars.length > 0 && (
            <div className="row" style={{ marginBottom: 10 }}>
              <button className={filterChar === 'all' ? 'primary' : ''} onClick={() => setFilterChar('all')}>Tất cả</button>
              {chars.map((c) => (
                <button key={c} className={filterChar === c ? 'primary' : ''} onClick={() => setFilterChar(c)}>
                  {CHARACTERS[c].name}
                </button>
              ))}
              <select value={filterCost} onChange={(e) => setFilterCost(e.target.value)} aria-label="Lọc theo cost">
                <option value="all">Mọi cost</option>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={String(n)}>{n === 7 ? '7+' : n} Mana</option>
                ))}
              </select>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} aria-label="Lọc theo loại">
                <option value="all">Mọi loại</option>
                {CARD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <input
                placeholder="Tìm tên / mô tả / từ khóa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}

          {chars.length === 0 ? (
            <div className="panel dim">Chọn nhân vật để xem kho bài của họ.</div>
          ) : (
            <div className="builder-pool">
              {pool.map((def) => {
                const inDeck = counts.get(def.id) ?? 0;
                return (
                  <CardView
                    key={def.id}
                    def={def}
                    count={inDeck}
                    disabled={inDeck >= RULES.MAX_COPIES_PER_CARD || cardIds.length >= RULES.DECK_SIZE}
                    onClick={() => addCard(def.id)}
                  />
                );
              })}
              {pool.length === 0 && <div className="dim">Không có lá nào khớp bộ lọc.</div>}
            </div>
          )}
        </div>

        <div className="builder-side">
          <input
            style={{ width: '100%' }}
            placeholder="Tên deck..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Tên deck"
          />

          <div className="dim" style={{ marginTop: 10 }}>Mana curve — Số lá: {cardIds.length}/{RULES.DECK_SIZE}</div>
          <div className="curve">
            {curve.map((n, i) => (
              <div key={i} className="curve-bar" style={{ height: `${(n / curveMax) * 100}%` }}>
                <span>{n > 0 ? n : ''}</span>
              </div>
            ))}
          </div>
          <div className="curve-label">
            {curve.map((_, i) => (
              <span key={i}>{i === 7 ? '7+' : i}</span>
            ))}
          </div>

          <div style={{ margin: '10px 0' }}>
            {entries.map(({ def, n }) => (
              <div
                key={def.id}
                className="deck-list-entry"
                style={{ ['--char-color' as string]: CHARACTERS[def.characterId].colors.primary }}
                onClick={() => removeOne(def.id)}
                title="Nhấn để bỏ một bản"
              >
                <span className="dim">{def.cost}</span>
                <span>{def.name}</span>
                <span style={{ marginLeft: 'auto' }}>×{n}</span>
              </div>
            ))}
            {entries.length === 0 && <div className="dim">Chưa có lá nào trong deck.</div>}
          </div>

          {validation.errors.map((err, i) => (
            <div key={`e${i}`} className="validation-error">{err}</div>
          ))}
          {validation.warnings.map((w, i) => (
            <div key={`w${i}`} className="validation-warning">{w}</div>
          ))}

          <div className="row" style={{ margin: '12px 0' }}>
            <button className="primary" disabled={!validation.valid || name.trim() === ''} onClick={save}>Lưu deck</button>
            <button onClick={randomize}>Deck ngẫu nhiên hợp lệ</button>
            <button className="betrayal" disabled={!validation.valid} onClick={playNow}>Chơi ngay</button>
          </div>

          <h3>Deck đã lưu</h3>
          {app.decks.length === 0 && <div className="dim">Chưa có deck nào được lưu.</div>}
          {app.decks.map((d) => (
            <div key={d.id} className="row spread" style={{ marginBottom: 6 }}>
              <span>{d.name}</span>
              <span className="row">
                <button onClick={() => loadDeck(d, true)}>Mở</button>
                <button className="danger" onClick={() => app.removeDeck(d.id)}>Xóa</button>
              </span>
            </div>
          ))}

          <h3 style={{ marginTop: 12 }}>Deck mẫu</h3>
          {SAMPLE_DECKS.map((d) => (
            <div key={d.id} className="row spread" style={{ marginBottom: 6 }}>
              <span>{d.name}</span>
              <button onClick={() => loadDeck(d, false)}>Sao chép</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
