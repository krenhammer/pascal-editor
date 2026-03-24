/**
 * Lazy access to Zustand stores from `@pascal-app/*` packages via `require`, so this module
 * does not create hard import edges that break SSR or tree-shaking boundaries.
 */

/** Node types that exist on the default scaffold before the user adds geometry or objects. */
const STRUCTURAL_SCAFFOLD_TYPES = new Set(['site', 'building', 'level'])

/** Known Zustand roots the Vowel bridge can read without static imports from app packages. */
export type StoreName = 'editor' | 'viewer' | 'scene' | 'commandPalette' | 'sidebarChrome'

/**
 * Resolves the Zustand `getState` accessor for editor, viewer, scene, or editor UI stores.
 *
 * @param name - Store id; `sidebarChrome` is the resizable sidebar width store.
 * @returns `getState` function, or `null` if not in browser or module failed to load.
 */
export function getStore(name: StoreName) {
  if (typeof window === 'undefined') return null

  if (name === 'editor' || name === 'commandPalette' || name === 'sidebarChrome') {
    try {
      const mod = require('@pascal-app/editor')
      if (name === 'editor') return mod.useEditor?.getState
      if (name === 'commandPalette') return mod.useCommandPalette?.getState
      return mod.useSidebarStore?.getState
    } catch {
      return null
    }
  }

  if (name === 'viewer') {
    try {
      const mod = require('@pascal-app/viewer')
      return mod.useViewer?.getState
    } catch {
      return null
    }
  }

  try {
    const mod = require('@pascal-app/core')
    return mod.useScene?.getState
  } catch {
    return null
  }
}

/**
 * Builds the object passed to `vowel.updateContext` from the current URL and editor store.
 * Safe on SSR (returns a minimal route-only context).
 */
export function buildVowelContext() {
  if (typeof window === 'undefined') {
    return { route: { pathname: '/', pathnameLabel: 'Editor', search: '' } }
  }

  const pathname = window.location.pathname

  try {
    const getEditorState = getStore('editor')
    const editor = getEditorState?.()
    const phase = editor?.phase || 'structure'
    const tool = editor?.tool || null
    return {
      route: {
        pathname,
        pathnameLabel: pathname === '/' ? 'Editor' : pathname,
        search: window.location.search,
      },
      editor: {
        phase,
        tool,
        mode: editor?.mode,
        sidebarPanel: editor?.sidebarPanel,
        structureLayer: editor?.structureLayer,
      },
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

/**
 * Wraps a synchronous action body so Vowel handlers never throw; logs and returns `fallback` on error.
 *
 * @typeParam T - Result shape (typically `{ success: boolean, ... }`).
 */
export function safeAction<T>(action: () => T, fallback: T): T {
  try {
    return action()
  } catch (error) {
    console.warn('[Vowel] Action failed:', error)
    return fallback
  }
}

/**
 * True when the scene has no user-authored content (only site/building/level shell, or no nodes).
 * Used for the voice agent opening line and context.
 */
export function isSceneEffectivelyEmpty(): boolean {
  const getSceneState = getStore('scene')
  if (!getSceneState) return true
  const nodes = getSceneState().nodes as Record<string, { type?: string }>
  const keys = Object.keys(nodes || {})
  if (keys.length === 0) return true
  for (const id of keys) {
    const t = nodes[id]?.type
    if (t && !STRUCTURAL_SCAFFOLD_TYPES.has(t)) return false
  }
  return true
}
