import { getVowelBridgeProjectId, VOWEL_REFERENCE_STORAGE_DELETE_EVENT } from '@pascal-app/editor'

import { safeAction } from './helpers'
import { getStore } from './store'
import type { VowelClient } from './types'

/**
 * Scan / guide references: delete from level, select in sidebar.
 */
export function registerReferenceActions(vowel: VowelClient) {
  vowel.registerAction(
    'deleteScanOrGuide',
    {
      description:
        'Remove a 3D scan or guide image from a level (sidebar row delete). Use reference id from getSceneInfo levels[].references.',
      parameters: {
        referenceId: { type: 'string', description: 'Scan or guide node id' },
      },
    },
    async ({ referenceId }: { referenceId: string }) => {
      return safeAction(
        () => {
          const getSceneState = getStore('scene')
          const getEditorState = getStore('editor')
          if (!getSceneState) return { success: false, error: 'Store not available' }
          const scene = getSceneState()
          const node = scene.nodes[referenceId as keyof typeof scene.nodes] as
            | { type?: string; url?: string }
            | undefined
          if (!node || (node.type !== 'scan' && node.type !== 'guide')) {
            return { success: false, error: 'Not a scan or guide node' }
          }
          const url = node.url
          if (
            url &&
            (url.startsWith('http://') || url.startsWith('https://')) &&
            typeof window !== 'undefined'
          ) {
            window.dispatchEvent(
              new CustomEvent(VOWEL_REFERENCE_STORAGE_DELETE_EVENT, {
                detail: {
                  url,
                  projectId: getVowelBridgeProjectId(),
                },
              }),
            )
          }
          scene.deleteNode(referenceId as any)
          if (getEditorState?.()?.selectedReferenceId === referenceId) {
            getEditorState().setSelectedReferenceId(null)
          }
          return { success: true, message: 'Reference removed from scene' }
        },
        { success: false, error: 'Failed to delete reference' },
      )
    },
  )

  vowel.registerAction(
    'selectReference',
    {
      description:
        'Select a scan/guide in the sidebar (opens reference panel). Pass null to clear.',
      parameters: {
        referenceId: {
          type: 'string',
          description: 'Scan or guide node id, or empty to clear',
        },
      },
    },
    async (args: { referenceId?: string | null }) => {
      return safeAction(
        () => {
          const getEditorState = getStore('editor')
          if (!getEditorState) return { success: false, error: 'Store not available' }
          const id =
            args.referenceId === undefined || args.referenceId === null || args.referenceId === ''
              ? null
              : String(args.referenceId)
          getEditorState().setSelectedReferenceId(id)
          return {
            success: true,
            message: id ? `Selected reference ${id}` : 'Cleared reference selection',
          }
        },
        { success: false, error: 'Failed to select reference' },
      )
    },
  )
}
