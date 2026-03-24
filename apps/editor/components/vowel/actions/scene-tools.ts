import type { AnyNode, AnyNodeId } from '@pascal-app/core'
import { getStore, safeAction } from '../store-bridge'
import type { VowelInstance } from '../types'

/**
 * Scene graph mutations and export — same APIs the inspector panels use.
 */
export function registerSceneToolsActions(vowel: VowelInstance) {
  vowel.registerAction(
    'updateSceneNode',
    {
      description:
        'Partially update a scene node by id (pass only fields to change; matches updateNode in the scene store)',
      parameters: {
        nodeId: { type: 'string', description: 'Node id' },
        patch: {
          type: 'object',
          description:
            'Partial node fields, e.g. { name: "Wall 1" } — must be valid for that node type',
        },
      },
    },
    async ({ nodeId, patch }: { nodeId: string; patch: Record<string, unknown> }) => {
      return safeAction(
        () => {
          const getScene = getStore('scene')
          if (!getScene) return { success: false, error: 'Scene store not available' }
          const scene = getScene()
          if (!scene.nodes[nodeId]) {
            return { success: false, error: `Unknown node: ${nodeId}` }
          }
          scene.updateNode(nodeId as AnyNodeId, patch as Partial<AnyNode>)
          return { success: true, message: `Updated ${nodeId}` }
        },
        { success: false, error: 'Failed to update node' },
      )
    },
  )

  vowel.registerAction(
    'exportScene',
    {
      description: 'Run the editor export handler if one is registered on the viewer store',
      parameters: {},
    },
    async () => {
      try {
        const getV = getStore('viewer')
        if (!getV) return { success: false, error: 'Viewer store not available' }
        const fn = getV().exportScene
        if (!fn) {
          return { success: false, error: 'No export handler registered' }
        }
        await fn()
        return { success: true, message: 'Export completed' }
      } catch (error) {
        console.warn('[Vowel] exportScene failed:', error)
        return { success: false, error: 'Export failed' }
      }
    },
  )
}
