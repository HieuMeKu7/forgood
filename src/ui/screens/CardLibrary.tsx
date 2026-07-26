import React, { useMemo, useState } from 'react';
import type { CardDef, CardType, CharacterId, Keyword } from '../../engine/types';
import { useApp } from '../../store/appStore';
import { CARD_LIST } from '../../data/cards';
import { CHARACTERS, CHARACTER_ORDER } from '../../data/characterMeta';
import { CardView } from '../CardView';
import { CharacterAvatar } from '../CharacterAvatar';

const TYPE_OPTIONS: { value: CardType; label: string }[] = [
  { value: 'attack', label: 'Tấn công' },
  { value: 'defense', label: 'Phòng thủ' },
  { value: 'heal', label: 'Hồi phục' },
  { value: 'support', label: 'Hỗ trợ' },
];

const KEYWORD_OPTIONS: { value: Keyword; label: string }[] = [
  { value: 'friend', label: 'Friend' },
  { value: 'betray', label: 'Betray' },
  { value: 'bully', label: 'Bully' },
  { value: 'support', label: 'Support' },
  { value: 'exhaust', label: 'Tiêu hao' },
  { value: 'retain', label: 'Giữ lại' },
  { value: 'bleed', label: 'Chảy máu' },
  { value: 'weak', label: 'Yếu' },
  { value: 'expose', label: 'Lộ sơ hở' },
  { value: 'counter', label: 'Phản đòn' },
  { value: 'taunt', label: 'Taunt' },
  { value: 'twoFaced', label: 'Hai Mặt' },
];

const CHAR_INDEX: Record<string, number> = {};
CHARACTER_ORDER.forEach((id, i) => { CHAR_INDEX[id] = i; });

function hasKeyword(def: CardDef, kw: Keyword): boolean {
  if (def.keywords.includes(kw)) return true;
  if (kw === 'exhaust' && def.exhaust) return true;
  if (kw === 'retain' && def.retain) return true;
  return false;
}

export function CardLibrary(): JSX.Element {
  const app = useApp();
  const [charFilter, setCharFilter] = useState<'all' | CharacterId>('all');
  const [costFilter, setCostFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | CardType>('all');
  const [keywordFilter, setKeywordFilter] = useState<'all' | Keyword>('all');
  const [search, setSearch] = useState<string>('');

  const cards = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CARD_LIST
      .filter((def) => {
        if (charFilter !== 'all' && def.characterId !== charFilter) return false;
        if (costFilter !== 'all' && def.cost !== Number(costFilter)) return false;
        if (typeFilter !== 'all' && !def.types.includes(typeFilter)) return false;
        if (keywordFilter !== 'all' && !hasKeyword(def, keywordFilter)) return false;
        if (q && !def.name.toLowerCase().includes(q) && !def.description.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) =>
        (CHAR_INDEX[a.characterId] - CHAR_INDEX[b.characterId])
        || (a.cost - b.cost)
        || a.id.localeCompare(b.id));
  }, [charFilter, costFilter, typeFilter, keywordFilter, search]);

  return (
    <div className="screen">
      <button className="back-btn" onClick={() => app.navigate('menu')}>← Menu</button>
      <h1 className="page-title">Thư Viện Bài</h1>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 17, marginBottom: 10 }}>Ultimate <span className="dim" style={{ fontSize: 12, fontWeight: 400 }}>(không nằm trong bộ bài)</span></h2>
        <div className="grid-cards">
          {CHARACTER_ORDER.map((charId) => {
            const meta = CHARACTERS[charId];
            const ult = meta.ultimate;
            return (
              <div
                key={charId}
                className="panel"
                style={{
                  width: 236,
                  padding: 10,
                  borderColor: meta.colors.primary,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                  <CharacterAvatar characterId={meta.id} size={36} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>{ult.name}</div>
                    <div className="dim" style={{ fontSize: 11 }}>{meta.name} · {meta.title}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#c99aff', fontWeight: 700 }}>Nạp: {ult.charge} điểm</div>
                <div className="dim" style={{ fontSize: 11, lineHeight: 1.35 }}>{ult.description}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="row" style={{ marginBottom: 12 }}>
        <label className="dim" style={{ fontSize: 12 }}>
          Nhân vật{' '}
          <select value={charFilter} onChange={(e) => setCharFilter(e.target.value as 'all' | CharacterId)}>
            <option value="all">Tất cả</option>
            {CHARACTER_ORDER.map((id) => (
              <option key={id} value={id}>{CHARACTERS[id].name}</option>
            ))}
          </select>
        </label>
        <label className="dim" style={{ fontSize: 12 }}>
          Cost{' '}
          <select value={costFilter} onChange={(e) => setCostFilter(e.target.value)}>
            <option value="all">Tất cả</option>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((c) => (
              <option key={c} value={String(c)}>{c}</option>
            ))}
          </select>
        </label>
        <label className="dim" style={{ fontSize: 12 }}>
          Loại{' '}
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as 'all' | CardType)}>
            <option value="all">Tất cả</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="dim" style={{ fontSize: 12 }}>
          Từ khóa{' '}
          <select value={keywordFilter} onChange={(e) => setKeywordFilter(e.target.value as 'all' | Keyword)}>
            <option value="all">Tất cả</option>
            {KEYWORD_OPTIONS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
        </label>
        <input
          type="text"
          placeholder="Tìm theo tên hoặc mô tả…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 220 }}
        />
        <span className="dim">{cards.length} lá</span>
      </div>

      <div className="grid-cards">
        {cards.map((def) => (
          <CardView key={def.id} def={def} />
        ))}
      </div>
      {cards.length === 0 && (
        <p className="dim" style={{ marginTop: 12 }}>Không có lá nào khớp bộ lọc.</p>
      )}
    </div>
  );
}
