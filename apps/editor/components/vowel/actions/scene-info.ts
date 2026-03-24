import type { VowelInstance } from '../types'
import { getStore, safeAction } from '../store-bridge'

/**
 * Registers `getSceneInfo` — hierarchical site/building/level summary for voice context.
 */
export function registerSceneInfoActions(vowel: VowelInstance) {
  vowel.registerAction(
    'getSceneInfo',
    {
      description: 'Get information about the current scene (buildings, levels, elements)',
      parameters: {},
    },
    async () => {
      return safeAction(
        () => {
          const getSceneState = getStore('scene')
          const getViewerState = getStore('viewer')

          if (!getSceneState || !getViewerState) {
            return { success: false, error: 'Stores not available' }
          }

          const scene = getSceneState()
          const viewer = getViewerState()

          const rootId = scene?.rootNodeIds?.[0]
          const site = rootId ? scene?.nodes?.[rootId] : null
          const buildings =
            site?.children?.filter((id: string) => {
              const node = scene?.nodes?.[id]
              return node?.type === 'building'
            }) || []

          const buildingInfo = buildings.map((id: string) => {
            const building = scene.nodes[id] as {
              name?: string
              children?: string[]
            }
            const levels =
              building.children?.filter((cid: string) => {
                const node = scene?.nodes?.[cid]
                return node?.type === 'level'
              }) || []
            return {
              id,
              name: building?.name || id,
              levelCount: levels.length,
              levels: levels.map((lid: string) => {
                const level = scene.nodes[lid] as { name?: string; level?: number }
                return {
                  id: lid,
                  name: level?.name || `Level ${level?.level}`,
                  level: level?.level,
                }
              }),
            }
          })

          const currentBuildingId = viewer?.selection?.buildingId
          const currentLevelId = viewer?.selection?.levelId

          return {
            success: true,
            siteName: (site as { name?: string } | null)?.name || 'Untitled Site',
            buildingCount: buildings.length,
            buildings: buildingInfo,
            currentBuildingId,
            currentLevelId,
            selectedCount: viewer?.selection?.selectedIds?.length || 0,
          }
        },
        { success: false, error: 'Failed to get scene info' },
      )
    },
  )
}
