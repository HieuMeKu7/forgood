import React from 'react';
import { useApp } from '../../store/appStore';
import { getCardDef } from '../../data/cards';
import { CHARACTERS } from '../../data/characterMeta';

export function ResultScreen(): JSX.Element {
  const app = useApp();
  const r = app.lastResult;
  if (!r) {
    return (
      <div className="screen">
        <button className="back-btn" onClick={() => app.navigate('menu')}>← Menu</button>
        <p className="dim">Chưa có trận đấu nào.</p>
      </div>
    );
  }
  const won = r.winner === 'player';
  const p = r.playerStats;
  return (
    <div className="screen" style={{ maxWidth: 720 }}>
      <h1 className="page-title" style={{ textAlign: 'center', fontSize: 40 }}>
        {won
          ? <span className="rel-state-friendship">🏆 CHIẾN THẮNG</span>
          : <span className="rel-state-betrayal">💀 THẤT BẠI</span>}
      </h1>
      <p className="dim" style={{ textAlign: 'center', marginBottom: 16 }}>
        {r.playerDeckName} ({r.playerCharacters.map((c) => CHARACTERS[c].name).join(' + ')})
        {' vs '}
        {r.enemyCharacters.map((c) => CHARACTERS[c].name).join(' + ')} — AI: {r.aiLevel}
      </p>
      <div className="panel">
        <table className="stat-table">
          <tbody>
            <tr><td>Số lượt</td><td>{r.turns}</td></tr>
            <tr><td>Sát thương gây ra</td><td>{p.damageDealt}</td></tr>
            <tr><td>Sát thương nhận</td><td>{p.damageTaken}</td></tr>
            <tr><td>Hồi phục</td><td>{p.healingDone}</td></tr>
            <tr><td>Giáp tạo ra</td><td>{p.blockGained}</td></tr>
            <tr><td>Số lá đã dùng</td><td>{p.cardsPlayed}</td></tr>
            <tr>
              <td>Ultimate đã kích hoạt</td>
              <td>{p.ultimatesUsed.length > 0
                ? p.ultimatesUsed.map((id) => {
                    const char = Object.values(CHARACTERS).find((c) => c.ultimate.id === id);
                    return char ? char.ultimate.name : id;
                  }).join(', ')
                : '—'}</td>
            </tr>
            <tr>
              <td>Lá gây nhiều sát thương nhất</td>
              <td>{r.topDamageCard ? `${getCardDef(r.topDamageCard.defId).name} (${r.topDamageCard.damage})` : '—'}</td>
            </tr>
            <tr><td>Seed trận đấu</td><td style={{ fontFamily: 'monospace' }}>{r.seed}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
        <button className="primary" onClick={() => app.rematch(true)}>🔁 Rematch cùng seed</button>
        <button className="betrayal" onClick={() => app.rematch(false)}>🎲 Rematch seed mới</button>
        <button onClick={() => app.navigate('menu')}>← Main Menu</button>
      </div>
    </div>
  );
}
