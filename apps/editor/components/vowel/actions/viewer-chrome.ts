import { getStore, safeAction } from '../store-bridge'
import type { VowelInstance } from '../types'

/**
 * Registers presentation toggles that live on `useViewer` (theme, camera, levels, walls, overlays).
 */
export function registerViewerChromeActions(vowel: VowelInstance) {
  vowel.registerAction(
    'setTheme',
    {
      description: 'Set light or dark UI theme',
      parameters: {
        theme: { type: 'string', description: 'light or dark' },
      },
    },
    async ({ theme }: { theme: string }) => {
      return safeAction(
        () => {
          const getV = getStore('viewer')
          if (!getV) return { success: false, error: 'Store not available' }
          if (theme !== 'light' && theme !== 'dark') {
            return { success: false, error: 'theme must be light or dark' }
          }
          getV().setTheme(theme)
          return { success: true, message: `Theme: ${theme}` }
        },
        { success: false, error: 'Failed to set theme' },
      )
    },
  )

  vowel.registerAction(
    'setCameraMode',
    {
      description: 'Perspective or orthographic 3D camera',
      parameters: {
        cameraMode: { type: 'string', description: 'perspective or orthographic' },
      },
    },
    async ({ cameraMode }: { cameraMode: string }) => {
      return safeAction(
        () => {
          const getV = getStore('viewer')
          if (!getV) return { success: false, error: 'Store not available' }
          if (cameraMode !== 'perspective' && cameraMode !== 'orthographic') {
            return { success: false, error: 'cameraMode must be perspective or orthographic' }
          }
          getV().setCameraMode(cameraMode)
          return { success: true, message: `Camera: ${cameraMode}` }
        },
        { success: false, error: 'Failed to set camera mode' },
      )
    },
  )

  vowel.registerAction(
    'setLevelMode',
    {
      description: 'How multiple levels are displayed: stacked, exploded, solo, or manual',
      parameters: {
        levelMode: {
          type: 'string',
          description: 'stacked | exploded | solo | manual',
        },
      },
    },
    async ({ levelMode }: { levelMode: string }) => {
      return safeAction(
        () => {
          const getV = getStore('viewer')
          if (!getV) return { success: false, error: 'Store not available' }
          const ok = ['stacked', 'exploded', 'solo', 'manual'] as const
          if (!ok.includes(levelMode as (typeof ok)[number])) {
            return { success: false, error: `Invalid levelMode: ${levelMode}` }
          }
          getV().setLevelMode(levelMode as (typeof ok)[number])
          return { success: true, message: `Level mode: ${levelMode}` }
        },
        { success: false, error: 'Failed to set level mode' },
      )
    },
  )

  vowel.registerAction(
    'setWallMode',
    {
      description: 'Wall display: up (full height), cutaway, or down (low)',
      parameters: {
        wallMode: { type: 'string', description: 'up | cutaway | down' },
      },
    },
    async ({ wallMode }: { wallMode: string }) => {
      return safeAction(
        () => {
          const getV = getStore('viewer')
          if (!getV) return { success: false, error: 'Store not available' }
          const ok = ['up', 'cutaway', 'down'] as const
          if (!ok.includes(wallMode as (typeof ok)[number])) {
            return { success: false, error: `Invalid wallMode: ${wallMode}` }
          }
          getV().setWallMode(wallMode as (typeof ok)[number])
          return { success: true, message: `Wall mode: ${wallMode}` }
        },
        { success: false, error: 'Failed to set wall mode' },
      )
    },
  )

  vowel.registerAction(
    'setShowScans',
    {
      description: 'Toggle scan / mesh overlay visibility',
      parameters: {
        show: { type: 'boolean', description: 'true to show scans' },
      },
    },
    async ({ show }: { show: boolean }) => {
      return safeAction(
        () => {
          const getV = getStore('viewer')
          if (!getV) return { success: false, error: 'Store not available' }
          getV().setShowScans(Boolean(show))
          return { success: true, message: `Scans ${show ? 'on' : 'off'}` }
        },
        { success: false, error: 'Failed to set showScans' },
      )
    },
  )

  vowel.registerAction(
    'setShowGuides',
    {
      description: 'Toggle floor plan / guide overlay visibility',
      parameters: {
        show: { type: 'boolean', description: 'true to show guides' },
      },
    },
    async ({ show }: { show: boolean }) => {
      return safeAction(
        () => {
          const getV = getStore('viewer')
          if (!getV) return { success: false, error: 'Store not available' }
          getV().setShowGuides(Boolean(show))
          return { success: true, message: `Guides ${show ? 'on' : 'off'}` }
        },
        { success: false, error: 'Failed to set showGuides' },
      )
    },
  )

  vowel.registerAction(
    'setShowGrid',
    {
      description: 'Toggle ground grid visibility',
      parameters: {
        show: { type: 'boolean', description: 'true to show grid' },
      },
    },
    async ({ show }: { show: boolean }) => {
      return safeAction(
        () => {
          const getV = getStore('viewer')
          if (!getV) return { success: false, error: 'Store not available' }
          getV().setShowGrid(Boolean(show))
          return { success: true, message: `Grid ${show ? 'on' : 'off'}` }
        },
        { success: false, error: 'Failed to set showGrid' },
      )
    },
  )

  vowel.registerAction(
    'setDebugColors',
    {
      description: 'Toggle debug vertex colors on meshes (developer visualization)',
      parameters: {
        enabled: { type: 'boolean', description: 'true to enable' },
      },
    },
    async ({ enabled }: { enabled: boolean }) => {
      return safeAction(
        () => {
          const getV = getStore('viewer')
          if (!getV) return { success: false, error: 'Store not available' }
          getV().setDebugColors(Boolean(enabled))
          return { success: true, message: `Debug colors ${enabled ? 'on' : 'off'}` }
        },
        { success: false, error: 'Failed to set debug colors' },
      )
    },
  )
}
