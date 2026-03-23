'use client'

import { setVowelBridgeProjectId } from '@pascal-app/editor'
import { createNextJSAdapters, Vowel } from '@vowel.to/client'
import { useSyncContext, VowelAgent, VowelProvider } from '@vowel.to/client/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { buildVowelContext } from '@/components/vowel-actions/context'
import { registerVowelActions } from '@/components/vowel-actions/register'
import { getStore } from '@/components/vowel-actions/store'

const ROUTES = [{ path: '/', description: 'Editor - Main 3D building editor' }]

/**
 * Builds the object passed to {@link useSyncContext} from Zustand stores.
 * Returns null when editor/viewer are not mounted yet.
 */
function buildEditorViewerSyncPayload(): Record<string, unknown> | null {
  const getEditorState = getStore('editor')
  const getViewerState = getStore('viewer')
  if (!getEditorState || !getViewerState) return null

  const editor = getEditorState()
  const viewer = getViewerState()

  return {
    editor: {
      phase: editor?.phase || 'structure',
      mode: editor?.mode || 'build',
      tool: editor?.tool,
      structureLayer: editor?.structureLayer,
      selectedReferenceId: editor?.selectedReferenceId ?? null,
    },
    viewer: {
      selectedIds: viewer?.selection?.selectedIds || [],
      buildingId: viewer?.selection?.buildingId,
      levelId: viewer?.selection?.levelId,
      zoneId: viewer?.selection?.zoneId ?? null,
      cameraMode: viewer?.cameraMode,
      levelMode: viewer?.levelMode,
      wallMode: viewer?.wallMode,
      showScans: viewer?.showScans,
      showGuides: viewer?.showGuides,
    },
  }
}

/**
 * Keeps Vowel session context aligned with editor + viewer state.
 * `useSyncContext` takes the payload each render (see @vowel.to/client typings).
 */
function EditorStateSync() {
  const [syncPayload, setSyncPayload] = useState<Record<string, unknown> | null>(() =>
    typeof window === 'undefined' ? null : buildEditorViewerSyncPayload(),
  )

  useEffect(() => {
    const tick = () => {
      setSyncPayload(buildEditorViewerSyncPayload())
      const gv = getStore('viewer')
      setVowelBridgeProjectId(gv?.()?.projectId ?? null)
    }
    tick()
    const interval = setInterval(tick, 2000)
    return () => clearInterval(interval)
  }, [])

  useSyncContext(syncPayload)
  return null
}

function VowelInitializer({
  appId,
  onClientReady,
}: {
  appId: string
  onClientReady: (client: Vowel) => void
}) {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!appId || typeof window === 'undefined') return

    try {
      const { navigationAdapter } = createNextJSAdapters(router, {
        routes: ROUTES,
        enableAutomation: false,
      })

      const instance = new Vowel({
        appId: appId,
        instructions: `You are a helpful voice assistant for the Pascal 3D Building Editor.

## CRITICAL: Write to App Store, Not DOM
When performing actions, write to the application store/state, NOT manipulate the DOM directly.

## Context
The <context> section is automatically updated with the current editor state. Always check it for the latest information.

## Available Actions:
- getEditorState: Current editor + selection summary
- getSceneInfo: Site id, buildings, levels, per-level references (scan/guide), zones, slabs (id + name), cameras, selection
- setPhase: site | structure | furnish
- setSidebarTab: structure (elements) | furnish | zones — matches S/F/Z sidebar tabs
- setMode: select | edit | delete | build
- setTool: wall, slab, door, window, zone, item, property-line, etc.
- selectBuilding, selectLevel (by index)
- addLevel, deleteLevel (by id or index; never ground floor)
- openUploadScanOrFloorplan: File picker for scan/floorplan (optional levelIndex)
- deleteScanOrGuide, selectReference (id or clear)
- renameNode: Site, building, level, zone, scan, guide, slab display names (slab ids from levels[].slabs)
- renameSelectedSlab: Rename the single selected slab
- createRectangularSlab: width × depth on current level (unit feet or meters; optional origin corner, name)
- translateSlab: Move slab by deltas in X, Z, elevation (unit feet or meters; optional slabId else selection)
- nodeCameraSnapshot: view | capture | clear for site, building, level, or zone node ids
- selectZone, setZoneColor
- setPropertyLineEditing, setPropertyLineVertex, addPropertyLineVertex, deletePropertyLineVertex
- clearMultiSelection: Clears multi-selected canvas objects
- selectSceneNodes: Comma-separated ids or "clear" — outliner / structure tree selection
- setCameraMode: perspective | orthographic
- setLevelDisplayMode: stacked | exploded | solo | manual
- setWallDisplayMode: up | cutaway | down
- setShowScans / setShowGuides: boolean visibility
- cameraOrbit: direction cw or ccw
- cameraTopView: Top-down camera
- deleteSelected, undo, redo

## How to Use:
- Call getSceneInfo for ids (siteId, buildings, levels, references, zones, slabs) before snapshot/rename/delete/move
- Sidebar site/building/level/zone camera menu → nodeCameraSnapshot
- Property line pencil + vertices → setPropertyLineEditing + vertex actions
- Sidebar tabs / zones layer → setSidebarTab
- Add/remove floor → addLevel, deleteLevel
- Upload reference → openUploadScanOrFloorplan
- Toolbar view toggles → setCameraMode, setLevelDisplayMode, setWallDisplayMode, setShowScans, setShowGuides
- Orbit / top view → cameraOrbit, cameraTopView

Help users navigate the 3D editor with voice commands.`,
        navigationAdapter,
        floatingCursor: { enabled: false },
        borderGlow: {
          enabled: true,
          color: 'rgba(99, 102, 241, 0.5)',
          intensity: 30,
          pulse: true,
        },
        _caption: {
          enabled: true,
          position: 'top-center',
          maxWidth: '600px',
          showRole: true,
          showOnMobile: false,
        },
        voiceConfig: {
          provider: 'vowel-prime',
          vowelPrimeConfig: { environment: 'staging' },
          llmProvider: 'groq',
          model: 'openai/gpt-oss-120b',
          voice: 'Timothy',
          language: 'en-US',
          initialGreetingPrompt: `Welcome to the Pascal 3D Building Editor. You can use voice commands to switch tools, change modes, navigate between floors, and manage your building project. Try saying "what tools are available?" or "show me the scene" to get started.`,
        },
        onUserSpeakingChange: (isSpeaking: boolean) => {
          console.log('[Vowel] User speaking:', isSpeaking)
        },
        onAIThinkingChange: (isThinking: boolean) => {
          console.log('[Vowel] AI thinking:', isThinking)
        },
        onAISpeakingChange: (isSpeaking: boolean) => {
          console.log('[Vowel] AI speaking:', isSpeaking)
        },
      })

      registerVowelActions(instance)
      instance.updateContext(buildVowelContext())

      onClientReady(instance)
      setReady(true)
      console.log('[Vowel] Client initialized successfully')
    } catch (err) {
      console.error('[Vowel] Initialization failed:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [appId, router, onClientReady])

  if (error) {
    console.warn('[Vowel] Initialization error (failing open):', error)
  }

  if (!ready) return null

  return <EditorStateSync />
}

export function VowelAppWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [vowelClient, setVowelClient] = useState<Vowel | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const appId = mounted ? process.env.NEXT_PUBLIC_VOWEL_APP_ID : undefined

  if (!appId) {
    return <>{children}</>
  }

  return (
    <VowelProvider client={vowelClient}>
      <VowelInitializer appId={appId} onClientReady={setVowelClient} />
      {children}
      <VowelAgent position="bottom-right" enableFloatingCursor={false} />
    </VowelProvider>
  )
}
