import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useApp } from '../../store/appStore';
import {
  createBattle, playCard, useUltimate, endTurn, resolvePendingChoice, canPlayCard,
  getCardCost, aiChooseAction, applyIntent, aiPickChoice, allyOf,
} from '../../engine';
import type { CardInstance, CharacterId, CombatantState, GameState, MatchResult, TeamState } from '../../engine/types';
import { RULES } from '../../engine/types';
import { getCardDef } from '../../data/cards';
import { CHARACTERS } from '../../data/characterMeta';
import { CardView } from '../CardView';
import { CharacterAvatar } from '../CharacterAvatar';
import { playSound } from '../../audio/sound';

interface FloatNum { id: number; teamId: string; type: string; value?: number }

function StatusChips({ team: t, char }: { team: TeamState; char?: CombatantState }): JSX.Element {
  const chips: { label: string; title: string; debuff: boolean }[] = [];
  if (char) {
    for (const s of char.statuses) {
      if (s.id === 'taunt') chips.push({ label: `Taunt ${s.percent}%`, title: `Taunt ${s.percent}%: lá tấn công đơn mục tiêu có thể bị kéo về nhân vật này.`, debuff: false });
      if (s.id === 'counter') chips.push({ label: `Phản đòn ${s.stacks}`, title: `Phản đòn ${s.stacks}: gây lại ${s.stacks} sát thương khi bị một lá tấn công nhắm tới.`, debuff: false });
    }
    if (char.characterId === 'lam' && char.noise > 0) chips.push({ label: `Nhiễu ${char.noise}`, title: 'Nhiễu: đầu lượt sau, +1 Mana mỗi Nhiễu (tối đa 3).', debuff: false });
    if (char.isMeatShield) chips.push({ label: 'Bia Thịt', title: 'Bia Thịt: đòn chuyển hướng sang nhân vật này hồi máu cho Trúc.', debuff: true });
    if (char.characterId === 'mien' && char.face) chips.push({ label: char.face === 'white' ? 'Mặt Trắng' : 'Mặt Đen', title: 'Mặt hiện tại của Miên quyết định hiệu ứng lá Hai Mặt.', debuff: char.face === 'black' });
  } else {
    for (const s of t.statuses) {
      if (s.id === 'weak') chips.push({ label: `Yếu${s.turns !== undefined ? ` (${s.turns})` : ''}`, title: 'Yếu: sát thương gây ra giảm 25%.', debuff: true });
      if (s.id === 'expose') chips.push({ label: `Lộ sơ hở${s.turns !== undefined ? ` (${s.turns})` : ''}`, title: 'Lộ sơ hở: sát thương nhận vào tăng 25%.', debuff: true });
      if (s.id === 'exposeNextHit') chips.push({ label: 'Lộ sơ hở (1 đòn)', title: 'Đòn tấn công tiếp theo nhận thêm 25% sát thương.', debuff: true });
      if (s.id === 'bleed') chips.push({ label: `Chảy máu ${s.stacks}`, title: `Chảy máu ${s.stacks}: cuối lượt mất ${s.stacks} HP (xuyên Giáp), sau đó giảm 1.`, debuff: true });
      if (s.id === 'humiliate') chips.push({ label: `Làm Nhục ${s.stacks}`, title: 'Làm Nhục: mỗi stack -1 Giáp nhận và -1 hồi phục nhận. Mất 1 stack cuối lượt.', debuff: true });
    }
  }
  return (
    <div className="char-statuses">
      {chips.map((c, i) => (
        <span key={i} className={`status-chip ${c.debuff ? 'debuff' : 'buff'}`} title={c.title}>{c.label}</span>
      ))}
    </div>
  );
}

function CharBox({ state, char, t, targetable, onTarget, onUlt }: {
  state: GameState; char: CombatantState; t: TeamState;
  targetable: boolean; onTarget?: (c: CharacterId) => void; onUlt?: (c: CharacterId) => void;
}): JSX.Element {
  const meta = CHARACTERS[char.characterId];
  const ult = meta.ultimate;
  const pct = Math.min(100, Math.round((char.ultimateCharge / ult.charge) * 100));
  return (
    <div
      className={`char-box${targetable ? ' targetable' : ''}`}
      onClick={targetable && onTarget ? () => onTarget(char.characterId) : undefined}
      title={`${meta.name} — ${meta.title}\nNội tại: ${meta.passive.name} — ${meta.passive.description}`}
    >
      <CharacterAvatar characterId={char.characterId} size={52} glow={char.ultimateReady} />
      <div className="char-name">{meta.name}</div>
      <div className="ult-bar" title={`Ultimate: ${ult.name} (${char.ultimateCharge}/${ult.charge})${char.ultimateUsed ? ' — đã dùng' : ''}`}>
        <div className="ult-fill" style={{ width: `${char.ultimateUsed ? 0 : pct}%` }} />
      </div>
      {char.ultimateReady && !char.ultimateUsed && onUlt && (
        <button className="ult-ready-btn" onClick={(e) => { e.stopPropagation(); onUlt(char.characterId); }}>
          ⚡ {ult.name}
        </button>
      )}
      <StatusChips team={t} char={char} />
    </div>
  );
}

function RelBar({ t }: { t: TeamState }): JSX.Element {
  const rel = t.relationship;
  const pct = ((rel + 5) / 10) * 100;
  const stateLabel = rel >= RULES.FRIENDSHIP_AT ? 'FRIENDSHIP' : rel <= RULES.BETRAYAL_AT ? 'BETRAYAL' : '';
  return (
    <div className="rel-bar" title="Quan hệ: -5 (Betrayal) đến +5 (Friendship)">
      <span>-5</span>
      <div className="rel-track"><div className="rel-marker" style={{ left: `calc(${pct}% - 5px)` }} /></div>
      <span>+5</span>
      <span style={{ minWidth: 90 }} className={rel >= 3 ? 'rel-state-friendship' : rel <= -3 ? 'rel-state-betrayal' : 'dim'}>
        {rel > 0 ? `+${rel}` : rel} {stateLabel}
      </span>
    </div>
  );
}

function TeamRow({ state, t, isEnemy, targeting, onTarget, onUlt, floats }: {
  state: GameState; t: TeamState; isEnemy: boolean;
  targeting: boolean; onTarget?: (c: CharacterId) => void; onUlt?: (c: CharacterId) => void;
  floats: FloatNum[];
}): JSX.Element {
  return (
    <div className={`team-row${isEnemy ? ' enemy-row' : ''}`} style={{ position: 'relative' }}>
      {floats.filter((f) => f.teamId === t.id).map((f) => (
        <div key={f.id} className={`float-num float-${f.type}`} style={{ left: `${30 + (f.id % 5) * 10}%` }}>
          {f.type === 'heal' ? '+' : f.type === 'block' ? '🛡' : '-'}{f.value ?? ''}
        </div>
      ))}
      {t.characters.map((c) => (
        <CharBox key={c.characterId} state={state} char={c} t={t}
          targetable={targeting && isEnemy}
          onTarget={onTarget}
          onUlt={!isEnemy ? onUlt : undefined} />
      ))}
      <div className="team-bars">
        <div className="bar bar-hp">
          <div className="bar-fill" style={{ transform: `scaleX(${Math.max(0, t.hp / t.maxHp)})` }} />
          <div className="bar-label">❤ {t.hp}/{t.maxHp}{t.block > 0 ? `  🛡 ${t.block}` : ''}</div>
        </div>
        <RelBar t={t} />
        <StatusChips team={t} />
        <div className="row" style={{ gap: 6 }}>
          {t.vouchers + t.vouchersAllyOnly > 0 && <span className="resource-chip" title="Phiếu: giảm 1 cost mỗi Phiếu (tự động bù khi thiếu Mana). Tối đa 6, giữ qua lượt.">🎫 Phiếu {t.vouchers + t.vouchersAllyOnly}</span>}
          {t.characters.some((c) => c.characterId === 'moc') && <span className="resource-chip" title="Trò: mỗi lá 0 Mana +1 điểm. Đủ 3: +1 Mana và rút 1.">🎭 Trò {t.trickPoints}/3</span>}
          {t.characters.some((c) => c.characterId === 'khanh') && <span className="resource-chip" title="Nhịp Chém: mỗi lá Khanh +1. Mốc 3/6/9: tấn công +2/+4/+7.">🔪 Nhịp {t.bladeTempo}</span>}
        </div>
      </div>
    </div>
  );
}

export function BattleScreen(): JSX.Element {
  const app = useApp();
  const cfg = app.battleConfig;
  const stateRef = useRef<GameState | null>(null);
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [targetingCard, setTargetingCard] = useState<number | null>(null);
  const [floats, setFloats] = useState<FloatNum[]>([]);
  const [shake, setShake] = useState(false);
  const [blood, setBlood] = useState(false);
  const [flash, setFlash] = useState(false);
  const [showFullLog, setShowFullLog] = useState(false);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [selectedDefs, setSelectedDefs] = useState<string[]>([]);
  const finishedRef = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);
  const settings = app.settings;
  const fast = settings.fastAnimations;

  // (re)create battle when config changes
  useEffect(() => {
    if (!cfg) return;
    stateRef.current = createBattle({ playerDeck: cfg.deck, enemyDeck: cfg.enemyDeck, seed: cfg.seed, aiLevel: cfg.aiLevel });
    finishedRef.current = false;
    setTargetingCard(null);
    setFloats([]);
    force();
  }, [cfg?.seed, cfg?.deck.id, cfg?.enemyDeck.id, cfg?.aiLevel]);

  const consumeAnimations = useCallback(() => {
    const state = stateRef.current;
    if (!state) return;
    const events = state.animationEvents.splice(0);
    if (events.length === 0) return;
    const newFloats: FloatNum[] = [];
    for (const e of events) {
      if (e.type === 'hit' && (e.value ?? 0) > 0) {
        newFloats.push({ id: e.id, teamId: e.teamId, type: 'damage', value: e.value });
        if (e.teamId === 'player') {
          if (settings.screenShake) { setShake(true); setTimeout(() => setShake(false), 350); }
          if (settings.bloodEffects && (e.value ?? 0) >= 8) { setBlood(true); setTimeout(() => setBlood(false), 550); }
        }
        playSound('hit', settings.sound);
      }
      if (e.type === 'heal') { newFloats.push({ id: e.id, teamId: e.teamId, type: 'heal', value: e.value }); }
      if (e.type === 'block') { newFloats.push({ id: e.id, teamId: e.teamId, type: 'block', value: e.value }); }
      if (e.type === 'ultimate') {
        playSound('ultimate', settings.sound);
        if (settings.screenFlash) { setFlash(true); setTimeout(() => setFlash(false), 280); }
      }
      if (e.type === 'flip') playSound('flip', settings.sound);
    }
    if (newFloats.length > 0) {
      setFloats((prev) => [...prev.slice(-8), ...newFloats]);
      setTimeout(() => setFloats((prev) => prev.filter((f) => !newFloats.includes(f))), 950);
    }
  }, [settings]);

  const afterAction = useCallback(() => {
    const state = stateRef.current;
    if (!state) return;
    consumeAnimations();
    // Mộc ult: forced end turn
    if (state.phase !== 'gameOver' && state.active === 'player' && state.teams.player.turnFlags['forceEndTurn'] && !state.pendingChoice) {
      endTurn(state);
    }
    force();
  }, [consumeAnimations]);

  // enemy AI loop
  useEffect(() => {
    const state = stateRef.current;
    if (!state || state.phase === 'gameOver' || state.active !== 'enemy') return;
    const delay = fast ? 130 : 650;
    const timer = setTimeout(() => {
      const st = stateRef.current;
      if (!st || st.phase === 'gameOver' || st.active !== 'enemy') return;
      const intent = aiChooseAction(st);
      applyIntent(st, intent);
      afterAction();
    }, delay);
    return () => clearTimeout(timer);
  });

  // finish detection
  useEffect(() => {
    const state = stateRef.current;
    if (!state || state.phase !== 'gameOver' || finishedRef.current || !cfg) return;
    finishedRef.current = true;
    playSound(state.winner === 'player' ? 'victory' : 'defeat', settings.sound);
    const p = state.teams.player;
    let topDamageCard: MatchResult['topDamageCard'];
    for (const [defId, dmg] of Object.entries(p.stats.damageByCard)) {
      if (!topDamageCard || dmg > topDamageCard.damage) topDamageCard = { defId, damage: dmg };
    }
    const result: MatchResult = {
      id: `m-${Date.now()}`,
      timestamp: Date.now(),
      seed: state.seed,
      aiLevel: cfg.aiLevel,
      playerDeckName: cfg.deck.name,
      playerCharacters: cfg.deck.characterIds,
      enemyCharacters: cfg.enemyDeck.characterIds,
      winner: state.winner!,
      turns: state.turn,
      playerStats: p.stats,
      enemyStats: state.teams.enemy.stats,
      topDamageCard,
    };
    const t = setTimeout(() => app.finishBattle(result), fast ? 500 : 1400);
    return () => clearTimeout(t);
  });

  // autoscroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  });

  const state = stateRef.current;
  if (!cfg || !state) return <div className="screen"><p>Đang tải trận đấu…</p></div>;

  const player = state.teams.player;
  const enemy = state.teams.enemy;
  const isPlayerTurn = state.active === 'player' && state.phase !== 'gameOver';
  const choice = state.pendingChoice;

  const handlePlay = (inst: CardInstance): void => {
    if (!isPlayerTurn || choice) return;
    const def = getCardDef(inst.defId);
    if (!canPlayCard(state, player, inst).ok) return;
    if (def.targetType === 'enemy' && enemy.characters.length > 1) {
      setTargetingCard((prev) => (prev === inst.instanceId ? null : inst.instanceId));
      return;
    }
    playSound('play', settings.sound);
    playCard(state, inst.instanceId, enemy.characters[0]?.characterId);
    afterAction();
  };

  const handleTarget = (charId: CharacterId): void => {
    if (targetingCard === null) return;
    playSound('play', settings.sound);
    playCard(state, targetingCard, charId);
    setTargetingCard(null);
    afterAction();
  };

  const handleUlt = (charId: CharacterId): void => {
    if (!isPlayerTurn || choice) return;
    useUltimate(state, charId);
    afterAction();
  };

  const handleEndTurn = (): void => {
    if (!isPlayerTurn || choice) return;
    setTargetingCard(null);
    endTurn(state);
    afterAction();
  };

  const handleChoiceOption = (idx: number): void => {
    resolvePendingChoice(state, { optionIndex: idx });
    afterAction();
  };

  const handleChoiceCardToggle = (id: number): void => {
    setSelectedCards((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const confirmCardChoice = (): void => {
    if (!choice) return;
    if (choice.type === 'cardDefs') {
      resolvePendingChoice(state, { cardDefIds: selectedDefs });
      setSelectedDefs([]);
    } else {
      resolvePendingChoice(state, { cardInstanceIds: selectedCards });
      setSelectedCards([]);
    }
    afterAction();
  };

  const recentLog = state.log.slice(-60);

  return (
    <div className={`screen${shake ? ' shake' : ''}`} style={{ maxWidth: 1400 }}>
      {blood && <div className="blood-overlay" />}
      {flash && settings.screenFlash && <div className="flash-overlay" />}
      <div className="battle">
        <div className="battle-main">
          <TeamRow state={state} t={enemy} isEnemy targeting={targetingCard !== null} onTarget={handleTarget} floats={floats} />
          <TeamRow state={state} t={player} isEnemy={false} targeting={false} onUlt={handleUlt} floats={floats} />

          <div className="battle-hud">
            <div className="mana-orb" title={`Mana: đặt lại thành ${RULES.MANA_PER_TURN} đầu lượt, tối đa ${RULES.MANA_CAP}.`}>{player.mana}</div>
            <span className="pile-info" title="Draw pile — hết thì xáo discard thành deck mới.">🂠 Rút: {player.drawPile.length}</span>
            <span className="pile-info" title="Discard pile — lá đã dùng/bỏ.">🗂 Bỏ: {player.discardPile.length}</span>
            <span className="pile-info" title="Exhaust — lá Tiêu hao, không quay lại trận.">🔥 Tiêu hao: {player.exhaustPile.length}</span>
            <span className="pile-info" title="Số lá đã dùng trong lượt (tối đa 14).">Đã dùng: {player.cardsPlayedThisTurn}/{RULES.MAX_CARDS_PER_TURN}</span>
            <div style={{ flex: 1 }} />
            <button onClick={() => app.updateSettings({ fastAnimations: !fast })} title="Tăng tốc animation">
              {fast ? '⏩ Nhanh' : '▶ Thường'}
            </button>
            <button onClick={() => setShowFullLog(true)}>📜 Lịch sử</button>
            <button className="primary" disabled={!isPlayerTurn || Boolean(choice)} onClick={handleEndTurn}>
              {isPlayerTurn ? 'End Turn' : 'Lượt địch…'}
            </button>
          </div>

          <div className="hand-area">
            {player.hand.length === 0 && <span className="dim" style={{ alignSelf: 'center' }}>Hết bài trên tay.</span>}
            {player.hand.map((inst) => {
              const def = getCardDef(inst.defId);
              const cost = getCardCost(state, player, inst);
              const playable = isPlayerTurn && !choice && canPlayCard(state, player, inst).ok;
              return (
                <CardView
                  key={inst.instanceId}
                  def={def}
                  cost={cost}
                  disabled={!playable}
                  selected={targetingCard === inst.instanceId}
                  isCopy={inst.isCopy}
                  badge={inst.isTemp ? 'Tạm' : undefined}
                  small
                  onClick={() => handlePlay(inst)}
                />
              );
            })}
          </div>
          {targetingCard !== null && (
            <div className="panel" style={{ borderColor: 'var(--betray)' }}>
              🎯 Chọn mục tiêu trên đội địch (bấm lại lá bài để hủy).
            </div>
          )}
        </div>

        <div className="log-panel">
          <h3 style={{ marginBottom: 6 }}>Combat Log</h3>
          <div className="log-entries" ref={logRef}>
            {recentLog.map((entry, i) => (
              <div key={i} className={`log-entry log-${entry.kind}`}>{entry.text}</div>
            ))}
          </div>
        </div>
      </div>

      {/* pending choice modal (player only) */}
      {choice && state.active === 'player' && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>{choice.prompt}</h3>
            {choice.type === 'option' && (
              <div className="modal-options">
                {(choice.options ?? []).map((o) => (
                  <button key={o.index} onClick={() => handleChoiceOption(o.index)}>{o.label}</button>
                ))}
              </div>
            )}
            {(choice.type === 'handCards' || choice.type === 'discardCards') && (
              <>
                <div className="modal-cards">
                  {(choice.cardInstanceIds ?? []).map((id) => {
                    const inst = player.hand.find((c) => c.instanceId === id)
                      ?? player.discardPile.find((c) => c.instanceId === id)
                      ?? player.drawPile.find((c) => c.instanceId === id);
                    if (!inst) return null;
                    return (
                      <CardView key={id} def={getCardDef(inst.defId)} small isCopy={inst.isCopy}
                        selected={selectedCards.includes(id)}
                        onClick={() => handleChoiceCardToggle(id)} />
                    );
                  })}
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <span className="dim">Chọn {choice.min === choice.max ? choice.min : `${choice.min}–${choice.max}`} lá ({selectedCards.length} đã chọn)</span>
                  <button className="primary" disabled={selectedCards.length < choice.min || selectedCards.length > choice.max}
                    onClick={confirmCardChoice}>Xác nhận</button>
                </div>
              </>
            )}
            {choice.type === 'cardDefs' && (
              <>
                <div className="modal-cards">
                  {(choice.cardDefIds ?? []).map((defId) => (
                    <CardView key={defId} def={getCardDef(defId)} small
                      selected={selectedDefs.includes(defId)}
                      onClick={() => setSelectedDefs((prev) => prev.includes(defId) ? prev.filter((x) => x !== defId) : [...prev, defId].slice(-choice.max))} />
                  ))}
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="primary" disabled={selectedDefs.length < choice.min}
                    onClick={confirmCardChoice}>Xác nhận</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* full action history modal */}
      {showFullLog && (
        <div className="modal-backdrop" onClick={() => setShowFullLog(false)}>
          <div className="modal" style={{ width: 700 }} onClick={(e) => e.stopPropagation()}>
            <div className="row spread">
              <h3>Toàn bộ hành động ({state.log.length})</h3>
              <button onClick={() => setShowFullLog(false)}>Đóng</button>
            </div>
            <div className="log-entries" style={{ maxHeight: '60vh', marginTop: 10 }}>
              {state.log.map((entry, i) => (
                <div key={i} className={`log-entry log-${entry.kind}`}>[L{entry.turn}] {entry.text}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
