import { BuildingNode, clearSceneHistory, LevelNode, SiteNode } from '@pascal-app/core'
import { clearPersistedLocalViewerProjectId, persistLocalViewerProjectId } from '@pascal-app/editor'

import { safeAction } from './helpers'
import { getStore } from './store'
import type { VowelClient } from './types'

/**
 * Generates a new project ID for local/unsaved projects.
 * Uses crypto.randomUUID if available, falls back to a timestamp-based ID.
 */
function generateProjectId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Project lifecycle actions: create new project, reset scene.
 */
export function registerProjectActions(vowel: VowelClient) {
  vowel.registerAction(
    'newProject',
    {
      description:
        'Create a new empty project with a fresh site, building, and ground level. This clears the current scene and starts fresh. Use for ANY request to start or add a new project, including phrasing like "add a new project", "add a new project called X", "create a project named X", "new project called my house", "start a new project", "create new project", or "clear everything and start over". Always pass the user\'s chosen project or site name as siteName when they give one (e.g. "my house" → siteName: "my house").',
      parameters: {
        siteName: {
          type: 'string',
          description:
            'Name for the new site / project when the user specifies one (e.g. "my house", "Oak Street ADU"). Omit only if they did not give a name.',
          optional: true,
        },
        buildingName: {
          type: 'string',
          description: 'Optional name for the new building (default: "Building")',
          optional: true,
        },
      },
    },
    async (args: { siteName?: string; buildingName?: string }) => {
      return safeAction(
        () => {
          const getSceneState = getStore('scene')
          const getViewerState = getStore('viewer')
          const getEditorState = getStore('editor')

          if (!getSceneState || !getViewerState) {
            return { success: false, error: 'Stores not available' }
          }

          const scene = getSceneState()
          const viewer = getViewerState()
          const editor = getEditorState?.()

          // Create new scene hierarchy: Site → Building → Level
          const level0 = LevelNode.parse({
            level: 0,
            children: [],
          })

          const building = BuildingNode.parse({
            name: args.buildingName?.trim() || 'Building',
            children: [level0.id],
          })

          const site = SiteNode.parse({
            name: args.siteName?.trim() || 'New Site',
            children: [building],
          })

          // Build flat nodes dictionary
          const nodes: Record<string, any> = {
            [site.id]: site,
            [building.id]: building,
            [level0.id]: level0,
          }

          // Replace entire scene state
          scene.setScene(nodes, [site.id])

          // Clear scene history (undo/redo)
          clearSceneHistory()

          // Generate and set a new project ID for asset uploads
          const newProjectId = generateProjectId()
          if (viewer.setProjectId) {
            viewer.setProjectId(newProjectId)
            persistLocalViewerProjectId(newProjectId)
          }

          // Reset viewer selection to new building/level
          viewer.setSelection({
            buildingId: building.id,
            levelId: level0.id,
            selectedIds: [],
            zoneId: null,
          })

          // Reset editor to default phase/mode if available
          if (editor?.setPhase) {
            editor.setPhase('structure')
          }
          if (editor?.setMode) {
            editor.setMode('select')
          }
          if (editor?.setTool) {
            editor.setTool(null as any)
          }

          return {
            success: true,
            message: `Created new project: ${site.name}`,
            projectId: newProjectId,
            siteId: site.id,
            siteName: site.name,
            buildingId: building.id,
            buildingName: building.name,
            levelId: level0.id,
            levelName: `Level ${level0.level}`,
          }
        },
        { success: false, error: 'Failed to create new project' },
      )
    },
  )

  vowel.registerAction(
    'clearScene',
    {
      description:
        'Clear the current scene and reset to empty state. This removes all nodes but does NOT create a new project structure. Use with caution - prefer newProject for starting fresh.',
      parameters: {
        confirm: {
          type: 'boolean',
          description: 'Must be true to confirm clearing the scene',
        },
      },
    },
    async (args: { confirm?: boolean }) => {
      return safeAction(
        () => {
          if (args.confirm !== true) {
            return {
              success: false,
              error: 'Confirmation required. Pass confirm: true to clear the scene.',
            }
          }

          const getSceneState = getStore('scene')
          const getViewerState = getStore('viewer')

          if (!getSceneState || !getViewerState) {
            return { success: false, error: 'Stores not available' }
          }

          const scene = getSceneState()
          const viewer = getViewerState()

          // Clear the scene completely
          scene.unloadScene()

          // Clear scene history
          clearSceneHistory()

          // Clear project ID and local persistence
          if (viewer.setProjectId) {
            viewer.setProjectId(null)
          }
          clearPersistedLocalViewerProjectId()

          // Reset viewer selection
          viewer.setSelection({
            buildingId: null,
            levelId: null,
            selectedIds: [],
            zoneId: null,
          })

          return {
            success: true,
            message: 'Scene cleared. Call newProject to create a fresh project structure.',
          }
        },
        { success: false, error: 'Failed to clear scene' },
      )
    },
  )
}
