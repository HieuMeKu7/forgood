import type { CardDef } from '../../engine/types';

// DUY — THE BROKER. Giảm cost, hoàn Mana, hỗ trợ bài đắt, Phiếu (Vouchers).
// Card ids follow spec order: duy-01 .. duy-21.

export const duyCards: CardDef[] = [
  {
    id: 'duy-01', characterId: 'duy', name: 'Phiếu Dùng Thử',
    cost: 0, baseCost: 0, types: ['support'], keywords: ['support', 'exhaust'],
    description: 'Nhận 1 Phiếu. Tiêu hao.',
    targetType: 'none', exhaust: true,
    effects: [{ op: 'gainVouchers', amount: 1 }],
    aiTags: ['economy', 'setup'], animTags: ['glow'],
  },
  // CUSTOM duy-02: scry 3 — reveal top 3 cards of draw pile; player picks one to put on top, the rest go to the bottom.
  {
    id: 'duy-02', characterId: 'duy', name: 'Đọc Điều Khoản',
    cost: 0, baseCost: 0, types: ['support'], keywords: ['support'],
    description: 'Xem 3 lá đầu; chọn một lên đầu, còn lại xuống đáy.',
    targetType: 'none',
    effects: [{ op: 'custom', id: 'duy-02' }],
    aiTags: ['setup'], animTags: ['glow'],
  },
  {
    id: 'duy-03', characterId: 'duy', name: 'Tiền Lẻ',
    cost: 0, baseCost: 0, types: ['support'], keywords: ['support'],
    description: 'Nếu còn đúng 1 Mana, nhận 1 Phiếu và rút 1.',
    targetType: 'none',
    effects: [
      { op: 'if', cond: { kind: 'manaExactly', value: 1 }, then: [{ op: 'gainVouchers', amount: 1 }, { op: 'draw', count: 1 }] },
    ],
    aiTags: ['economy', 'draw'], animTags: ['glow'],
  },
  // CUSTOM duy-04: choose a hand card; it gets -1 cost this turn.
  {
    id: 'duy-04', characterId: 'duy', name: 'Mặc Cả',
    cost: 1, baseCost: 1, types: ['support'], keywords: ['support'],
    description: 'Giảm 1 cost cho một lá trong lượt, rút 1.',
    targetType: 'none',
    effects: [{ op: 'custom', id: 'duy-04' }, { op: 'draw', count: 1 }],
    aiTags: ['economy', 'draw'], animTags: ['glow'],
  },
  {
    id: 'duy-05', characterId: 'duy', name: 'Ưu Đãi Thành Viên',
    cost: 1, baseCost: 1, types: ['support'], keywords: ['support'],
    description: 'Nhận 2 Phiếu chỉ dùng cho lá đồng minh.',
    targetType: 'none',
    effects: [{ op: 'gainVouchers', amount: 2, allyOnly: true }],
    aiTags: ['economy', 'setup'], animTags: ['glow'],
  },
  // CUSTOM duy-06: choose a hand card with a this-turn/persistent cost reduction; remove the reduction and gain that many vouchers (max 3).
  {
    id: 'duy-06', characterId: 'duy', name: 'Thu Hồi Vốn',
    cost: 1, baseCost: 1, types: ['support'], keywords: ['support'],
    description: 'Hủy giảm cost của một lá, nhận lại Phiếu tương ứng, tối đa 3.',
    targetType: 'none',
    effects: [{ op: 'custom', id: 'duy-06' }],
    aiTags: ['economy'], animTags: ['glow'],
  },
  // CUSTOM duy-07: all hand cards with baseCost <= 2 get -1 cost this turn.
  {
    id: 'duy-07', characterId: 'duy', name: 'Giảm Giá Đồng Loạt',
    cost: 2, baseCost: 2, types: ['support'], keywords: ['support'],
    description: 'Lá cost gốc không quá 2 trên tay giảm 1 trong lượt.',
    targetType: 'none',
    effects: [{ op: 'custom', id: 'duy-07' }],
    aiTags: ['economy', 'setup'], animTags: ['glow'],
  },
  // CUSTOM duy-08: choose up to 4 hand cards; each gets -1 cost this turn.
  {
    id: 'duy-08', characterId: 'duy', name: 'Mua Bốn Trả Hai',
    cost: 2, baseCost: 2, types: ['support'], keywords: ['support'],
    description: 'Chọn tối đa 4 lá, mỗi lá giảm 1 trong lượt.',
    targetType: 'none',
    effects: [{ op: 'custom', id: 'duy-08' }],
    aiTags: ['economy', 'setup'], animTags: ['glow'],
  },
  {
    id: 'duy-09', characterId: 'duy', name: 'Đầu Tư Khẩn Cấp',
    cost: 2, baseCost: 2, types: ['defense', 'support'], keywords: ['support', 'defense'],
    description: 'Nhận 7 Giáp và 2 Phiếu.',
    targetType: 'none',
    effects: [{ op: 'block', value: 7 }, { op: 'gainVouchers', amount: 2 }],
    aiTags: ['defense', 'economy'], animTags: ['shield', 'glow'],
  },
  // CUSTOM duy-10: choose a hand card → its this-turn cost becomes 0; add modifier manaDebtNextTurn = ceil(baseCost/2), capped at 3.
  {
    id: 'duy-10', characterId: 'duy', name: 'Thanh Toán Sau',
    cost: 3, baseCost: 3, types: ['support'], keywords: ['support'],
    description: 'Một lá tốn 0 trong lượt; đầu lượt sau mất Mana bằng nửa cost gốc làm tròn lên, tối đa 3.',
    targetType: 'none',
    effects: [{ op: 'custom', id: 'duy-10' }],
    aiTags: ['economy', 'combo'], animTags: ['glow'],
  },
  // CUSTOM duy-11: all ally-character cards currently in hand get persistent -1 cost (costOverride) until played.
  {
    id: 'duy-11', characterId: 'duy', name: 'Giá Nội Bộ',
    cost: 3, baseCost: 3, types: ['support'], keywords: ['support'],
    description: 'Tất cả lá đồng minh trên tay giảm 1 đến khi dùng.',
    targetType: 'none',
    effects: [{ op: 'custom', id: 'duy-11' }],
    aiTags: ['economy', 'setup'], animTags: ['glow'],
  },
  {
    id: 'duy-12', characterId: 'duy', name: 'Hoàn Tiền',
    cost: 3, baseCost: 3, types: ['support'], keywords: ['support'],
    description: 'Lá tiếp theo cost từ 3 trở lên hoàn 2 Mana.',
    targetType: 'none',
    effects: [{ op: 'modifier', target: 'ownTeam', mod: { kind: 'refundNext', amount: 2, uses: 1, filter: { costAtLeast: 3 } } }],
    aiTags: ['economy', 'setup'], animTags: ['glow'],
  },
  // CUSTOM duy-13: cap every hand card's this-turn cost at 2 (end-of-turn discard of unused cards = normal rule).
  {
    id: 'duy-13', characterId: 'duy', name: 'Bán Tháo',
    cost: 4, baseCost: 4, types: ['support'], keywords: ['support'],
    description: 'Mọi lá trên tay còn tối đa 2 cost trong lượt; cuối lượt bỏ lá chưa dùng.',
    targetType: 'none',
    effects: [{ op: 'custom', id: 'duy-13' }],
    aiTags: ['economy', 'burst'], animTags: ['glow'],
  },
  {
    id: 'duy-14', characterId: 'duy', name: 'Gói Cao Cấp',
    cost: 4, baseCost: 4, types: ['heal', 'defense', 'support'], keywords: ['support', 'heal', 'defense'],
    description: 'Hồi 6, nhận 10 Giáp, nhận 2 Phiếu.',
    targetType: 'none',
    effects: [{ op: 'heal', value: 6 }, { op: 'block', value: 10 }, { op: 'gainVouchers', amount: 2 }],
    aiTags: ['heal', 'defense', 'economy'], animTags: ['glow', 'shield'],
  },
  // CUSTOM duy-15: choose 2 hand cards; swap their current costs for this turn.
  {
    id: 'duy-15', characterId: 'duy', name: 'Tái Định Giá',
    cost: 4, baseCost: 4, types: ['support'], keywords: ['support'],
    description: 'Hoán đổi cost hiện tại của hai lá trong lượt.',
    targetType: 'none',
    effects: [{ op: 'custom', id: 'duy-15' }],
    aiTags: ['economy', 'combo'], animTags: ['glow'],
  },
  // Engine flag 'duy-16': next card played creates a TEMP duplicate in hand costing ceil(baseCost/2);
  // the temp card exhausts and cannot be copied. This card itself is NOT exhaust.
  {
    id: 'duy-16', characterId: 'duy', name: 'Mua Một Tặng Một',
    cost: 5, baseCost: 5, types: ['support'], keywords: ['support'],
    description: 'Lá tiếp theo tạo bản tạm thời cost bằng nửa cost gốc làm tròn lên; bản tạm Tiêu hao và không thể sao chép.',
    targetType: 'none',
    effects: [{ op: 'modifier', target: 'ownTeam', mod: { kind: 'flag', id: 'duy-16', uses: 1 } }],
    aiTags: ['setup', 'combo', 'economy'], animTags: ['glow'],
  },
  // CUSTOM duy-17: all hand cards get -2 cost this turn; add modifier maxCardsThisTurn 5.
  {
    id: 'duy-17', characterId: 'duy', name: 'Cắt Giảm Ngân Sách',
    cost: 5, baseCost: 5, types: ['support'], keywords: ['support'],
    description: 'Mọi lá giảm 2 cost trong lượt; không dùng quá 5 lá.',
    targetType: 'none',
    effects: [{ op: 'custom', id: 'duy-17' }],
    aiTags: ['economy', 'burst'], animTags: ['glow'],
  },
  {
    id: 'duy-18', characterId: 'duy', name: 'Phá Giá Thị Trường',
    cost: 6, baseCost: 6, types: ['support'], keywords: ['support'],
    description: 'Trong hai lượt, lá đầu của mỗi nhân vật giảm 2 cost.',
    targetType: 'none',
    effects: [{ op: 'modifier', target: 'ownTeam', mod: { kind: 'firstCharCardDiscount', amount: 2, turns: 2 } }],
    aiTags: ['economy', 'setup'], animTags: ['glow'],
  },
  // CUSTOM duy-19: gain 4 mana (cap 10); add modifier manaNextTurn 4 with id 'duy-debt'.
  // Unplayable while a 'duy-debt' or manaDebtNextTurn modifier exists (resolver validates; engine blocks play).
  {
    id: 'duy-19', characterId: 'duy', name: 'Vay Nóng',
    cost: 6, baseCost: 6, types: ['support'], keywords: ['support'],
    description: 'Nhận 4 Mana; lượt sau chỉ có 4 Mana. Không dùng khi đang có Nợ.',
    targetType: 'none',
    effects: [{ op: 'custom', id: 'duy-19' }],
    aiTags: ['economy', 'burst'], animTags: ['glow'],
  },
  // CUSTOM duy-20: draw until hand has 7 cards; the cards drawn this way get -2 cost this turn.
  {
    id: 'duy-20', characterId: 'duy', name: 'Xả Kho',
    cost: 7, baseCost: 7, types: ['support'], keywords: ['support'],
    description: 'Rút đến 7; lá vừa rút giảm 2 cost trong lượt.',
    targetType: 'none',
    effects: [{ op: 'custom', id: 'duy-20' }],
    aiTags: ['draw', 'economy', 'burst'], animTags: ['glow'],
  },
  // CUSTOM duy-21: choose a hand card; play it immediately for free with valuePercent 125; then lose ALL vouchers.
  {
    id: 'duy-21', characterId: 'duy', name: 'Thỏa Thuận Không Thể Từ Chối',
    cost: 7, baseCost: 7, types: ['support'], keywords: ['support'],
    description: 'Dùng ngay một lá miễn phí, tăng hiệu ứng 25%, sau đó mất toàn bộ Phiếu.',
    targetType: 'none',
    effects: [{ op: 'custom', id: 'duy-21' }],
    aiTags: ['combo', 'burst', 'finisher'], animTags: ['glow'],
  },
];
