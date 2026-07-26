// Registry for custom card/ultimate resolvers. battle.ts looks resolvers up
// here; resolvers.ts registers them (imported for side effects by engine/index.ts).
// This indirection avoids a circular import between battle.ts and resolvers.ts.

import type { EffectCtx } from './battle';

export type CustomResolver = (ctx: EffectCtx, params?: Record<string, unknown>) => void;

export const customResolvers = new Map<string, CustomResolver>();

export function registerResolver(id: string, fn: CustomResolver): void {
  customResolvers.set(id, fn);
}
