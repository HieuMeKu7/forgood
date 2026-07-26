// ============================================================
// FRIEND/BETRAYAL IS FUN — Core type models
// Data-driven effect engine types. All card/character data lives
// in src/data and is interpreted by the engine (src/engine).
// ============================================================

export type CharacterId =
  | 'an' | 'vy' | 'moc' | 'khoi' | 'lam'
  | 'truc' | 'yen' | 'khanh' | 'duy' | 'mien';

export type TeamId = 'player' | 'enemy';

export type CardType = 'attack' | 'defense' | 'heal' | 'support';

export type Keyword =
  | 'friend' | 'betray' | 'bully' | 'support'
  | 'attack' | 'defense' | 'heal'
  | 'exhaust' | 'retain' | 'copy' | 'bleed' | 'weak' | 'expose'
  | 'counter' | 'taunt' | 'twoFaced' | 'flip';

/** Where a played card needs a target. 'enemy' = single enemy character
 * (subject to Taunt redirect). 'ally' = the other character on the team
 * (auto-resolved since teams have max 2 members). */
export type TargetType = 'enemy' | 'enemyTeam' | 'ally' | 'self' | 'none';

// ------------------------------------------------------------
// Conditions
// ------------------------------------------------------------

export type Cond =
  | { kind: 'relAtLeast'; value: number }
  | { kind: 'relAtMost'; value: number }
  | { kind: 'relIs'; value: number }
  | { kind: 'friendship' }               // own team relationship >= 3
  | { kind: 'betrayal' }                 // own team relationship <= -3
  | { kind: 'hpAtMost'; value: number }  // own team HP
  | { kind: 'hpBelowPercent'; value: number }
  | { kind: 'enemyHpAtMost'; value: number }
  | { kind: 'targetNoBlock' }            // enemy team has 0 block
  | { kind: 'targetHasBlock' }
  | { kind: 'selfHasBlock' }             // own team has block
  | { kind: 'ownerHasTaunt' }            // card owner char has taunt
  | { kind: 'allyHasTaunt' }             // the other team member has taunt
  | { kind: 'targetExposed' }            // enemy team has Expose
  | { kind: 'targetWeak' }
  | { kind: 'prevCardAlly' }             // previous card played this turn belongs to the other team member
  | { kind: 'cardsPlayedAtLeast'; value: number }  // cards played this turn (incl. current)
  | { kind: 'ownerHitLastEnemyTurn' }    // owner char was hit by an attack card last enemy turn
  | { kind: 'tookAttackDamage' }         // own team took attack damage since start of last enemy turn
  | { kind: 'noiseLastTurnAtLeast'; value: number }   // Lâm: noise gained during last enemy turn
  | { kind: 'noiseManaAtLeast'; value: number }       // Lâm: mana gained from noise at start of this turn
  | { kind: 'enemyBleeding' }
  | { kind: 'enemyBlockBroken' }         // enemy block was broken this turn
  | { kind: 'allyLostHpLastTurn' }
  | { kind: 'humiliateAtLeast'; value: number }       // Làm Nhục stacks on enemy team
  | { kind: 'random'; percent: number }
  | { kind: 'manaExactly'; value: number }
  | { kind: 'faceIs'; value: Face };

// ------------------------------------------------------------
// Effects (data-driven DSL)
// ------------------------------------------------------------

export interface DamageOpts {
  /** number of hits; taunt + "when attacked by a card" reactions check once per card */
  hits?: number;
  /** random damage roll per hit (inclusive), replaces value */
  randomMin?: number;
  randomMax?: number;
  /** additional damage per point of negative relationship (own team) */
  perNegativeRel?: number;
  /** additional damage per Noise stack gained during last enemy turn (Lâm) */
  perNoise?: number;
  /** additional damage per card played this turn before this one */
  perCardPlayed?: number;
  /** cap for total computed base damage (with per-X bonuses) */
  maxTotal?: number;
  /** one hit per card played before this one (Mưa Dao), capped by maxHits */
  hitPerCardPlayed?: boolean;
  maxHits?: number;
  /** ignore up to N block */
  ignoreBlock?: number;
  /** destroy up to N enemy block before dealing damage */
  breakBlockFirst?: number;
  /** if target team has any block, destroy N extra block first */
  bonusBreakIfBlock?: number;
  /** own team loses N HP after the attack (no Overload trigger, counts as self damage) */
  selfTeamLoseHp?: number;
  /** don't apply Nhịp Chém bonus (Khanh) */
  noTempoBonus?: boolean;
  /** apply tempo bonus at 50% per hit (Liên Hoàn Ba Nhát) */
  tempoPercentPerHit?: number;
  /** random: total becomes value*2 or value/2 (Gấp Đôi Hoặc Mất Trắng) */
  doubleOrHalf?: boolean;
  /** deal damage equal to X% of enemy block instead of value */
  percentOfEnemyBlock?: number;
  /** aoe: not redirectable by taunt */
  aoe?: boolean;
}

export type StatusId =
  | 'weak'          // team: damage dealt -25%
  | 'expose'        // team: damage taken +25%
  | 'bleed'         // team: end of turn take X then reduce 1
  | 'counter'       // char: when hit by an attack card, deal X back (once per card)
  | 'taunt'         // char: X% chance to redirect single-target attacks
  | 'humiliate'     // team: each stack -1 block gained & -1 heal received, max 5, -1/turn
  | 'exposeNextHit' // team: next incoming attack +25% then removed
  ;

export type ModTarget = 'ownTeam' | 'enemyTeam' | 'ownerChar' | 'ally' | 'targetChar';

/** Generic pending modifier attached to a team. The engine consults these
 * when computing cost / damage / block / heal, or at specific hooks. */
export interface ModifierDef {
  /** engine-known modifier kind */
  kind:
    | 'costDelta'          // cost change for matching cards (amount, uses/turns)
    | 'damageBonus'        // next matching attack card(s) +amount damage
    | 'healBonus'          // next matching heal +amount
    | 'blockBonus'         // next matching block gain +amount
    | 'damageOrHealBonus'  // next card +amount dmg OR +amount heal (whichever applies first)
    | 'damageOrBlockBonus' // next card +amount dmg OR +amount block
    | 'incomingDamageReduction' // next matching incoming attack -amount (on this team / char)
    | 'incomingAttackCostUp'    // enemy's first/next attack card +amount cost
    | 'blockGainCapPerCard'     // this team can't gain more than amount block from one card
    | 'blockGainPercent'        // block gained multiplied by amount% (Bịt Miệng: 50)
    | 'forceFriendship'    // next Friend card resolves with Friendship bonus regardless of rel
    | 'copyBlockBonus'     // next copy generates +amount block (Yến)
    | 'copyValueBonus'     // next N copies +amount to damage/heal/block (Yến)
    | 'copyAttackBonus'    // next N attack copies +amount dmg, non-attack +amount block/heal
    | 'copyEcho'           // next copy played creates another copy of same card (once)
    | 'retainProtect'      // next ally card cannot be discarded
    | 'overloadBonus'      // next attack on Lâm counts +amount toward threshold
    | 'overloadExtraNoise' // next N attacks on Lâm each generate +1 noise
    | 'overloadLowThreshold' // next enemy turn thresholds 6/12/18
    | 'reflectDebuff'      // next debuff applied to this team is reflected
    | 'drawDelta'          // draw N fewer/more next turn
    | 'manaNextTurn'       // fixed mana next turn (5 for Không Thể Bị Phá Vỡ, 4 for Vay Nóng)
    | 'manaDebtNextTurn'   // lose N mana next turn (Thanh Toán Sau)
    | 'manaGainNextTurn'   // +N mana next turn start (Không Được Nghỉ)
    | 'keepBlockPercent'   // keep N% of block at start of own turn
    | 'blockPierceNegate'  // first damage that would pierce block next turn becomes 0
    | 'cardLockAfter'      // lock playing cards after N more cards this turn
    | 'maxCardsThisTurn'   // can't play more than N cards this turn
    | 'firstCharCardDiscount' // first card of each character -N cost (Phá Giá Thị Trường)
    | 'ultRepeatAttacks'   // next N attack cards repeat at 50% damage (Khanh ult)
    | 'attackHealsDefender' // next enemy turn: each attack targeting char heals defender team 2 (Lâm ult)
    | 'blockBreakReturn'   // when enemy breaks block, deal 50% of broken block back (Khôi ult)
    | 'friendCardDiscount' // first friend card each turn -1 (An ult, 2 turns)
    | 'deathPrevention'    // first lethal damage leaves team at 1 HP
    | 'tauntedAttacksHeal' // ult Trúc: redirected attacks heal 5, Trúc deals 7 after each
    | 'zeroCostCardBonus'  // next 0-cost card +2 to its effects (Tăng Nhịp)
    | 'refundNext'         // next card with cost >= minCost refunds N mana
    | 'flag';              // free-form marker consumed by custom resolvers
  amount?: number;
  /** remaining uses; omit for turn-scoped */
  uses?: number;
  /** turns remaining; decremented at end of owner team's turn */
  turns?: number;
  /** filter which cards/hits this applies to */
  filter?: {
    charId?: CharacterId | 'owner' | 'ally';
    keyword?: Keyword;
    cardType?: CardType;
    costAtLeast?: number;
    costAtMost?: number;
    zeroCost?: boolean;
    isCopy?: boolean;
    targetCharId?: CharacterId;
  };
  /** free-form data for custom resolvers */
  data?: Record<string, unknown>;
  /** id for dedupe / custom lookup */
  id?: string;
}

export type Face = 'white' | 'black';

export type EffectDef =
  | ({ op: 'damage'; value?: number } & DamageOpts)
  | { op: 'block'; value: number; target?: 'ownerChar' | 'ally' }
  | { op: 'heal'; value: number }
  | { op: 'healEnemy'; value: number }
  | { op: 'loseHp'; value: number }   // own team loses HP (self damage, no Overload)
  | { op: 'rel'; delta?: number; set?: number; invert?: boolean; atLeast?: number; atMost?: number; setRandomOf?: number[] }
  | { op: 'draw'; count?: number; upTo?: number }
  | { op: 'discardRandom'; count: number; filterCharId?: CharacterId | 'ally' }
  | { op: 'discardChoose'; count: number }
  | { op: 'discardFriendCards' }      // Đốt Cầu: discard all Friend cards in hand
  | { op: 'status'; status: StatusId; stacks?: number; turns?: number; target: 'enemyTeam' | 'ownTeam' | 'ownerChar' | 'ally' | 'targetChar'; percent?: number; uses?: number }
  | { op: 'bleed'; stacks: number }
  | { op: 'triggerBleed'; reduceStacks?: boolean }
  | { op: 'cleanse'; what: 'debuff' | 'buff' | 'weakOrExpose'; from: 'ownTeam' | 'enemyTeam' }
  | { op: 'gainMana'; amount: number }
  | { op: 'gainVouchers'; amount: number; allyOnly?: boolean }
  | { op: 'modifier'; target: 'ownTeam' | 'enemyTeam'; mod: ModifierDef }
  | { op: 'generateCopies'; count: number; mode: 'random' | 'choose' | 'distinct'; canDuplicate?: boolean; valuePenalty?: number }
  | { op: 'flipFace' }
  | { op: 'if'; cond: Cond; then: EffectDef[]; else?: EffectDef[] }
  | { op: 'choose'; prompt: string; options: { label: string; effects: EffectDef[] }[]; bothChancePercent?: number }
  | { op: 'random'; options: { weight?: number; effects: EffectDef[] }[] }
  | { op: 'custom'; id: string; params?: Record<string, unknown> };

// ------------------------------------------------------------
// Cards & characters
// ------------------------------------------------------------

export interface CardDef {
  id: string;               // e.g. 'an-01' (index in spec order)
  characterId: CharacterId;
  name: string;
  cost: number;             // current printed cost (= baseCost for all base cards)
  baseCost: number;         // original printed cost — copy rules use this
  types: CardType[];
  keywords: Keyword[];
  description: string;      // full rules text (Vietnamese)
  targetType: TargetType;
  exhaust?: boolean;
  retain?: boolean;
  /** override for ultimate charge instead of actual mana paid */
  manaValue?: number;
  /** conditional printed cost (e.g. Sức Mạnh Tình Bạn costs 5 at +5 rel) */
  costCondition?: { cond: Cond; cost: number };
  /** effects for normal cards */
  effects?: EffectDef[];
  /** Miên two-faced cards */
  faces?: { white: EffectDef[]; black: EffectDef[] };
  aiTags: string[];         // e.g. 'lethal', 'defense', 'heal', 'setup', 'draw', 'burst'
  animTags: string[];       // e.g. 'slash', 'glow', 'glitch', 'shield'
}

export interface UltimateDef {
  id: string;
  characterId: CharacterId;
  name: string;
  description: string;
  charge: number;           // required ultimate points
  targetType: TargetType;
  effects?: EffectDef[];
  customId?: string;        // custom resolver for complex ultimates
  aiTags: string[];
}

export interface PassiveDef {
  id: string;
  name: string;
  description: string;
}

export interface CharacterDef {
  id: CharacterId;
  name: string;
  title: string;            // e.g. 'THE HEART'
  role: string;
  description: string;
  colors: { primary: string; accent: string };
  passive: PassiveDef;
  ultimate: UltimateDef;
  /** note shown in Characters screen (e.g. Lâm's representation note) */
  contentNote?: string;
}

// ------------------------------------------------------------
// Decks
// ------------------------------------------------------------

export interface Deck {
  id: string;
  name: string;
  characterIds: CharacterId[];   // 1..2 characters
  cardIds: string[];             // exactly 30 card def ids (duplicates allowed, max 2)
  createdAt: number;
  updatedAt: number;
}

export interface DeckValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ------------------------------------------------------------
// Battle state
// ------------------------------------------------------------

export interface StatusInstance {
  id: StatusId;
  stacks: number;
  /** turns remaining (decremented at end of holder team's turn); undefined = until consumed */
  turns?: number;
  /** taunt percent for taunt status */
  percent?: number;
  data?: Record<string, unknown>;
}

export interface CardInstance {
  instanceId: number;
  defId: string;
  /** cost after persistent reductions (this-turn cost mods are computed on the fly) */
  costOverride?: number;
  /** temporary per-turn cost set by effects (cleared end of turn) */
  turnCost?: number;
  isCopy?: boolean;
  /** for copies: character owning the ORIGINAL card (gets the +4 ultimate) */
  copySourceCharId?: CharacterId;
  /** temporary card generated by an effect (cannot be copied; removed at battle end) */
  isTemp?: boolean;
  /** temp cards keep their generated cost */
  tempCost?: number;
  /** value multiplier percent (e.g. 150 for boosted copies, 50 for Bắt Chước) */
  valuePercent?: number;
  /** flat value bonus applied to damage/heal/block (Yến buffs) */
  valueBonus?: number;
  /** granted retain for this turn (Chứng Cứ Ngoại Phạm) */
  retainThisTurn?: boolean;
  /** cannot be discarded by effects this turn (Đỡ Đòn) */
  protectedFromDiscard?: boolean;
}

export interface CombatantState {
  characterId: CharacterId;
  teamId: TeamId;
  ultimateCharge: number;
  ultimateUsed: boolean;
  ultimateReady: boolean;
  statuses: StatusInstance[];       // char-level: taunt, counter
  /** Lâm: pre-block attack damage accumulated during current enemy turn */
  overloadDamage: number;
  /** Lâm: noise stacks pending (converted to mana at own turn start) */
  noise: number;
  /** Lâm: extra noise granted by Dồn Nén this enemy turn */
  overloadExtra: number;
  /** HP actually lost while this char was the hit target, current/last enemy turn */
  hpLostThisEnemyTurn: number;
  hpLostLastEnemyTurn: number;
  /** Lâm: noise converted last turn start (for card conditions) */
  noiseLastTurn: number;
  manaFromNoiseThisTurn: number;
  /** Trúc meat shield assignment (on the ally) */
  isMeatShield?: boolean;
  /** number of times this char was hit by attack cards last enemy turn */
  hitsTakenLastEnemyTurn: number;
  hitsTakenThisEnemyTurn: number;
  /** Miên */
  face?: Face;
  flipsThisTurn?: number;
  maskBreakUsedThisTurn?: boolean;
  ultimateActiveTurns?: number;     // Miên ult / Khôi ult duration marker
}

export interface TeamStats {
  damageDealt: number;
  damageTaken: number;
  healingDone: number;
  blockGained: number;
  cardsPlayed: number;
  ultimatesUsed: string[];
  damageByCard: Record<string, number>;  // defId -> total damage
}

export interface TeamState {
  id: TeamId;
  hp: number;
  maxHp: number;
  block: number;
  relationship: number;             // -5..+5
  mana: number;
  manaRefundedThisTurn: number;     // cap 5
  vouchers: number;                 // Duy, cap 6 (combined with ally-only)
  vouchersAllyOnly: number;         // Duy: vouchers usable only on ally cards
  trickPoints: number;              // Mộc's Trò
  bladeTempo: number;               // Khanh's Nhịp Chém
  characters: CombatantState[];
  drawPile: CardInstance[];
  hand: CardInstance[];
  discardPile: CardInstance[];
  exhaustPile: CardInstance[];
  /** cards mid-resolution (awaiting finalize) — clone-safe holding zone */
  inPlay: CardInstance[];
  statuses: StatusInstance[];       // team-level: weak, expose, bleed, humiliate
  modifiers: ModifierDef[];
  cardsPlayedThisTurn: number;
  copiesPlayedThisTurn: number;     // Yến passive counter
  attackCardsPlayedThisTurn: number;
  /** ids of team flags set this turn (first friend card used, etc.) */
  turnFlags: Record<string, number>;
  /** heal from Trúc passive this enemy turn (cap 12) */
  meatShieldHealThisTurn: number;
  /** Trúc rage state */
  trucRage?: 'pending' | 'active' | 'spent';
  trucPassiveDisabled?: boolean;
  lastPlayedCharId?: CharacterId;   // for prevCardAlly checks
  lastPlayedCardDefId?: string;
  stats: TeamStats;
  aiLevel?: AILevel;
}

export type Phase = 'playerTurn' | 'enemyTurn' | 'gameOver';

export type PendingChoiceType = 'option' | 'handCards' | 'discardCards' | 'cardDefs';

export interface PendingChoice {
  type: PendingChoiceType;
  prompt: string;
  /** for 'option' */
  options?: { label: string; index: number }[];
  /** for card choices: instanceIds (hand/discard) or defIds */
  cardInstanceIds?: number[];
  cardDefIds?: string[];
  min: number;
  max: number;
  /** resolver context */
  contextId: string;
  data?: Record<string, unknown>;
}

export interface CombatAction {
  turn: number;
  actor: TeamId;
  kind: 'playCard' | 'ultimate' | 'endTurn' | 'startTurn' | 'damage' | 'block' | 'heal'
      | 'status' | 'rel' | 'draw' | 'passive' | 'info' | 'defeat' | 'victory' | 'choice';
  text: string;
  cardDefId?: string;
  characterId?: CharacterId;
  value?: number;
}

export interface GameState {
  seed: number;
  rngState: number;
  turn: number;                 // increments on each player turn start
  phase: Phase;
  active: TeamId;
  teams: Record<TeamId, TeamState>;
  pendingChoice?: PendingChoice;
  /** pending effects to resolve after choice */
  log: CombatAction[];
  nextInstanceId: number;
  winner?: TeamId;
  aiLevel: AILevel;
  /** effect queue serialized for pending choice resolution */
  pendingQueue?: { effects: EffectDef[]; ctx: SerializedCtx }[];
  /** card awaiting finalize (discard/exhaust) once effect queue empties */
  pendingFinalize?: { teamId: TeamId; instanceId: number };
  animationEvents: AnimationEvent[];
}

export interface SerializedCtx {
  teamId: TeamId;
  ownerCharId: CharacterId;
  targetTeamId: TeamId;
  targetCharId?: CharacterId;
  cardDefId?: string;
  cardInstanceId?: number;
  valuePercent?: number;
  valueBonus?: number;
  isCopy?: boolean;
}

export interface AnimationEvent {
  id: number;
  type: 'hit' | 'block' | 'heal' | 'ultimate' | 'status' | 'flip' | 'glitch';
  teamId: TeamId;
  characterId?: CharacterId;
  value?: number;
  crit?: boolean;
}

// ------------------------------------------------------------
// AI
// ------------------------------------------------------------

export type AILevel = 'easy' | 'normal' | 'hard';

export interface AIIntent {
  kind: 'playCard' | 'ultimate' | 'endTurn';
  cardInstanceId?: number;
  targetCharId?: CharacterId;
  ultimateCharId?: CharacterId;
  score?: number;
  reason?: string;
}

// ------------------------------------------------------------
// Match result / history
// ------------------------------------------------------------

export interface MatchResult {
  id: string;
  timestamp: number;
  seed: number;
  aiLevel: AILevel;
  playerDeckName: string;
  playerCharacters: CharacterId[];
  enemyCharacters: CharacterId[];
  winner: TeamId;
  turns: number;
  playerStats: TeamStats;
  enemyStats: TeamStats;
  topDamageCard?: { defId: string; damage: number };
}

// ------------------------------------------------------------
// Settings
// ------------------------------------------------------------

export interface Settings {
  sound: boolean;
  screenShake: boolean;
  bloodEffects: boolean;
  screenFlash: boolean;
  reducedViolence: boolean;
  fastAnimations: boolean;
  aiLevel: AILevel;
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  screenShake: true,
  bloodEffects: true,
  screenFlash: true,
  reducedViolence: false,
  fastAnimations: false,
  aiLevel: 'normal',
};

// ------------------------------------------------------------
// Rule constants
// ------------------------------------------------------------

export const RULES = {
  TEAM_HP: 50,
  MANA_PER_TURN: 7,
  MANA_CAP: 10,
  MANA_REFUND_CAP: 5,
  HAND_DRAW: 5,
  MAX_CARDS_PER_TURN: 14,
  REL_MIN: -5,
  REL_MAX: 5,
  FRIENDSHIP_AT: 3,
  BETRAYAL_AT: -3,
  DECK_SIZE: 30,
  MAX_COPIES_PER_CARD: 2,
  MAX_COPY_CARDS_IN_HAND: 10,
  COPY_MANA_VALUE: 4,
  VOUCHER_CAP: 6,
  HUMILIATE_CAP: 5,
  WEAK_PERCENT: 25,
  EXPOSE_PERCENT: 25,
  MEAT_SHIELD_HEAL_CAP: 12,
} as const;
