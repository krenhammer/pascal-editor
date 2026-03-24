import type { AnyNodeId } from '@pascal-app/core'
import { emitter } from '@pascal-app/core'
import { getStore, safeAction } from '../store-bridge'
import type { VowelInstance, VowelToolResult } from '../types'

/**
 * Command palette, sidebar chrome width, and camera/thumbnail events (same paths the UI uses).
 */
export function registerShellActions(vowel: VowelInstance) {
  vowel.registerAction(
    'setCommandPaletteOpen',
    {
      description: 'Open or close the command palette (search / quick actions)',
      parameters: {
        open: { type: 'boolean', description: 'true to open' },
      },
    },
    async ({ open }: { open: boolean }) => {
      return safeAction<VowelToolResult>(
        () => {
          const getP = getStore('commandPalette')
          if (!getP) return { success: false, error: 'Command palette store not available' }
          getP().setOpen(Boolean(open))
          return {
            success: true,
            message: open ? 'Command palette opened' : 'Command palette closed',
          }
        },
        { success: false, error: 'Failed to set command palette' },
      )
    },
  )

  vowel.registerAction(
    'setSidebarWidth',
    {
      description: 'Resize the left sidebar width in pixels (clamped 288–800)',
      parameters: {
        widthPx: { type: 'number', description: 'Width in pixels' },
      },
    },
    async ({ widthPx }: { widthPx: number }) => {
      return safeAction<VowelToolResult>(
        () => {
          const getS = getStore('sidebarChrome')
          if (!getS) return { success: false, error: 'Sidebar store not available' }
          getS().setWidth(Number(widthPx))
          return { success: true, message: `Sidebar width set` }
        },
        { success: false, error: 'Failed to set sidebar width' },
      )
    },
  )

  vowel.registerAction(
    'cameraTopView',
    {
      description: 'Frame camera to top-down view (same as toolbar top-view button)',
      parameters: {},
    },
    async () => {
      return safeAction<VowelToolResult>(
        () => {
          emitter.emit('camera-controls:top-view')
          return { success: true, message: 'Top view' }
        },
        { success: false, error: 'Failed top view' },
      )
    },
  )

  vowel.registerAction(
    'cameraOrbitClockwise',
    {
      description: 'Orbit camera clockwise',
      parameters: {},
    },
    async () => {
      return safeAction<VowelToolResult>(
        () => {
          emitter.emit('camera-controls:orbit-cw')
          return { success: true, message: 'Orbit CW' }
        },
        { success: false, error: 'Failed orbit' },
      )
    },
  )

  vowel.registerAction(
    'cameraOrbitCounterClockwise',
    {
      description: 'Orbit camera counter-clockwise',
      parameters: {},
    },
    async () => {
      return safeAction<VowelToolResult>(
        () => {
          emitter.emit('camera-controls:orbit-ccw')
          return { success: true, message: 'Orbit CCW' }
        },
        { success: false, error: 'Failed orbit' },
      )
    },
  )

  vowel.registerAction(
    'cameraFocusNode',
    {
      description: 'Move camera to frame a node (same as tree “view” actions)',
      parameters: {
        nodeId: { type: 'string', description: 'Scene node id' },
      },
    },
    async ({ nodeId }: { nodeId: string }) => {
      return safeAction<VowelToolResult>(
        () => {
          emitter.emit('camera-controls:view', { nodeId: nodeId as AnyNodeId })
          return { success: true, message: `Focus ${nodeId}` }
        },
        { success: false, error: 'Failed camera focus' },
      )
    },
  )

  vowel.registerAction(
    'cameraCaptureNode',
    {
      description: 'Trigger node-scoped camera capture framing (editor camera rig)',
      parameters: {
        nodeId: { type: 'string', description: 'Scene node id' },
      },
    },
    async ({ nodeId }: { nodeId: string }) => {
      return safeAction<VowelToolResult>(
        () => {
          emitter.emit('camera-controls:capture', { nodeId: nodeId as AnyNodeId })
          return { success: true, message: `Capture ${nodeId}` }
        },
        { success: false, error: 'Failed capture' },
      )
    },
  )

  vowel.registerAction(
    'generateProjectThumbnail',
    {
      description: 'Request thumbnail generation for the current project (uses viewer projectId)',
      parameters: {},
    },
    async () => {
      return safeAction<VowelToolResult>(
        () => {
          const getV = getStore('viewer')
          if (!getV) return { success: false, error: 'Viewer store not available' }
          const projectId = getV().projectId
          if (!projectId) {
            return { success: false, error: 'No projectId set on viewer' }
          }
          emitter.emit('camera-controls:generate-thumbnail', { projectId })
          return { success: true, message: 'Thumbnail generation requested' }
        },
        { success: false, error: 'Failed thumbnail request' },
      )
    },
  )
}
