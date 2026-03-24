import type { VowelInstance } from '../types'
import { getStore, safeAction } from '../store-bridge'

/**
 * Registers building/level selection and bulk delete of the current selection.
 */
export function registerSelectionActions(vowel: VowelInstance) {
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
}
