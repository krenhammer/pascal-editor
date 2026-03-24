import { registerEditorControlActions } from './actions/editor-controls'
import { registerEditorStateActions } from './actions/editor-state'
import { registerHistoryActions } from './actions/history'
import { registerSceneInfoActions } from './actions/scene-info'
import { registerSceneToolsActions } from './actions/scene-tools'
import { registerSelectionActions } from './actions/selection'
import { registerShellActions } from './actions/shell'
import { registerSidebarWorkflowActions } from './actions/sidebar-workflows'
import { registerViewerChromeActions } from './actions/viewer-chrome'
import type { VowelInstance } from './types'

/**
 * Attaches all Pascal-specific Vowel tool actions to a client instance (idempotent per name
 * only if Vowel dedupes; call once after constructing `Vowel`).
 */
export function registerVowelActions(vowel: VowelInstance) {
  registerEditorStateActions(vowel)
  registerEditorControlActions(vowel)
  registerSelectionActions(vowel)
  registerViewerChromeActions(vowel)
  registerShellActions(vowel)
  registerSceneToolsActions(vowel)
  registerSceneInfoActions(vowel)
  registerHistoryActions(vowel)
  registerSidebarWorkflowActions(vowel)
}
