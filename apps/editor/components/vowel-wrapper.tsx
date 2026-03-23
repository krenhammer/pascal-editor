'use client'

import { emitter, LevelNode } from '@pascal-app/core'
import {
  getVowelBridgeProjectId,
  setVowelBridgeProjectId,
  VOWEL_OPEN_LEVEL_UPLOAD_EVENT,
  VOWEL_REFERENCE_STORAGE_DELETE_EVENT,
} from '@pascal-app/editor'
import { createNextJSAdapters, Vowel } from '@vowel.to/client'
import { useSyncContext, VowelAgent, VowelProvider } from '@vowel.to/client/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const ROUTES = [{ path: '/', description: 'Editor - Main 3D building editor' }]

/** Subset used by custom actions; matches Vowel instance API. */
type VowelClient = Pick<Vowel, 'updateContext' | 'registerAction'>

/** Standard JSON-serializable result shape for Vowel `registerAction` handlers. */
type VowelActionResult = {
  success: boolean
  message?: string
  error?: string
  levelId?: string
  levelIndex?: number
}

function getStore(name: string) {
  if (typeof window === 'undefined') return null
  const path =
    name === 'editor'
      ? '@pascal-app/editor'
      : name === 'viewer'
        ? '@pascal-app/viewer'
        : '@pascal-app/core'

  try {
    const mod = require(path)
    if (name === 'editor') return mod.useEditor?.getState
    if (name === 'viewer') return mod.useViewer?.getState
    return mod.useScene?.getState
  } catch {
    return null
  }
}

function buildVowelContext() {
  if (typeof window === 'undefined') {
    return { route: { pathname: '/', pathnameLabel: 'Editor', search: '' } }
  }

  const pathname = window.location.pathname

  try {
    const getEditorState = getStore('editor')
    const getViewerState = getStore('viewer')
    const phase = getEditorState?.()?.phase || 'structure'
    const tool = getEditorState?.()?.tool || null
    const structureLayer = getEditorState?.()?.structureLayer ?? 'elements'
    const viewer = getViewerState?.()
    return {
      route: {
        pathname,
        pathnameLabel: pathname === '/' ? 'Editor' : pathname,
        search: window.location.search,
      },
      editor: { phase, tool, structureLayer, mode: getEditorState?.()?.mode },
      viewerUi: viewer
        ? {
            cameraMode: viewer.cameraMode,
            levelMode: viewer.levelMode,
            wallMode: viewer.wallMode,
            showScans: viewer.showScans,
            showGuides: viewer.showGuides,
          }
        : undefined,
    }
  } catch {
    return {
      route: {
        pathname,
        pathnameLabel: pathname === '/' ? 'Editor' : pathname,
        search: window.location.search,
      },
    }
  }
}

function safeAction<T extends VowelActionResult>(action: () => T, fallback: T): T {
  try {
    return action()
  } catch (error) {
    console.warn('[Vowel] Action failed:', error)
    return fallback
  }
}

function registerCustomActions(vowel: VowelClient) {
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
                      name:
                        n.name || (n.type === 'scan' ? '3D Scan' : 'Guide Image'),
                    }
                  })
                const zones = childIds
                  .filter((cid: string) => scene.nodes[cid]?.type === 'zone')
                  .map((cid: string) => {
                    const z = scene.nodes[cid] as any
                    return { id: cid, name: z.name, color: z.color }
                  })
                return {
                  id: lid,
                  name: level?.name || `Level ${level?.level}`,
                  level: level?.level,
                  references,
                  zones,
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

  vowel.registerAction(
    'undo',
    {
      description: 'Undo the last action in the editor',
      parameters: {},
    },
    async () => {
      return safeAction(
        () => {
          const getSceneState = getStore('scene')
          if (!getSceneState) return { success: false, error: 'Store not available' }
          const history = (getSceneState as any).history
          if (history?.undo) {
            history.undo()
            return { success: true, message: 'Undone last action' }
          }
          return { success: false, error: 'No history available or nothing to undo' }
        },
        { success: false, error: 'Failed to undo' },
      )
    },
  )

  vowel.registerAction(
    'redo',
    {
      description: 'Redo the last undone action in the editor',
      parameters: {},
    },
    async () => {
      return safeAction(
        () => {
          const getSceneState = getStore('scene')
          if (!getSceneState) return { success: false, error: 'Store not available' }
          const history = (getSceneState as any).history
          if (history?.redo) {
            history.redo()
            return { success: true, message: 'Redone last action' }
          }
          return { success: false, error: 'No history available or nothing to redo' }
        },
        { success: false, error: 'Failed to redo' },
      )
    },
  )

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

  vowel.registerAction(
    'setCameraMode',
    {
      description: 'Set 3D view projection: perspective or orthographic (toolbar camera button)',
      parameters: {
        mode: { type: 'string', description: 'perspective | orthographic' },
      },
    },
    async ({ mode }: { mode: string }) => {
      return safeAction(
        () => {
          const getViewerState = getStore('viewer')
          if (!getViewerState) return { success: false, error: 'Store not available' }
          const m = String(mode).toLowerCase()
          if (m !== 'perspective' && m !== 'orthographic') {
            return { success: false, error: 'Use perspective or orthographic' }
          }
          getViewerState().setCameraMode(m)
          return { success: true, message: `Camera: ${m}` }
        },
        { success: false, error: 'Failed to set camera mode' },
      )
    },
  )

  vowel.registerAction(
    'setLevelDisplayMode',
    {
      description:
        'How floors are displayed: stacked, exploded, solo, or manual (toolbar layers / stack control)',
      parameters: {
        mode: { type: 'string', description: 'stacked | exploded | solo | manual' },
      },
    },
    async ({ mode }: { mode: string }) => {
      return safeAction(
        () => {
          const getViewerState = getStore('viewer')
          if (!getViewerState) return { success: false, error: 'Store not available' }
          const m = String(mode).toLowerCase()
          const valid = ['stacked', 'exploded', 'solo', 'manual'] as const
          if (!valid.includes(m as (typeof valid)[number])) {
            return { success: false, error: 'Use stacked, exploded, solo, or manual' }
          }
          getViewerState().setLevelMode(m as (typeof valid)[number])
          return { success: true, message: `Level display: ${m}` }
        },
        { success: false, error: 'Failed to set level display mode' },
      )
    },
  )

  vowel.registerAction(
    'setWallDisplayMode',
    {
      description:
        'Wall height visualization: up (full), cutaway, or down (low) — toolbar wall mode',
      parameters: {
        mode: { type: 'string', description: 'up | cutaway | down' },
      },
    },
    async ({ mode }: { mode: string }) => {
      return safeAction(
        () => {
          const getViewerState = getStore('viewer')
          if (!getViewerState) return { success: false, error: 'Store not available' }
          const m = String(mode).toLowerCase()
          const valid = ['up', 'cutaway', 'down'] as const
          if (!valid.includes(m as (typeof valid)[number])) {
            return { success: false, error: 'Use up, cutaway, or down' }
          }
          getViewerState().setWallMode(m as (typeof valid)[number])
          return { success: true, message: `Wall display: ${m}` }
        },
        { success: false, error: 'Failed to set wall display mode' },
      )
    },
  )

  vowel.registerAction(
    'setShowScans',
    {
      description: 'Show or hide 3D scan overlays in the viewer (toolbar scans icon)',
      parameters: {
        visible: { type: 'boolean', description: 'true to show scans' },
      },
    },
    async ({ visible }: { visible: boolean }) => {
      return safeAction(
        () => {
          const getViewerState = getStore('viewer')
          if (!getViewerState) return { success: false, error: 'Store not available' }
          getViewerState().setShowScans(Boolean(visible))
          return { success: true, message: `Scans ${visible ? 'visible' : 'hidden'}` }
        },
        { success: false, error: 'Failed to set scan visibility' },
      )
    },
  )

  vowel.registerAction(
    'setShowGuides',
    {
      description: 'Show or hide guide / floorplan images in the viewer (toolbar guides icon)',
      parameters: {
        visible: { type: 'boolean', description: 'true to show guides' },
      },
    },
    async ({ visible }: { visible: boolean }) => {
      return safeAction(
        () => {
          const getViewerState = getStore('viewer')
          if (!getViewerState) return { success: false, error: 'Store not available' }
          getViewerState().setShowGuides(Boolean(visible))
          return { success: true, message: `Guides ${visible ? 'visible' : 'hidden'}` }
        },
        { success: false, error: 'Failed to set guide visibility' },
      )
    },
  )

  vowel.registerAction(
    'cameraOrbit',
    {
      description: 'Orbit the camera left or right (toolbar rotate arrows)',
      parameters: {
        direction: {
          type: 'string',
          description: 'cw / clockwise / right, or ccw / counter-clockwise / left',
        },
      },
    },
    async ({ direction }: { direction: string }) => {
      return safeAction<VowelActionResult>(
        () => {
          const d = String(direction).toLowerCase()
          if (d === 'cw' || d === 'clockwise' || d === 'right') {
            emitter.emit('camera-controls:orbit-cw', undefined)
            return { success: true, message: 'Orbited camera clockwise' }
          }
          if (d === 'ccw' || d === 'counter-clockwise' || d === 'left') {
            emitter.emit('camera-controls:orbit-ccw', undefined)
            return { success: true, message: 'Orbited camera counter-clockwise' }
          }
          return { success: false, error: 'Use direction cw or ccw' }
        },
        { success: false, error: 'Failed to orbit camera' },
      )
    },
  )

  vowel.registerAction(
    'cameraTopView',
    {
      description: 'Set camera to top-down view (toolbar top view)',
      parameters: {},
    },
    async () => {
      return safeAction<VowelActionResult>(
        () => {
          emitter.emit('camera-controls:top-view', undefined)
          return { success: true, message: 'Top view' }
        },
        { success: false, error: 'Failed to set top view' },
      )
    },
  )

  vowel.registerAction(
    'nodeCameraSnapshot',
    {
      description:
        'Sidebar camera snapshot for site, building, level, or zone: view, capture (take/update), or clear. Use node ids from getSceneInfo.',
      parameters: {
        nodeId: { type: 'string', description: 'Site, building, level, or zone node id' },
        operation: {
          type: 'string',
          description: 'view | capture | clear',
        },
      },
    },
    async ({ nodeId, operation }: { nodeId: string; operation: string }) => {
      return safeAction(
        () => {
          const getSceneState = getStore('scene')
          if (!getSceneState) return { success: false, error: 'Store not available' }
          const scene = getSceneState()
          const node = scene.nodes[nodeId as keyof typeof scene.nodes] as
            | { type?: string }
            | undefined
          if (!node?.type) return { success: false, error: 'Node not found' }
          const allowed = ['site', 'building', 'level', 'zone']
          if (!allowed.includes(node.type)) {
            return {
              success: false,
              error: `Camera snapshot supports: ${allowed.join(', ')}`,
            }
          }
          const op = String(operation).toLowerCase()
          const id = nodeId as any
          if (op === 'view') {
            emitter.emit('camera-controls:view', { nodeId: id })
            return { success: true, message: 'Opening snapshot view' }
          }
          if (op === 'capture') {
            emitter.emit('camera-controls:capture', { nodeId: id })
            return { success: true, message: 'Capture snapshot requested' }
          }
          if (op === 'clear') {
            scene.updateNode(nodeId as any, { camera: undefined })
            return { success: true, message: 'Cleared snapshot' }
          }
          return { success: false, error: 'Use operation: view, capture, or clear' }
        },
        { success: false, error: 'Failed camera snapshot action' },
      )
    },
  )

  vowel.registerAction(
    'renameNode',
    {
      description:
        'Rename a site, building, level, zone, scan, or guide (same as double-click rename in the sidebar).',
      parameters: {
        nodeId: { type: 'string', description: 'Node id from getSceneInfo' },
        name: { type: 'string', description: 'New display name' },
      },
    },
    async ({ nodeId, name }: { nodeId: string; name: string }) => {
      return safeAction(
        () => {
          const getSceneState = getStore('scene')
          if (!getSceneState) return { success: false, error: 'Store not available' }
          const scene = getSceneState()
          if (!scene.nodes[nodeId as keyof typeof scene.nodes]) {
            return { success: false, error: 'Node not found' }
          }
          const label = String(name).trim()
          if (!label) return { success: false, error: 'Name must be non-empty' }
          scene.updateNode(nodeId as any, { name: label })
          return { success: true, message: `Renamed to "${label}"` }
        },
        { success: false, error: 'Failed to rename' },
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
        levelIndex: { type: 'number', description: 'Optional index among levels in selected building' },
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

  vowel.registerAction(
    'deleteScanOrGuide',
    {
      description:
        'Remove a 3D scan or guide image from a level (sidebar row delete). Use reference id from getSceneInfo levels[].references.',
      parameters: {
        referenceId: { type: 'string', description: 'Scan or guide node id' },
      },
    },
    async ({ referenceId }: { referenceId: string }) => {
      return safeAction(
        () => {
          const getSceneState = getStore('scene')
          const getEditorState = getStore('editor')
          if (!getSceneState) return { success: false, error: 'Store not available' }
          const scene = getSceneState()
          const node = scene.nodes[referenceId as keyof typeof scene.nodes] as
            | { type?: string; url?: string }
            | undefined
          if (!node || (node.type !== 'scan' && node.type !== 'guide')) {
            return { success: false, error: 'Not a scan or guide node' }
          }
          const url = node.url
          if (
            url &&
            (url.startsWith('http://') || url.startsWith('https://')) &&
            typeof window !== 'undefined'
          ) {
            window.dispatchEvent(
              new CustomEvent(VOWEL_REFERENCE_STORAGE_DELETE_EVENT, {
                detail: {
                  url,
                  projectId: getVowelBridgeProjectId(),
                },
              }),
            )
          }
          scene.deleteNode(referenceId as any)
          if (getEditorState?.()?.selectedReferenceId === referenceId) {
            getEditorState().setSelectedReferenceId(null)
          }
          return { success: true, message: 'Reference removed from scene' }
        },
        { success: false, error: 'Failed to delete reference' },
      )
    },
  )

  vowel.registerAction(
    'selectReference',
    {
      description:
        'Select a scan/guide in the sidebar (opens reference panel). Pass null to clear.',
      parameters: {
        referenceId: {
          type: 'string',
          description: 'Scan or guide node id, or empty to clear',
        },
      },
    },
    async (args: { referenceId?: string | null }) => {
      return safeAction(
        () => {
          const getEditorState = getStore('editor')
          if (!getEditorState) return { success: false, error: 'Store not available' }
          const id =
            args.referenceId === undefined || args.referenceId === null || args.referenceId === ''
              ? null
              : String(args.referenceId)
          getEditorState().setSelectedReferenceId(id)
          return {
            success: true,
            message: id ? `Selected reference ${id}` : 'Cleared reference selection',
          }
        },
        { success: false, error: 'Failed to select reference' },
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
          description:
            'Comma-separated node ids, or the word "clear" to select nothing',
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
          const node = scene.nodes[zoneId as keyof typeof scene.nodes] as { type?: string } | undefined
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

  vowel.registerAction(
    'setZoneColor',
    {
      description: 'Change a zone swatch color (hex string, same as sidebar color dot).',
      parameters: {
        zoneId: { type: 'string', description: 'Zone node id from getSceneInfo' },
        color: { type: 'string', description: 'CSS hex color e.g. #3b82f6' },
      },
    },
    async ({ zoneId, color }: { zoneId: string; color: string }) => {
      return safeAction(
        () => {
          const getSceneState = getStore('scene')
          if (!getSceneState) return { success: false, error: 'Store not available' }
          const scene = getSceneState()
          const node = scene.nodes[zoneId as keyof typeof scene.nodes] as { type?: string } | undefined
          if (!node || node.type !== 'zone') {
            return { success: false, error: 'Not a zone node' }
          }
          const hex = String(color).trim()
          if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) {
            return { success: false, error: 'Color must be a hex string like #3b82f6' }
          }
          scene.updateNode(zoneId as any, { color: hex })
          return { success: true, message: `Zone color set to ${hex}` }
        },
        { success: false, error: 'Failed to set zone color' },
      )
    },
  )

  vowel.registerAction(
    'setPropertyLineEditing',
    {
      description:
        'Show or hide property-line vertex editing in the site sidebar (pencil control). When true, switches to site phase and edit mode.',
      parameters: {
        editing: { type: 'boolean', description: 'true = edit vertices, false = leave edit mode' },
      },
    },
    async ({ editing }: { editing: boolean }) => {
      return safeAction(
        () => {
          const getEditorState = getStore('editor')
          if (!getEditorState) return { success: false, error: 'Store not available' }
          const ed = getEditorState()
          if (editing) {
            ed.setPhase('site')
            ed.setMode('edit')
            return { success: true, message: 'Property line editing on' }
          }
          ed.setMode('select')
          return { success: true, message: 'Property line editing off' }
        },
        { success: false, error: 'Failed to toggle property line editing' },
      )
    },
  )

  vowel.registerAction(
    'setPropertyLineVertex',
    {
      description:
        'Update one X or Z coordinate of a property-line vertex (site polygon). Point indices start at 0.',
      parameters: {
        pointIndex: { type: 'number', description: 'Vertex index (0-based)' },
        axis: { type: 'string', description: '"x" or "z" (horizontal plane)' },
        value: { type: 'number', description: 'New coordinate value in meters' },
      },
    },
    async (args: { pointIndex: number; axis: string; value: number }) => {
      return safeAction(
        () => {
          const getSceneState = getStore('scene')
          if (!getSceneState) return { success: false, error: 'Store not available' }
          const scene = getSceneState()
          const rootId = scene.rootNodeIds?.[0]
          const site = rootId ? (scene.nodes[rootId] as any) : null
          if (!site || site.type !== 'site') {
            return { success: false, error: 'No site node' }
          }
          const points: [number, number][] = [...(site.polygon?.points || [])]
          const idx = Number(args.pointIndex)
          if (!Number.isInteger(idx) || idx < 0 || idx >= points.length) {
            return { success: false, error: 'Invalid pointIndex' }
          }
          const ax = String(args.axis).toLowerCase()
          if (ax !== 'x' && ax !== 'z') {
            return { success: false, error: 'axis must be x or z' }
          }
          const axisIdx = ax === 'x' ? 0 : 1
          const next = points.map((p) => [...p] as [number, number])
          next[idx]![axisIdx] = Number(args.value)
          scene.updateNode(rootId as any, {
            polygon: { type: 'polygon' as const, points: next },
          })
          return { success: true, message: `Updated vertex ${idx} ${ax}` }
        },
        { success: false, error: 'Failed to update vertex' },
      )
    },
  )

  vowel.registerAction(
    'addPropertyLineVertex',
    {
      description:
        'Insert a property-line vertex between the last and first points (same as "Add point" in the sidebar).',
      parameters: {},
    },
    async () => {
      return safeAction(
        () => {
          const getSceneState = getStore('scene')
          if (!getSceneState) return { success: false, error: 'Store not available' }
          const scene = getSceneState()
          const rootId = scene.rootNodeIds?.[0]
          const site = rootId ? (scene.nodes[rootId] as any) : null
          if (!site || site.type !== 'site') {
            return { success: false, error: 'No site node' }
          }
          const points: [number, number][] = [...(site.polygon?.points || [])]
          const lastPoint = points[points.length - 1]
          const firstPoint = points[0]
          if (!(lastPoint && firstPoint)) {
            return { success: false, error: 'Not enough points to extend' }
          }
          const newPoint: [number, number] = [
            (lastPoint[0] + firstPoint[0]) / 2,
            (lastPoint[1] + firstPoint[1]) / 2,
          ]
          scene.updateNode(rootId as any, {
            polygon: { type: 'polygon' as const, points: [...points, newPoint] },
          })
          return { success: true, message: 'Added property line point' }
        },
        { success: false, error: 'Failed to add vertex' },
      )
    },
  )

  vowel.registerAction(
    'deletePropertyLineVertex',
    {
      description:
        'Remove a property-line vertex by index. Polygon must keep at least 3 corners.',
      parameters: {
        pointIndex: { type: 'number', description: 'Vertex index to remove (0-based)' },
      },
    },
    async ({ pointIndex }: { pointIndex: number }) => {
      return safeAction(
        () => {
          const getSceneState = getStore('scene')
          if (!getSceneState) return { success: false, error: 'Store not available' }
          const scene = getSceneState()
          const rootId = scene.rootNodeIds?.[0]
          const site = rootId ? (scene.nodes[rootId] as any) : null
          if (!site || site.type !== 'site') {
            return { success: false, error: 'No site node' }
          }
          const points: [number, number][] = [...(site.polygon?.points || [])]
          const idx = Number(pointIndex)
          if (points.length <= 3) {
            return { success: false, error: 'Polygon must have at least 3 points' }
          }
          if (!Number.isInteger(idx) || idx < 0 || idx >= points.length) {
            return { success: false, error: 'Invalid pointIndex' }
          }
          const next = points.filter((_, i) => i !== idx)
          scene.updateNode(rootId as any, {
            polygon: { type: 'polygon' as const, points: next },
          })
          return { success: true, message: `Removed vertex ${idx}` }
        },
        { success: false, error: 'Failed to delete vertex' },
      )
    },
  )
}

/**
 * Builds the object passed to {@link useSyncContext} from Zustand stores.
 * Returns null when editor/viewer are not mounted yet.
 */
function buildEditorViewerSyncPayload(): Record<string, unknown> | null {
  const getEditorState = getStore('editor')
  const getViewerState = getStore('viewer')
  if (!getEditorState || !getViewerState) return null

  const editor = getEditorState()
  const viewer = getViewerState()

  return {
    editor: {
      phase: editor?.phase || 'structure',
      mode: editor?.mode || 'build',
      tool: editor?.tool,
      structureLayer: editor?.structureLayer,
      selectedReferenceId: editor?.selectedReferenceId ?? null,
    },
    viewer: {
      selectedIds: viewer?.selection?.selectedIds || [],
      buildingId: viewer?.selection?.buildingId,
      levelId: viewer?.selection?.levelId,
      zoneId: viewer?.selection?.zoneId ?? null,
      cameraMode: viewer?.cameraMode,
      levelMode: viewer?.levelMode,
      wallMode: viewer?.wallMode,
      showScans: viewer?.showScans,
      showGuides: viewer?.showGuides,
    },
  }
}

/**
 * Keeps Vowel session context aligned with editor + viewer state.
 * `useSyncContext` takes the payload each render (see @vowel.to/client typings).
 */
function EditorStateSync() {
  const [syncPayload, setSyncPayload] = useState<Record<string, unknown> | null>(() =>
    typeof window === 'undefined' ? null : buildEditorViewerSyncPayload(),
  )

  useEffect(() => {
    const tick = () => {
      setSyncPayload(buildEditorViewerSyncPayload())
      const gv = getStore('viewer')
      setVowelBridgeProjectId(gv?.()?.projectId ?? null)
    }
    tick()
    const interval = setInterval(tick, 2000)
    return () => clearInterval(interval)
  }, [])

  useSyncContext(syncPayload)
  return null
}

function VowelInitializer({
  appId,
  onClientReady,
}: {
  appId: string
  onClientReady: (client: Vowel) => void
}) {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!appId || typeof window === 'undefined') return

    try {
      const { navigationAdapter } = createNextJSAdapters(router, {
        routes: ROUTES,
        enableAutomation: false,
      })

      const instance = new Vowel({
        appId: appId,
        instructions: `You are a helpful voice assistant for the Pascal 3D Building Editor.

## CRITICAL: Write to App Store, Not DOM
When performing actions, write to the application store/state, NOT manipulate the DOM directly.

## Context
The <context> section is automatically updated with the current editor state. Always check it for the latest information.

## Available Actions:
- getEditorState: Current editor + selection summary
- getSceneInfo: Site id, buildings, levels, per-level references (scan/guide) and zones, cameras, selection
- setPhase: site | structure | furnish
- setSidebarTab: structure (elements) | furnish | zones — matches S/F/Z sidebar tabs
- setMode: select | edit | delete | build
- setTool: wall, slab, door, window, zone, item, property-line, etc.
- selectBuilding, selectLevel (by index)
- addLevel, deleteLevel (by id or index; never ground floor)
- openUploadScanOrFloorplan: File picker for scan/floorplan (optional levelIndex)
- deleteScanOrGuide, selectReference (id or clear)
- renameNode: Site, building, level, zone, scan, guide display names
- nodeCameraSnapshot: view | capture | clear for site, building, level, or zone node ids
- selectZone, setZoneColor
- setPropertyLineEditing, setPropertyLineVertex, addPropertyLineVertex, deletePropertyLineVertex
- clearMultiSelection: Clears multi-selected canvas objects
- selectSceneNodes: Comma-separated ids or "clear" — outliner / structure tree selection
- setCameraMode: perspective | orthographic
- setLevelDisplayMode: stacked | exploded | solo | manual
- setWallDisplayMode: up | cutaway | down
- setShowScans / setShowGuides: boolean visibility
- cameraOrbit: direction cw or ccw
- cameraTopView: Top-down camera
- deleteSelected, undo, redo

## How to Use:
- Call getSceneInfo for ids (siteId, buildings, levels, references, zones) before snapshot/rename/delete
- Sidebar site/building/level/zone camera menu → nodeCameraSnapshot
- Property line pencil + vertices → setPropertyLineEditing + vertex actions
- Sidebar tabs / zones layer → setSidebarTab
- Add/remove floor → addLevel, deleteLevel
- Upload reference → openUploadScanOrFloorplan
- Toolbar view toggles → setCameraMode, setLevelDisplayMode, setWallDisplayMode, setShowScans, setShowGuides
- Orbit / top view → cameraOrbit, cameraTopView

Help users navigate the 3D editor with voice commands.`,
        navigationAdapter,
        floatingCursor: { enabled: false },
        borderGlow: {
          enabled: true,
          color: 'rgba(99, 102, 241, 0.5)',
          intensity: 30,
          pulse: true,
        },
        _caption: {
          enabled: true,
          position: 'top-center',
          maxWidth: '600px',
          showRole: true,
          showOnMobile: false,
        },
        voiceConfig: {
          provider: 'vowel-prime',
          vowelPrimeConfig: { environment: 'staging' },
          llmProvider: 'groq',
          model: 'openai/gpt-oss-120b',
          voice: 'Timothy',
          language: 'en-US',
          initialGreetingPrompt: `Welcome to the Pascal 3D Building Editor. You can use voice commands to switch tools, change modes, navigate between floors, and manage your building project. Try saying "what tools are available?" or "show me the scene" to get started.`,
        },
        onUserSpeakingChange: (isSpeaking: boolean) => {
          console.log('[Vowel] User speaking:', isSpeaking)
        },
        onAIThinkingChange: (isThinking: boolean) => {
          console.log('[Vowel] AI thinking:', isThinking)
        },
        onAISpeakingChange: (isSpeaking: boolean) => {
          console.log('[Vowel] AI speaking:', isSpeaking)
        },
      })

      registerCustomActions(instance)
      instance.updateContext(buildVowelContext())

      onClientReady(instance)
      setReady(true)
      console.log('[Vowel] Client initialized successfully')
    } catch (err) {
      console.error('[Vowel] Initialization failed:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [appId, router, onClientReady])

  if (error) {
    console.warn('[Vowel] Initialization error (failing open):', error)
  }

  if (!ready) return null

  return <EditorStateSync />
}

export function VowelAppWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [vowelClient, setVowelClient] = useState<Vowel | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const appId = mounted ? process.env.NEXT_PUBLIC_VOWEL_APP_ID : undefined

  if (!appId) {
    return <>{children}</>
  }

  return (
    <VowelProvider client={vowelClient}>
      <VowelInitializer appId={appId} onClientReady={setVowelClient} />
      {children}
      <VowelAgent position="bottom-right" enableFloatingCursor={false} />
    </VowelProvider>
  )
}
