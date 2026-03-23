import { LevelNode } from '@pascal-app/core'
import { VOWEL_OPEN_LEVEL_UPLOAD_EVENT } from '@pascal-app/editor'

import { safeAction } from './helpers'
import { getStore } from './store'
import type { VowelClient } from './types'

/**
 * Floor level lifecycle: add level, delete level (non-ground), open scan/floorplan upload.
 */
export function registerLevelActions(vowel: VowelClient) {
  vowel.registerAction(
    'addLevel',
    {
      description:
        'Add a new floor level to the selected building (same as sidebar "Add level") and select it',
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
          const viewer = getViewerState()
          const scene = getSceneState()
          const buildingId = viewer.selection?.buildingId
          if (!buildingId) return { success: false, error: 'No building selected' }
          const building = scene.nodes[buildingId] as {
            type?: string
            id: string
            children?: string[]
          }
          if (!building || building.type !== 'building') {
            return { success: false, error: 'Invalid building selection' }
          }
          const levelCount =
            building.children?.filter((id) => scene.nodes[id]?.type === 'level').length ?? 0
          const newLevel = LevelNode.parse({
            level: levelCount,
            children: [],
            parentId: building.id,
          })
          scene.createNode(newLevel, building.id)
          viewer.setSelection({ levelId: newLevel.id })
          return {
            success: true,
            message: 'Added new level',
            levelId: newLevel.id,
            levelIndex: levelCount,
          }
        },
        { success: false, error: 'Failed to add level' },
      )
    },
  )

  vowel.registerAction(
    'openUploadScanOrFloorplan',
    {
      description:
        'Open the file picker to upload a .glb/.gltf scan or an image floorplan for a level (same as "Upload scan/floorplan"). Omit levelIndex to use the currently selected level.',
      parameters: {
        levelIndex: {
          type: 'number',
          description: 'Optional level index in the building (0 = ground). Omit for current level.',
        },
      },
    },
    async (args: { levelIndex?: number }) => {
      return safeAction(
        () => {
          const getViewerState = getStore('viewer')
          const getSceneState = getStore('scene')
          if (!getViewerState || !getSceneState) {
            return { success: false, error: 'Stores not available' }
          }
          const viewer = getViewerState()
          const scene = getSceneState()
          const buildingId = viewer.selection?.buildingId
          if (!buildingId) return { success: false, error: 'No building selected' }
          const building = scene.nodes[buildingId] as { type?: string; children?: string[] }
          if (!building || building.type !== 'building') {
            return { success: false, error: 'Invalid building' }
          }
          const levelIds =
            building.children?.filter((id: string) => scene.nodes[id]?.type === 'level') || []

          let levelId: string | null = viewer.selection?.levelId ?? null

          if (args?.levelIndex !== undefined && args.levelIndex !== null) {
            const idx = Number(args.levelIndex)
            if (!Number.isInteger(idx) || idx < 0 || idx >= levelIds.length) {
              return {
                success: false,
                error: `Invalid levelIndex. Use 0-${levelIds.length - 1}`,
              }
            }
            levelId = levelIds[idx] ?? null
          }

          if (!levelId || !levelIds.includes(levelId)) {
            return {
              success: false,
              error: 'No valid level. Select a level in the sidebar or pass levelIndex.',
            }
          }

          window.dispatchEvent(
            new CustomEvent(VOWEL_OPEN_LEVEL_UPLOAD_EVENT, { detail: { levelId } }),
          )
          return {
            success: true,
            message: 'Opened file picker for scan or floorplan upload',
            levelId,
          }
        },
        { success: false, error: 'Failed to open upload' },
      )
    },
  )

  vowel.registerAction(
    'deleteLevel',
    {
      description:
        'Delete a floor level (not ground / level index 0 in scene data). Pass levelId from getSceneInfo or levelIndex like selectLevel.',
      parameters: {
        levelId: { type: 'string', description: 'Optional level node id' },
        levelIndex: {
          type: 'number',
          description: 'Optional index among levels in selected building',
        },
      },
    },
    async (args: { levelId?: string; levelIndex?: number }) => {
      return safeAction(
        () => {
          const getSceneState = getStore('scene')
          const getViewerState = getStore('viewer')
          if (!getSceneState || !getViewerState) {
            return { success: false, error: 'Stores not available' }
          }
          const scene = getSceneState()
          const viewer = getViewerState()
          const buildingId = viewer.selection?.buildingId
          if (!buildingId) return { success: false, error: 'No building selected' }
          const building = scene.nodes[buildingId] as {
            type?: string
            children?: string[]
          }
          if (!building || building.type !== 'building') {
            return { success: false, error: 'Invalid building' }
          }
          const levelIds =
            building.children?.filter((id: string) => scene.nodes[id]?.type === 'level') || []

          let targetId: string | null = null
          if (args.levelId) {
            if (!levelIds.includes(args.levelId)) {
              return { success: false, error: 'Level is not in the selected building' }
            }
            targetId = args.levelId
          } else if (args.levelIndex !== undefined && args.levelIndex !== null) {
            const idx = Number(args.levelIndex)
            if (!Number.isInteger(idx) || idx < 0 || idx >= levelIds.length) {
              return {
                success: false,
                error: `Invalid levelIndex. Use 0-${levelIds.length - 1}`,
              }
            }
            targetId = levelIds[idx] ?? null
          } else {
            return { success: false, error: 'Provide levelId or levelIndex' }
          }

          const levelNode = targetId ? (scene.nodes[targetId] as { level?: number }) : null
          if (!levelNode || levelNode.level === undefined) {
            return { success: false, error: 'Level not found' }
          }
          if (levelNode.level === 0) {
            return { success: false, error: 'Cannot delete ground floor (level 0)' }
          }

          scene.deleteNode(targetId as any)

          const buildingAfter = scene.nodes[buildingId] as { children?: string[] } | undefined
          const nextIds =
            buildingAfter?.children?.filter((id: string) => scene.nodes[id]?.type === 'level') || []
          const ground = nextIds.find((id: string) => (scene.nodes[id] as any)?.level === 0)
          const nextLevelId = ground || nextIds[0] || null
          if (viewer.selection?.levelId === targetId) {
            viewer.setSelection({ levelId: nextLevelId })
          }
          return { success: true, message: 'Level deleted', levelId: nextLevelId ?? undefined }
        },
        { success: false, error: 'Failed to delete level' },
      )
    },
  )
}
