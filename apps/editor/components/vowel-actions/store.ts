'use client'

import { useScene } from '@pascal-app/core'
import { useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'

type GetSceneState = typeof useScene.getState
type GetViewerState = typeof useViewer.getState
type GetEditorState = typeof useEditor.getState

/**
 * Returns Zustand `getState` for the named store.
 *
 * Uses **static imports** so Next.js / Turbopack always bundle `useScene`, `useViewer`,
 * and `useEditor`. The previous `require()`-based lookup often returned `null` in the
 * client build (ESM + bundler), which surfaced as "Stores not available" in Vowel actions.
 */
export function getStore(name: 'scene'): GetSceneState | null
export function getStore(name: 'viewer'): GetViewerState | null
export function getStore(name: 'editor'): GetEditorState | null
export function getStore(name: string): GetSceneState | GetViewerState | GetEditorState | null
export function getStore(name: string): GetSceneState | GetViewerState | GetEditorState | null {
  if (typeof window === 'undefined') return null
  if (name === 'editor') return useEditor.getState
  if (name === 'viewer') return useViewer.getState
  return useScene.getState
}
