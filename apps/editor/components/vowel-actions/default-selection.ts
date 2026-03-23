import { getStore } from './store'

type SceneNode = { type?: string; children?: string[]; level?: number }

/**
 * When the scene has a site → building → level graph but the viewer has no (valid)
 * building/level selection, set the first building and ground floor (level index 0),
 * or the first level child if level 0 is missing.
 *
 * Skips when editor phase is `site`, matching the editor store's site mode (overview
 * clears structural selection; we must not repopulate it on every sync tick).
 *
 * Used so Vowel voice actions that require `viewer.selection.buildingId` / `levelId`
 * work right after init or async scene load without forcing a manual sidebar pick.
 */
export function ensureDefaultBuildingAndLevelSelection(): void {
  const getViewerState = getStore('viewer')
  const getSceneState = getStore('scene')
  const getEditorState = getStore('editor')
  if (!getViewerState || !getSceneState) return

  const phase = getEditorState?.()?.phase
  if (phase === 'site') return

  const viewer = getViewerState()
  const scene = getSceneState()
  if (!viewer?.setSelection || !scene?.nodes || !scene.rootNodeIds?.length) return

  const nodes = scene.nodes as Record<string, SceneNode>
  const sel = viewer.selection
  const buildingId = sel?.buildingId ?? null
  const levelId = sel?.levelId ?? null

  const buildingValid = Boolean(buildingId && nodes[buildingId]?.type === 'building')
  const levelValid = Boolean(levelId && nodes[levelId]?.type === 'level')

  if (buildingValid && levelValid) return

  const siteNode = nodes[scene.rootNodeIds[0]!]
  if (siteNode?.type !== 'site' || !siteNode.children?.length) return

  let defaultBuildingId: string | null = null
  for (const cid of siteNode.children) {
    if (nodes[cid]?.type === 'building') {
      defaultBuildingId = cid
      break
    }
  }
  if (!defaultBuildingId) return

  const bId = buildingValid ? buildingId! : defaultBuildingId
  const buildingNode = nodes[bId]
  if (buildingNode?.type !== 'building' || !buildingNode.children?.length) return

  let lId: string | null = levelValid ? levelId! : null
  if (!levelValid) {
    const levelChildIds = buildingNode.children.filter((cid) => nodes[cid]?.type === 'level')
    const ground = levelChildIds.find((cid) => nodes[cid]?.level === 0)
    lId = ground ?? levelChildIds[0] ?? null
  }

  if (!lId) return

  viewer.setSelection({
    buildingId: bId,
    levelId: lId,
    zoneId: null,
    selectedIds: [],
  })
}
