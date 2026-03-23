/**
 * Lazy access to Zustand store getters via dynamic require so this module
 * does not create static import cycles with editor / viewer / core.
 */
export function getStore(name: string) {
  if (typeof window === 'undefined') return null
  const path =
    name === 'editor'
      ? '@pascal-app/editor'
      : name === 'viewer'
        ? '@pascal-app/viewer'
        : '@pascal-app/core'

  try {
    const mod = require(path)
    if (name === 'editor') return mod.useEditor?.getState
    if (name === 'viewer') return mod.useViewer?.getState
    return mod.useScene?.getState
  } catch {
    return null
  }
}
