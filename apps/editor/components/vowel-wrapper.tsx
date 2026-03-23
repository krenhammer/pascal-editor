'use client'

import { createNextJSAdapters } from '@vowel.to/client'
import { useSyncContext, VowelAgent, VowelProvider } from '@vowel.to/client/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const ROUTES = [{ path: '/', description: 'Editor - Main 3D building editor' }]

interface VowelInstance {
  updateContext: (context: any) => void
  registerAction: (name: string, config: any, handler: any) => void
}

let vowelInstance: VowelInstance | null = null
let initialized = false

function getStore(name: string) {
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

function buildVowelContext() {
  if (typeof window === 'undefined') {
    return { route: { pathname: '/', pathnameLabel: 'Editor', search: '' } }
  }

  const pathname = window.location.pathname

  try {
    const getEditorState = getStore('editor')
    const phase = getEditorState?.()?.phase || 'structure'
    const tool = getEditorState?.()?.tool || null
    return {
      route: {
        pathname,
        pathnameLabel: pathname === '/' ? 'Editor' : pathname,
        search: window.location.search,
      },
      editor: { phase, tool },
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

function safeAction<T>(action: () => T, fallback: T): T {
  try {
    return action()
  } catch (error) {
    console.warn('[Vowel] Action failed:', error)
    return fallback
  }
}

function registerCustomActions(vowel: VowelInstance) {
  vowel.registerAction(
    'getEditorState',
    {
      description: 'Get current editor state (phase, mode, tool, selection)',
      parameters: {},
    },
    async () => {
      return safeAction(
        () => {
          const getEditorState = getStore('editor')
          const getViewerState = getStore('viewer')
          const getSceneState = getStore('scene')

          if (!getEditorState || !getViewerState || !getSceneState) {
            return { success: false, error: 'Stores not available' }
          }

          const editor = getEditorState()
          const viewer = getViewerState()
          const scene = getSceneState()

          const buildingId = viewer?.selection?.buildingId
          const levelId = viewer?.selection?.levelId

          let buildingName = 'None'
          let levelName = 'None'

          if (buildingId && scene?.nodes?.[buildingId]) {
            const buildingNode = scene.nodes[buildingId] as any
            buildingName = buildingNode?.name || buildingId
          }
          if (levelId && scene?.nodes?.[levelId]) {
            const levelNode = scene.nodes[levelId] as any
            levelName = levelNode?.name || `Level ${levelNode?.level}` || levelId
          }

          return {
            success: true,
            phase: editor?.phase,
            mode: editor?.mode,
            tool: editor?.tool,
            structureLayer: editor?.structureLayer,
            selectedBuilding: buildingName,
            selectedLevel: levelName,
            selectedIds: viewer?.selection?.selectedIds,
            totalNodes: Object.keys(scene?.nodes || {}).length,
          }
        },
        { success: false, error: 'Failed to get editor state' },
      )
    },
  )

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
          getEditorState().setPhase(phase as any)
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
          getEditorState().setMode(mode as any)
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
          getEditorState().setTool(tool as any)
          return { success: true, message: `Selected ${tool} tool` }
        },
        { success: false, error: 'Failed to set tool' },
      )
    },
  )

  vowel.registerAction(
    'selectLevel',
    {
      description: 'Select a level by index',
      parameters: {
        levelIndex: { type: 'number', description: 'Level index (0 for ground floor)' },
      },
    },
    async ({ levelIndex }: { levelIndex: number }) => {
      return safeAction(
        () => {
          const getViewerState = getStore('viewer')
          const getSceneState = getStore('scene')

          if (!getViewerState || !getSceneState) {
            return { success: false, error: 'Stores not available' }
          }

          const viewer = getViewerState()
          const scene = getSceneState()

          const buildingId = viewer?.selection?.buildingId
          if (!buildingId) return { success: false, error: 'No building selected' }

          const building = scene?.nodes?.[buildingId]
          if (!building || building.type !== 'building') {
            return { success: false, error: 'Invalid building' }
          }

          const levelIds =
            building.children?.filter((id: string) => {
              const node = scene?.nodes?.[id]
              return node?.type === 'level'
            }) || []

          if (levelIndex >= levelIds.length) {
            return {
              success: false,
              error: `Level ${levelIndex} does not exist. Available: 0-${levelIds.length - 1}`,
            }
          }

          const targetLevelId = levelIds[levelIndex]
          viewer.setSelection({ levelId: targetLevelId })

          return { success: true, message: `Selected level ${levelIndex}` }
        },
        { success: false, error: 'Failed to select level' },
      )
    },
  )

  vowel.registerAction(
    'selectBuilding',
    {
      description: 'Select a building by ID',
      parameters: {
        buildingId: { type: 'string', description: 'Building ID to select' },
      },
    },
    async ({ buildingId }: { buildingId: string }) => {
      return safeAction(
        () => {
          const getViewerState = getStore('viewer')
          const getSceneState = getStore('scene')

          if (!getViewerState || !getSceneState) {
            return { success: false, error: 'Stores not available' }
          }

          const scene = getSceneState()
          const building = scene?.nodes?.[buildingId]

          if (!building || building.type !== 'building') {
            return { success: false, error: `Building not found: ${buildingId}` }
          }

          getViewerState().setSelection({ buildingId, selectedIds: [] })
          return { success: true, message: `Selected building: ${buildingId}` }
        },
        { success: false, error: 'Failed to select building' },
      )
    },
  )

  vowel.registerAction(
    'deleteSelected',
    {
      description: 'Delete the currently selected elements',
      parameters: {},
    },
    async () => {
      return safeAction(
        () => {
          const getViewerState = getStore('viewer')
          const getSceneState = getStore('scene')

          if (!getViewerState || !getSceneState) {
            return { success: false, error: 'Stores not available' }
          }

          const viewer = getViewerState()
          const scene = getSceneState()
          const selectedIds = viewer?.selection?.selectedIds

          if (!selectedIds || selectedIds.length === 0) {
            return { success: false, error: 'Nothing selected to delete' }
          }

          for (const id of selectedIds) {
            scene.deleteNode(id)
          }

          viewer.setSelection({ selectedIds: [] })
          return { success: true, message: `Deleted ${selectedIds.length} element(s)` }
        },
        { success: false, error: 'Failed to delete' },
      )
    },
  )

  vowel.registerAction(
    'getSceneInfo',
    {
      description: 'Get information about the current scene (buildings, levels, elements)',
      parameters: {},
    },
    async () => {
      return safeAction(
        () => {
          const getSceneState = getStore('scene')
          const getViewerState = getStore('viewer')

          if (!getSceneState || !getViewerState) {
            return { success: false, error: 'Stores not available' }
          }

          const scene = getSceneState()
          const viewer = getViewerState()

          const rootId = scene?.rootNodeIds?.[0]
          const site = rootId ? scene?.nodes?.[rootId] : null
          const buildings =
            site?.children?.filter((id: string) => {
              const node = scene?.nodes?.[id]
              return node?.type === 'building'
            }) || []

          const buildingInfo = buildings.map((id: string) => {
            const building = scene.nodes[id] as any
            const levels =
              building.children?.filter((cid: string) => {
                const node = scene?.nodes?.[cid]
                return node?.type === 'level'
              }) || []
            return {
              id,
              name: building?.name || id,
              levelCount: levels.length,
              levels: levels.map((lid: string) => {
                const level = scene.nodes[lid] as any
                return {
                  id: lid,
                  name: level?.name || `Level ${level?.level}`,
                  level: level?.level,
                }
              }),
            }
          })

          const currentBuildingId = viewer?.selection?.buildingId
          const currentLevelId = viewer?.selection?.levelId

          return {
            success: true,
            siteName: (site as any)?.name || 'Untitled Site',
            buildingCount: buildings.length,
            buildings: buildingInfo,
            currentBuildingId,
            currentLevelId,
            selectedCount: viewer?.selection?.selectedIds?.length || 0,
          }
        },
        { success: false, error: 'Failed to get scene info' },
      )
    },
  )

  vowel.registerAction(
    'undo',
    {
      description: 'Undo the last action in the editor',
      parameters: {},
    },
    async () => {
      return safeAction(
        () => {
          const getSceneState = getStore('scene')
          if (!getSceneState) return { success: false, error: 'Store not available' }
          const history = (getSceneState as any).history
          if (history?.undo) {
            history.undo()
            return { success: true, message: 'Undone last action' }
          }
          return { success: false, error: 'No history available or nothing to undo' }
        },
        { success: false, error: 'Failed to undo' },
      )
    },
  )

  vowel.registerAction(
    'redo',
    {
      description: 'Redo the last undone action in the editor',
      parameters: {},
    },
    async () => {
      return safeAction(
        () => {
          const getSceneState = getStore('scene')
          if (!getSceneState) return { success: false, error: 'Store not available' }
          const history = (getSceneState as any).history
          if (history?.redo) {
            history.redo()
            return { success: true, message: 'Redone last action' }
          }
          return { success: false, error: 'No history available or nothing to redo' }
        },
        { success: false, error: 'Failed to redo' },
      )
    },
  )
}

function EditorStateSync() {
  const syncContext = useSyncContext()

  useEffect(() => {
    if (!syncContext) return

    const updateContext = () => {
      const getEditorState = getStore('editor')
      const getViewerState = getStore('viewer')

      if (!getEditorState || !getViewerState) return

      const editor = getEditorState()
      const viewer = getViewerState()

      syncContext({
        editor: {
          phase: editor?.phase || 'structure',
          mode: editor?.mode || 'build',
          tool: editor?.tool,
          structureLayer: editor?.structureLayer,
        },
        viewer: {
          selectedIds: viewer?.selection?.selectedIds || [],
          buildingId: viewer?.selection?.buildingId,
          levelId: viewer?.selection?.levelId,
        },
      })
    }

    updateContext()

    const interval = setInterval(updateContext, 2000)
    return () => clearInterval(interval)
  }, [syncContext])

  return null
}

function VowelInitializer({ appId }: { appId: string }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialized || !appId || typeof window === 'undefined') return

    try {
      const { navigationAdapter } = createNextJSAdapters(router, {
        routes: ROUTES,
        enableAutomation: false,
      })

      const Vowel = (window as any).Vowel
      if (!Vowel) {
        console.error('[Vowel] Vowel not found on window')
        setError('Vowel SDK not loaded')
        return
      }

      vowelInstance = new Vowel({
        appId: appId,
        instructions: `You are a helpful voice assistant for the Pascal 3D Building Editor.

## CRITICAL: Write to App Store, Not DOM
When performing actions, write to the application store/state, NOT manipulate the DOM directly.

## Context
The <context> section is automatically updated with the current editor state. Always check it for the latest information.

## Available Actions:
- getEditorState: Get current editor state (phase, mode, tool, selection)
- getSceneInfo: Get scene overview (buildings, levels count)
- setPhase: Switch phase (site, structure, furnish)
- setMode: Switch mode (select, edit, delete, build)
- setTool: Select tool (wall, door, window, slab, zone, item, etc.)
- selectBuilding: Select a building by ID
- selectLevel: Select level by index (0=ground floor)
- deleteSelected: Delete selected elements
- undo: Undo last action
- redo: Redo last undone action

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

      registerCustomActions(vowelInstance)
      vowelInstance.updateContext(buildVowelContext())

      initialized = true
      setReady(true)
      console.log('[Vowel] Client initialized successfully')
    } catch (err) {
      console.error('[Vowel] Initialization failed:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [appId, router])

  if (error) {
    console.warn('[Vowel] Initialization error (failing open):', error)
  }

  if (!ready) return null

  return <EditorStateSync />
}

export function VowelAppWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    <VowelProvider client={vowelInstance}>
      <VowelInitializer appId={appId} />
      {children}
      <VowelAgent position="bottom-right" enableFloatingCursor={false} />
    </VowelProvider>
  )
}
