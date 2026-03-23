import { safeAction } from './helpers'
import { getStore } from './store'
import type { VowelClient } from './types'

/**
 * Viewer UI toggles: camera projection, level stack mode, wall height mode, scans/guides visibility.
 */
export function registerViewerActions(vowel: VowelClient) {
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
}
