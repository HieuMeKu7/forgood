import type { CardDef } from '../../engine/types';

// VY — THE KNIFE. Burst damage, Chảy máu, Betrayal.
// Card ids follow spec order: vy-01 .. vy-21.

export const vyCards: CardDef[] = [
  {
    id: 'vy-01', characterId: 'vy', name: 'Nụ Cười Vô Tội',
    cost: 0, baseCost: 0, types: ['support'], keywords: ['betray', 'support', 'exhaust'],
    description: 'Giảm 1 Quan hệ; lá Betray tiếp theo thêm 2 sát thương. Tiêu hao.',
    targetType: 'none', exhaust: true,
    effects: [
      { op: 'rel', delta: -1 },
      { op: 'modifier', target: 'ownTeam', mod: { kind: 'damageBonus', amount: 2, uses: 1, filter: { keyword: 'betray' } } },
    ],
    aiTags: ['setup', 'relationship'], animTags: ['glow'],
  },
  {
    id: 'vy-02', characterId: 'vy', name: 'Lưỡi Dao Giấu Kín',
    cost: 0, baseCost: 0, types: ['attack'], keywords: ['betray', 'attack', 'exhaust'],
    description: 'Gây 2; trong Betrayal gây 5. Tiêu hao.',
    targetType: 'enemy', exhaust: true,
    effects: [{ op: 'if', cond: { kind: 'betrayal' }, then: [{ op: 'damage', value: 5 }], else: [{ op: 'damage', value: 2 }] }],
    aiTags: ['damage'], animTags: ['slash'],
  },
  // CUSTOM vy-03: choose+discard 1 card from hand, draw 1, the drawn card gets -1 cost this turn.
  {
    id: 'vy-03', characterId: 'vy', name: 'Xóa Dấu Vết',
    cost: 0, baseCost: 0, types: ['support'], keywords: ['betray', 'support'],
    description: 'Bỏ 1 lá, rút 1; lá rút giảm 1 Mana trong lượt.',
    targetType: 'none',
    effects: [{ op: 'custom', id: 'vy-03' }],
    aiTags: ['draw', 'economy'], animTags: ['glitch'],
  },
  {
    id: 'vy-04', characterId: 'vy', name: 'Đánh Lén',
    cost: 1, baseCost: 1, types: ['attack'], keywords: ['betray', 'attack'],
    description: 'Gây 5 sát thương; nếu đối thủ không có Giáp, thêm 2.',
    targetType: 'enemy',
    effects: [{ op: 'if', cond: { kind: 'targetNoBlock' }, then: [{ op: 'damage', value: 7 }], else: [{ op: 'damage', value: 5 }] }],
    aiTags: ['damage'], animTags: ['slash'],
  },
  {
    id: 'vy-05', characterId: 'vy', name: 'Lời Đồn Nhỏ',
    cost: 1, baseCost: 1, types: ['support'], keywords: ['betray', 'support', 'weak'],
    description: 'Giảm 1 Quan hệ; đối thủ bị Yếu lượt sau.',
    targetType: 'none',
    effects: [
      { op: 'rel', delta: -1 },
      { op: 'status', status: 'weak', turns: 1, target: 'enemyTeam' },
    ],
    aiTags: ['debuff', 'relationship'], animTags: ['glitch'],
  },
  {
    id: 'vy-06', characterId: 'vy', name: 'Cát Trong Mắt',
    cost: 1, baseCost: 1, types: ['attack'], keywords: ['betray', 'attack', 'expose'],
    description: 'Gây 3 sát thương; đối thủ Lộ sơ hở trước đòn tiếp theo.',
    targetType: 'enemy',
    effects: [
      { op: 'damage', value: 3 },
      { op: 'status', status: 'exposeNextHit', target: 'enemyTeam' },
    ],
    aiTags: ['damage', 'debuff', 'setup'], animTags: ['hit'],
  },
  {
    id: 'vy-07', characterId: 'vy', name: 'Đâm Sau Lưng',
    cost: 2, baseCost: 2, types: ['attack'], keywords: ['betray', 'attack'],
    description: 'Gây 8 sát thương; nếu lá trước thuộc đồng minh, thêm 4.',
    targetType: 'enemy',
    effects: [{ op: 'if', cond: { kind: 'prevCardAlly' }, then: [{ op: 'damage', value: 12 }], else: [{ op: 'damage', value: 8 }] }],
    aiTags: ['damage', 'combo'], animTags: ['slash', 'blood'],
  },
  {
    id: 'vy-08', characterId: 'vy', name: 'Dao Mượn',
    cost: 2, baseCost: 2, types: ['attack'], keywords: ['betray', 'attack'],
    description: 'Gây 6 sát thương; nếu Quan hệ không quá -2, rút 1 lá.',
    targetType: 'enemy',
    effects: [
      { op: 'damage', value: 6 },
      { op: 'if', cond: { kind: 'relAtMost', value: -2 }, then: [{ op: 'draw', count: 1 }] },
    ],
    aiTags: ['damage', 'draw'], animTags: ['slash'],
  },
  {
    id: 'vy-09', characterId: 'vy', name: 'Chối Mọi Thứ',
    cost: 2, baseCost: 2, types: ['defense', 'support'], keywords: ['betray', 'defense', 'support'],
    description: 'Nhận 6 Giáp, xóa một debuff, giảm 1 Quan hệ.',
    targetType: 'none',
    effects: [
      { op: 'block', value: 6 },
      { op: 'cleanse', what: 'debuff', from: 'ownTeam' },
      { op: 'rel', delta: -1 },
    ],
    aiTags: ['defense', 'dispel'], animTags: ['shield'],
  },
  {
    id: 'vy-10', characterId: 'vy', name: 'Cắt Đứt Quan Hệ',
    cost: 3, baseCost: 3, types: ['attack'], keywords: ['betray', 'attack'],
    description: 'Phá tối đa 6 Giáp rồi gây 10 sát thương.',
    targetType: 'enemy',
    effects: [{ op: 'damage', value: 10, breakBlockFirst: 6 }],
    aiTags: ['damage', 'burst'], animTags: ['slash', 'hit'],
  },
  {
    id: 'vy-11', characterId: 'vy', name: 'Ngửi Thấy Máu',
    cost: 3, baseCost: 3, types: ['attack'], keywords: ['betray', 'attack', 'bleed'],
    description: 'Chảy máu 5; nếu mục tiêu Lộ sơ hở, Chảy máu 7.',
    targetType: 'none',
    effects: [{ op: 'if', cond: { kind: 'targetExposed' }, then: [{ op: 'bleed', stacks: 7 }], else: [{ op: 'bleed', stacks: 5 }] }],
    aiTags: ['bleed', 'debuff', 'setup'], animTags: ['blood'],
  },
  // CUSTOM vy-12: the lowest-cost Betray card in hand gains retain for this turn.
  {
    id: 'vy-12', characterId: 'vy', name: 'Chứng Cứ Ngoại Phạm',
    cost: 3, baseCost: 3, types: ['defense'], keywords: ['betray', 'defense', 'retain'],
    description: 'Nhận 9 Giáp; giữ lại lá Betray cost thấp nhất.',
    targetType: 'none',
    effects: [
      { op: 'block', value: 9 },
      { op: 'custom', id: 'vy-12' },
    ],
    aiTags: ['defense', 'setup'], animTags: ['shield'],
  },
  {
    id: 'vy-13', characterId: 'vy', name: 'Phản Bội',
    cost: 4, baseCost: 4, types: ['attack'], keywords: ['betray', 'attack'],
    description: 'Gây 14 sát thương, giảm 2 Quan hệ, đội mất 3 HP.',
    targetType: 'enemy',
    effects: [
      { op: 'damage', value: 14 },
      { op: 'rel', delta: -2 },
      { op: 'loseHp', value: 3 },
    ],
    aiTags: ['damage', 'burst', 'relationship'], animTags: ['slash', 'blood'],
  },
  {
    id: 'vy-14', characterId: 'vy', name: 'Bịt Miệng',
    cost: 4, baseCost: 4, types: ['attack'], keywords: ['betray', 'attack'],
    description: 'Gây 11 sát thương; đối thủ nhận ít hơn 50% Giáp lượt sau.',
    targetType: 'enemy',
    effects: [
      { op: 'damage', value: 11 },
      { op: 'modifier', target: 'enemyTeam', mod: { kind: 'blockGainPercent', amount: 50, turns: 1 } },
    ],
    aiTags: ['damage', 'debuff'], animTags: ['hit'],
  },
  // CUSTOM vy-15: draw 2 cards; those drawn cards get -1 cost this turn.
  {
    id: 'vy-15', characterId: 'vy', name: 'Cười Và Vẫy Tay',
    cost: 4, baseCost: 4, types: ['support'], keywords: ['betray', 'support'],
    description: 'Rút 2 lá, giảm cost chúng 1 trong lượt, giảm 1 Quan hệ.',
    targetType: 'none',
    effects: [
      { op: 'custom', id: 'vy-15' },
      { op: 'rel', delta: -1 },
    ],
    aiTags: ['draw', 'economy', 'relationship'], animTags: ['glow'],
  },
  {
    id: 'vy-16', characterId: 'vy', name: 'Xoáy Dao',
    cost: 5, baseCost: 5, types: ['attack'], keywords: ['betray', 'attack', 'bleed'],
    description: 'Gây 12 sát thương và kích hoạt Chảy máu một lần không giảm stack.',
    targetType: 'enemy',
    effects: [
      { op: 'damage', value: 12 },
      { op: 'triggerBleed', reduceStacks: false },
    ],
    aiTags: ['damage', 'bleed', 'burst'], animTags: ['slash', 'blood'],
  },
  {
    id: 'vy-17', characterId: 'vy', name: 'Không Ai Nhìn Thấy',
    cost: 5, baseCost: 5, types: ['attack'], keywords: ['betray', 'attack'],
    description: 'Gây 12 sát thương; trong Betrayal gây 20.',
    targetType: 'enemy',
    effects: [{ op: 'if', cond: { kind: 'betrayal' }, then: [{ op: 'damage', value: 20 }], else: [{ op: 'damage', value: 12 }] }],
    aiTags: ['damage', 'burst'], animTags: ['slash', 'blood'],
  },
  {
    id: 'vy-18', characterId: 'vy', name: 'Đốt Cầu',
    cost: 6, baseCost: 6, types: ['attack'], keywords: ['betray', 'attack', 'exhaust'],
    description: 'Gây 20 sát thương, đặt Quan hệ -5, bỏ toàn bộ lá Friend trên tay. Tiêu hao.',
    targetType: 'enemy', exhaust: true,
    effects: [
      { op: 'damage', value: 20 },
      { op: 'rel', set: -5 },
      { op: 'discardFriendCards' },
    ],
    aiTags: ['damage', 'burst', 'relationship'], animTags: ['slash', 'blood', 'glitch'],
  },
  {
    id: 'vy-19', characterId: 'vy', name: 'Ngộ Thương',
    cost: 6, baseCost: 6, types: ['attack'], keywords: ['betray', 'attack'],
    description: 'Gây 16 sát thương; nếu lá trước thuộc đồng minh, thêm 8 nhưng bỏ ngẫu nhiên một lá đồng minh.',
    targetType: 'enemy',
    effects: [
      {
        op: 'if', cond: { kind: 'prevCardAlly' },
        then: [{ op: 'damage', value: 24 }, { op: 'discardRandom', count: 1, filterCharId: 'ally' }],
        else: [{ op: 'damage', value: 16 }],
      },
    ],
    aiTags: ['damage', 'burst', 'combo'], animTags: ['slash', 'blood'],
  },
  {
    id: 'vy-20', characterId: 'vy', name: 'Pha Phản Bội Hoàn Hảo',
    cost: 7, baseCost: 7, types: ['attack'], keywords: ['betray', 'attack'],
    description: 'Gây 28 sát thương, sau đó đưa Quan hệ về 0.',
    targetType: 'enemy',
    effects: [
      { op: 'damage', value: 28 },
      { op: 'rel', set: 0 },
    ],
    aiTags: ['damage', 'finisher'], animTags: ['slash', 'blood'],
  },
  {
    id: 'vy-21', characterId: 'vy', name: 'Nữ Hoàng Dối Trá',
    cost: 7, baseCost: 7, types: ['attack'], keywords: ['betray', 'attack', 'weak', 'expose'],
    description: 'Gây 18 sát thương, giảm 2 Quan hệ, gây Yếu và Lộ sơ hở trong hai lượt.',
    targetType: 'enemy',
    effects: [
      { op: 'damage', value: 18 },
      { op: 'rel', delta: -2 },
      { op: 'status', status: 'weak', turns: 2, target: 'enemyTeam' },
      { op: 'status', status: 'expose', turns: 2, target: 'enemyTeam' },
    ],
    aiTags: ['damage', 'debuff', 'finisher'], animTags: ['slash', 'glitch'],
  },
];
