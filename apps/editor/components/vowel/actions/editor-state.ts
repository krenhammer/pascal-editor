import type { VowelInstance } from '../types'
import { getStore, isSceneEffectivelyEmpty, safeAction } from '../store-bridge'

/**
 * Registers `getEditorState` — snapshot of editor / viewer / selection and scene emptiness for the agent.
 */
export function registerEditorStateActions(vowel: VowelInstance) {
  vowel.registerAction(
    'getEditorState',
    {
      description: 'Get current editor state (phase, mode, tool, selection)',
      parameters: {},
    },
    async () => {
      return safeAction(
        () => {
          const getEditorState = getStore('editor')
          const getViewerState = getStore('viewer')
          const getSceneState = getStore('scene')

          if (!getEditorState || !getViewerState || !getSceneState) {
            return { success: false, error: 'Stores not available' }
          }

          const editor = getEditorState()
          const viewer = getViewerState()
          const scene = getSceneState()

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

          return {
            success: true,
            phase: editor?.phase,
            mode: editor?.mode,
            tool: editor?.tool,
            structureLayer: editor?.structureLayer,
            selectedBuilding: buildingName,
            selectedLevel: levelName,
            selectedIds: viewer?.selection?.selectedIds,
            totalNodes: Object.keys(scene?.nodes || {}).length,
            /** True if only site/building/level scaffold — opening greeting uses this. */
            sceneIsEffectivelyEmpty: isSceneEffectivelyEmpty(),
          }
        },
        { success: false, error: 'Failed to get editor state' },
      )
    },
  )
}
