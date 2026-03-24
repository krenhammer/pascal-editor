'use client'

import { type AnyNodeId, GuideNode, ScanNode, saveAsset, useScene } from '@pascal-app/core'

import { useUploadStore } from '../store/use-upload'

/**
 * Persists a scan or floorplan image to IndexedDB (`saveAsset` → `asset://` URL) and
 * attaches a {@link ScanNode} or {@link GuideNode} under the given level.
 *
 * Used as the default {@link SitePanelProps.onUploadAsset} when the host app does not
 * supply cloud upload (e.g. standalone `apps/editor` home page).
 *
 * @param _projectId — Reserved for cloud backends; ignored for local storage.
 * @param levelId — Parent level node id.
 * @param file — Uploaded file (.glb/.gltf for scans, image/* for guides).
 * @param type — `scan` or `guide` (already inferred in the site panel from extension/MIME).
 */
export function handleLocalLevelAssetUpload(
  _projectId: string,
  levelId: string,
  file: File,
  type: 'scan' | 'guide',
): void {
  const upload = useUploadStore.getState()
  upload.startUpload(levelId, type, file.name)
  upload.setStatus(levelId, 'uploading')
  upload.setProgress(levelId, 5)

  void (async () => {
    try {
      upload.setProgress(levelId, 30)
      const url = await saveAsset(file)
      upload.setProgress(levelId, 70)

      const baseName = file.name.replace(/\.[^.]+$/, '')
      const node =
        type === 'guide'
          ? GuideNode.parse({
              url,
              name: baseName || 'Floorplan',
            })
          : ScanNode.parse({
              url,
              name: baseName || 'Scan',
            })

      useScene.getState().createNode(node, levelId as AnyNodeId)
      upload.setProgress(levelId, 100)
      upload.setResult(levelId, url)
    } catch (err) {
      upload.setError(
        levelId,
        err instanceof Error ? err.message : 'Failed to save reference asset',
      )
    }
  })()
}
