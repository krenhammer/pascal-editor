import { safeAction } from './helpers'
import { getStore } from './store'
import type { VowelClient } from './types'

/**
 * Site property-line polygon: edit mode toggle and vertex CRUD.
 */
export function registerPropertyLineActions(vowel: VowelClient) {
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
      description: 'Remove a property-line vertex by index. Polygon must keep at least 3 corners.',
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
