import type { CardDef } from '../../engine/types';

// LÂM — THE CHAOS. Nhận đòn, tích Mana (Nhiễu), phản công.
// Card ids follow spec order: lam-01 .. lam-21.

export const lamCards: CardDef[] = [
  {
    id: 'lam-01', characterId: 'lam', name: 'Đếm Nhịp',
    cost: 0, baseCost: 0, types: ['defense'], keywords: ['defense'],
    description: 'Giảm 2 sát thương từ đòn tiếp theo nhắm Lâm.',
    targetType: 'none',
    effects: [
      { op: 'modifier', target: 'ownTeam', mod: { kind: 'incomingDamageReduction', amount: 2, uses: 1, turns: 2, filter: { targetCharId: 'lam' } } },
    ],
    aiTags: ['defense', 'setup'], animTags: ['shield'],
  },
  {
    id: 'lam-02', characterId: 'lam', name: 'Nhịp Tay',
    cost: 0, baseCost: 0, types: ['support'], keywords: ['support'],
    description: 'Lá Lâm tiếp theo thêm 2 sát thương hoặc 2 Giáp.',
    targetType: 'none',
    effects: [
      { op: 'modifier', target: 'ownTeam', mod: { kind: 'damageOrBlockBonus', amount: 2, uses: 1, filter: { charId: 'owner' } } },
    ],
    aiTags: ['setup'], animTags: ['glow'],
  },
  {
    id: 'lam-03', characterId: 'lam', name: 'Bỏ Ngoài Tai',
    cost: 0, baseCost: 0, types: ['defense', 'support'], keywords: ['defense', 'taunt', 'exhaust'],
    description: 'Lâm Taunt 20%, rút 1 lá. Tiêu hao.',
    targetType: 'none', exhaust: true,
    effects: [
      { op: 'status', status: 'taunt', percent: 20, turns: 1, target: 'ownerChar' },
      { op: 'draw', count: 1 },
    ],
    aiTags: ['taunt', 'draw'], animTags: ['glow'],
  },
  {
    id: 'lam-04', characterId: 'lam', name: 'Đừng Nhìn Tôi',
    cost: 1, baseCost: 1, types: ['defense'], keywords: ['defense'],
    description: 'Nhận 4 Giáp; nếu có Taunt, thêm 3.',
    targetType: 'none',
    effects: [
      { op: 'if', cond: { kind: 'ownerHasTaunt' }, then: [{ op: 'block', value: 7 }], else: [{ op: 'block', value: 4 }] },
    ],
    aiTags: ['defense', 'combo'], animTags: ['shield'],
  },
  {
    id: 'lam-05', characterId: 'lam', name: 'Phản Xạ Bất Ngờ',
    cost: 1, baseCost: 1, types: ['attack'], keywords: ['attack'],
    description: 'Gây 4 sát thương; nếu Lâm đã bị đánh từ lượt trước, thêm 3.',
    targetType: 'enemy',
    effects: [
      { op: 'if', cond: { kind: 'ownerHitLastEnemyTurn' }, then: [{ op: 'damage', value: 7 }], else: [{ op: 'damage', value: 4 }] },
    ],
    aiTags: ['damage'], animTags: ['hit'],
  },
  {
    id: 'lam-06', characterId: 'lam', name: 'Nén Lại',
    cost: 1, baseCost: 1, types: ['heal', 'support'], keywords: ['heal', 'support'],
    description: 'Hồi 2 HP; đòn tiếp theo được tính thêm 4 cho ngưỡng Quá Tải.',
    targetType: 'none',
    effects: [
      { op: 'heal', value: 2 },
      { op: 'modifier', target: 'ownTeam', mod: { kind: 'overloadBonus', amount: 4, uses: 1, turns: 2 } },
    ],
    aiTags: ['heal', 'setup'], animTags: ['glow'],
  },
  {
    id: 'lam-07', characterId: 'lam', name: 'Quá Nhiều Tiếng',
    cost: 2, baseCost: 2, types: ['support', 'defense'], keywords: ['support', 'weak', 'taunt'],
    description: 'Đối thủ bị Yếu lượt sau; Lâm Taunt 40%.',
    targetType: 'none',
    effects: [
      { op: 'status', status: 'weak', turns: 1, target: 'enemyTeam' },
      { op: 'status', status: 'taunt', percent: 40, turns: 1, target: 'ownerChar' },
    ],
    aiTags: ['debuff', 'taunt'], animTags: ['glow', 'glitch'],
  },
  {
    // CUSTOM (engine flag 'lam-08'): if this team's block is fully broken while the flag
    // is active, draw 1 card at the start of the next own turn.
    id: 'lam-08', characterId: 'lam', name: 'Cắn Răng',
    cost: 2, baseCost: 2, types: ['defense'], keywords: ['defense'],
    description: 'Nhận 7 Giáp; nếu bị phá hết, đầu lượt sau rút 1 lá.',
    targetType: 'none',
    effects: [
      { op: 'block', value: 7 },
      { op: 'modifier', target: 'ownTeam', mod: { kind: 'flag', id: 'lam-08', turns: 1 } },
    ],
    aiTags: ['defense', 'draw'], animTags: ['shield'],
  },
  {
    id: 'lam-09', characterId: 'lam', name: 'Nhiễu Tăng Cao',
    cost: 2, baseCost: 2, types: ['attack'], keywords: ['attack'],
    description: 'Gây 5 sát thương, thêm 3 mỗi Nhiễu của lượt đối thủ gần nhất.',
    targetType: 'enemy',
    effects: [{ op: 'damage', value: 5, perNoise: 3 }],
    aiTags: ['damage', 'burst'], animTags: ['hit', 'glitch'],
  },
  {
    id: 'lam-10', characterId: 'lam', name: 'Mất Nhịp',
    cost: 3, baseCost: 3, types: ['attack'], keywords: ['attack'],
    description: 'Gây 9 sát thương; nếu đã nhận sát thương từ lá tấn công, rút 1 lá.',
    targetType: 'enemy',
    effects: [
      { op: 'damage', value: 9 },
      { op: 'if', cond: { kind: 'tookAttackDamage' }, then: [{ op: 'draw', count: 1 }] },
    ],
    aiTags: ['damage', 'draw'], animTags: ['hit'],
  },
  {
    id: 'lam-11', characterId: 'lam', name: 'Tự Điều Chỉnh',
    cost: 3, baseCost: 3, types: ['heal'], keywords: ['heal'],
    description: 'Hồi 6 HP, xóa Yếu hoặc Lộ sơ hở.',
    targetType: 'none',
    effects: [
      { op: 'heal', value: 6 },
      { op: 'cleanse', what: 'weakOrExpose', from: 'ownTeam' },
    ],
    aiTags: ['heal', 'dispel'], animTags: ['glow'],
  },
  {
    id: 'lam-12', characterId: 'lam', name: 'Cứ Đánh Đi',
    cost: 3, baseCost: 3, types: ['defense'], keywords: ['defense', 'taunt', 'counter'],
    description: 'Nhận 8 Giáp, Taunt 80%, Phản đòn 3.',
    targetType: 'none',
    effects: [
      { op: 'block', value: 8 },
      { op: 'status', status: 'taunt', percent: 80, turns: 1, target: 'ownerChar' },
      { op: 'status', status: 'counter', stacks: 3, turns: 1, target: 'ownerChar' },
    ],
    aiTags: ['defense', 'taunt'], animTags: ['shield'],
  },
  {
    id: 'lam-13', characterId: 'lam', name: 'Dồn Nén',
    cost: 4, baseCost: 4, types: ['support'], keywords: ['support'],
    description: 'Hai lá tiếp theo nhắm Lâm mỗi lá tạo thêm 1 Nhiễu, vẫn tối đa 3.',
    targetType: 'none',
    effects: [
      { op: 'modifier', target: 'ownTeam', mod: { kind: 'overloadExtraNoise', uses: 2, turns: 2 } },
    ],
    aiTags: ['setup', 'economy'], animTags: ['glow', 'glitch'],
  },
  {
    id: 'lam-14', characterId: 'lam', name: 'Vỡ Mạch',
    cost: 4, baseCost: 4, types: ['attack'], keywords: ['attack'],
    description: 'Gây 12 sát thương; nếu lượt bắt đầu với ít nhất 2 Mana từ Nhiễu, thêm 6.',
    targetType: 'enemy',
    effects: [
      { op: 'if', cond: { kind: 'noiseManaAtLeast', value: 2 }, then: [{ op: 'damage', value: 18 }], else: [{ op: 'damage', value: 12 }] },
    ],
    aiTags: ['damage', 'burst'], animTags: ['hit', 'glitch'],
  },
  {
    id: 'lam-15', characterId: 'lam', name: 'Không Sao Đâu',
    cost: 4, baseCost: 4, types: ['heal', 'defense'], keywords: ['heal', 'defense'],
    description: 'Hồi 7 HP; nếu lượt bắt đầu với ít nhất 2 Nhiễu, thêm 9 Giáp.',
    targetType: 'none',
    effects: [
      { op: 'heal', value: 7 },
      { op: 'if', cond: { kind: 'noiseLastTurnAtLeast', value: 2 }, then: [{ op: 'block', value: 9 }] },
    ],
    aiTags: ['heal', 'defense'], animTags: ['glow', 'shield'],
  },
  {
    id: 'lam-16', characterId: 'lam', name: 'Quá Tải Giác Quan',
    cost: 5, baseCost: 5, types: ['attack'], keywords: ['attack', 'weak'],
    description: 'Gây 16 sát thương, đối thủ bị Yếu lượt sau; đội mất 3 HP, không kích hoạt nội tại.',
    targetType: 'enemy',
    effects: [
      { op: 'damage', value: 16 },
      { op: 'status', status: 'weak', turns: 1, target: 'enemyTeam' },
      { op: 'loseHp', value: 3 },
    ],
    aiTags: ['damage', 'burst', 'debuff'], animTags: ['hit', 'glitch', 'blood'],
  },
  {
    id: 'lam-17', characterId: 'lam', name: 'Cơn Sóng Cảm Xúc',
    cost: 5, baseCost: 5, types: ['attack', 'defense'], keywords: ['attack', 'defense'],
    description: 'Chọn tăng hoặc giảm 2 Quan hệ; gây 10 sát thương, nhận 10 Giáp.',
    targetType: 'enemy',
    effects: [
      {
        op: 'choose', prompt: 'Chọn thay đổi Quan hệ',
        options: [
          { label: 'Tăng 2 Quan hệ', effects: [{ op: 'rel', delta: 2 }] },
          { label: 'Giảm 2 Quan hệ', effects: [{ op: 'rel', delta: -2 }] },
        ],
      },
      { op: 'damage', value: 10 },
      { op: 'block', value: 10 },
    ],
    aiTags: ['damage', 'defense', 'relationship'], animTags: ['hit', 'shield', 'glow'],
  },
  {
    id: 'lam-18', characterId: 'lam', name: 'Chạm Ngưỡng',
    cost: 6, baseCost: 6, types: ['support'], keywords: ['support', 'exhaust'],
    description: 'Lượt đối thủ sau, ngưỡng Quá Tải thành 6/12/18. Tiêu hao.',
    targetType: 'none', exhaust: true,
    effects: [
      { op: 'modifier', target: 'ownTeam', mod: { kind: 'overloadLowThreshold', turns: 1 } },
    ],
    aiTags: ['setup'], animTags: ['glitch', 'glow'],
  },
  {
    id: 'lam-19', characterId: 'lam', name: 'Phản Hồi Dữ Dội',
    cost: 6, baseCost: 6, types: ['attack'], keywords: ['attack'],
    description: 'Gây 19 sát thương; nếu bắt đầu lượt với 3 Mana thêm, thêm 9.',
    targetType: 'enemy',
    effects: [
      { op: 'if', cond: { kind: 'noiseManaAtLeast', value: 3 }, then: [{ op: 'damage', value: 28 }], else: [{ op: 'damage', value: 19 }] },
    ],
    aiTags: ['damage', 'burst', 'finisher'], animTags: ['hit', 'glitch'],
  },
  {
    id: 'lam-20', characterId: 'lam', name: 'Tất Cả Cùng Lúc',
    cost: 7, baseCost: 7, types: ['attack', 'defense'], keywords: ['attack', 'defense', 'taunt'],
    description: 'Gây 22 sát thương, nhận 12 Giáp, Taunt 100%.',
    targetType: 'enemy',
    effects: [
      { op: 'damage', value: 22 },
      { op: 'block', value: 12 },
      { op: 'status', status: 'taunt', percent: 100, turns: 1, target: 'ownerChar' },
    ],
    aiTags: ['damage', 'defense', 'finisher', 'taunt'], animTags: ['hit', 'shield'],
  },
  {
    // CUSTOM (engine flag 'lam-21'): while active (2 turns, 2 uses), the first time Lâm
    // is attacked each turn: gain 5 block and draw 1 at the start of the next own turn.
    id: 'lam-21', characterId: 'lam', name: 'Tôi Vẫn Ở Đây',
    cost: 7, baseCost: 7, types: ['heal', 'support'], keywords: ['heal', 'support', 'exhaust'],
    description: 'Hồi 12 HP; trong hai lượt, lần đầu Lâm bị tấn công nhận 5 Giáp và rút 1 lá đầu lượt sau. Tiêu hao.',
    targetType: 'none', exhaust: true,
    effects: [
      { op: 'heal', value: 12 },
      { op: 'modifier', target: 'ownTeam', mod: { kind: 'flag', id: 'lam-21', uses: 2, turns: 2 } },
    ],
    aiTags: ['heal', 'setup', 'emergency'], animTags: ['glow'],
  },
];
