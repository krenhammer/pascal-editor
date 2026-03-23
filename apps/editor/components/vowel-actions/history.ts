import { safeAction } from './helpers'
import { getStore } from './store'
import type { VowelClient } from './types'

/**
 * Undo / redo via scene store history (Zundo).
 */
export function registerHistoryActions(vowel: VowelClient) {
  vowel.registerAction(
    'undo',
    {
      description: 'Undo the last action in the editor',
      parameters: {},
    },
    async () => {
      return safeAction(
        () => {
          const getSceneState = getStore('scene')
          if (!getSceneState) return { success: false, error: 'Store not available' }
          const history = (getSceneState as any).history
          if (history?.undo) {
            history.undo()
            return { success: true, message: 'Undone last action' }
          }
          return { success: false, error: 'No history available or nothing to undo' }
        },
        { success: false, error: 'Failed to undo' },
      )
    },
  )

  vowel.registerAction(
    'redo',
    {
      description: 'Redo the last undone action in the editor',
      parameters: {},
    },
    async () => {
      return safeAction(
        () => {
          const getSceneState = getStore('scene')
          if (!getSceneState) return { success: false, error: 'Store not available' }
          const history = (getSceneState as any).history
          if (history?.redo) {
            history.redo()
            return { success: true, message: 'Redone last action' }
          }
          return { success: false, error: 'No history available or nothing to redo' }
        },
        { success: false, error: 'Failed to redo' },
      )
    },
  )
}
