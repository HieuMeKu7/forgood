// Seeded RNG (mulberry32). RNG state lives inside GameState so battles
// are fully reproducible from a seed and state can be cloned for AI search.

export function mulberry32Next(state: number): { value: number; state: number } {
  let a = (state + 0x6d2b79f5) | 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, state: a };
}

export interface RngHolder {
  rngState: number;
}

/** Random float in [0, 1) advancing the holder's rng state. */
export function rand(holder: RngHolder): number {
  const { value, state } = mulberry32Next(holder.rngState);
  holder.rngState = state;
  return value;
}

/** Random integer in [min, max] inclusive. */
export function randInt(holder: RngHolder, min: number, max: number): number {
  return min + Math.floor(rand(holder) * (max - min + 1));
}

/** Random true with given percent chance. */
export function randPercent(holder: RngHolder, percent: number): boolean {
  return rand(holder) * 100 < percent;
}

/** Pick a random element. */
export function randPick<T>(holder: RngHolder, arr: T[]): T {
  return arr[randInt(holder, 0, arr.length - 1)];
}

/** Fisher-Yates shuffle (in place) using seeded rng. */
export function shuffle<T>(holder: RngHolder, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(holder, 0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Derive a numeric seed from a string or number. */
export function toSeed(input: string | number): number {
  if (typeof input === 'number') return input >>> 0;
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
