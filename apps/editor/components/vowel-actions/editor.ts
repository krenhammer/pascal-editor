import { getSceneHasUserObjects } from './context'
import { safeAction } from './helpers'
import { getStore } from './store'
import type { VowelClient } from './types'

/**
 * Voice actions for editor chrome: phase, mode, tool, sidebar tab, and state readout.
 */
export function registerEditorActions(vowel: VowelClient) {
  vowel.registerAction(
    'getEditorState',
    {
      description:
        'Get current editor state (phase, mode, tool, selection) and sceneHasUserObjects. For the very first greeting, call this if context.sceneContent.hasObjects is missing.',
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
            const buildingNode = scene.nodes[buildingId] as any
            buildingName = buildingNode?.name || buildingId
          }
          if (levelId && scene?.nodes?.[levelId]) {
            const levelNode = scene.nodes[levelId] as any
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
            sceneHasUserObjects: getSceneHasUserObjects(),
          }
        },
        { success: false, error: 'Failed to get editor state' },
      )
    },
  )

  vowel.registerAction(
    'setPhase',
    {
      description: 'Switch editor phase: site, structure, or furnish',
      parameters: {
        phase: { type: 'string', description: 'Phase: site, structure, or furnish' },
      },
    },
    async ({ phase }: { phase: string }) => {
      return safeAction(
        () => {
          const getEditorState = getStore('editor')
          if (!getEditorState) return { success: false, error: 'Store not available' }
          const validPhases = ['site', 'structure', 'furnish']
          if (!validPhases.includes(phase)) {
            return {
              success: false,
              error: `Invalid phase: ${phase}. Use: site, structure, furnish`,
            }
          }
          getEditorState().setPhase(phase as any)
          return { success: true, message: `Switched to ${phase} phase` }
        },
        { success: false, error: 'Failed to set phase' },
      )
    },
  )

  vowel.registerAction(
    'setMode',
    {
      description: 'Switch editor mode: select, edit, delete, or build',
      parameters: {
        mode: { type: 'string', description: 'Mode: select, edit, delete, or build' },
      },
    },
    async ({ mode }: { mode: string }) => {
      return safeAction(
        () => {
          const getEditorState = getStore('editor')
          if (!getEditorState) return { success: false, error: 'Store not available' }
          const validModes = ['select', 'edit', 'delete', 'build']
          if (!validModes.includes(mode)) {
            return {
              success: false,
              error: `Invalid mode: ${mode}. Use: select, edit, delete, build`,
            }
          }
          getEditorState().setMode(mode as any)
          return { success: true, message: `Switched to ${mode} mode` }
        },
        { success: false, error: 'Failed to set mode' },
      )
    },
  )

  vowel.registerAction(
    'setTool',
    {
      description: 'Select an editor tool',
      parameters: {
        tool: { type: 'string', description: 'Tool: wall, door, window, slab, etc.' },
      },
    },
    async ({ tool }: { tool: string }) => {
      return safeAction(
        () => {
          const getEditorState = getStore('editor')
          if (!getEditorState) return { success: false, error: 'Store not available' }
          const validTools = [
            'wall',
            'room',
            'custom-room',
            'slab',
            'ceiling',
            'roof',
            'column',
            'stair',
            'item',
            'zone',
            'window',
            'door',
            'property-line',
          ]
          if (!validTools.includes(tool)) {
            return { success: false, error: `Invalid tool: ${tool}` }
          }
          getEditorState().setTool(tool as any)
          return { success: true, message: `Selected ${tool} tool` }
        },
        { success: false, error: 'Failed to set tool' },
      )
    },
  )

  vowel.registerAction(
    'setSidebarTab',
    {
      description:
        'Switch the left sidebar tabs: structure (elements), furnish, or zones — matches S / F / Z shortcuts.',
      parameters: {
        tab: { type: 'string', description: 'structure | furnish | zones' },
      },
    },
    async ({ tab }: { tab: string }) => {
      return safeAction(
        () => {
          const getEditorState = getStore('editor')
          if (!getEditorState) return { success: false, error: 'Store not available' }
          const t = String(tab).toLowerCase()
          if (t === 'structure') {
            getEditorState().setPhase('structure')
            getEditorState().setStructureLayer('elements')
            return { success: true, message: 'Sidebar: Structure (elements)' }
          }
          if (t === 'furnish') {
            getEditorState().setPhase('furnish')
            return { success: true, message: 'Sidebar: Furnish' }
          }
          if (t === 'zones') {
            getEditorState().setPhase('structure')
            getEditorState().setStructureLayer('zones')
            return { success: true, message: 'Sidebar: Zones' }
          }
          return { success: false, error: 'Invalid tab. Use: structure, furnish, zones' }
        },
        { success: false, error: 'Failed to set sidebar tab' },
      )
    },
  )
}
