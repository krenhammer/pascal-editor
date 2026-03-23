import { safeAction } from './helpers'
import { getStore } from './store'
import type { VowelClient } from './types'

/**
 * Voice actions for building/level/scene selection, multi-select, zones, and delete-selected.
 */
export function registerSelectionActions(vowel: VowelClient) {
  vowel.registerAction(
    'selectLevel',
    {
      description: 'Select a level by index',
      parameters: {
        levelIndex: { type: 'number', description: 'Level index (0 for ground floor)' },
      },
    },
    async ({ levelIndex }: { levelIndex: number }) => {
      return safeAction(
        () => {
          const getViewerState = getStore('viewer')
          const getSceneState = getStore('scene')

          if (!getViewerState || !getSceneState) {
            return { success: false, error: 'Stores not available' }
          }

          const viewer = getViewerState()
          const scene = getSceneState()

          const buildingId = viewer?.selection?.buildingId
          if (!buildingId) return { success: false, error: 'No building selected' }

          const building = scene?.nodes?.[buildingId]
          if (!building || building.type !== 'building') {
            return { success: false, error: 'Invalid building' }
          }

          const levelIds =
            building.children?.filter((id: string) => {
              const node = scene?.nodes?.[id]
              return node?.type === 'level'
            }) || []

          if (levelIndex >= levelIds.length) {
            return {
              success: false,
              error: `Level ${levelIndex} does not exist. Available: 0-${levelIds.length - 1}`,
            }
          }

          const targetLevelId = levelIds[levelIndex]
          viewer.setSelection({ levelId: targetLevelId })

          return { success: true, message: `Selected level ${levelIndex}` }
        },
        { success: false, error: 'Failed to select level' },
      )
    },
  )

  vowel.registerAction(
    'selectBuilding',
    {
      description: 'Select a building by ID',
      parameters: {
        buildingId: { type: 'string', description: 'Building ID to select' },
      },
    },
    async ({ buildingId }: { buildingId: string }) => {
      return safeAction(
        () => {
          const getViewerState = getStore('viewer')
          const getSceneState = getStore('scene')

          if (!getViewerState || !getSceneState) {
            return { success: false, error: 'Stores not available' }
          }

          const scene = getSceneState()
          const building = scene?.nodes?.[buildingId]

          if (!building || building.type !== 'building') {
            return { success: false, error: `Building not found: ${buildingId}` }
          }

          getViewerState().setSelection({ buildingId, selectedIds: [] })
          return { success: true, message: `Selected building: ${buildingId}` }
        },
        { success: false, error: 'Failed to select building' },
      )
    },
  )

  vowel.registerAction(
    'deleteSelected',
    {
      description: 'Delete the currently selected elements',
      parameters: {},
    },
    async () => {
      return safeAction(
        () => {
          const getViewerState = getStore('viewer')
          const getSceneState = getStore('scene')

          if (!getViewerState || !getSceneState) {
            return { success: false, error: 'Stores not available' }
          }

          const viewer = getViewerState()
          const scene = getSceneState()
          const selectedIds = viewer?.selection?.selectedIds

          if (!selectedIds || selectedIds.length === 0) {
            return { success: false, error: 'Nothing selected to delete' }
          }

          for (const id of selectedIds) {
            scene.deleteNode(id)
          }

          viewer.setSelection({ selectedIds: [] })
          return { success: true, message: `Deleted ${selectedIds.length} element(s)` }
        },
        { success: false, error: 'Failed to delete' },
      )
    },
  )

  vowel.registerAction(
    'clearMultiSelection',
    {
      description:
        'Clear multi-selected 3D objects (same as the X on the "N objects selected" badge).',
      parameters: {},
    },
    async () => {
      return safeAction(
        () => {
          const getViewerState = getStore('viewer')
          if (!getViewerState) return { success: false, error: 'Store not available' }
          getViewerState().setSelection({ selectedIds: [] })
          return { success: true, message: 'Cleared multi-selection' }
        },
        { success: false, error: 'Failed to clear selection' },
      )
    },
  )

  vowel.registerAction(
    'selectSceneNodes',
    {
      description:
        'Set outliner / canvas selection for structure or furnish tree nodes (walls, slabs, items, etc.). Pass comma-separated node ids, or "clear" to empty selection.',
      parameters: {
        nodeIds: {
          type: 'string',
          description: 'Comma-separated node ids, or the word "clear" to select nothing',
        },
      },
    },
    async ({ nodeIds }: { nodeIds: string }) => {
      return safeAction(
        () => {
          const getViewerState = getStore('viewer')
          const getSceneState = getStore('scene')
          if (!getViewerState || !getSceneState) {
            return { success: false, error: 'Stores not available' }
          }
          const raw = String(nodeIds ?? '').trim()
          if (!raw || raw.toLowerCase() === 'clear') {
            getViewerState().setSelection({ selectedIds: [], zoneId: null })
            return { success: true, message: 'Cleared scene selection' }
          }
          const scene = getSceneState()
          const ids = raw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
          for (const id of ids) {
            if (!scene.nodes[id as keyof typeof scene.nodes]) {
              return { success: false, error: `Unknown node id: ${id}` }
            }
          }
          getViewerState().setSelection({
            selectedIds: ids as any,
            zoneId: null,
          })
          return { success: true, message: `Selected ${ids.length} node(s)` }
        },
        { success: false, error: 'Failed to set scene selection' },
      )
    },
  )

  vowel.registerAction(
    'selectZone',
    {
      description:
        'Select a zone on the current structure view (same as clicking a zone row). Use zone id from getSceneInfo.',
      parameters: {
        zoneId: { type: 'string', description: 'Zone node id' },
      },
    },
    async ({ zoneId }: { zoneId: string }) => {
      return safeAction(
        () => {
          const getSceneState = getStore('scene')
          const getViewerState = getStore('viewer')
          const getEditorState = getStore('editor')
          if (!getSceneState || !getViewerState || !getEditorState) {
            return { success: false, error: 'Stores not available' }
          }
          const scene = getSceneState()
          const node = scene.nodes[zoneId as keyof typeof scene.nodes] as
            | { type?: string }
            | undefined
          if (!node || node.type !== 'zone') {
            return { success: false, error: 'Not a zone node' }
          }
          getViewerState().setSelection({ zoneId })
          getEditorState().setPhase('structure')
          getEditorState().setMode('select')
          return { success: true, message: `Selected zone ${zoneId}` }
        },
        { success: false, error: 'Failed to select zone' },
      )
    },
  )
}
