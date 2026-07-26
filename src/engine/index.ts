// Engine public API. Importing this module registers all custom resolvers.
import './resolvers';

export * from './types';
export {
  createBattle, playCard, useUltimate, endTurn, resolvePendingChoice,
  getCardCost, canPlayCard, cloneState, findChar, allyOf, getStatus,
  isFriendship, isBetrayal, processQueue, peekModifier,
} from './battle';
export type { ChoiceSelection, EffectCtx } from './battle';
export { aiChooseAction, applyIntent, aiPickChoice, runEnemyTurn, previewEnemyIntent } from './ai';
export { validateDeck, generateRandomDeck, manaCurve } from './deck';
export { toSeed } from './rng';
export {
  getEnemyById, buildEnemyDeck, validateEnemySystem, resolveEnemyLoadout,
  applyEnemyModifiers, pickEnemyForSeed,
} from './enemyDeckBuilder';
