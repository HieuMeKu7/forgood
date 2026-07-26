import type { CharacterId, Deck } from '../engine/types';

// One dedicated 30-card deck per enemy (see src/data/enemies.ts).
// Every deck: exactly 30 cards, max 2 copies, ≥1 card per team character.

type Counts = [index: number, copies: number][];

function ids(char: CharacterId, counts: Counts): string[] {
  const out: string[] = [];
  for (const [idx, copies] of counts) {
    for (let i = 0; i < copies; i++) out.push(`${char}-${String(idx).padStart(2, '0')}`);
  }
  return out;
}

function mk(id: string, name: string, a: CharacterId, aCounts: Counts, b: CharacterId, bCounts: Counts): Deck {
  return {
    id, name,
    characterIds: [a, b],
    cardIds: [...ids(a, aCounts), ...ids(b, bCounts)],
    createdAt: 0,
    updatedAt: 0,
  };
}

export const ENEMY_DECKS: Record<string, Deck> = {
  'edeck-an': mk('edeck-an', 'Vòng Tay Siết Chặt',
    'an', [[1, 1], [4, 2], [6, 2], [8, 2], [9, 2], [10, 2], [13, 2], [16, 1], [20, 1]],
    'khoi', [[2, 2], [5, 2], [8, 2], [9, 2], [13, 2], [16, 2], [18, 1], [19, 1], [21, 1]]),
  'edeck-vy': mk('edeck-vy', 'Hai Lưỡi Dao Một Nụ Cười',
    'vy', [[2, 1], [4, 2], [6, 2], [7, 2], [10, 1], [11, 2], [16, 1], [17, 2], [20, 1], [21, 1]],
    'mien', [[1, 2], [2, 2], [4, 2], [7, 2], [10, 2], [14, 2], [16, 2], [19, 1]]),
  'edeck-moc': mk('edeck-moc', 'Sòng Bạc Máu',
    'moc', [[2, 2], [4, 2], [5, 1], [7, 2], [9, 2], [10, 1], [14, 2], [17, 2], [20, 1]],
    'khanh', [[1, 2], [2, 2], [6, 2], [11, 2], [12, 2], [13, 2], [15, 1], [19, 1], [21, 1]]),
  'edeck-khoi': mk('edeck-khoi', 'Pháo Đài Mua Bằng Tiền',
    'khoi', [[1, 1], [5, 2], [9, 2], [13, 2], [14, 2], [16, 2], [17, 2], [20, 1], [21, 1]],
    'duy', [[1, 1], [3, 2], [4, 2], [9, 2], [10, 2], [12, 2], [14, 2], [18, 1], [20, 1]]),
  'edeck-lam': mk('edeck-lam', 'Tiếng Ồn Được Nuôi Dưỡng',
    'lam', [[3, 1], [4, 2], [5, 2], [7, 2], [9, 2], [12, 2], [14, 2], [18, 1], [20, 1]],
    'yen', [[2, 2], [3, 2], [5, 2], [7, 2], [9, 2], [13, 2], [17, 1], [18, 1], [20, 1]]),
  'edeck-truc': mk('edeck-truc', 'Bia Thịt Không Được Chết',
    'truc', [[1, 2], [4, 2], [7, 2], [9, 2], [11, 2], [12, 1], [16, 1], [18, 1], [20, 1], [21, 1]],
    'lam', [[1, 2], [4, 2], [8, 2], [11, 2], [12, 2], [13, 1], [15, 2], [17, 1], [21, 1]]),
  'edeck-yen': mk('edeck-yen', 'Kho Hàng Vô Tận',
    'yen', [[1, 1], [3, 2], [4, 2], [7, 2], [8, 1], [9, 2], [11, 2], [15, 1], [17, 1], [18, 1]],
    'khanh', [[1, 2], [2, 2], [6, 2], [11, 2], [12, 2], [13, 2], [19, 1], [20, 1], [21, 1]]),
  'edeck-khanh': mk('edeck-khanh', 'Nghìn Nhát Cắt',
    'khanh', [[2, 2], [5, 2], [6, 2], [11, 2], [12, 2], [13, 2], [16, 1], [20, 1], [21, 1]],
    'vy', [[4, 2], [6, 2], [11, 2], [13, 1], [14, 2], [16, 2], [17, 2], [20, 1], [21, 1]]),
  'edeck-duy': mk('edeck-duy', 'Hợp Đồng Hai Mặt',
    'duy', [[1, 1], [2, 2], [4, 2], [7, 2], [9, 2], [12, 2], [14, 2], [17, 1], [20, 1]],
    'mien', [[1, 2], [3, 2], [4, 2], [7, 2], [10, 2], [13, 2], [16, 2], [21, 1]]),
  'edeck-mien': mk('edeck-mien', 'Gương Mặt Thứ Ba',
    'mien', [[1, 2], [2, 2], [7, 2], [8, 2], [10, 2], [14, 2], [16, 1], [19, 1], [21, 1]],
    'truc', [[1, 2], [3, 2], [5, 2], [10, 2], [12, 2], [13, 2], [17, 1], [19, 1], [21, 1]]),
};
