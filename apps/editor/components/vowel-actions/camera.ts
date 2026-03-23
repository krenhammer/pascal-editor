import { emitter } from '@pascal-app/core'

import { safeAction } from './helpers'
import { getStore } from './store'
import type { VowelActionResult, VowelClient } from './types'

/**
 * Camera controls: orbit, top view, and per-node snapshot (site/building/level/zone).
 */
export function registerCameraActions(vowel: VowelClient) {
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
}
