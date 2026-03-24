import { getStore, isSceneEffectivelyEmpty, safeAction } from '../store-bridge'
import type { VowelInstance } from '../types'

/**
 * Registers `getEditorState` — full snapshot of editor, viewer, shell UI, and scene summary for the agent.
 */
export function registerEditorStateActions(vowel: VowelInstance) {
  vowel.registerAction(
    'getEditorState',
    {
      description:
        'Get full editor + viewer + UI chrome state (phase, sidebar, toggles, selection). Call for stale context.',
      parameters: {},
    },
    async () => {
      return safeAction(
        () => {
          const getEditorState = getStore('editor')
          const getViewerState = getStore('viewer')
          const getSceneState = getStore('scene')
          const getCmd = getStore('commandPalette')
          const getSidebar = getStore('sidebarChrome')

          if (!getEditorState || !getViewerState || !getSceneState) {
            return { success: false, error: 'Stores not available' }
          }

          const editor = getEditorState()
          const viewer = getViewerState()
          const scene = getSceneState()
          const cmd = getCmd?.()
          const sidebar = getSidebar?.()

          const buildingId = viewer?.selection?.buildingId
          const levelId = viewer?.selection?.levelId

          let buildingName = 'None'
          let levelName = 'None'

          if (buildingId && scene?.nodes?.[buildingId]) {
            const buildingNode = scene.nodes[buildingId] as { name?: string }
            buildingName = buildingNode?.name || buildingId
          }
          if (levelId && scene?.nodes?.[levelId]) {
            const levelNode = scene.nodes[levelId] as { name?: string; level?: number }
            levelName = levelNode?.name || `Level ${levelNode?.level}` || levelId
          }

          const sceneIsEffectivelyEmpty = isSceneEffectivelyEmpty()

          return {
            success: true,
            /** Flat field kept for greeting prompts that reference `sceneIsEffectivelyEmpty`. */
            sceneIsEffectivelyEmpty,
            editor: {
              phase: editor?.phase,
              mode: editor?.mode,
              tool: editor?.tool,
              structureLayer: editor?.structureLayer,
              sidebarPanel: editor?.sidebarPanel,
              catalogCategory: editor?.catalogCategory,
              selectedCatalogSrc: editor?.selectedItem?.src ?? null,
              selectedReferenceId: editor?.selectedReferenceId,
              isPreviewMode: editor?.isPreviewMode,
              editingHole: editor?.editingHole,
              clearStartNewDialogOpen: editor?.clearStartNewDialogOpen ?? false,
              pendingLevelUploadPickLevelId: editor?.pendingLevelUploadPickLevelId ?? null,
            },
            viewer: {
              selectedIds: viewer?.selection?.selectedIds,
              zoneId: viewer?.selection?.zoneId,
              selectedBuilding: buildingName,
              selectedLevel: levelName,
              currentBuildingId: buildingId,
              currentLevelId: levelId,
              theme: viewer?.theme,
              cameraMode: viewer?.cameraMode,
              levelMode: viewer?.levelMode,
              wallMode: viewer?.wallMode,
              showScans: viewer?.showScans,
              showGuides: viewer?.showGuides,
              showGrid: viewer?.showGrid,
              debugColors: viewer?.debugColors,
              projectId: viewer?.projectId,
            },
            ui: {
              commandPaletteOpen: cmd?.open ?? false,
              sidebarWidthPx: sidebar?.width ?? null,
            },
            sceneSummary: {
              totalNodes: Object.keys(scene?.nodes || {}).length,
              sceneIsEffectivelyEmpty,
            },
          }
        },
        { success: false, error: 'Failed to get editor state' },
      )
    },
  )
}
