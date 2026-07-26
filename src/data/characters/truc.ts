import type { CardDef } from '../../engine/types';

// TRÚC — THE BULLY. Ép đồng minh làm bia thịt, Taunt, hồi máu qua đòn chuyển hướng, Làm Nhục.
// Card ids follow spec order: truc-01 .. truc-21.

export const trucCards: CardDef[] = [
  {
    id: 'truc-01', characterId: 'truc', name: 'Ra Đứng Trước',
    cost: 0, baseCost: 0, types: ['support', 'heal'], keywords: ['bully', 'taunt', 'heal'],
    description: 'Đồng minh Taunt 60%, Trúc hồi 1.',
    targetType: 'ally',
    effects: [
      { op: 'status', status: 'taunt', percent: 60, turns: 1, target: 'ally' },
      { op: 'heal', value: 1 },
    ],
    aiTags: ['taunt', 'heal', 'setup'], animTags: ['glow'],
  },
  {
    id: 'truc-02', characterId: 'truc', name: 'Câm Mồm',
    cost: 0, baseCost: 0, types: ['support'], keywords: ['bully', 'support'],
    description: 'Xóa một hiệu ứng Friend; lá Bully tiếp theo thêm 2 sát thương.',
    targetType: 'none',
    effects: [
      { op: 'cleanse', what: 'buff', from: 'enemyTeam' },
      { op: 'modifier', target: 'ownTeam', mod: { kind: 'damageBonus', amount: 2, uses: 1, filter: { keyword: 'bully' } } },
    ],
    aiTags: ['dispel', 'setup'], animTags: ['glow'],
  },
  {
    id: 'truc-03', characterId: 'truc', name: 'Tát Cảnh Cáo',
    cost: 0, baseCost: 0, types: ['attack'], keywords: ['bully', 'attack'],
    description: 'Gây 2; nếu mục tiêu Lộ sơ hở, gây 5.',
    targetType: 'enemy',
    effects: [
      { op: 'if', cond: { kind: 'targetExposed' }, then: [{ op: 'damage', value: 5 }], else: [{ op: 'damage', value: 2 }] },
    ],
    aiTags: ['damage'], animTags: ['hit'],
  },
  {
    id: 'truc-04', characterId: 'truc', name: 'Làm Bia Cho Tao',
    cost: 1, baseCost: 1, types: ['defense', 'support'], keywords: ['bully', 'defense', 'taunt'],
    description: 'Đồng minh nhận 4 Giáp, Taunt 70%.',
    targetType: 'ally',
    effects: [
      { op: 'block', value: 4, target: 'ally' },
      { op: 'status', status: 'taunt', percent: 70, turns: 1, target: 'ally' },
    ],
    aiTags: ['defense', 'taunt'], animTags: ['shield'],
  },
  {
    id: 'truc-05', characterId: 'truc', name: 'Đập Mặt Vào Tường',
    cost: 1, baseCost: 1, types: ['attack'], keywords: ['bully', 'attack'],
    description: 'Gây 6; nếu có Giáp, phá thêm 3.',
    targetType: 'enemy',
    effects: [{ op: 'damage', value: 6, bonusBreakIfBlock: 3 }],
    aiTags: ['damage'], animTags: ['hit'],
  },
  {
    id: 'truc-06', characterId: 'truc', name: 'Đừng Có Giả Chết',
    cost: 1, baseCost: 1, types: ['heal'], keywords: ['bully', 'heal'],
    description: 'Hồi 4; nếu HP dưới 20, hồi 7 và giảm 1 Quan hệ.',
    targetType: 'none',
    effects: [
      { op: 'if', cond: { kind: 'hpAtMost', value: 19 }, then: [{ op: 'heal', value: 7 }, { op: 'rel', delta: -1 }], else: [{ op: 'heal', value: 4 }] },
    ],
    aiTags: ['heal', 'emergency'], animTags: ['glow'],
  },
  // CUSTOM (flag 'truc-07'): first time the taunting ally is hit this effect's window, team heals 3.
  {
    id: 'truc-07', characterId: 'truc', name: 'Đẩy Ra Chịu Đòn',
    cost: 2, baseCost: 2, types: ['defense', 'support'], keywords: ['bully', 'defense', 'taunt'],
    description: 'Đồng minh nhận 7 Giáp, Taunt 90%; sau lần bị đánh đầu hồi 3.',
    targetType: 'ally',
    effects: [
      { op: 'block', value: 7, target: 'ally' },
      { op: 'status', status: 'taunt', percent: 90, turns: 1, target: 'ally' },
      { op: 'modifier', target: 'ownTeam', mod: { kind: 'flag', id: 'truc-07', uses: 1, turns: 1 } },
    ],
    aiTags: ['defense', 'taunt', 'setup'], animTags: ['shield'],
  },
  {
    id: 'truc-08', characterId: 'truc', name: 'Bẻ Ngón Tay',
    cost: 2, baseCost: 2, types: ['attack'], keywords: ['bully', 'attack'],
    description: 'Gây 7; lá tấn công tiếp theo của đối thủ giảm 3 sát thương.',
    targetType: 'enemy',
    effects: [
      { op: 'damage', value: 7 },
      { op: 'modifier', target: 'ownTeam', mod: { kind: 'incomingDamageReduction', amount: 3, uses: 1, turns: 2 } },
    ],
    aiTags: ['damage', 'defense'], animTags: ['hit'],
  },
  {
    id: 'truc-09', characterId: 'truc', name: 'Liếm Máu Đi',
    cost: 2, baseCost: 2, types: ['heal'], keywords: ['bully', 'heal'],
    description: 'Hồi 6; nếu đồng minh mất HP lượt trước, rút 1.',
    targetType: 'none',
    effects: [
      { op: 'heal', value: 6 },
      { op: 'if', cond: { kind: 'allyLostHpLastTurn' }, then: [{ op: 'draw', count: 1 }] },
    ],
    aiTags: ['heal', 'draw'], animTags: ['glow', 'blood'],
  },
  {
    id: 'truc-10', characterId: 'truc', name: 'Quỳ Xuống',
    cost: 3, baseCost: 3, types: ['attack'], keywords: ['bully', 'attack', 'expose'],
    description: 'Gây 9, gây Lộ sơ hở; trong Betrayal thêm 4 và thêm 1 Làm Nhục.',
    targetType: 'enemy',
    effects: [
      {
        op: 'if', cond: { kind: 'betrayal' },
        then: [
          { op: 'damage', value: 13 },
          { op: 'status', status: 'expose', turns: 1, target: 'enemyTeam' },
          { op: 'status', status: 'humiliate', stacks: 1, target: 'enemyTeam' },
        ],
        else: [
          { op: 'damage', value: 9 },
          { op: 'status', status: 'expose', turns: 1, target: 'enemyTeam' },
        ],
      },
    ],
    aiTags: ['damage', 'debuff'], animTags: ['hit'],
  },
  // CUSTOM (flag 'truc-11'): after the next redirected hit on the ally, heal 50% of the HP lost by that hit (max 8).
  {
    id: 'truc-11', characterId: 'truc', name: 'Chịu Cho Quen',
    cost: 3, baseCost: 3, types: ['support', 'heal'], keywords: ['bully', 'taunt', 'heal'],
    description: 'Đồng minh Taunt 100% cho lá tiếp theo; sau đòn hồi 50% HP mất, tối đa 8.',
    targetType: 'ally',
    effects: [
      { op: 'status', status: 'taunt', percent: 100, uses: 1, turns: 1, target: 'ally' },
      { op: 'modifier', target: 'ownTeam', mod: { kind: 'flag', id: 'truc-11', uses: 1, turns: 1 } },
    ],
    aiTags: ['taunt', 'heal', 'setup'], animTags: ['shield', 'glow'],
  },
  {
    id: 'truc-12', characterId: 'truc', name: 'Tao Đang Nói Chuyện',
    cost: 3, baseCost: 3, types: ['attack'], keywords: ['bully', 'attack'],
    description: 'Gây 8; lượt sau đối thủ không thể tạo quá 8 Giáp bằng một lá; thêm 2 Làm Nhục.',
    targetType: 'enemy',
    effects: [
      { op: 'damage', value: 8 },
      { op: 'modifier', target: 'enemyTeam', mod: { kind: 'blockGainCapPerCard', amount: 8, turns: 1 } },
      { op: 'status', status: 'humiliate', stacks: 2, target: 'enemyTeam' },
    ],
    aiTags: ['damage', 'debuff'], animTags: ['hit'],
  },
  {
    id: 'truc-13', characterId: 'truc', name: 'Đạp Xuống Đất',
    cost: 4, baseCost: 4, types: ['attack'], keywords: ['bully', 'attack'],
    description: 'Gây 13; nếu mục tiêu Yếu, thêm 6; nếu có ít nhất 3 Làm Nhục, thêm 5.',
    targetType: 'enemy',
    effects: [
      {
        op: 'if', cond: { kind: 'targetWeak' },
        then: [
          { op: 'if', cond: { kind: 'humiliateAtLeast', value: 3 }, then: [{ op: 'damage', value: 24 }], else: [{ op: 'damage', value: 19 }] },
        ],
        else: [
          { op: 'if', cond: { kind: 'humiliateAtLeast', value: 3 }, then: [{ op: 'damage', value: 18 }], else: [{ op: 'damage', value: 13 }] },
        ],
      },
    ],
    aiTags: ['damage', 'burst'], animTags: ['hit'],
  },
  {
    id: 'truc-14', characterId: 'truc', name: 'Cấm Mày Gục',
    cost: 4, baseCost: 4, types: ['heal', 'support'], keywords: ['bully', 'heal', 'taunt', 'counter'],
    description: 'Hồi 10; đồng minh Taunt 60%, Phản đòn 5.',
    targetType: 'ally',
    effects: [
      { op: 'heal', value: 10 },
      { op: 'status', status: 'taunt', percent: 60, turns: 1, target: 'ally' },
      { op: 'status', status: 'counter', stacks: 5, turns: 1, target: 'ally' },
    ],
    aiTags: ['heal', 'taunt', 'setup'], animTags: ['glow', 'shield'],
  },
  {
    id: 'truc-15', characterId: 'truc', name: 'Đánh Nó Thay Tao',
    cost: 4, baseCost: 4, types: ['defense', 'support'], keywords: ['bully', 'defense', 'taunt'],
    description: 'Đồng minh nhận 12 Giáp; hai lá tiếp theo có 80% chuyển sang họ.',
    targetType: 'ally',
    effects: [
      { op: 'block', value: 12, target: 'ally' },
      { op: 'status', status: 'taunt', percent: 80, uses: 2, turns: 1, target: 'ally' },
    ],
    aiTags: ['defense', 'taunt'], animTags: ['shield'],
  },
  // CUSTOM (flag 'truc-16'): each time the ally is hit by an attack card this turn, deal 5 to the attacker team.
  {
    id: 'truc-16', characterId: 'truc', name: 'Vật Sở Hữu Của Tao',
    cost: 5, baseCost: 5, types: ['defense', 'support'], keywords: ['bully', 'defense', 'taunt'],
    description: 'Đồng minh nhận 16 Giáp, Taunt 100%; mỗi lần bị đánh Trúc gây lại 5.',
    targetType: 'ally',
    effects: [
      { op: 'block', value: 16, target: 'ally' },
      { op: 'status', status: 'taunt', percent: 100, turns: 1, target: 'ally' },
      { op: 'modifier', target: 'ownTeam', mod: { kind: 'flag', id: 'truc-16', turns: 1 } },
    ],
    aiTags: ['defense', 'taunt', 'damage'], animTags: ['shield', 'hit'],
  },
  {
    id: 'truc-17', characterId: 'truc', name: 'Đánh Đến Khi Biết Điều',
    cost: 5, baseCost: 5, types: ['attack'], keywords: ['bully', 'attack'],
    description: 'Gây 5 ba lần; đòn cuối thêm 5 nếu Giáp đã vỡ.',
    targetType: 'enemy',
    effects: [
      { op: 'damage', value: 5, hits: 2 },
      { op: 'if', cond: { kind: 'enemyBlockBroken' }, then: [{ op: 'damage', value: 10 }], else: [{ op: 'damage', value: 5 }] },
    ],
    aiTags: ['damage', 'burst'], animTags: ['hit'],
  },
  // CUSTOM (flag 'truc-18'): each attack redirected to the taunting ally heals the team 4.
  {
    id: 'truc-18', characterId: 'truc', name: 'Lôi Nó Ra Giữa Sân',
    cost: 6, baseCost: 6, types: ['defense', 'support'], keywords: ['bully', 'defense', 'taunt'],
    description: 'Đồng minh nhận 20 Giáp, Taunt 100% cả lượt; mỗi lá chuyển hướng hồi 4.',
    targetType: 'ally',
    effects: [
      { op: 'block', value: 20, target: 'ally' },
      { op: 'status', status: 'taunt', percent: 100, turns: 1, target: 'ally' },
      { op: 'modifier', target: 'ownTeam', mod: { kind: 'flag', id: 'truc-18', turns: 1 } },
    ],
    aiTags: ['defense', 'taunt', 'heal'], animTags: ['shield', 'glow'],
  },
  {
    id: 'truc-19', characterId: 'truc', name: 'Dẫm Nát Lòng Tự Trọng',
    cost: 6, baseCost: 6, types: ['attack'], keywords: ['bully', 'attack', 'weak'],
    description: 'Gây 20, giảm 2 Quan hệ, Yếu hai lượt, thêm 3 Làm Nhục.',
    targetType: 'enemy',
    effects: [
      { op: 'damage', value: 20 },
      { op: 'rel', delta: -2 },
      { op: 'status', status: 'weak', turns: 2, target: 'enemyTeam' },
      { op: 'status', status: 'humiliate', stacks: 3, target: 'enemyTeam' },
    ],
    aiTags: ['damage', 'debuff', 'burst'], animTags: ['hit', 'blood'],
  },
  // CUSTOM (flag 'truc-20'): each time the ally is hit while this is active (2 turns), team gains 2 block and heals 3.
  {
    id: 'truc-20', characterId: 'truc', name: 'Bao Cát Biết Đi',
    cost: 7, baseCost: 7, types: ['defense', 'support'], keywords: ['bully', 'defense', 'taunt', 'exhaust'],
    description: 'Đồng minh nhận 25 Giáp, Taunt 100% hai lượt; mỗi lần bị đánh thêm 2 Giáp và hồi 3. Tiêu hao.',
    targetType: 'ally', exhaust: true,
    effects: [
      { op: 'block', value: 25, target: 'ally' },
      { op: 'status', status: 'taunt', percent: 100, turns: 2, target: 'ally' },
      { op: 'modifier', target: 'ownTeam', mod: { kind: 'flag', id: 'truc-20', turns: 2 } },
    ],
    aiTags: ['defense', 'taunt', 'heal'], animTags: ['shield', 'glow'],
  },
  {
    id: 'truc-21', characterId: 'truc', name: 'Tao Mới Là Kẻ Được Quyền Đánh Nó',
    cost: 7, baseCost: 7, types: ['attack', 'heal', 'support'], keywords: ['bully', 'attack', 'heal', 'taunt'],
    description: 'Gây 24; hồi đồng minh 12 và Taunt 100% cho đòn tiếp theo.',
    targetType: 'enemy',
    effects: [
      { op: 'damage', value: 24 },
      { op: 'heal', value: 12 },
      { op: 'status', status: 'taunt', percent: 100, uses: 1, turns: 1, target: 'ally' },
    ],
    aiTags: ['damage', 'finisher', 'heal', 'taunt'], animTags: ['hit', 'glow'],
  },
];
