'use client'

import { createNextJSAdapters, Vowel } from '@vowel.to/client'
import { useVowel, VowelAgent, VowelProvider } from '@vowel.to/client/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { buildVowelContext, getStore } from './vowel/store-bridge'
import { registerVowelActions } from './vowel/register-actions'
import type { VowelInstance } from './vowel/types'

const ROUTES = [{ path: '/', description: 'Editor - Main 3D building editor' }]

let vowelInstance: VowelInstance | null = null
let initialized = false

function EditorStateSync() {
  const { updateContext } = useVowel()

  useEffect(() => {
    const pushContext = () => {
      const getEditorState = getStore('editor')
      const getViewerState = getStore('viewer')
      const getCmd = getStore('commandPalette')
      const getSidebar = getStore('sidebarChrome')

      if (!getEditorState || !getViewerState) return

      const editor = getEditorState()
      const viewer = getViewerState()
      const cmd = getCmd?.()
      const sidebar = getSidebar?.()

      updateContext({
        editor: {
          phase: editor?.phase || 'structure',
          mode: editor?.mode || 'build',
          tool: editor?.tool,
          structureLayer: editor?.structureLayer,
          sidebarPanel: editor?.sidebarPanel,
          catalogCategory: editor?.catalogCategory,
          selectedCatalogSrc: editor?.selectedItem?.src ?? null,
          selectedReferenceId: editor?.selectedReferenceId,
          isPreviewMode: editor?.isPreviewMode,
          editingHole: editor?.editingHole,
        },
        viewer: {
          selectedIds: viewer?.selection?.selectedIds || [],
          zoneId: viewer?.selection?.zoneId,
          buildingId: viewer?.selection?.buildingId,
          levelId: viewer?.selection?.levelId,
          theme: viewer?.theme,
          cameraMode: viewer?.cameraMode,
          levelMode: viewer?.levelMode,
          wallMode: viewer?.wallMode,
          showScans: viewer?.showScans,
          showGuides: viewer?.showGuides,
          showGrid: viewer?.showGrid,
          debugColors: viewer?.debugColors,
          projectId: viewer?.projectId,
        },
        ui: {
          commandPaletteOpen: cmd?.open ?? false,
          sidebarWidth: sidebar?.width ?? null,
        },
      })
    }

    pushContext()
    const interval = setInterval(pushContext, 2000)
    return () => clearInterval(interval)
  }, [updateContext])

  return null
}

/**
 * Bootstraps the npm `Vowel` client (not `window.Vowel` — that exists only with the CDN standalone script). Calls `onClientReady` so the parent can pass
 * the instance into `VowelProvider` — the module-level `vowelInstance` alone does not trigger
 * a re-render, and `VowelAgent` renders nothing when context `client` is null.
 */
function VowelInitializer({
  appId,
  onClientReady,
}: {
  appId: string
  onClientReady: (client: VowelInstance) => void
}) {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // React Strict Mode remount: singleton already exists; re-attach so provider state is not stuck null.
    if (initialized && vowelInstance) {
      onClientReady(vowelInstance)
      setReady(true)
      return
    }

    if (!appId || initialized) return

    try {
      const { navigationAdapter } = createNextJSAdapters(router, {
        routes: ROUTES,
        enableAutomation: false,
      })

      const client = new Vowel({
        appId: appId,
        instructions: `You are a helpful voice assistant for the Pascal 3D Building Editor.

## CRITICAL: Concise speech
Keep every response short: default to one brief sentence (or two only if needed). Do not ramble or list everything unless the user asks for detail.

## CRITICAL: Write to App Store, Not DOM
When performing actions, write to the application store/state, NOT manipulate the DOM directly.

## Context
The <context> section is automatically updated with the current editor state. Always check it for the latest information.

## CRITICAL: First utterance in a new session
Before your first spoken reply, call getEditorState once if context might be stale. If sceneIsEffectivelyEmpty is true, your entire first utterance must be exactly: "Lets get started". Otherwise exactly: "Let's continue". No extra words on that first line. After that, follow the concise speech rule.

## Available Actions (use tool/schema names; full params in client):
- getEditorState / getSceneInfo: Read state (getEditorState includes editor.*, viewer.*, ui.*, sceneSummary, sceneIsEffectivelyEmpty)
- setPhase, setMode, setTool, setStructureLayer, setSidebarPanel (site|settings), setPreviewMode, setCatalogCategory, setSelectedReferenceId, setSelectedCatalogItem (by src), setEditingHole
- Viewer: setTheme, setCameraMode, setLevelMode, setWallMode, setShowScans, setShowGuides, setShowGrid, setDebugColors
- Selection: selectBuilding, selectLevel, selectSceneNodes, selectZone, resetViewerSelection, deleteSelected
- Shell: setCommandPaletteOpen, setSidebarWidth, cameraTopView, cameraOrbitClockwise, cameraOrbitCounterClockwise, cameraFocusNode, cameraCaptureNode, generateProjectThumbnail
- Scene: updateSceneNode (partial patch), exportScene
- History: undo, redo

## How to Use:
- "What tools are available?" → getEditorState
- "Show me the scene" → getSceneInfo
- "Switch to structure mode" → setPhase
- "Select wall tool" → setTool
- "Go to second floor" → selectLevel with levelIndex: 1
- "Undo that" → undo
- "Redo" → redo

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
          /**
           * Turn off client-side VAD (no silero / @ricky0123/vad-web in the browser).
           * Matches vowel-react `references/languages-and-vad.md` (`mode: 'disabled'`).
           */
          turnDetection: { mode: 'disabled' },
          initialGreetingPrompt: `First: call getEditorState. Your entire first utterance must be only: "Lets get started" if sceneIsEffectivelyEmpty is true, otherwise only: "Let's continue". No other words. Then wait for the user. Every reply after that: one short concise sentence unless the user asks for more.`,
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

      vowelInstance = client
      registerVowelActions(client)
      client.updateContext(buildVowelContext())

      initialized = true
      onClientReady(client)
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
  const [error, setError] = useState<string | null>(null)
  /** Must live in React state so `VowelProvider` re-receives a non-null `client` after init. */
  const [vowelClient, setVowelClient] = useState<VowelInstance | null>(null)

  const handleClientReady = useCallback((client: VowelInstance) => {
    setVowelClient(client)
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  const appId = mounted ? process.env.NEXT_PUBLIC_VOWEL_APP_ID : undefined

  if (!appId) {
    return <>{children}</>
  }

  if (error) {
    console.warn('[Vowel] Failed to initialize (failing open):', error)
    return <>{children}</>
  }

  return (
    <VowelProvider client={vowelClient}>
      <VowelInitializer appId={appId} onClientReady={handleClientReady} />
      {children}
      <VowelAgent position="bottom-right" enableFloatingCursor={false} />
    </VowelProvider>
  )
}
