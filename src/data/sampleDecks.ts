import type { CharacterId, Deck } from '../engine/types';

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

/** 8 prebuilt sample decks — each exactly 30 cards, valid. */
export const SAMPLE_DECKS: Deck[] = [
  mk('sample-an-khoi', 'An + Khôi — Lá Chắn Tình Bạn',
    'an', [[4, 2], [6, 2], [7, 2], [8, 2], [10, 2], [13, 2], [16, 1], [17, 1], [20, 1]],
    'khoi', [[1, 2], [5, 2], [8, 2], [9, 2], [13, 2], [10, 1], [14, 1], [16, 1], [18, 1], [19, 1]]),
  mk('sample-vy-moc', 'Vy + Mộc — Hỗn Loạn Phản Bội',
    'vy', [[1, 1], [2, 1], [4, 2], [5, 2], [7, 2], [11, 2], [16, 1], [17, 2], [20, 1], [21, 1]],
    'moc', [[1, 1], [2, 2], [5, 2], [7, 2], [9, 2], [12, 1], [14, 2], [17, 2], [20, 1]]),
  mk('sample-an-vy', 'An + Vy — Yêu Và Dao',
    'an', [[1, 1], [4, 2], [5, 2], [6, 2], [8, 2], [9, 2], [10, 1], [13, 1], [14, 1], [16, 1]],
    'vy', [[1, 1], [4, 2], [5, 2], [8, 2], [11, 2], [13, 1], [15, 2], [17, 2], [20, 1]]),
  mk('sample-khoi-vy', 'Khôi + Vy — Tường Và Dao',
    'khoi', [[1, 2], [4, 2], [8, 2], [9, 2], [13, 2], [16, 2], [10, 1], [19, 1], [21, 1]],
    'vy', [[2, 1], [4, 2], [6, 2], [11, 2], [12, 2], [16, 2], [17, 2], [10, 1], [21, 1]]),
  mk('sample-lam-truc', 'Lâm + Trúc — Bia Thịt Sống',
    'lam', [[3, 1], [4, 2], [5, 2], [7, 2], [9, 2], [12, 2], [14, 2], [13, 1], [18, 1]],
    'truc', [[1, 2], [4, 2], [7, 2], [9, 2], [11, 2], [6, 1], [14, 1], [16, 1], [18, 1], [21, 1]]),
  mk('sample-yen-khanh', 'Yến + Khanh — Dây Chuyền 0-Cost',
    'yen', [[1, 1], [3, 2], [4, 2], [7, 2], [9, 2], [11, 2], [8, 1], [15, 1], [17, 1], [18, 1]],
    'khanh', [[1, 2], [2, 2], [5, 2], [11, 2], [12, 2], [13, 2], [19, 1], [20, 1], [21, 1]]),
  mk('sample-duy-mien', 'Duy + Miên — Hai Mặt Giảm Giá',
    'duy', [[1, 1], [3, 2], [4, 2], [7, 2], [9, 2], [12, 2], [14, 2], [18, 1], [20, 1]],
    'mien', [[1, 2], [2, 2], [4, 2], [7, 2], [10, 2], [12, 1], [14, 2], [16, 2]]),
  mk('sample-duy-khoi', 'Duy + Khôi — Pháo Đài Trả Góp',
    'duy', [[1, 1], [4, 2], [9, 2], [10, 2], [11, 2], [12, 2], [14, 2], [18, 2]],
    'khoi', [[1, 1], [5, 2], [9, 2], [13, 2], [14, 2], [17, 2], [18, 2], [20, 1], [21, 1]]),
];
