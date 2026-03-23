import type { Vowel } from '@vowel.to/client'

import { registerCameraActions } from './camera'
import { registerEditorActions } from './editor'
import { registerHistoryActions } from './history'
import { registerLevelActions } from './levels'
import { registerNodeActions } from './nodes'
import { registerPropertyLineActions } from './property-line'
import { registerReferenceActions } from './references'
import { registerSceneActions } from './scene'
import { registerSelectionActions } from './selection'
import { registerSlabActions } from './slabs'
import type { VowelClient } from './types'
import { registerViewerActions } from './viewer'

/**
 * Registers all Pascal editor voice actions on a Vowel client instance.
 * Call once after constructing {@link Vowel}.
 */
export function registerVowelActions(vowel: VowelClient) {
  registerEditorActions(vowel)
  registerSelectionActions(vowel)
  registerSceneActions(vowel)
  registerSlabActions(vowel)
  registerHistoryActions(vowel)
  registerLevelActions(vowel)
  registerReferenceActions(vowel)
  registerViewerActions(vowel)
  registerCameraActions(vowel)
  registerNodeActions(vowel)
  registerPropertyLineActions(vowel)
}
