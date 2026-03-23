import { SlabNode } from '@pascal-app/core'

import { lengthToMeters, safeAction } from './helpers'
import { getStore } from './store'
import type { VowelClient } from './types'

/**
 * Voice actions for rectangular slabs: create, translate, rename (selection).
 */
export function registerSlabActions(vowel: VowelClient) {
  vowel.registerAction(
    'createRectangularSlab',
    {
      description:
        'Create a new axis-aligned rectangular floor slab on the currently selected level. Polygon is in the XZ plane; Y height uses slab elevation. Use unit feet for voice dimensions like 15 by 20.',
      parameters: {
        width: { type: 'number', description: 'Width along +X' },
        depth: { type: 'number', description: 'Depth along +Z' },
        unit: {
          type: 'string',
          description: 'feet | meters (default feet)',
          optional: true,
        },
        originX: {
          type: 'number',
          description: 'Min-corner X in the same unit (default 0)',
          optional: true,
        },
        originZ: {
          type: 'number',
          description: 'Min-corner Z in the same unit (default 0)',
          optional: true,
        },
        name: { type: 'string', description: 'Optional display name', optional: true },
      },
    },
    async (args: {
      width: number
      depth: number
      unit?: string
      originX?: number
      originZ?: number
      name?: string
    }) => {
      return safeAction(
        () => {
          const getSceneState = getStore('scene')
          const getViewerState = getStore('viewer')
          if (!getSceneState || !getViewerState) {
            return { success: false, error: 'Stores not available' }
          }
          const scene = getSceneState()
          const viewer = getViewerState()
          const levelId = viewer.selection?.levelId
          if (!levelId) return { success: false, error: 'No level selected' }
          const levelNode = scene.nodes[levelId] as { type?: string } | undefined
          if (!levelNode || levelNode.type !== 'level') {
            return { success: false, error: 'Invalid level selection' }
          }

          const unit = args.unit?.trim() ? args.unit : 'feet'
          const widthM = lengthToMeters(Math.abs(Number(args.width)), unit)
          const depthM = lengthToMeters(Math.abs(Number(args.depth)), unit)
          if (!(widthM > 0 && depthM > 0)) {
            return { success: false, error: 'width and depth must be positive' }
          }

          const ox = lengthToMeters(Number(args.originX ?? 0), unit)
          const oz = lengthToMeters(Number(args.originZ ?? 0), unit)

          const polygon: [number, number][] = [
            [ox, oz],
            [ox + widthM, oz],
            [ox + widthM, oz + depthM],
            [ox, oz + depthM],
          ]

          const allNodes = Object.values(scene.nodes) as Array<{ type?: string }>
          const slabCount = allNodes.filter((n) => n.type === 'slab').length
          const trimmed = args.name?.trim()
          const label = trimmed && trimmed.length > 0 ? trimmed : `Slab ${slabCount + 1}`

          const slab = SlabNode.parse({ name: label, polygon })
          scene.createNode(slab, levelId)
          viewer.setSelection({ selectedIds: [slab.id] })

          return {
            success: true,
            message: `Created ${label}`,
            slabId: slab.id,
          }
        },
        { success: false, error: 'Failed to create slab' },
      )
    },
  )

  vowel.registerAction(
    'translateSlab',
    {
      description:
        'Move a slab horizontally (XZ polygon) and/or vertically (elevation). Pass slabId from getSceneInfo or omit to use the single selected slab.',
      parameters: {
        slabId: { type: 'string', description: 'Optional slab node id', optional: true },
        deltaX: {
          type: 'number',
          description: 'Offset along +X (e.g. right), 0 if omitted',
          optional: true,
        },
        deltaZ: {
          type: 'number',
          description: 'Offset along +Z, 0 if omitted',
          optional: true,
        },
        deltaElevation: {
          type: 'number',
          description: 'Vertical offset (up = positive), 0 if omitted',
          optional: true,
        },
        unit: {
          type: 'string',
          description: 'feet | meters for all deltas (default feet)',
          optional: true,
        },
      },
    },
    async (args: {
      slabId?: string
      deltaX?: number
      deltaZ?: number
      deltaElevation?: number
      unit?: string
    }) => {
      return safeAction(
        () => {
          const getSceneState = getStore('scene')
          const getViewerState = getStore('viewer')
          if (!getSceneState || !getViewerState) {
            return { success: false, error: 'Stores not available' }
          }
          const scene = getSceneState()
          const viewer = getViewerState()

          let targetId: string | null = args.slabId?.trim() ? args.slabId.trim() : null
          if (!targetId) {
            const sel = viewer.selection?.selectedIds ?? []
            const slabIds = sel.filter((id: string) => scene.nodes[id]?.type === 'slab')
            if (slabIds.length !== 1) {
              return {
                success: false,
                error: 'Pass slabId or select exactly one slab. getSceneInfo lists levels[].slabs.',
              }
            }
            targetId = slabIds[0]!
          }

          const node = scene.nodes[targetId as keyof typeof scene.nodes] as SlabNode | undefined
          if (!node || node.type !== 'slab') {
            return { success: false, error: 'Not a slab node' }
          }

          const unit = args.unit?.trim() ? args.unit : 'feet'
          const dx = lengthToMeters(Number(args.deltaX ?? 0), unit)
          const dz = lengthToMeters(Number(args.deltaZ ?? 0), unit)
          const de = lengthToMeters(Number(args.deltaElevation ?? 0), unit)

          const newPolygon = node.polygon.map(([x, z]) => [x + dx, z + dz] as [number, number])
          const baseEl = node.elevation ?? 0.05
          scene.updateNode(targetId as SlabNode['id'], {
            polygon: newPolygon,
            elevation: baseEl + de,
          })

          return { success: true, message: `Moved slab ${targetId}` }
        },
        { success: false, error: 'Failed to move slab' },
      )
    },
  )

  vowel.registerAction(
    'renameSelectedSlab',
    {
      description:
        'Set the display name of the one selected slab. Use renameNode with a slab id from getSceneInfo when nothing is selected.',
      parameters: {
        name: { type: 'string', description: 'New slab name' },
      },
    },
    async ({ name }: { name: string }) => {
      return safeAction(
        () => {
          const getSceneState = getStore('scene')
          const getViewerState = getStore('viewer')
          if (!getSceneState || !getViewerState) {
            return { success: false, error: 'Stores not available' }
          }
          const scene = getSceneState()
          const viewer = getViewerState()
          const sel = viewer.selection?.selectedIds ?? []
          const slabIds = sel.filter((id: string) => scene.nodes[id]?.type === 'slab')
          if (slabIds.length !== 1) {
            return {
              success: false,
              error:
                'Select exactly one slab on the canvas, or use renameNode(slabId, name) with id from getSceneInfo levels[].slabs.',
            }
          }
          const label = String(name).trim()
          if (!label) return { success: false, error: 'Name must be non-empty' }
          scene.updateNode(slabIds[0] as SlabNode['id'], { name: label })
          return { success: true, message: `Renamed slab to "${label}"` }
        },
        { success: false, error: 'Failed to rename slab' },
      )
    },
  )
}
