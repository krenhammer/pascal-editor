import { getStore } from './store'

/**
 * Hierarchy-only node types. Anything else counts as user-authored scene content
 * for voice greeting and summaries (walls, slabs, zones, scans, etc.).
 */
const STRUCTURAL_NODE_TYPES = new Set(['site', 'building', 'level'])

/**
 * Returns true when the scene graph contains at least one node that is not
 * site/building/level (i.e. the user has added geometry, zones, references, etc.).
 */
export function getSceneHasUserObjects(): boolean {
  const getSceneState = getStore('scene')
  const nodes = getSceneState?.()?.nodes as Record<string, { type?: string }> | undefined
  if (!nodes) return false
  for (const n of Object.values(nodes)) {
    const t = n?.type
    if (t && !STRUCTURAL_NODE_TYPES.has(t)) return true
  }
  return false
}

/**
 * Builds the object passed to Vowel `updateContext` from current window location
 * and editor/viewer store snapshots (when available).
 */
export function buildVowelContext() {
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
      /** Used for the first voice line: empty scene vs continuing work */
      sceneContent: { hasObjects: getSceneHasUserObjects() },
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
