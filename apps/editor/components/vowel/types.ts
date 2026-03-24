import type { Vowel } from '@vowel.to/client'

/**
 * Alias for the Vowel client type used when registering Pascal actions and passing into
 * `VowelProvider` — keeps naming consistent with the wrapper’s singleton lifecycle.
 */
export type VowelInstance = Vowel

/** Normalized tool result so `safeAction` success and fallback branches share one shape. */
export type VowelToolResult = { success: true; message: string } | { success: false; error: string }
