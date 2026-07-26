import React, { useState } from 'react';
import { useApp } from '../../store/appStore';
import { ENEMIES, ENEMY_PROFILES } from '../../data/enemies';
import { ENEMY_DECKS } from '../../data/enemyDecks';
import { resolveEnemyLoadout } from '../../engine/enemyDeckBuilder';
import { CHARACTERS } from '../../data/characterMeta';
import { CharacterAvatar } from '../CharacterAvatar';
import type { EnemyProfileId } from '../../types/enemy';

const PROFILE_ORDER: EnemyProfileId[] = ['easy', 'normal', 'hard', 'boss'];

export function EnemySelect(): JSX.Element {
  const app = useApp();
  const [profileId, setProfileId] = useState<EnemyProfileId>(
    app.settings.aiLevel === 'easy' || app.settings.aiLevel === 'hard' ? app.settings.aiLevel : 'normal',
  );
  const deck = app.pendingDeck;

  if (!deck) {
    return (
      <div className="screen">
        <button className="back-btn" onClick={() => app.navigate('menu')}>← Menu</button>
        <p className="dim">Chưa chọn deck. Quay lại Main Menu → New Game để chọn deck trước.</p>
      </div>
    );
  }

  const profile = ENEMY_PROFILES[profileId];

  return (
    <div className="screen">
      <button className="back-btn" onClick={() => app.navigate('menu')}>← Menu</button>
      <h1 className="page-title">Chọn Đối Thủ</h1>
      <p className="dim" style={{ marginBottom: 12 }}>
        Deck của bạn: <strong>{deck.name}</strong> — {deck.characterIds.map((c) => CHARACTERS[c].name).join(' + ')}
      </p>

      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="row" style={{ gap: 8 }}>
          <span>Độ khó:</span>
          {PROFILE_ORDER.map((pid) => (
            <button
              key={pid}
              className={pid === profileId ? (pid === 'boss' ? 'betrayal' : 'primary') : ''}
              onClick={() => setProfileId(pid)}
            >
              {ENEMY_PROFILES[pid].name}
            </button>
          ))}
        </div>
        <p className="dim" style={{ marginTop: 8 }}>{profile.description}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ENEMIES.map((enemy) => {
          const loadout = resolveEnemyLoadout(enemy.id, profileId);
          const deckDef = ENEMY_DECKS[enemy.deckId];
          const lead = CHARACTERS[enemy.portraitCharId];
          return (
            <div key={enemy.id} className="panel" style={{ borderLeft: `4px solid ${lead.colors.primary}` }}>
              <div className="row spread" style={{ alignItems: 'flex-start' }}>
                <div className="row" style={{ alignItems: 'flex-start' }}>
                  <div className="row" style={{ gap: 4 }}>
                    {enemy.characterIds.map((cid) => (
                      <CharacterAvatar key={cid} characterId={cid} size={56} glow={cid === enemy.portraitCharId} />
                    ))}
                  </div>
                  <div style={{ maxWidth: 620 }}>
                    <strong>{loadout.displayName}</strong>
                    <span className="dim" style={{ marginLeft: 8, fontSize: 12 }}>{enemy.title}</span>
                    <div className="dim" style={{ fontSize: 13, margin: '4px 0' }}>{enemy.description}</div>
                    <div className="dim" style={{ fontSize: 12 }}>
                      Deck: <em>{deckDef?.name}</em> ({enemy.characterIds.map((c) => CHARACTERS[c].name).join(' + ')})
                    </div>
                    <div className="row" style={{ gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                      {loadout.modifiers.map((m) => (
                        <span key={m.id} className="status-chip debuff" title={m.description}>{m.name}</span>
                      ))}
                      {loadout.modifiers.length === 0 && <span className="dim" style={{ fontSize: 12 }}>Không modifier</span>}
                    </div>
                    <div className="row" style={{ gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                      {enemy.aiHints.map((h, i) => (
                        <span key={i} className="status-chip buff">{h}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  className={profileId === 'boss' ? 'betrayal' : 'primary'}
                  onClick={() => app.startBattle(deck, { enemyId: enemy.id, profileId })}
                >
                  ⚔ Chiến
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
