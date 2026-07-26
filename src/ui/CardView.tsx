import React from 'react';
import type { CardDef, Keyword } from '../engine/types';
import { CHARACTERS } from '../data/characterMeta';

export const KEYWORD_GLOSSARY: Record<string, string> = {
  friend: 'Friend: Lá thiên về Friendship (Quan hệ +3 trở lên).',
  betray: 'Betray: Lá thiên về Betrayal (Quan hệ -3 trở xuống).',
  bully: 'Bully: Lá bắt nạt và thao túng Taunt (nội tại Trúc).',
  support: 'Support: Lá hỗ trợ.',
  attack: 'Tấn công: Gây sát thương.',
  defense: 'Phòng thủ: Tạo Giáp hoặc giảm sát thương.',
  heal: 'Hồi phục: Hồi HP.',
  exhaust: 'Tiêu hao: Biến mất khỏi trận sau khi dùng.',
  retain: 'Giữ lại: Không bị bỏ cuối lượt.',
  bleed: 'Chảy máu X: Cuối lượt của mục tiêu, nhận X sát thương (xuyên Giáp), sau đó giảm 1.',
  weak: 'Yếu: Sát thương gây ra giảm 25%.',
  expose: 'Lộ sơ hở: Sát thương nhận vào tăng 25%.',
  counter: 'Phản đòn X: Khi bị một lá tấn công nhắm tới, gây lại X sát thương một lần.',
  taunt: 'Taunt X%: Lá tấn công đơn mục tiêu có X% khả năng chuyển sang nhân vật có Taunt.',
  copy: 'Bản Sao: Sao chép lá 0-cost của đồng minh; tốn 0 Mana, Mana Value 4 (nạp Ultimate cho chủ lá gốc), Tiêu hao sau dùng.',
  twoFaced: 'Hai Mặt: Hiệu ứng phụ thuộc mặt hiện tại của Miên (Trắng/Đen).',
  flip: 'Lật Mặt: Đổi mặt của Miên sau khi lá được giải quyết.',
};

const KEYWORD_LABEL: Record<string, string> = {
  friend: 'Friend', betray: 'Betray', bully: 'Bully', support: 'Support',
  attack: 'Tấn công', defense: 'Phòng thủ', heal: 'Hồi phục',
  exhaust: 'Tiêu hao', retain: 'Giữ lại', bleed: 'Chảy máu', weak: 'Yếu',
  expose: 'Lộ sơ hở', counter: 'Phản đòn', taunt: 'Taunt', copy: 'Bản Sao',
  twoFaced: 'Hai Mặt', flip: 'Lật',
};

export interface CardViewProps {
  def: CardDef;
  /** current cost to display (defaults to printed cost) */
  cost?: number;
  count?: number;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  small?: boolean;
  isCopy?: boolean;
  badge?: string;
}

export function CardView({ def, cost, count, onClick, disabled, selected, small, isCopy, badge }: CardViewProps): JSX.Element {
  const meta = CHARACTERS[def.characterId];
  const displayCost = cost ?? def.cost;
  const discounted = displayCost < def.baseCost;
  const increased = displayCost > def.baseCost;
  return (
    <div
      className={[
        'card',
        small ? 'card-small' : '',
        disabled ? 'card-disabled' : '',
        selected ? 'card-selected' : '',
        onClick && !disabled ? 'card-clickable' : '',
      ].filter(Boolean).join(' ')}
      style={{ ['--char-color' as string]: meta.colors.primary, ['--char-accent' as string]: meta.colors.accent }}
      onClick={disabled ? undefined : onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className="card-header">
        <span className={`card-cost${discounted ? ' cost-down' : ''}${increased ? ' cost-up' : ''}`}>{displayCost}</span>
        <span className="card-name">{def.name}</span>
        {count !== undefined && count > 1 && <span className="card-count">×{count}</span>}
      </div>
      <div className="card-char">{meta.name} · {meta.title}</div>
      <div className="card-desc">{def.description}</div>
      <div className="card-keywords">
        {def.keywords.slice(0, 5).map((k) => (
          <span key={k} className={`kw kw-${k}`}>{KEYWORD_LABEL[k] ?? k}</span>
        ))}
        {isCopy && <span className="kw kw-copy">Bản Sao</span>}
        {badge && <span className="kw kw-badge">{badge}</span>}
      </div>
      <div className="card-tooltip">
        <strong>{def.name}</strong> — cost {def.baseCost}{def.manaValue !== undefined ? ` (Mana Value ${def.manaValue})` : ''}
        <p>{def.description}</p>
        {def.keywords.filter((k: Keyword) => KEYWORD_GLOSSARY[k]).map((k) => (
          <div key={k} className="tooltip-kw">{KEYWORD_GLOSSARY[k]}</div>
        ))}
        {isCopy && <div className="tooltip-kw">{KEYWORD_GLOSSARY.copy}</div>}
      </div>
    </div>
  );
}
