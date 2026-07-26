import React from 'react';
import type { CharacterId } from '../engine/types';
import { CHARACTERS } from '../data/characterMeta';

// Hand-drawn geometric SVG silhouettes — no copyrighted assets.
const ICONS: Record<CharacterId, JSX.Element> = {
  an: <path d="M32 52 C10 38 8 20 20 16 C27 13 32 19 32 22 C32 19 37 13 44 16 C56 20 54 38 32 52 Z" />,
  vy: <path d="M20 8 L28 30 L24 34 L20 54 L28 40 L34 36 L46 10 L30 26 Z" />,
  moc: <path d="M14 20 Q32 4 50 20 Q46 36 32 34 Q18 36 14 20 Z M22 42 L32 56 L42 42 Q32 48 22 42 Z" />,
  khoi: <path d="M32 6 L52 14 V32 Q52 48 32 58 Q12 48 12 32 V14 Z M32 14 L44 19 V32 Q44 42 32 49 Z" />,
  lam: <path d="M8 32 L16 32 L20 20 L26 44 L32 12 L38 52 L44 26 L48 32 L56 32 L48 36 L44 34 L38 58 L32 20 L26 50 L20 28 L16 36 L8 36 Z" />,
  truc: <path d="M18 12 h8 v14 h4 V12 h8 v14 h4 V14 h8 v22 q0 16 -16 20 q-16 -4 -16 -20 Z" />,
  yen: <path d="M12 22 L32 10 L52 22 V44 L32 56 L12 44 Z M32 10 V33 M12 22 L32 33 L52 22" fill="none" strokeWidth="4" />,
  khanh: <path d="M8 40 L48 8 L56 12 L24 48 L36 46 L40 52 L12 56 Z" />,
  duy: <path d="M32 6 A26 26 0 1 0 32 58 A26 26 0 1 0 32 6 Z M32 16 V48 M24 24 Q32 18 40 24 M24 40 Q32 46 40 40" fill="none" strokeWidth="4" />,
  mien: <path d="M32 6 A26 26 0 0 0 32 58 Z M32 6 A26 26 0 0 1 32 58 M32 6 V58" strokeWidth="3" />,
};

export function CharacterAvatar({ characterId, size = 56, glow = false }: { characterId: CharacterId; size?: number; glow?: boolean }): JSX.Element {
  const meta = CHARACTERS[characterId];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`avatar${glow ? ' avatar-glow' : ''}`}
      style={{ ['--char-color' as string]: meta.colors.primary, ['--char-accent' as string]: meta.colors.accent }}
      role="img"
      aria-label={meta.name}
    >
      <circle cx="32" cy="32" r="31" fill="#0d0d13" stroke={meta.colors.primary} strokeWidth="2" />
      <g fill={meta.colors.primary} stroke={meta.colors.accent} strokeWidth="1">
        {ICONS[characterId]}
      </g>
    </svg>
  );
}
