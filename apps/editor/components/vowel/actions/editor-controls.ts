import type { Mode, Phase, Tool } from '@pascal-app/editor'
import type { VowelInstance } from '../types'
import { getStore, safeAction } from '../store-bridge'

/**
 * Registers phase, mode, and tool switching actions for the Pascal editor chrome.
 */
export function registerEditorControlActions(vowel: VowelInstance) {
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
          getEditorState().setPhase(phase as Phase)
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
          getEditorState().setMode(mode as Mode)
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
          getEditorState().setTool(tool as Tool)
          return { success: true, message: `Selected ${tool} tool` }
        },
        { success: false, error: 'Failed to set tool' },
      )
    },
  )
}
