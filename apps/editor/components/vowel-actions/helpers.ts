import type { VowelActionResult } from './types'

/** US customary / ISO foot to meters (slab polygons and elevations are stored in meters). */
export const FEET_TO_METERS = 0.3048

/**
 * Converts a length from feet or meters into meters for scene mutations.
 * @param value Numeric length in the given unit
 * @param unit `"feet"` | `"ft"` | `"meters"` | `"m"` (case-insensitive)
 */
export function lengthToMeters(value: number, unit: string): number {
  const u = String(unit).toLowerCase()
  if (u === 'foot' || u === 'feet' || u === 'ft') return value * FEET_TO_METERS
  return value
}

/**
 * Wraps a synchronous action body so thrown errors become a safe failure result
 * and are logged for debugging.
 */
export function safeAction<T extends VowelActionResult>(action: () => T, fallback: T): T {
  try {
    return action()
  } catch (error) {
    console.warn('[Vowel] Action failed:', error)
    return fallback
  }
}
