import { getStore } from './store'

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
