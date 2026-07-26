import type { EnemyDefinition, EnemyModifier, EnemyProfile, EnemyProfileId } from '../types/enemy';

// ------------------------------------------------------------
// Enemy modifiers (generic + boss-only)
// ------------------------------------------------------------

export const ENEMY_MODIFIERS: Record<string, EnemyModifier> = {
  'frail': {
    id: 'frail', name: 'Yếu Sức',
    description: 'Đội địch bắt đầu với -5 HP tối đa.',
    effects: { hpBonus: -5 },
  },
  'veteran': {
    id: 'veteran', name: 'Lì Đòn',
    description: 'Đội địch +5 HP tối đa.',
    effects: { hpBonus: 5 },
  },
  'iron-skin': {
    id: 'iron-skin', name: 'Da Sắt',
    description: 'Đội địch bắt đầu trận với 8 Giáp.',
    effects: { startingBlock: 8 },
  },
  'grudge': {
    id: 'grudge', name: 'Thù Cũ',
    description: 'Đội địch bắt đầu ở Quan hệ -2 — sẵn máu phản bội.',
    effects: { startingRelationship: -2 },
  },
  'bonded': {
    id: 'bonded', name: 'Keo Sơn',
    description: 'Đội địch bắt đầu ở Quan hệ +2 — khó chia rẽ.',
    effects: { startingRelationship: 2 },
  },
  'hoarder': {
    id: 'hoarder', name: 'Đầu Cơ',
    description: 'Đội địch bắt đầu với 2 Phiếu.',
    effects: { startingVouchers: 2 },
  },
  'warmed-up': {
    id: 'warmed-up', name: 'Khởi Động Sẵn',
    description: 'Mỗi nhân vật địch bắt đầu với 6 điểm Ultimate.',
    effects: { startingUltCharge: 6 },
  },
  'boss-vitality': {
    id: 'boss-vitality', name: 'Trâu Bò (Boss)',
    description: 'Đội địch +15 HP tối đa.',
    effects: { hpBonus: 15 }, bossOnly: true,
  },
  'boss-flow': {
    id: 'boss-flow', name: 'Dòng Chảy Đen (Boss)',
    description: 'Địch nhận thêm 1 Mana mỗi đầu lượt (vẫn tối đa 10).',
    effects: { manaPerTurn: 1 }, bossOnly: true,
  },
  'boss-foresight': {
    id: 'boss-foresight', name: 'Đọc Vị (Boss)',
    description: 'Địch rút thêm 1 lá mỗi đầu lượt.',
    effects: { drawPerTurn: 1 }, bossOnly: true,
  },
  'boss-awakened': {
    id: 'boss-awakened', name: 'Thức Tỉnh (Boss)',
    description: 'Mỗi nhân vật địch bắt đầu với 10 điểm Ultimate.',
    effects: { startingUltCharge: 10 }, bossOnly: true,
  },
  'boss-cruel-opening': {
    id: 'boss-cruel-opening', name: 'Nhát Dao Chào Sân (Boss)',
    description: 'Bạn bắt đầu trận với Chảy máu 2.',
    effects: { openingBleedOnPlayer: 2 }, bossOnly: true,
  },
  'boss-fortress': {
    id: 'boss-fortress', name: 'Thành Trì (Boss)',
    description: 'Đội địch bắt đầu trận với 15 Giáp.',
    effects: { startingBlock: 15 }, bossOnly: true,
  },
};

// ------------------------------------------------------------
// Difficulty profiles
// ------------------------------------------------------------

export const ENEMY_PROFILES: Record<EnemyProfileId, EnemyProfile> = {
  easy: {
    id: 'easy', name: 'Dễ',
    description: 'AI chơi ngẫu nhiên, đội địch yếu sức (-5 HP).',
    aiLevel: 'easy',
    modifierIds: ['frail'],
  },
  normal: {
    id: 'normal', name: 'Thường',
    description: 'AI biết lethal, phòng thủ và synergy. Không modifier.',
    aiLevel: 'normal',
    modifierIds: [],
  },
  hard: {
    id: 'hard', name: 'Khó',
    description: 'AI tính trước 2 bước; đội địch +5 HP và khởi động sẵn Ultimate.',
    aiLevel: 'hard',
    modifierIds: ['veteran', 'warmed-up'],
  },
  boss: {
    id: 'boss', name: 'Boss',
    description: 'AI khó nhất + toàn bộ boss modifier riêng của đối thủ. +15 HP, +1 Mana/lượt.',
    aiLevel: 'hard',
    modifierIds: ['boss-vitality', 'boss-flow'],
    isBoss: true,
  },
};

// ------------------------------------------------------------
// 10 enemies — one per leader character
// ------------------------------------------------------------

export const ENEMIES: EnemyDefinition[] = [
  {
    id: 'enemy-an', name: 'Người Bạn Không Buông', title: 'AN DẪN ĐẦU',
    description: 'Một tình bạn tốt đến mức nghẹt thở. An và Khôi sẽ ôm nhau hồi máu cho đến khi bạn kiệt sức trước.',
    characterIds: ['an', 'khoi'], deckId: 'edeck-an', portraitCharId: 'an',
    modifierIds: ['bonded'], bossModifierIds: ['boss-fortress'],
    aiHints: ['Trâu máu, nhiều Giáp', 'Kết liễu sớm trước khi Friendship kích hoạt'],
  },
  {
    id: 'enemy-vy', name: 'Nụ Cười Hai Lưỡi', title: 'VY DẪN ĐẦU',
    description: 'Vy cầm dao, Miên cầm mặt nạ. Bạn sẽ không biết nhát nào là thật cho đến khi chảy máu.',
    characterIds: ['vy', 'mien'], deckId: 'edeck-vy', portraitCharId: 'vy',
    modifierIds: ['grudge'], bossModifierIds: ['boss-cruel-opening', 'boss-awakened'],
    aiHints: ['Burst + Chảy máu', 'Cẩn thận khi Quan hệ địch xuống -3'],
  },
  {
    id: 'enemy-moc', name: 'Sòng Bạc Di Động', title: 'MỘC DẪN ĐẦU',
    description: 'Mộc đặt cược, Khanh chém đếm. Luật thay đổi từng lượt và nhà cái luôn thắng.',
    characterIds: ['moc', 'khanh'], deckId: 'edeck-moc', portraitCharId: 'moc',
    modifierIds: [], bossModifierIds: ['boss-foresight', 'boss-awakened'],
    aiHints: ['Khó đoán, nhiều lá 0 Mana', 'Phòng thủ ổn định thắng may rủi'],
  },
  {
    id: 'enemy-khoi', name: 'Bức Tường Trả Góp', title: 'KHÔI DẪN ĐẦU',
    description: 'Duy trả tiền, Khôi đứng chắn. Mỗi lớp Giáp đều có hóa đơn — và bạn là người thanh toán.',
    characterIds: ['khoi', 'duy'], deckId: 'edeck-khoi', portraitCharId: 'khoi',
    modifierIds: ['iron-skin'], bossModifierIds: ['boss-fortress'],
    aiHints: ['Giáp dày, bài đắt ra sớm nhờ Phiếu', 'Phá Giáp trước khi burst'],
  },
  {
    id: 'enemy-lam', name: 'Tiếng Ồn Nuôi Dưỡng', title: 'LÂM DẪN ĐẦU',
    description: 'Yến đưa mọi thứ Lâm cần, và mọi đòn bạn đánh vào Lâm đều trở thành năng lượng đáp trả.',
    characterIds: ['lam', 'yen'], deckId: 'edeck-lam', portraitCharId: 'lam',
    modifierIds: [], bossModifierIds: ['boss-vitality', 'boss-foresight'],
    aiHints: ['Đánh Lâm cho Lâm Mana — chọn mục tiêu khôn ngoan', 'AoE không bị Taunt kéo'],
  },
  {
    id: 'enemy-truc', name: 'Chủ Nhân Và Bao Cát', title: 'TRÚC DẪN ĐẦU',
    description: 'Trúc không cho Lâm gục — chưa được phép. Mỗi đòn bạn đánh vào "bia thịt" là một ngụm máu cho Trúc.',
    characterIds: ['truc', 'lam'], deckId: 'edeck-truc', portraitCharId: 'truc',
    modifierIds: ['veteran'], bossModifierIds: ['boss-vitality'],
    aiHints: ['Taunt dày đặc + hồi máu qua đòn chuyển hướng', 'Đòn diện rộng và Chảy máu không bị kéo'],
  },
  {
    id: 'enemy-yen', name: 'Kho Hàng Biết Cười', title: 'YẾN DẪN ĐẦU',
    description: 'Yến in Bản Sao nhanh hơn bạn kịp đỡ. Khanh chỉ việc chém — đạn dược không bao giờ hết.',
    characterIds: ['yen', 'khanh'], deckId: 'edeck-yen', portraitCharId: 'yen',
    modifierIds: [], bossModifierIds: ['boss-foresight', 'boss-awakened'],
    aiHints: ['Spam 0-cost nạp Ultimate cực nhanh', 'Khóa bài / tăng cost là khắc chế'],
  },
  {
    id: 'enemy-khanh', name: 'Nghìn Nhát Không Nghỉ', title: 'KHANH DẪN ĐẦU',
    description: 'Khanh mở nhịp, Vy khép màn. Từng vết cắt nhỏ cộng lại thành một cái kết rất to.',
    characterIds: ['khanh', 'vy'], deckId: 'edeck-khanh', portraitCharId: 'khanh',
    modifierIds: ['grudge'], bossModifierIds: ['boss-cruel-opening', 'boss-flow'],
    aiHints: ['Nhịp Chém leo thang mỗi lá', 'Giáp lớn một cục tốt hơn giáp nhỏ giọt'],
  },
  {
    id: 'enemy-duy', name: 'Hợp Đồng Không Đọc Kỹ', title: 'DUY DẪN ĐẦU',
    description: 'Duy giảm giá mọi thứ, kể cả lòng tin. Miên ký tên bằng cả hai mặt.',
    characterIds: ['duy', 'mien'], deckId: 'edeck-duy', portraitCharId: 'duy',
    modifierIds: ['hoarder'], bossModifierIds: ['boss-flow', 'boss-awakened'],
    aiHints: ['Bài đắt ra sớm nhờ Phiếu', 'Đề phòng lượt combo sau khi địch tích Phiếu'],
  },
  {
    id: 'enemy-mien', name: 'Gương Mặt Thứ Ba', title: 'MIÊN DẪN ĐẦU',
    description: 'Miên có hai mặt. Trúc chỉ có một — và nó đang cười. Không mặt nào định tha cho bạn.',
    characterIds: ['mien', 'truc'], deckId: 'edeck-mien', portraitCharId: 'mien',
    modifierIds: [], bossModifierIds: ['boss-vitality', 'boss-cruel-opening'],
    aiHints: ['Lật Mặt đổi giữa hồi và burst', 'Làm Nhục cắt Giáp lẫn hồi phục của bạn'],
  },
];

export function getEnemyDef(id: string): EnemyDefinition | undefined {
  return ENEMIES.find((e) => e.id === id);
}
