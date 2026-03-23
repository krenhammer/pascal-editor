/**
 * Cross-runtime bridge between the Vowel voice layer (apps/editor) and the sidebar upload UI.
 * The voice agent dispatches this event; {@link LevelReferences} listens and opens the hidden file input.
 */
export const VOWEL_OPEN_LEVEL_UPLOAD_EVENT = 'pascal-vowel:open-level-upload' as const

/** Payload for {@link VOWEL_OPEN_LEVEL_UPLOAD_EVENT}. */
export type VowelOpenLevelUploadDetail = {
  /** Target level node id whose upload row should open the file picker. */
  levelId: string
}

/**
 * Dispatched when voice deletes a scan/guide that may still exist in remote storage.
 * Optional: host apps (e.g. Next route with `projectId`) listen and call their storage API.
 * Scene graph removal always happens in the action regardless of listeners.
 */
export const VOWEL_REFERENCE_STORAGE_DELETE_EVENT =
  'pascal-vowel:delete-stored-reference-asset' as const

/** Payload for {@link VOWEL_REFERENCE_STORAGE_DELETE_EVENT}. */
export type VowelReferenceStorageDeleteDetail = {
  url: string
  /** From {@link getVowelBridgeProjectId} when the host calls {@link setVowelBridgeProjectId}. */
  projectId: string | null
}

let vowelBridgeProjectId: string | null = null

/**
 * Sets the active project id for voice-triggered asset cleanup (e.g. Supabase delete).
 * Call from the host when the editor loads a project; clears when leaving the project.
 */
export function setVowelBridgeProjectId(projectId: string | null): void {
  vowelBridgeProjectId = projectId
}

/** Current project id for {@link VOWEL_REFERENCE_STORAGE_DELETE_EVENT}, if the host set it. */
export function getVowelBridgeProjectId(): string | null {
  return vowelBridgeProjectId
}
