import type { CardDef } from '../../engine/types';

// KHANH — THE RAZOR. DPS chỉ dùng bài 0–1 cost, combo nhiều lá.
// Nhịp Chém (Blade Tempo) là passive engine-side: mỗi lá Khanh +1 tempo;
// đòn tấn công +2/+4/+7 ở mốc 3/6/9 (chỉ tier cao nhất).
// Card ids follow spec order: khanh-01 .. khanh-21.

export const khanhCards: CardDef[] = [
  {
    id: 'khanh-01', characterId: 'khanh', name: 'Chém Lướt',
    cost: 0, baseCost: 0, types: ['attack'], keywords: ['attack'],
    description: 'Gây 2.',
    targetType: 'enemy',
    effects: [{ op: 'damage', value: 2 }],
    aiTags: ['damage'], animTags: ['slash'],
  },
  {
    id: 'khanh-02', characterId: 'khanh', name: 'Cứa Nông',
    cost: 0, baseCost: 0, types: ['attack'], keywords: ['attack', 'bleed'],
    description: 'Gây 1, Chảy máu 2.',
    targetType: 'enemy',
    effects: [{ op: 'damage', value: 1 }, { op: 'bleed', stacks: 2 }],
    aiTags: ['damage', 'bleed'], animTags: ['slash', 'blood'],
  },
  {
    id: 'khanh-03', characterId: 'khanh', name: 'Gạt Tay',
    cost: 0, baseCost: 0, types: ['attack', 'defense'], keywords: ['attack', 'defense'],
    description: 'Gây 1; đòn đầu đối thủ lượt sau giảm 2.',
    targetType: 'enemy',
    effects: [
      { op: 'damage', value: 1 },
      { op: 'modifier', target: 'ownTeam', mod: { kind: 'incomingDamageReduction', amount: 2, uses: 1, turns: 2 } },
    ],
    aiTags: ['damage', 'defense'], animTags: ['slash', 'shield'],
  },
  {
    id: 'khanh-04', characterId: 'khanh', name: 'Lách Người',
    cost: 0, baseCost: 0, types: ['support'], keywords: ['support'],
    description: 'Rút 1 rồi bỏ 1.',
    targetType: 'none',
    effects: [{ op: 'draw', count: 1 }, { op: 'discardChoose', count: 1 }],
    aiTags: ['draw'], animTags: ['glow'],
  },
  {
    id: 'khanh-05', characterId: 'khanh', name: 'Mồi Đòn',
    cost: 0, baseCost: 0, types: ['support'], keywords: ['support'],
    description: 'Lá tấn công tiếp theo thêm 3.',
    targetType: 'none',
    effects: [{ op: 'modifier', target: 'ownTeam', mod: { kind: 'damageBonus', amount: 3, uses: 1, filter: { cardType: 'attack' } } }],
    aiTags: ['setup'], animTags: ['glow'],
  },
  {
    id: 'khanh-06', characterId: 'khanh', name: 'Đạp Gối',
    cost: 0, baseCost: 0, types: ['attack'], keywords: ['attack', 'expose'],
    description: 'Gây 2; nếu Lộ sơ hở, gây 5.',
    targetType: 'enemy',
    effects: [{ op: 'if', cond: { kind: 'targetExposed' }, then: [{ op: 'damage', value: 5 }], else: [{ op: 'damage', value: 2 }] }],
    aiTags: ['damage', 'combo'], animTags: ['hit'],
  },
  {
    id: 'khanh-07', characterId: 'khanh', name: 'Cắn Răng',
    cost: 0, baseCost: 0, types: ['heal'], keywords: ['heal'],
    description: 'Hồi 2; nếu đã dùng ít nhất 6 lá, hồi 4.',
    targetType: 'none',
    effects: [{ op: 'if', cond: { kind: 'cardsPlayedAtLeast', value: 6 }, then: [{ op: 'heal', value: 4 }], else: [{ op: 'heal', value: 2 }] }],
    aiTags: ['heal', 'combo'], animTags: ['glow'],
  },
  // CUSTOM: khanh-08 — grants +1 extra Blade Tempo (base +1 from playing the card
  // happens automatically, so the card counts as 2 toward Nhịp Chém).
  {
    id: 'khanh-08', characterId: 'khanh', name: 'Không Ngừng Tay',
    cost: 0, baseCost: 0, types: ['support'], keywords: ['support', 'exhaust'],
    description: 'Tính là 2 lá cho Nhịp Chém. Tiêu hao.',
    targetType: 'none', exhaust: true,
    effects: [{ op: 'custom', id: 'khanh-08' }],
    aiTags: ['setup', 'combo'], animTags: ['glow'],
  },
  {
    id: 'khanh-09', characterId: 'khanh', name: 'Máu Trên Tay',
    cost: 0, baseCost: 0, types: ['support'], keywords: ['support', 'bleed', 'exhaust'],
    description: 'Nếu đối thủ có Chảy máu, rút 1; nếu không, Chảy máu 1. Tiêu hao.',
    targetType: 'none', exhaust: true,
    effects: [{ op: 'if', cond: { kind: 'enemyBleeding' }, then: [{ op: 'draw', count: 1 }], else: [{ op: 'bleed', stacks: 1 }] }],
    aiTags: ['bleed', 'draw'], animTags: ['blood'],
  },
  {
    id: 'khanh-10', characterId: 'khanh', name: 'Nhát Cuối Nhỏ',
    cost: 0, baseCost: 0, types: ['attack'], keywords: ['attack'],
    description: 'Gây 3; nếu đối thủ không quá 15 HP, gây 6.',
    targetType: 'enemy',
    effects: [{ op: 'if', cond: { kind: 'enemyHpAtMost', value: 15 }, then: [{ op: 'damage', value: 6 }], else: [{ op: 'damage', value: 3 }] }],
    aiTags: ['damage', 'finisher'], animTags: ['slash'],
  },
  {
    id: 'khanh-11', characterId: 'khanh', name: 'Liên Hoàn Ba Nhát',
    cost: 1, baseCost: 1, types: ['attack'], keywords: ['attack'],
    description: 'Ba đòn 2; bonus Nhịp áp dụng mỗi hit ở 50%.',
    targetType: 'enemy',
    effects: [{ op: 'damage', value: 2, hits: 3, tempoPercentPerHit: 50 }],
    aiTags: ['damage', 'burst'], animTags: ['slash', 'hit'],
  },
  {
    id: 'khanh-12', characterId: 'khanh', name: 'Rạch Mở',
    cost: 1, baseCost: 1, types: ['attack'], keywords: ['attack', 'bleed'],
    description: 'Gây 5, Chảy máu 4.',
    targetType: 'enemy',
    effects: [{ op: 'damage', value: 5 }, { op: 'bleed', stacks: 4 }],
    aiTags: ['damage', 'bleed'], animTags: ['slash', 'blood'],
  },
  {
    id: 'khanh-13', characterId: 'khanh', name: 'Đâm Xuyên',
    cost: 1, baseCost: 1, types: ['attack'], keywords: ['attack'],
    description: 'Gây 7, bỏ qua 4 Giáp.',
    targetType: 'enemy',
    effects: [{ op: 'damage', value: 7, ignoreBlock: 4 }],
    aiTags: ['damage'], animTags: ['hit'],
  },
  {
    id: 'khanh-14', characterId: 'khanh', name: 'Bẻ Khớp',
    cost: 1, baseCost: 1, types: ['attack'], keywords: ['attack', 'weak'],
    description: 'Gây 4, đối thủ Yếu lượt sau.',
    targetType: 'enemy',
    effects: [{ op: 'damage', value: 4 }, { op: 'status', status: 'weak', turns: 1, target: 'enemyTeam' }],
    aiTags: ['damage', 'debuff'], animTags: ['hit'],
  },
  {
    id: 'khanh-15', characterId: 'khanh', name: 'Dồn Vào Góc',
    cost: 1, baseCost: 1, types: ['attack'], keywords: ['attack', 'expose'],
    description: 'Gây 5, gây Lộ sơ hở trước đòn tiếp theo.',
    targetType: 'enemy',
    effects: [{ op: 'damage', value: 5 }, { op: 'status', status: 'exposeNextHit', target: 'enemyTeam' }],
    aiTags: ['damage', 'debuff', 'setup'], animTags: ['slash'],
  },
  {
    id: 'khanh-16', characterId: 'khanh', name: 'Đổi Máu',
    cost: 1, baseCost: 1, types: ['attack'], keywords: ['attack'],
    description: 'Mất 2 HP, gây 10; không thể tự giết Khanh.',
    targetType: 'enemy',
    effects: [{ op: 'loseHp', value: 2 }, { op: 'damage', value: 10 }],
    aiTags: ['damage', 'burst'], animTags: ['slash', 'blood'],
  },
  {
    id: 'khanh-17', characterId: 'khanh', name: 'Tăng Nhịp',
    cost: 1, baseCost: 1, types: ['support'], keywords: ['support'],
    description: 'Rút 2; lá 0-cost tiếp theo thêm 2 hiệu ứng.',
    targetType: 'none',
    effects: [
      { op: 'draw', count: 2 },
      { op: 'modifier', target: 'ownTeam', mod: { kind: 'zeroCostCardBonus', amount: 2, uses: 1 } },
    ],
    aiTags: ['draw', 'setup'], animTags: ['glow'],
  },
  {
    id: 'khanh-18', characterId: 'khanh', name: 'Cắt Gân',
    cost: 1, baseCost: 1, types: ['attack'], keywords: ['attack'],
    description: 'Gây 6; lá tấn công đầu tiên của đối thủ lượt sau tăng 1 cost.',
    targetType: 'enemy',
    effects: [
      { op: 'damage', value: 6 },
      { op: 'modifier', target: 'enemyTeam', mod: { kind: 'costDelta', amount: 1, uses: 1, turns: 1, filter: { cardType: 'attack' } } },
    ],
    aiTags: ['damage', 'debuff'], animTags: ['slash'],
  },
  // CUSTOM: reset-tempo — sets own team's Nhịp Chém (bladeTempo) back to 0 after the attack.
  {
    id: 'khanh-19', characterId: 'khanh', name: 'Chém Đứt Nhịp',
    cost: 1, baseCost: 1, types: ['attack'], keywords: ['attack'],
    description: 'Gây 2 mỗi lá đã dùng, tối đa 20; đặt Nhịp về 0.',
    targetType: 'enemy',
    effects: [
      { op: 'damage', value: 0, perCardPlayed: 2, maxTotal: 20 },
      { op: 'custom', id: 'reset-tempo' },
    ],
    aiTags: ['damage', 'burst', 'combo'], animTags: ['slash'],
  },
  {
    id: 'khanh-20', characterId: 'khanh', name: 'Mưa Dao',
    cost: 1, baseCost: 1, types: ['attack'], keywords: ['attack'],
    description: 'Gây một hit 1 sát thương mỗi lá đã dùng, tối đa 10 hit; không nhận bonus Nhịp.',
    targetType: 'enemy',
    effects: [{ op: 'damage', value: 1, hitPerCardPlayed: true, maxHits: 10, noTempoBonus: true }],
    aiTags: ['damage', 'burst', 'combo'], animTags: ['slash', 'hit'],
  },
  // CUSTOM: reset-tempo — sets own team's Nhịp Chém (bladeTempo) back to 0 after the attack.
  {
    id: 'khanh-21', characterId: 'khanh', name: 'Không Còn Chỗ Chạy',
    cost: 1, baseCost: 1, types: ['attack'], keywords: ['attack'],
    description: 'Gây 8; nếu đã dùng 9 lá, lặp một lần; đặt Nhịp về 0.',
    targetType: 'enemy',
    effects: [
      { op: 'damage', value: 8 },
      { op: 'if', cond: { kind: 'cardsPlayedAtLeast', value: 9 }, then: [{ op: 'damage', value: 8 }] },
      { op: 'custom', id: 'reset-tempo' },
    ],
    aiTags: ['damage', 'finisher', 'combo'], animTags: ['slash', 'hit'],
  },
];
