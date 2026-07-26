import type { CardDef } from '../../engine/types';

// MIÊN — THE DOUBLE FACE. Chaos hai mặt: mọi lá dùng faces (Trắng/Đen).
// Trắng = hồi/Giáp/Friendship; Đen = sát thương/Chảy máu/Betrayal.
// Card ids follow spec order: mien-01 .. mien-21.

export const mienCards: CardDef[] = [
  {
    id: 'mien-01', characterId: 'mien', name: 'Đổi Nụ Cười',
    cost: 0, baseCost: 0, types: ['heal', 'attack'], keywords: ['twoFaced', 'flip', 'heal', 'attack'],
    description: 'Trắng hồi 1 rồi Lật; Đen gây 2 rồi Lật.',
    targetType: 'enemy',
    faces: {
      white: [{ op: 'heal', value: 1 }, { op: 'flipFace' }],
      black: [{ op: 'damage', value: 2 }, { op: 'flipFace' }],
    },
    aiTags: ['heal', 'damage'], animTags: ['glow', 'hit', 'flip'],
  },
  {
    id: 'mien-02', characterId: 'mien', name: 'Một Thoáng Dịu Dàng',
    cost: 0, baseCost: 0, types: ['defense', 'attack'], keywords: ['twoFaced', 'defense', 'attack'],
    description: 'Trắng nhận 3 Giáp; Đen gây 3.',
    targetType: 'enemy',
    faces: {
      white: [{ op: 'block', value: 3 }],
      black: [{ op: 'damage', value: 3 }],
    },
    aiTags: ['defense', 'damage'], animTags: ['shield', 'hit'],
  },
  {
    id: 'mien-03', characterId: 'mien', name: 'Đồng Xu Nứt',
    cost: 0, baseCost: 0, types: ['support', 'attack'], keywords: ['twoFaced', 'support', 'attack', 'bleed'],
    description: 'Trắng ngẫu nhiên rút 1 hoặc nhận giảm cost 1 tạm thời; Đen ngẫu nhiên gây 4 hoặc Chảy máu 3.',
    targetType: 'enemy',
    faces: {
      white: [{
        op: 'random',
        options: [
          { effects: [{ op: 'draw', count: 1 }] },
          { effects: [{ op: 'modifier', target: 'ownTeam', mod: { kind: 'costDelta', amount: -1, uses: 1 } }] },
        ],
      }],
      black: [{
        op: 'random',
        options: [
          { effects: [{ op: 'damage', value: 4 }] },
          { effects: [{ op: 'bleed', stacks: 3 }] },
        ],
      }],
    },
    aiTags: ['draw', 'economy', 'damage', 'bleed'], animTags: ['glow', 'hit'],
  },
  {
    id: 'mien-04', characterId: 'mien', name: 'Nắm Tay',
    cost: 1, baseCost: 1, types: ['heal', 'attack'], keywords: ['twoFaced', 'friend', 'betray', 'heal', 'attack'],
    description: 'Trắng hồi 4, tăng 1 Quan hệ; Đen gây 5, giảm 1 Quan hệ.',
    targetType: 'enemy',
    faces: {
      white: [{ op: 'heal', value: 4 }, { op: 'rel', delta: 1 }],
      black: [{ op: 'damage', value: 5 }, { op: 'rel', delta: -1 }],
    },
    aiTags: ['heal', 'damage', 'relationship'], animTags: ['glow', 'hit'],
  },
  {
    id: 'mien-05', characterId: 'mien', name: 'Đừng Sợ',
    cost: 1, baseCost: 1, types: ['defense', 'support'], keywords: ['twoFaced', 'defense', 'weak'],
    description: 'Trắng nhận 6 Giáp; Đen gây Yếu lượt sau.',
    targetType: 'none',
    faces: {
      white: [{ op: 'block', value: 6 }],
      black: [{ op: 'status', status: 'weak', turns: 1, target: 'enemyTeam' }],
    },
    aiTags: ['defense', 'debuff'], animTags: ['shield', 'glitch'],
  },
  {
    id: 'mien-06', characterId: 'mien', name: 'Cười Đúng Lúc',
    cost: 1, baseCost: 1, types: ['support'], keywords: ['twoFaced', 'support'],
    description: 'Trắng rút 1; Đen lá tấn công tiếp theo thêm 4.',
    targetType: 'none',
    faces: {
      white: [{ op: 'draw', count: 1 }],
      black: [{ op: 'modifier', target: 'ownTeam', mod: { kind: 'damageBonus', amount: 4, uses: 1, filter: { cardType: 'attack' } } }],
    },
    aiTags: ['draw', 'setup'], animTags: ['glow'],
  },
  {
    id: 'mien-07', characterId: 'mien', name: 'Mặt Nạ Dịu Dàng',
    cost: 2, baseCost: 2, types: ['heal', 'attack'], keywords: ['twoFaced', 'flip', 'heal', 'attack'],
    description: 'Trắng hồi 5 rồi Lật; Đen gây 7 rồi Lật.',
    targetType: 'enemy',
    faces: {
      white: [{ op: 'heal', value: 5 }, { op: 'flipFace' }],
      black: [{ op: 'damage', value: 7 }, { op: 'flipFace' }],
    },
    aiTags: ['heal', 'damage'], animTags: ['glow', 'hit', 'flip'],
  },
  {
    id: 'mien-08', characterId: 'mien', name: 'Lời Nói Hai Nghĩa',
    cost: 2, baseCost: 2, types: ['support'], keywords: ['twoFaced', 'friend', 'betray', 'support'],
    description: 'Trắng tăng 2 Quan hệ; Đen giảm 2.',
    targetType: 'none',
    faces: {
      white: [{ op: 'rel', delta: 2 }],
      black: [{ op: 'rel', delta: -2 }],
    },
    aiTags: ['relationship'], animTags: ['glow', 'glitch'],
  },
  {
    // Trắng "chuyển debuff đồng minh sang Miên": đội chung HP nên map thành xóa debuff của đội.
    id: 'mien-09', characterId: 'mien', name: 'Đổi Vai',
    cost: 2, baseCost: 2, types: ['support'], keywords: ['twoFaced', 'support', 'expose'],
    description: 'Trắng chuyển một debuff đồng minh sang Miên; Đen chuyển một buff đối thủ thành Lộ sơ hở.',
    targetType: 'none',
    faces: {
      white: [{ op: 'cleanse', what: 'debuff', from: 'ownTeam' }],
      black: [
        { op: 'cleanse', what: 'buff', from: 'enemyTeam' },
        { op: 'status', status: 'expose', turns: 1, target: 'enemyTeam' },
      ],
    },
    aiTags: ['dispel', 'debuff'], animTags: ['glow', 'glitch'],
  },
  {
    id: 'mien-10', characterId: 'mien', name: 'Ôm Chặt',
    cost: 3, baseCost: 3, types: ['heal', 'defense', 'attack'], keywords: ['twoFaced', 'heal', 'defense', 'attack', 'bleed'],
    description: 'Trắng hồi 7, nhận 7 Giáp; Đen gây 10, Chảy máu 3.',
    targetType: 'enemy',
    faces: {
      white: [{ op: 'heal', value: 7 }, { op: 'block', value: 7 }],
      black: [{ op: 'damage', value: 10 }, { op: 'bleed', stacks: 3 }],
    },
    aiTags: ['heal', 'defense', 'damage', 'bleed'], animTags: ['glow', 'shield', 'hit', 'blood'],
  },
  {
    id: 'mien-11', characterId: 'mien', name: 'Thì Thầm',
    cost: 3, baseCost: 3, types: ['support'], keywords: ['twoFaced', 'support'],
    description: 'Trắng lá Friend tiếp theo giảm 1; Đen lá Betray tiếp theo thêm 5 sát thương.',
    targetType: 'none',
    faces: {
      white: [{ op: 'modifier', target: 'ownTeam', mod: { kind: 'costDelta', amount: -1, uses: 1, filter: { keyword: 'friend' } } }],
      black: [{ op: 'modifier', target: 'ownTeam', mod: { kind: 'damageBonus', amount: 5, uses: 1, filter: { keyword: 'betray' } } }],
    },
    aiTags: ['setup', 'economy'], animTags: ['glow'],
  },
  {
    id: 'mien-12', characterId: 'mien', name: 'Không Phải Tao',
    cost: 3, baseCost: 3, types: ['support', 'attack'], keywords: ['twoFaced', 'flip', 'support', 'attack'],
    description: 'Trắng xóa debuff rồi Lật; Đen phá tối đa 8 Giáp rồi Lật.',
    targetType: 'enemy',
    faces: {
      white: [{ op: 'cleanse', what: 'debuff', from: 'ownTeam' }, { op: 'flipFace' }],
      black: [{ op: 'damage', value: 0, breakBlockFirst: 8 }, { op: 'flipFace' }],
    },
    aiTags: ['dispel', 'damage', 'setup'], animTags: ['glitch', 'hit', 'flip'],
  },
  {
    id: 'mien-13', characterId: 'mien', name: 'Món Quà Có Dao',
    cost: 4, baseCost: 4, types: ['heal', 'attack'], keywords: ['twoFaced', 'heal', 'attack'],
    description: 'Trắng hồi 8, đồng minh rút 1; Đen gây 13, nếu có Giáp thêm 5.',
    targetType: 'enemy',
    faces: {
      white: [{ op: 'heal', value: 8 }, { op: 'draw', count: 1 }],
      black: [{ op: 'if', cond: { kind: 'targetHasBlock' }, then: [{ op: 'damage', value: 18 }], else: [{ op: 'damage', value: 13 }] }],
    },
    aiTags: ['heal', 'damage', 'burst'], animTags: ['glow', 'hit'],
  },
  {
    id: 'mien-14', characterId: 'mien', name: 'Yêu Hay Ghét',
    cost: 4, baseCost: 4, types: ['defense', 'attack', 'support'], keywords: ['twoFaced', 'friend', 'betray', 'defense', 'attack', 'support'],
    description: 'Trắng tăng 2 Quan hệ, nhận 10 Giáp; Đen giảm 2 Quan hệ, gây 12.',
    targetType: 'enemy',
    faces: {
      white: [{ op: 'rel', delta: 2 }, { op: 'block', value: 10 }],
      black: [{ op: 'rel', delta: -2 }, { op: 'damage', value: 12 }],
    },
    aiTags: ['defense', 'damage', 'relationship'], animTags: ['shield', 'hit', 'glow'],
  },
  {
    // CUSTOM mien-15 (mặt Trắng): nhận Giáp bằng 50% Giáp hiện tại của đội mình.
    id: 'mien-15', characterId: 'mien', name: 'Gương Vỡ',
    cost: 4, baseCost: 4, types: ['defense', 'attack'], keywords: ['twoFaced', 'defense', 'attack'],
    description: 'Trắng sao chép 50% Giáp đồng minh; Đen gây sát thương bằng 50% Giáp đối thủ, tối đa 14.',
    targetType: 'enemy',
    faces: {
      white: [{ op: 'custom', id: 'mien-15' }],
      black: [{ op: 'damage', percentOfEnemyBlock: 50, maxTotal: 14 }],
    },
    aiTags: ['defense', 'damage'], animTags: ['shield', 'hit', 'glitch'],
  },
  {
    id: 'mien-16', characterId: 'mien', name: 'Nụ Hôn Giả Tạo',
    cost: 5, baseCost: 5, types: ['heal', 'attack'], keywords: ['twoFaced', 'flip', 'heal', 'attack'],
    description: 'Trắng hồi 12 rồi Lật; Đen gây 16 rồi Lật.',
    targetType: 'enemy',
    faces: {
      white: [{ op: 'heal', value: 12 }, { op: 'flipFace' }],
      black: [{ op: 'damage', value: 16 }, { op: 'flipFace' }],
    },
    aiTags: ['heal', 'damage', 'burst'], animTags: ['glow', 'hit', 'flip'],
  },
  {
    // CUSTOM mien-17 (cả hai mặt): kích hoạt lại hiệu ứng CÙNG MẶT của lá Hai Mặt được chơi gần nhất.
    id: 'mien-17', characterId: 'mien', name: 'Cùng Một Cơ Thể',
    cost: 5, baseCost: 5, types: ['support'], keywords: ['twoFaced', 'support'],
    description: 'Kích hoạt lại hiệu ứng cùng mặt của lá Hai Mặt gần nhất.',
    targetType: 'none',
    faces: {
      white: [{ op: 'custom', id: 'mien-17' }],
      black: [{ op: 'custom', id: 'mien-17' }],
    },
    aiTags: ['combo', 'copy'], animTags: ['glitch', 'glow'],
  },
  {
    id: 'mien-18', characterId: 'mien', name: 'Người Tốt Cuối Cùng',
    cost: 6, baseCost: 6, types: ['heal', 'defense', 'support'], keywords: ['twoFaced', 'flip', 'friend', 'heal', 'defense', 'support'],
    description: 'Trắng hồi 15, tạo 12 Giáp, đặt Quan hệ tối thiểu +3; Đen không hiệu ứng rồi Lật.',
    targetType: 'none',
    faces: {
      white: [{ op: 'heal', value: 15 }, { op: 'block', value: 12 }, { op: 'rel', atLeast: 3 }],
      black: [{ op: 'flipFace' }],
    },
    aiTags: ['heal', 'defense', 'relationship', 'emergency'], animTags: ['glow', 'shield', 'flip'],
  },
  {
    id: 'mien-19', characterId: 'mien', name: 'Con Quỷ Thật Sự',
    cost: 6, baseCost: 6, types: ['attack'], keywords: ['twoFaced', 'flip', 'betray', 'attack', 'bleed'],
    description: 'Trắng không hiệu ứng rồi Lật; Đen gây 22, Chảy máu 5, đặt Quan hệ tối đa -3.',
    targetType: 'enemy',
    faces: {
      white: [{ op: 'flipFace' }],
      black: [{ op: 'damage', value: 22 }, { op: 'bleed', stacks: 5 }, { op: 'rel', atMost: -3 }],
    },
    aiTags: ['damage', 'burst', 'bleed', 'finisher'], animTags: ['hit', 'blood', 'flip'],
  },
  {
    id: 'mien-20', characterId: 'mien', name: 'Tao Yêu Tất Cả',
    cost: 7, baseCost: 7, types: ['heal', 'defense', 'support'], keywords: ['twoFaced', 'flip', 'friend', 'heal', 'defense', 'support'],
    description: 'Trắng hồi 14, nhận 14 Giáp, tăng 2 Quan hệ, rút 1; Đen đội mất 8 HP rồi Lật.',
    targetType: 'none',
    faces: {
      white: [{ op: 'heal', value: 14 }, { op: 'block', value: 14 }, { op: 'rel', delta: 2 }, { op: 'draw', count: 1 }],
      black: [{ op: 'loseHp', value: 8 }, { op: 'flipFace' }],
    },
    aiTags: ['heal', 'defense', 'relationship', 'draw'], animTags: ['glow', 'shield', 'flip'],
  },
  {
    id: 'mien-21', characterId: 'mien', name: 'Tao Ghét Tất Cả',
    cost: 7, baseCost: 7, types: ['attack'], keywords: ['twoFaced', 'flip', 'betray', 'attack', 'expose'],
    description: 'Trắng hồi đối thủ 5 rồi Lật; Đen gây 26, giảm 2 Quan hệ, gây Lộ sơ hở.',
    targetType: 'enemy',
    faces: {
      white: [{ op: 'healEnemy', value: 5 }, { op: 'flipFace' }],
      black: [{ op: 'damage', value: 26 }, { op: 'rel', delta: -2 }, { op: 'status', status: 'expose', turns: 1, target: 'enemyTeam' }],
    },
    aiTags: ['damage', 'finisher', 'burst', 'debuff'], animTags: ['hit', 'blood', 'flip', 'glitch'],
  },
];
