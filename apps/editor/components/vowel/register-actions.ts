import type { VowelInstance } from './types'
import { registerEditorControlActions } from './actions/editor-controls'
import { registerEditorStateActions } from './actions/editor-state'
import { registerHistoryActions } from './actions/history'
import { registerSceneInfoActions } from './actions/scene-info'
import { registerSelectionActions } from './actions/selection'

/**
 * Attaches all Pascal-specific Vowel tool actions to a client instance (idempotent per name
 * only if Vowel dedupes; call once after constructing `Vowel`).
 */
export function registerVowelActions(vowel: VowelInstance) {
  registerEditorStateActions(vowel)
  registerEditorControlActions(vowel)
  registerSelectionActions(vowel)
  registerSceneInfoActions(vowel)
  registerHistoryActions(vowel)
}
