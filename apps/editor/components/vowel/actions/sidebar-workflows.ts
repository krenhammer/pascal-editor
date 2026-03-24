import { type AnyNode, type AnyNodeId, LevelNode } from '@pascal-app/core'
import { getStore, safeAction } from '../store-bridge'
import type { VowelInstance } from '../types'

/**
 * Collects level child ids for a building in scene graph order (same indexing as `selectLevel`).
 */
function getLevelIdsForBuilding(
  scene: { nodes: Record<string, { type?: string }> },
  buildingId: string,
): string[] {
  const building = scene.nodes[buildingId]
  if (!building || building.type !== 'building') return []
  const b = building as { children?: string[] }
  return (
    b.children?.filter((id) => {
      const node = scene.nodes[id]
      return node?.type === 'level'
    }) ?? []
  )
}

/**
 * Sidebar parity: levels, save/load build, upload picker bridge, clear-scene flows (see Settings / Site panels).
 */
export function registerSidebarWorkflowActions(vowel: VowelInstance) {
  vowel.registerAction(
    'addLevelToSelectedBuilding',
    {
      description:
        'Add a new level to the currently selected building (same as Site sidebar “Add level”), then select that level',
      parameters: {},
    },
    async () => {
      return safeAction(
        () => {
          const getScene = getStore('scene')
          const getViewer = getStore('viewer')
          if (!getScene || !getViewer) return { success: false, error: 'Stores not available' }

          const scene = getScene()
          const viewer = getViewer()
          const buildingId = viewer.selection?.buildingId
          if (!buildingId) {
            return {
              success: false,
              error: 'No building selected; select a building in the site tree first',
            }
          }

          const building = scene.nodes[buildingId]
          if (!building || building.type !== 'building') {
            return { success: false, error: 'Invalid building selection' }
          }

          const levelIds = getLevelIdsForBuilding(scene, buildingId)
          const newLevel = LevelNode.parse({
            level: levelIds.length,
            children: [],
            parentId: buildingId as AnyNodeId,
          })
          scene.createNode(newLevel, buildingId as AnyNodeId)
          viewer.setSelection({ levelId: newLevel.id })
          return { success: true, message: `Added level ${levelIds.length}` }
        },
        { success: false, error: 'Failed to add level' },
      )
    },
  )

  vowel.registerAction(
    'deleteLevelByIndex',
    {
      description:
        'Delete a level by index on the selected building (0 = ground). Cannot delete level 0. Same order as selectLevel.',
      parameters: {
        levelIndex: { type: 'number', description: 'Level index (0 = ground)' },
      },
    },
    async ({ levelIndex }: { levelIndex: number }) => {
      return safeAction(
        () => {
          const getScene = getStore('scene')
          const getViewer = getStore('viewer')
          if (!getScene || !getViewer) return { success: false, error: 'Stores not available' }

          const scene = getScene()
          const viewer = getViewer()
          const buildingId = viewer.selection?.buildingId
          if (!buildingId) {
            return { success: false, error: 'No building selected' }
          }

          const levelIds = getLevelIdsForBuilding(scene, buildingId)
          if (levelIndex < 0 || levelIndex >= levelIds.length) {
            return {
              success: false,
              error: `Level ${levelIndex} does not exist. Available: 0-${levelIds.length - 1}`,
            }
          }

          const targetId = levelIds[levelIndex]!
          const levelNode = scene.nodes[targetId] as { type?: string; level?: number }
          if (levelNode?.type !== 'level') {
            return { success: false, error: 'Target is not a level' }
          }
          if (levelNode.level === 0) {
            return { success: false, error: 'Cannot delete the ground level (level 0)' }
          }

          scene.deleteNode(targetId as AnyNodeId)
          const sel = viewer.selection?.levelId
          if (sel === targetId) {
            viewer.setSelection({ levelId: null })
          }
          return { success: true, message: `Deleted level at index ${levelIndex}` }
        },
        { success: false, error: 'Failed to delete level' },
      )
    },
  )

  vowel.registerAction(
    'saveBuildJsonToDownloads',
    {
      description:
        'Download the current scene as JSON (same as Settings “Save Build”: nodes + rootNodeIds)',
      parameters: {},
    },
    async () => {
      return safeAction(
        () => {
          if (typeof document === 'undefined') {
            return { success: false, error: 'Not available in this environment' }
          }
          const getScene = getStore('scene')
          if (!getScene) return { success: false, error: 'Scene store not available' }
          const { nodes, rootNodeIds } = getScene()
          const json = JSON.stringify({ nodes, rootNodeIds }, null, 2)
          const blob = new Blob([json], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `layout_${new Date().toISOString().split('T')[0]}.json`
          link.click()
          URL.revokeObjectURL(url)
          return { success: true, message: 'Build file download started' }
        },
        { success: false, error: 'Failed to save build' },
      )
    },
  )

  vowel.registerAction(
    'loadBuildFromJsonString',
    {
      description:
        'Replace the scene from JSON text with { nodes, rootNodeIds } (same shape as Save Build). Resets selection and goes to site phase.',
      parameters: {
        json: {
          type: 'string',
          description: 'Full JSON string of { nodes: Record<id, node>, rootNodeIds: string[] }',
        },
      },
    },
    async ({ json }: { json: string }) => {
      return safeAction(
        () => {
          const getScene = getStore('scene')
          const getViewer = getStore('viewer')
          const getEditor = getStore('editor')
          if (!getScene || !getViewer || !getEditor) {
            return { success: false, error: 'Stores not available' }
          }
          let data: unknown
          try {
            data = JSON.parse(json)
          } catch {
            return { success: false, error: 'Invalid JSON' }
          }
          if (!data || typeof data !== 'object' || !('nodes' in data) || !('rootNodeIds' in data)) {
            return {
              success: false,
              error: 'JSON must be an object with nodes and rootNodeIds',
            }
          }
          const rec = data as { nodes: Record<string, unknown>; rootNodeIds: unknown }
          if (!rec.nodes || typeof rec.nodes !== 'object' || !Array.isArray(rec.rootNodeIds)) {
            return {
              success: false,
              error: 'nodes must be an object; rootNodeIds must be an array',
            }
          }

          getScene().setScene(
            rec.nodes as Record<AnyNodeId, AnyNode>,
            rec.rootNodeIds as AnyNodeId[],
          )
          getViewer().resetSelection()
          getEditor().setPhase('site')
          return { success: true, message: 'Build loaded' }
        },
        { success: false, error: 'Failed to load build' },
      )
    },
  )

  vowel.registerAction(
    'openUploadScanFloorplanPicker',
    {
      description:
        'Open the OS file picker for “Upload scan/floorplan” on a level: switches to Site sidebar, structure phase, selects the level, then triggers the hidden file input. Omit levelId to use the currently selected level.',
      parameters: {
        levelId: {
          type: 'string',
          description: 'Optional level node id; defaults to viewer.selection.levelId',
        },
      },
    },
    async (params: { levelId?: string }) => {
      return safeAction(
        () => {
          const getEditor = getStore('editor')
          const getViewer = getStore('viewer')
          const getScene = getStore('scene')
          if (!getEditor || !getViewer || !getScene) {
            return { success: false, error: 'Stores not available' }
          }

          const viewer = getViewer()
          const editor = getEditor()
          const scene = getScene()

          const raw = params?.levelId?.trim()
          const target = raw || viewer.selection?.levelId
          if (!target) {
            return { success: false, error: 'No level id; select a level or pass levelId' }
          }

          const node = scene.nodes[target as AnyNodeId]
          if (!node || node.type !== 'level') {
            return { success: false, error: `Not a level node: ${target}` }
          }

          editor.setSidebarPanel('site')
          editor.setPhase('structure')
          viewer.setSelection({ levelId: target })
          editor.setPendingLevelUploadPickLevelId(target)

          return { success: true, message: 'File picker requested for level upload' }
        },
        { success: false, error: 'Failed to open upload picker' },
      )
    },
  )

  vowel.registerAction(
    'openClearStartNewConfirmDialog',
    {
      description:
        'Open Settings and show the “Clear and start new?” confirmation dialog (Radix dialog, not alert)',
      parameters: {},
    },
    async () => {
      return safeAction(
        () => {
          const getEditor = getStore('editor')
          if (!getEditor) return { success: false, error: 'Editor store not available' }
          const e = getEditor()
          e.setSidebarPanel('settings')
          e.setClearStartNewDialogOpen(true)
          return { success: true, message: 'Clear confirmation dialog opened' }
        },
        { success: false, error: 'Failed to open dialog' },
      )
    },
  )

  vowel.registerAction(
    'clearSceneStartNew',
    {
      description:
        'Immediately clear the scene to default scaffold, reset viewer selection, site phase. ONLY when the user explicitly confirms destruction — pass confirmDestructive: true (voice shortcut; the UI uses the dialog instead).',
      parameters: {
        confirmDestructive: {
          type: 'boolean',
          description: 'Must be true or the action is rejected',
        },
      },
    },
    async ({ confirmDestructive }: { confirmDestructive: boolean }) => {
      return safeAction(
        () => {
          if (confirmDestructive !== true) {
            return {
              success: false,
              error:
                'Refused: pass confirmDestructive: true only after explicit user intent to wipe the build',
            }
          }
          const getScene = getStore('scene')
          const getViewer = getStore('viewer')
          const getEditor = getStore('editor')
          if (!getScene || !getViewer || !getEditor) {
            return { success: false, error: 'Stores not available' }
          }
          getScene().clearScene()
          getViewer().resetSelection()
          getEditor().setPhase('site')
          getEditor().setClearStartNewDialogOpen(false)
          return { success: true, message: 'Scene cleared' }
        },
        { success: false, error: 'Failed to clear scene' },
      )
    },
  )
}
