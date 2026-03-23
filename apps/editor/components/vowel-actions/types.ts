import type { Vowel } from '@vowel.to/client'

/**
 * Minimal Vowel client surface used when registering custom voice actions.
 * Matches the subset of {@link Vowel} needed for `registerAction`.
 */
export type VowelClient = Pick<Vowel, 'updateContext' | 'registerAction'>

/**
 * Standard JSON-serializable result shape for Vowel `registerAction` handlers.
 */
export type VowelActionResult = {
  success: boolean
  message?: string
  error?: string
  levelId?: string
  levelIndex?: number
  slabId?: string
}
