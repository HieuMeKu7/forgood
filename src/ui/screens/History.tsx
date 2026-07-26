import React, { useState } from 'react';
import type { AILevel, CharacterId, MatchResult, TeamStats } from '../../engine/types';
import { useApp } from '../../store/appStore';
import { CHARACTERS } from '../../data/characterMeta';
import { getCardDef } from '../../data/cards';

const AI_LABEL: Record<AILevel, string> = {
  easy: 'Dễ',
  normal: 'Thường',
  hard: 'Khó',
};

// Map whatever key is stored in stats.ultimatesUsed (ultimate id, character id
// or already the display name) to the ultimate's display name.
const ULT_NAME: Record<string, string> = {};
for (const c of Object.values(CHARACTERS)) {
  ULT_NAME[c.ultimate.id] = c.ultimate.name;
  ULT_NAME[c.id] = c.ultimate.name;
  ULT_NAME[c.ultimate.name] = c.ultimate.name;
}

function ultimateName(key: string): string {
  return ULT_NAME[key] ?? key;
}

function charNames(ids: CharacterId[]): string {
  return ids.map((id) => CHARACTERS[id]?.name ?? id).join(' + ');
}

function TeamStatsTable({ title, stats }: { title: string; stats: TeamStats }): JSX.Element {
  const ults = stats.ultimatesUsed.map(ultimateName).join(', ');
  return (
    <div className="panel" style={{ flex: 1, minWidth: 260 }}>
      <h3 style={{ marginBottom: 8 }}>{title}</h3>
      <table className="stat-table">
        <tbody>
          <tr><td>Sát thương gây ra</td><td>{stats.damageDealt}</td></tr>
          <tr><td>Sát thương nhận vào</td><td>{stats.damageTaken}</td></tr>
          <tr><td>Hồi máu</td><td>{stats.healingDone}</td></tr>
          <tr><td>Giáp đã tạo</td><td>{stats.blockGained}</td></tr>
          <tr><td>Lá đã dùng</td><td>{stats.cardsPlayed}</td></tr>
          <tr><td>Ultimate đã dùng</td><td>{ults.length > 0 ? ults : '—'}</td></tr>
        </tbody>
      </table>
    </div>
  );
}

function MatchDetail({ match }: { match: MatchResult }): JSX.Element {
  let topCardName: string | undefined;
  if (match.topDamageCard) {
    try {
      topCardName = getCardDef(match.topDamageCard.defId).name;
    } catch {
      topCardName = match.topDamageCard.defId;
    }
  }
  return (
    <td colSpan={7} style={{ textAlign: 'left', fontWeight: 400 }}>
      <div className="row" style={{ alignItems: 'stretch' }}>
        <TeamStatsTable title="Đội của bạn" stats={match.playerStats} />
        <TeamStatsTable title="Đối thủ" stats={match.enemyStats} />
      </div>
      {match.topDamageCard && (
        <p className="dim" style={{ marginTop: 8 }}>
          Lá gây sát thương cao nhất: <strong style={{ color: 'var(--text)' }}>{topCardName}</strong>
          {' '}— {match.topDamageCard.damage} sát thương
        </p>
      )}
    </td>
  );
}

export function HistoryScreen(): JSX.Element {
  const app = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="screen">
      <button className="back-btn" onClick={() => app.navigate('menu')}>← Menu</button>
      <h1 className="page-title">Lịch Sử Trận Đấu</h1>
      {app.history.length === 0 ? (
        <p className="dim">Chưa có trận đấu nào được ghi lại. Chơi một trận rồi quay lại đây nhé.</p>
      ) : (
        <table className="stat-table">
          <thead>
            <tr className="dim" style={{ fontSize: 12 }}>
              <td>Thời gian</td>
              <td>Kết quả</td>
              <td>Deck</td>
              <td>Tổ đội</td>
              <td>Số lượt</td>
              <td>AI</td>
              <td style={{ fontWeight: 400 }}>Seed</td>
            </tr>
          </thead>
          <tbody>
            {app.history.map((m) => {
              const won = m.winner === 'player';
              const expanded = expandedId === m.id;
              return (
                <React.Fragment key={m.id}>
                  <tr
                    style={{ cursor: 'pointer' }}
                    onClick={() => setExpandedId(expanded ? null : m.id)}
                    title="Bấm để xem chi tiết"
                  >
                    <td>{new Date(m.timestamp).toLocaleString('vi-VN')}</td>
                    <td className={won ? 'rel-state-friendship' : 'rel-state-betrayal'} style={{ fontWeight: 700 }}>
                      {won ? 'THẮNG' : 'THUA'}
                    </td>
                    <td>{m.playerDeckName}</td>
                    <td>{charNames(m.playerCharacters)} vs {charNames(m.enemyCharacters)}</td>
                    <td>{m.turns}</td>
                    <td>{AI_LABEL[m.aiLevel]}</td>
                    <td className="dim" style={{ fontSize: 11, fontWeight: 400 }}>{m.seed}</td>
                  </tr>
                  {expanded && (
                    <tr>
                      <MatchDetail match={m} />
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
