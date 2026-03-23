import { safeAction } from './helpers'
import { getStore } from './store'
import type { VowelClient } from './types'

/**
 * Generic node rename and zone color (by id).
 */
export function registerNodeActions(vowel: VowelClient) {
  vowel.registerAction(
    'renameNode',
    {
      description:
        'Rename a site, building, level, zone, scan, guide, or slab by id (slab ids: getSceneInfo levels[].slabs). For a selected slab prefer renameSelectedSlab.',
      parameters: {
        nodeId: { type: 'string', description: 'Node id from getSceneInfo' },
        name: { type: 'string', description: 'New display name' },
      },
    },
    async ({ nodeId, name }: { nodeId: string; name: string }) => {
      return safeAction(
        () => {
          const getSceneState = getStore('scene')
          if (!getSceneState) return { success: false, error: 'Store not available' }
          const scene = getSceneState()
          if (!scene.nodes[nodeId as keyof typeof scene.nodes]) {
            return { success: false, error: 'Node not found' }
          }
          const label = String(name).trim()
          if (!label) return { success: false, error: 'Name must be non-empty' }
          scene.updateNode(nodeId as any, { name: label })
          return { success: true, message: `Renamed to "${label}"` }
        },
        { success: false, error: 'Failed to rename' },
      )
    },
  )

  vowel.registerAction(
    'setZoneColor',
    {
      description: 'Change a zone swatch color (hex string, same as sidebar color dot).',
      parameters: {
        zoneId: { type: 'string', description: 'Zone node id from getSceneInfo' },
        color: { type: 'string', description: 'CSS hex color e.g. #3b82f6' },
      },
    },
    async ({ zoneId, color }: { zoneId: string; color: string }) => {
      return safeAction(
        () => {
          const getSceneState = getStore('scene')
          if (!getSceneState) return { success: false, error: 'Store not available' }
          const scene = getSceneState()
          const node = scene.nodes[zoneId as keyof typeof scene.nodes] as
            | { type?: string }
            | undefined
          if (!node || node.type !== 'zone') {
            return { success: false, error: 'Not a zone node' }
          }
          const hex = String(color).trim()
          if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) {
            return { success: false, error: 'Color must be a hex string like #3b82f6' }
          }
          scene.updateNode(zoneId as any, { color: hex })
          return { success: true, message: `Zone color set to ${hex}` }
        },
        { success: false, error: 'Failed to set zone color' },
      )
    },
  )
}
