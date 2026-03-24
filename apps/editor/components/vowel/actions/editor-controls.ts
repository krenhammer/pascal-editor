import {
  type CatalogCategory,
  findCatalogItemBySrc,
  type Mode,
  type Phase,
  type SidebarPanelId,
  type StructureLayer,
  type Tool,
} from '@pascal-app/editor'
import { getStore, safeAction } from '../store-bridge'
import type { VowelInstance } from '../types'

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

  vowel.registerAction(
    'setStructureLayer',
    {
      description: 'In structure phase: zones layer vs elements layer (drives default tool)',
      parameters: {
        layer: { type: 'string', description: 'zones or elements' },
      },
    },
    async ({ layer }: { layer: string }) => {
      return safeAction(
        () => {
          const getEditorState = getStore('editor')
          if (!getEditorState) return { success: false, error: 'Store not available' }
          if (layer !== 'zones' && layer !== 'elements') {
            return { success: false, error: 'layer must be zones or elements' }
          }
          getEditorState().setStructureLayer(layer as StructureLayer)
          return { success: true, message: `Structure layer: ${layer}` }
        },
        { success: false, error: 'Failed to set structure layer' },
      )
    },
  )

  vowel.registerAction(
    'setSidebarPanel',
    {
      description: 'Switch left sidebar tab: site tree or settings',
      parameters: {
        panel: { type: 'string', description: 'site or settings' },
      },
    },
    async ({ panel }: { panel: string }) => {
      return safeAction(
        () => {
          const getEditorState = getStore('editor')
          if (!getEditorState) return { success: false, error: 'Store not available' }
          if (panel !== 'site' && panel !== 'settings') {
            return { success: false, error: 'panel must be site or settings' }
          }
          getEditorState().setSidebarPanel(panel as SidebarPanelId)
          return { success: true, message: `Sidebar: ${panel}` }
        },
        { success: false, error: 'Failed to set sidebar panel' },
      )
    },
  )

  vowel.registerAction(
    'setPreviewMode',
    {
      description: 'Enter or exit preview (viewer-like) mode inside the editor',
      parameters: {
        preview: { type: 'boolean', description: 'true to enter preview' },
      },
    },
    async ({ preview }: { preview: boolean }) => {
      return safeAction(
        () => {
          const getEditorState = getStore('editor')
          if (!getEditorState) return { success: false, error: 'Store not available' }
          getEditorState().setPreviewMode(Boolean(preview))
          return { success: true, message: preview ? 'Preview on' : 'Preview off' }
        },
        { success: false, error: 'Failed to set preview mode' },
      )
    },
  )

  vowel.registerAction(
    'setCatalogCategory',
    {
      description: 'Furnish item catalog category (when tool is item)',
      parameters: {
        category: {
          type: 'string',
          description:
            'furniture | appliance | bathroom | kitchen | outdoor | window | door — or empty to clear',
        },
      },
    },
    async ({ category }: { category: string }) => {
      return safeAction(
        () => {
          const getEditorState = getStore('editor')
          if (!getEditorState) return { success: false, error: 'Store not available' }
          const valid: CatalogCategory[] = [
            'furniture',
            'appliance',
            'bathroom',
            'kitchen',
            'outdoor',
            'window',
            'door',
          ]
          const c = category?.trim()
          if (!c) {
            getEditorState().setCatalogCategory(null)
            return { success: true, message: 'Catalog category cleared' }
          }
          if (!valid.includes(c as CatalogCategory)) {
            return { success: false, error: `Invalid category: ${c}` }
          }
          getEditorState().setCatalogCategory(c as CatalogCategory)
          return { success: true, message: `Catalog: ${c}` }
        },
        { success: false, error: 'Failed to set catalog category' },
      )
    },
  )

  vowel.registerAction(
    'setSelectedReferenceId',
    {
      description: 'Site panel reference attachment selection (or clear)',
      parameters: {
        referenceId: { type: 'string', description: 'Reference node id, or empty to clear' },
      },
    },
    async ({ referenceId }: { referenceId: string }) => {
      return safeAction(
        () => {
          const getEditorState = getStore('editor')
          if (!getEditorState) return { success: false, error: 'Store not available' }
          const id = referenceId?.trim() || null
          getEditorState().setSelectedReferenceId(id)
          return { success: true, message: id ? `Reference ${id}` : 'Reference cleared' }
        },
        { success: false, error: 'Failed to set reference' },
      )
    },
  )

  vowel.registerAction(
    'setSelectedCatalogItem',
    {
      description:
        'Pick furnish catalog item by exact src path (e.g. /items/tesla/model.glb). Omit or empty src to clear.',
      parameters: {
        src: { type: 'string', description: 'Asset src from catalog, or empty to clear' },
      },
    },
    async ({ src }: { src?: string }) => {
      return safeAction(
        () => {
          const getEditorState = getStore('editor')
          if (!getEditorState) return { success: false, error: 'Store not available' }
          const s = src?.trim()
          if (!s) {
            getEditorState().setSelectedItem(null)
            return { success: true, message: 'Catalog selection cleared' }
          }
          const item = findCatalogItemBySrc(s)
          if (!item) {
            return { success: false, error: `No catalog item for src: ${s}` }
          }
          getEditorState().setSelectedItem(item)
          return { success: true, message: `Selected catalog item` }
        },
        { success: false, error: 'Failed to set catalog item' },
      )
    },
  )

  vowel.registerAction(
    'setEditingHole',
    {
      description: 'Start or stop slab/ceiling hole editing mode',
      parameters: {
        nodeId: { type: 'string', description: 'Polygon node id, or empty to clear' },
        holeIndex: { type: 'number', description: 'Hole index; omit with empty nodeId to clear' },
      },
    },
    async ({ nodeId, holeIndex }: { nodeId?: string; holeIndex?: number }) => {
      return safeAction(
        () => {
          const getEditorState = getStore('editor')
          if (!getEditorState) return { success: false, error: 'Store not available' }
          const id = nodeId?.trim()
          if (!id) {
            getEditorState().setEditingHole(null)
            return { success: true, message: 'Hole editing cleared' }
          }
          if (typeof holeIndex !== 'number' || holeIndex < 0) {
            return { success: false, error: 'holeIndex must be a non-negative number' }
          }
          getEditorState().setEditingHole({ nodeId: id, holeIndex })
          return { success: true, message: `Editing hole ${holeIndex} on ${id}` }
        },
        { success: false, error: 'Failed to set editing hole' },
      )
    },
  )
}
