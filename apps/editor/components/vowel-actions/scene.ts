import { safeAction } from './helpers'
import { getStore } from './store'
import type { VowelClient } from './types'

/**
 * Read-only scene summary for the voice agent (buildings, levels, references, zones, slabs).
 */
export function registerSceneActions(vowel: VowelClient) {
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
            const building = scene.nodes[id] as any
            const levels =
              building.children?.filter((cid: string) => {
                const node = scene?.nodes?.[cid]
                return node?.type === 'level'
              }) || []
            return {
              id,
              name: building?.name || id,
              hasCamera: Boolean(building?.camera),
              levelCount: levels.length,
              levels: levels.map((lid: string) => {
                const level = scene.nodes[lid] as any
                const childIds: string[] = level.children || []
                const references = childIds
                  .filter((cid: string) => {
                    const t = scene.nodes[cid]?.type
                    return t === 'scan' || t === 'guide'
                  })
                  .map((cid: string) => {
                    const n = scene.nodes[cid] as any
                    return {
                      id: cid,
                      type: n.type as string,
                      name: n.name || (n.type === 'scan' ? '3D Scan' : 'Guide Image'),
                    }
                  })
                const zones = childIds
                  .filter((cid: string) => scene.nodes[cid]?.type === 'zone')
                  .map((cid: string) => {
                    const z = scene.nodes[cid] as any
                    return { id: cid, name: z.name, color: z.color }
                  })
                const slabs = childIds
                  .filter((cid: string) => scene.nodes[cid]?.type === 'slab')
                  .map((cid: string) => {
                    const s = scene.nodes[cid] as { name?: string }
                    return { id: cid, name: s.name ?? null }
                  })
                return {
                  id: lid,
                  name: level?.name || `Level ${level?.level}`,
                  level: level?.level,
                  references,
                  zones,
                  slabs,
                }
              }),
            }
          })

          const currentBuildingId = viewer?.selection?.buildingId
          const currentLevelId = viewer?.selection?.levelId

          return {
            success: true,
            siteId: rootId || null,
            siteName: (site as any)?.name || 'Untitled Site',
            siteHasCamera: Boolean((site as any)?.camera),
            buildingCount: buildings.length,
            buildings: buildingInfo,
            currentBuildingId,
            currentLevelId,
            currentZoneId: viewer?.selection?.zoneId ?? null,
            selectedReferenceId: getStore('editor')?.()?.selectedReferenceId ?? null,
            selectedCount: viewer?.selection?.selectedIds?.length || 0,
          }
        },
        { success: false, error: 'Failed to get scene info' },
      )
    },
  )
}
