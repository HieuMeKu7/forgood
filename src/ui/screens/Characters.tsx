import React from 'react';
import { useApp } from '../../store/appStore';
import { CHARACTERS, CHARACTER_ORDER } from '../../data/characterMeta';
import { CHARACTER_CARDS } from '../../data/cards';
import { CharacterAvatar } from '../CharacterAvatar';

export function CharactersScreen(): JSX.Element {
  const app = useApp();
  return (
    <div className="screen">
      <button className="back-btn" onClick={() => app.navigate('menu')}>← Menu</button>
      <h1 className="page-title">Nhân Vật</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {CHARACTER_ORDER.map((id) => {
          const meta = CHARACTERS[id];
          const cardCount = CHARACTER_CARDS[id].length;
          return (
            <div key={id} className="panel" style={{ borderLeft: `4px solid ${meta.colors.primary}` }}>
              <div className="row">
                <CharacterAvatar characterId={id} size={72} />
                <div>
                  <h2 style={{ color: meta.colors.primary }}>
                    {meta.name} <span className="dim">· {meta.title}</span>
                  </h2>
                  <div className="dim">{meta.role}</div>
                  <div className="dim" style={{ fontSize: 12 }}>{cardCount} lá</div>
                </div>
              </div>
              <p style={{ margin: '10px 0' }}>{meta.description}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <strong style={{ color: meta.colors.accent }}>Nội tại — {meta.passive.name}</strong>
                  <div className="dim">{meta.passive.description}</div>
                </div>
                <div>
                  <strong style={{ color: meta.colors.accent }}>
                    Ultimate — {meta.ultimate.name}
                  </strong>{' '}
                  <span className="dim">(Cần {meta.ultimate.charge} điểm Ultimate)</span>
                  <div className="dim">{meta.ultimate.description}</div>
                </div>
                {meta.contentNote && (
                  <div className="dim" style={{ fontStyle: 'italic', fontSize: 12 }}>{meta.contentNote}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
