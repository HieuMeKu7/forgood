import type { CharacterDef } from '../engine/types';

export const CHARACTERS: Record<string, CharacterDef> = {
  an: {
    id: 'an', name: 'An', title: 'THE HEART', role: 'Hồi phục, bảo vệ, Friendship.',
    description: 'Đứa bạn luôn đứng về phía cậu — kể cả khi cả thế giới quay lưng. Vấn đề là: nó tin cậu đến mức nguy hiểm.',
    colors: { primary: '#e8a13c', accent: '#ffd9a0' },
    passive: {
      id: 'an-passive', name: 'Có Tớ Đây',
      description: 'Lá Friend đầu tiên mỗi lượt tạo thêm 2 Giáp. Trong Friendship, tạo thêm 3 Giáp thay vì 2.',
    },
    ultimate: {
      id: 'an-ult', characterId: 'an', name: 'Không Bao Giờ Bỏ Cậu',
      description: 'Hồi 12 HP. Nhận 12 Giáp. Tăng 2 Quan hệ. Trong hai lượt, lá Friend đầu tiên mỗi lượt giảm 1 Mana.',
      charge: 20, targetType: 'none',
      effects: [
        { op: 'heal', value: 12 },
        { op: 'block', value: 12 },
        { op: 'rel', delta: 2 },
        { op: 'modifier', target: 'ownTeam', mod: { kind: 'friendCardDiscount', amount: -1, turns: 2, id: 'an-ult-discount' } },
      ],
      aiTags: ['heal', 'defense', 'relationship'],
    },
  },
  vy: {
    id: 'vy', name: 'Vy', title: 'THE KNIFE', role: 'Burst damage, Chảy máu, Betrayal.',
    description: 'Nụ cười ngọt nhất trong phòng. Con dao sắc nhất cũng vậy. Đừng bao giờ quay lưng lại với nó.',
    colors: { primary: '#c3243c', accent: '#ff5c72' },
    passive: {
      id: 'vy-passive', name: 'Nụ Cười Giả Tạo',
      description: 'Lá Betray đầu tiên mỗi lượt gây thêm 2 sát thương. Trong Betrayal, thêm 4 thay vì 2.',
    },
    ultimate: {
      id: 'vy-ult', characterId: 'vy', name: 'Không Còn Nhân Chứng',
      description: 'Gây 16 sát thương. Thêm 3 sát thương cho mỗi điểm Quan hệ âm. Kích hoạt toàn bộ Chảy máu ngay lập tức. Đưa Quan hệ về 0.',
      charge: 21, targetType: 'enemy',
      customId: 'ult-vy',
      aiTags: ['burst', 'finisher'],
    },
  },
  moc: {
    id: 'moc', name: 'Mộc', title: 'THE JOKER', role: 'Chaos, bài 0 Mana, thay đổi cost.',
    description: 'Không ai biết Mộc đang đùa hay đang nói thật. Kể cả Mộc. Luật chơi chỉ là gợi ý.',
    colors: { primary: '#8b3fd9', accent: '#c99aff' },
    passive: {
      id: 'moc-passive', name: 'Ba Trò Là Đủ',
      description: 'Mỗi lá 0 Mana cho 1 điểm Trò. Đủ 3 điểm: xóa điểm, nhận 1 Mana và rút 1 lá.',
    },
    ultimate: {
      id: 'moc-ult', characterId: 'moc', name: 'Luật Là Do Tôi Viết',
      description: 'Rút đến 7 lá. Tất cả lá trên tay thành 0 Mana trong lượt. Sau khi dùng thêm 4 lá, kết thúc lượt.',
      charge: 18, targetType: 'none',
      customId: 'ult-moc',
      aiTags: ['combo', 'draw'],
    },
  },
  khoi: {
    id: 'khoi', name: 'Khôi', title: 'THE SHIELD', role: 'Tank, Giáp, phản đòn.',
    description: 'Bức tường biết đi. Khôi không né đòn — Khôi đứng đó và để cậu tự hỏi tay mình có gãy không.',
    colors: { primary: '#2e6fb8', accent: '#7db4e8' },
    passive: {
      id: 'khoi-passive', name: 'Tường Thành',
      description: 'Lần đầu nhận Giáp mỗi lượt, thêm 3. Nếu HP không quá 20, thêm 5 thay vì 3.',
    },
    ultimate: {
      id: 'khoi-ult', characterId: 'khoi', name: 'Lời Thề Không Thể Phá',
      description: 'Nhận 20 Giáp. Trong hai lượt, giữ lại 50% Giáp đầu lượt và khi đối thủ phá Giáp, gây lại sát thương bằng 50% Giáp vừa bị phá.',
      charge: 24, targetType: 'none',
      effects: [
        { op: 'block', value: 20 },
        { op: 'modifier', target: 'ownTeam', mod: { kind: 'keepBlockPercent', amount: 50, turns: 2, id: 'khoi-ult-keep' } },
        { op: 'modifier', target: 'ownTeam', mod: { kind: 'blockBreakReturn', amount: 50, turns: 2, id: 'khoi-ult-return' } },
      ],
      aiTags: ['defense', 'counter'],
    },
  },
  lam: {
    id: 'lam', name: 'Lâm', title: 'THE CHAOS', role: 'Nhận đòn, tích Mana, phản công.',
    description: 'Thế giới quá ồn với Lâm. Nhưng khi mọi thứ vỡ ra, Lâm biến tất cả tiếng ồn đó thành năng lượng.',
    colors: { primary: '#1fa88c', accent: '#7fe8d2' },
    contentNote: 'Lâm có BPD và autism. Gameplay của Lâm đại diện cho quá tải giác quan và việc chuyển áp lực thành năng lượng chiến đấu — không phải bạo lực bẩm sinh.',
    passive: {
      id: 'lam-passive', name: 'Quá Tải',
      description: 'Trong lượt đối thủ, tính tổng sát thương trước Giáp từ các lá tấn công nhắm vào Lâm: mốc 8/16/24 sát thương, mỗi mốc cho 1 Nhiễu. Đầu lượt sau, nhận thêm 1 Mana mỗi Nhiễu (tối đa 3), rồi xóa Nhiễu. Sát thương tự gây, Chảy máu và sát thương cuối lượt không kích hoạt.',
    },
    ultimate: {
      id: 'lam-ult', characterId: 'lam', name: 'Biến Nhiễu Thành Năng Lượng',
      description: 'Nhận 15 Giáp. Nhận ngay 3 Mana. Rút 3 lá Lâm. Bài Lâm giảm 1 cost trong lượt. Lượt đối thủ sau, mỗi lá tấn công nhắm Lâm hồi 2 HP sau khi gây sát thương. Mana không vượt quá 10.',
      charge: 20, targetType: 'none',
      customId: 'ult-lam',
      aiTags: ['defense', 'economy'],
    },
  },
  truc: {
    id: 'truc', name: 'Trúc', title: 'THE BULLY', role: 'Kẻ bắt nạt thực sự, ép đồng minh làm bia thịt, hồi máu qua Taunt.',
    description: 'Trúc không có bạn. Trúc có tài sản. Cô chữa cho "đồ chơi" của mình vì chưa cho phép nó gục — không phải vì lòng tốt.',
    colors: { primary: '#a11d5e', accent: '#e86aa6' },
    passive: {
      id: 'truc-passive', name: 'Bia Thịt Của Tao',
      description: 'Lần đầu dùng lá Bully mỗi lượt, chọn đồng minh làm Bia Thịt: Taunt tối thiểu 60%; mỗi lá tấn công chuyển sang họ hồi 3 HP (+1 nếu mất HP thật), tối đa 12 HP mỗi lượt đối thủ. Nếu Bia Thịt bị hạ, Trúc nhận Cuồng Nộ: +5 sát thương lượt sau nhưng mất hồi máu nội tại phần còn lại trận.',
    },
    ultimate: {
      id: 'truc-ult', characterId: 'truc', name: 'Mày Chỉ Được Gục Khi Tao Cho Phép',
      description: 'Chọn đồng minh: nếu bị hạ, kéo về 1 HP. Hồi 15 HP. Nhận 20 Giáp. Taunt 100% cho ba lá tấn công đơn mục tiêu tiếp theo; mỗi đòn chuyển hướng hồi 5 HP, sau mỗi đòn Trúc gây 7 sát thương. Khi kết thúc, đồng minh mất 5 HP nhưng không xuống dưới 1.',
      charge: 22, targetType: 'ally',
      customId: 'ult-truc',
      aiTags: ['heal', 'defense', 'taunt'],
    },
  },
  yen: {
    id: 'yen', name: 'Yến', title: 'THE ENABLER', role: 'Full support, tạo Bản Sao, nạp Ultimate cho đồng minh.',
    description: 'Yến không bao giờ ra tay. Yến chỉ đưa dao, băng gạc, và mọi thứ cậu cần để tự hủy hoại mình — với nụ cười dịu dàng nhất.',
    colors: { primary: '#3f9ec9', accent: '#a8e3f7' },
    passive: {
      id: 'yen-passive', name: 'Hậu Cần Hoàn Hảo',
      description: 'Ba Bản Sao đầu tiên mỗi lượt: tạo 2 Giáp cho chủ lá gốc và hồi 1 HP. Bản Sao đầu tiên còn khiến Yến rút 1 lá.',
    },
    ultimate: {
      id: 'yen-ult', characterId: 'yen', name: 'Mở Toàn Bộ Kho',
      description: 'Chọn đồng minh: hồi 12 HP, tạo 15 Giáp, sinh 5 Bản Sao ngẫu nhiên từ lá 0-cost nguyên bản của đồng minh. Ba Bản Sao đầu tăng 50% giá trị số.',
      charge: 24, targetType: 'ally',
      customId: 'ult-yen',
      aiTags: ['support', 'combo'],
    },
  },
  khanh: {
    id: 'khanh', name: 'Khanh', title: 'THE RAZOR', role: 'DPS chỉ dùng bài 0–1 cost, combo nhiều lá.',
    description: 'Một nhát không đau. Mười nhát cũng không đau. Đến nhát thứ hai mươi thì cậu không còn đứng nổi nữa.',
    colors: { primary: '#c9c9d4', accent: '#ffffff' },
    passive: {
      id: 'khanh-passive', name: 'Nhịp Chém',
      description: 'Mỗi lá Khanh sử dụng trong lượt tăng Nhịp Chém 1. Sau 3 lá: tấn công thêm 2. Sau 6 lá: thêm 4. Sau 9 lá: thêm 7. Chỉ dùng mốc cao nhất. Đặt lại cuối lượt. Bản Sao vẫn tăng Nhịp. Lá nhiều hit chỉ tăng Nhịp một lần.',
    },
    ultimate: {
      id: 'khanh-ult', characterId: 'khanh', name: 'Xay Nát',
      description: 'Đặt Nhịp Chém thành 9. Rút đến 7 lá. Bốn lá tấn công tiếp theo lặp lại với 50% sát thương (không lặp debuff). Vẫn giới hạn 14 lá mỗi lượt.',
      charge: 28, targetType: 'none',
      customId: 'ult-khanh',
      aiTags: ['burst', 'combo'],
    },
  },
  duy: {
    id: 'duy', name: 'Duy', title: 'THE BROKER', role: 'Giảm cost, hoàn Mana, hỗ trợ bài đắt.',
    description: 'Mọi thứ đều có giá. Tình bạn, lòng trung thành, một nhát dao sau lưng — Duy đều bán, kèm phiếu giảm giá.',
    colors: { primary: '#b8862e', accent: '#ffd76e' },
    passive: {
      id: 'duy-passive', name: 'Khách Quen Thân Thiết',
      description: 'Đầu lượt nhận 1 Phiếu (mỗi Phiếu giảm 1 cost, tối đa 6, giữ qua lượt). Lần đầu dùng lá cost gốc từ 4 trở lên mỗi lượt, hoàn 1 Mana.',
    },
    ultimate: {
      id: 'duy-ult', characterId: 'duy', name: 'Mọi Thứ Đều Có Thể Thương Lượng',
      description: 'Nhận 4 Phiếu. Rút 3 lá. Tất cả lá trên tay giảm 1 cost trong lượt. Ba lá đầu tiếp theo hoàn 1 Mana (tối đa hoàn 4 Mana từ Ultimate).',
      charge: 22, targetType: 'none',
      customId: 'ult-duy',
      aiTags: ['economy', 'draw'],
    },
  },
  mien: {
    id: 'mien', name: 'Miên', title: 'THE DOUBLE FACE', role: 'Chaos hai mặt, đổi giữa hỗ trợ và sát thương.',
    description: 'Có hai Miên. Một đứa ôm cậu khi cậu khóc. Một đứa là lý do cậu khóc. Không ai biết đứa nào đang cười.',
    colors: { primary: '#5a4fcf', accent: '#b0a8ff' },
    passive: {
      id: 'mien-passive', name: 'Không Ai Biết Tao Là Ai',
      description: 'Mặt Trắng: lần đầu hồi hoặc tạo Giáp mỗi lượt thêm 2. Mặt Đen: lá tấn công đầu tiên mỗi lượt thêm 3. Mỗi lần Lật Mặt: sang Trắng hồi 1, sang Đen gây 2 (tối đa bốn lần mỗi lượt). Lật Mặt ba lần trong một lượt kích hoạt Vỡ Mặt Nạ: lá Hai Mặt kích hoạt mặt hiện tại 100% và mặt kia 50%, một lần mỗi lượt.',
    },
    ultimate: {
      id: 'mien-ult', characterId: 'mien', name: 'Không Còn Mặt Nạ',
      description: 'Trong hai lượt: mọi lá Hai Mặt kích hoạt cả hai mặt ở 100%, không tự Lật Mặt, người chơi chọn mặt sau mỗi lá. Rút 2 khi kích hoạt. Cuối hiệu ứng chọn mặt ngẫu nhiên.',
      charge: 21, targetType: 'none',
      customId: 'ult-mien',
      aiTags: ['combo', 'burst'],
    },
  },
};

export const CHARACTER_ORDER = ['an', 'vy', 'moc', 'khoi', 'lam', 'truc', 'yen', 'khanh', 'duy', 'mien'] as const;
