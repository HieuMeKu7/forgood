import type { CardDef } from '../../engine/types';

// MỘC — THE JOKER. Chaos, bài 0 Mana, thay đổi cost.
// Card ids follow spec order: moc-01 .. moc-21.

export const mocCards: CardDef[] = [
  {
    id: 'moc-01', characterId: 'moc', name: 'Tung Đồng Xu',
    cost: 0, baseCost: 0, types: ['support'], keywords: ['support', 'exhaust'],
    description: 'Ngẫu nhiên nhận 1 Mana hoặc rút 1 lá. Tiêu hao.',
    targetType: 'none', exhaust: true,
    effects: [
      {
        op: 'random',
        options: [
          { effects: [{ op: 'gainMana', amount: 1 }] },
          { effects: [{ op: 'draw', count: 1 }] },
        ],
      },
    ],
    aiTags: ['economy', 'draw'], animTags: ['glow'],
  },
  {
    id: 'moc-02', characterId: 'moc', name: 'Ái Chà',
    cost: 0, baseCost: 0, types: ['attack'], keywords: ['attack'],
    description: 'Gây ngẫu nhiên 1–6 sát thương.',
    targetType: 'enemy',
    effects: [{ op: 'damage', randomMin: 1, randomMax: 6 }],
    aiTags: ['damage'], animTags: ['hit'],
  },
  // CUSTOM: moc-03 — add to hand a random base-cost-1 card of one of the team's
  // characters as a TEMP card costing 0 (temp cards cannot be copied by Yến).
  {
    id: 'moc-03', characterId: 'moc', name: 'Hàng Dùng Thử',
    cost: 0, baseCost: 0, types: ['support'], keywords: ['support', 'exhaust'],
    description: 'Tạo một lá 1 Mana ngẫu nhiên từ hai nhân vật trong đội; lá đó tốn 0. Tiêu hao.',
    targetType: 'none', exhaust: true,
    effects: [{ op: 'custom', id: 'moc-03' }],
    aiTags: ['setup', 'economy'], animTags: ['glow'],
  },
  {
    id: 'moc-04', characterId: 'moc', name: 'Vỏ Chuối',
    cost: 1, baseCost: 1, types: ['attack', 'defense'], keywords: ['attack', 'defense'],
    description: 'Gây 4 sát thương; đòn đầu của đối thủ lượt sau giảm 3.',
    targetType: 'enemy',
    effects: [
      { op: 'damage', value: 4 },
      { op: 'modifier', target: 'ownTeam', mod: { kind: 'incomingDamageReduction', amount: 3, uses: 1, turns: 2 } },
    ],
    aiTags: ['damage', 'defense'], animTags: ['hit', 'shield'],
  },
  // CUSTOM: moc-05 — draw 1; if the drawn card's current cost is 0, draw 1 more.
  {
    id: 'moc-05', characterId: 'moc', name: 'Át Chủ Bài',
    cost: 1, baseCost: 1, types: ['support'], keywords: ['support'],
    description: 'Rút 1 lá; nếu là lá 0 Mana, rút thêm 1.',
    targetType: 'none',
    effects: [{ op: 'custom', id: 'moc-05' }],
    aiTags: ['draw'], animTags: ['glow'],
  },
  {
    id: 'moc-06', characterId: 'moc', name: 'Đổi Chỗ',
    cost: 1, baseCost: 1, types: ['support'], keywords: ['support'],
    description: 'Đảo dấu Quan hệ, giữ nguyên độ lớn.',
    targetType: 'none',
    effects: [{ op: 'rel', invert: true }],
    aiTags: ['relationship'], animTags: ['flip'],
  },
  {
    id: 'moc-07', characterId: 'moc', name: 'Xúc Xắc Gian Lận',
    cost: 2, baseCost: 2, types: ['attack'], keywords: ['attack'],
    description: 'Gây ba đòn, mỗi đòn 1–3 sát thương.',
    targetType: 'enemy',
    effects: [{ op: 'damage', hits: 3, randomMin: 1, randomMax: 3 }],
    aiTags: ['damage'], animTags: ['hit'],
  },
  // CUSTOM: moc-08 — choose a card from discard pile, put into hand with -1 cost this turn.
  {
    id: 'moc-08', characterId: 'moc', name: 'Nhanh Tay',
    cost: 2, baseCost: 2, types: ['support'], keywords: ['support'],
    description: 'Lấy một lá từ chồng bỏ; lá đó giảm 1 Mana trong lượt.',
    targetType: 'none',
    effects: [{ op: 'custom', id: 'moc-08' }],
    aiTags: ['draw', 'economy'], animTags: ['glow'],
  },
  {
    id: 'moc-09', characterId: 'moc', name: 'Quà Bất Ngờ',
    cost: 2, baseCost: 2, types: ['attack', 'defense'], keywords: ['attack', 'defense'],
    description: 'Chọn gây 7 sát thương hoặc nhận 7 Giáp; 25% kích hoạt thêm hiệu ứng còn lại.',
    targetType: 'enemy',
    effects: [
      {
        op: 'choose',
        prompt: 'Quà Bất Ngờ',
        options: [
          { label: 'Gây 7 sát thương', effects: [{ op: 'damage', value: 7 }] },
          { label: 'Nhận 7 Giáp', effects: [{ op: 'block', value: 7 }] },
        ],
        bothChancePercent: 25,
      },
    ],
    aiTags: ['damage', 'defense'], animTags: ['hit', 'shield'],
  },
  // CUSTOM: moc-10 — replay the previously played card's effects at 50% numeric values.
  {
    id: 'moc-10', characterId: 'moc', name: 'Bắt Chước',
    cost: 3, baseCost: 3, types: ['support'], keywords: ['support', 'copy'],
    description: 'Lặp lại lá vừa dùng với 50% giá trị số.',
    targetType: 'none',
    effects: [{ op: 'custom', id: 'moc-10' }],
    aiTags: ['copy', 'combo'], animTags: ['glitch'],
  },
  {
    id: 'moc-11', characterId: 'moc', name: 'Lá Bài Đảo Chiều',
    cost: 3, baseCost: 3, types: ['support'], keywords: ['support', 'retain'],
    description: 'Debuff tiếp theo bị phản lại. Giữ lại.',
    targetType: 'none', retain: true,
    effects: [{ op: 'modifier', target: 'ownTeam', mod: { kind: 'reflectDebuff', uses: 1 } }],
    aiTags: ['setup', 'dispel'], animTags: ['glow', 'flip'],
  },
  {
    id: 'moc-12', characterId: 'moc', name: 'Tin Tôi Không?',
    cost: 3, baseCost: 3, types: ['support'], keywords: ['support'],
    description: 'Chọn tăng 2 hoặc giảm 2 Quan hệ, rút 1 lá.',
    targetType: 'none',
    effects: [
      {
        op: 'choose',
        prompt: 'Tin Tôi Không?',
        options: [
          { label: 'Tăng 2 Quan hệ', effects: [{ op: 'rel', delta: 2 }] },
          { label: 'Giảm 2 Quan hệ', effects: [{ op: 'rel', delta: -2 }] },
        ],
      },
      { op: 'draw', count: 1 },
    ],
    aiTags: ['relationship', 'draw'], animTags: ['glow'],
  },
  // CUSTOM: moc-13 — draw 3; assign this-turn costs 0, 2, 4 to them in random order.
  {
    id: 'moc-13', characterId: 'moc', name: 'Rút Bài Hoang Dã',
    cost: 4, baseCost: 4, types: ['support'], keywords: ['support'],
    description: 'Rút 3 lá; cost của chúng lần lượt ngẫu nhiên 0, 2, 4 trong lượt.',
    targetType: 'none',
    effects: [{ op: 'custom', id: 'moc-13' }],
    aiTags: ['draw', 'economy'], animTags: ['glitch'],
  },
  {
    id: 'moc-14', characterId: 'moc', name: 'Nhà Cái Luôn Thắng',
    cost: 4, baseCost: 4, types: ['attack'], keywords: ['attack'],
    description: 'Gây 12 sát thương; nếu Quan hệ bằng 0, thêm 6.',
    targetType: 'enemy',
    effects: [
      { op: 'if', cond: { kind: 'relIs', value: 0 }, then: [{ op: 'damage', value: 18 }], else: [{ op: 'damage', value: 12 }] },
    ],
    aiTags: ['damage', 'burst'], animTags: ['hit'],
  },
  // CUSTOM: moc-15 — create 3 random TEMP copies of Mộc's base 0-cost cards in hand;
  // they exhaust after use. This card itself does NOT exhaust (the generated ones do).
  {
    id: 'moc-15', characterId: 'moc', name: 'Tung Hứng',
    cost: 4, baseCost: 4, types: ['support'], keywords: ['support'],
    description: 'Tạo 3 lá 0 Mana ngẫu nhiên của Mộc; chúng Tiêu hao sau khi dùng.',
    targetType: 'none',
    effects: [{ op: 'custom', id: 'moc-15' }],
    aiTags: ['setup', 'economy'], animTags: ['glow', 'glitch'],
  },
  // CUSTOM: moc-16 — reveal top 3 of draw pile; auto-play them in order while
  // cumulative cost ≤ 5 (played free), the rest go to discard.
  {
    id: 'moc-16', characterId: 'moc', name: 'Combo Hỗn Loạn',
    cost: 5, baseCost: 5, types: ['support'], keywords: ['support'],
    description: 'Lật ba lá đầu deck; tự dùng các lá có tổng cost không quá 5.',
    targetType: 'none',
    effects: [{ op: 'custom', id: 'moc-16' }],
    aiTags: ['combo', 'burst'], animTags: ['glitch'],
  },
  {
    id: 'moc-17', characterId: 'moc', name: 'Gấp Đôi Hoặc Mất Trắng',
    cost: 5, baseCost: 5, types: ['attack'], keywords: ['attack'],
    description: 'Gây 16 sát thương; ngẫu nhiên thành 32 hoặc 8.',
    targetType: 'enemy',
    effects: [{ op: 'damage', value: 16, doubleOrHalf: true }],
    aiTags: ['damage', 'burst'], animTags: ['hit', 'glitch'],
  },
  // CUSTOM: moc-18 — set turnCost 1 on all cards in hand; add modifier cardLockAfter 3
  // (after 3 more cards this turn, playing cards is locked).
  {
    id: 'moc-18', characterId: 'moc', name: 'Viết Lại Luật',
    cost: 6, baseCost: 6, types: ['support'], keywords: ['support'],
    description: 'Mọi lá trên tay tốn 1 Mana trong lượt; sau khi chơi thêm 3 lá thì khóa chơi bài.',
    targetType: 'none',
    effects: [{ op: 'custom', id: 'moc-18' }],
    aiTags: ['economy', 'setup', 'combo'], animTags: ['glitch'],
  },
  {
    id: 'moc-19', characterId: 'moc', name: 'Trò Đùa Thế Kỷ',
    cost: 6, baseCost: 6, types: ['defense', 'support'], keywords: ['defense', 'support'],
    description: 'Nhận 10 Giáp; bài của đối thủ lượt sau tăng 1 cost, tối đa 7.',
    targetType: 'none',
    effects: [
      { op: 'block', value: 10 },
      { op: 'modifier', target: 'enemyTeam', mod: { kind: 'costDelta', amount: 1, turns: 1 } },
    ],
    aiTags: ['defense', 'debuff'], animTags: ['shield', 'glitch'],
  },
  {
    id: 'moc-20', characterId: 'moc', name: 'Jackpot',
    cost: 7, baseCost: 7, types: ['attack'], keywords: ['attack'],
    description: 'Gây bảy đòn, mỗi đòn 2–5 sát thương.',
    targetType: 'enemy',
    effects: [{ op: 'damage', hits: 7, randomMin: 2, randomMax: 5 }],
    aiTags: ['damage', 'burst', 'finisher'], animTags: ['hit'],
  },
  // CUSTOM: moc-21 — draw 5; set their this-turn cost to 1.
  {
    id: 'moc-21', characterId: 'moc', name: 'Ai Cũng Phản Bội',
    cost: 7, baseCost: 7, types: ['support'], keywords: ['support'],
    description: 'Đặt Quan hệ ngẫu nhiên +5 hoặc -5; rút 5 lá, cost của chúng bằng 1 trong lượt.',
    targetType: 'none',
    effects: [
      { op: 'rel', setRandomOf: [5, -5] },
      { op: 'custom', id: 'moc-21' },
    ],
    aiTags: ['relationship', 'draw', 'economy'], animTags: ['flip', 'glitch'],
  },
];
