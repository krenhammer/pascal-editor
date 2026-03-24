import type { AssetInput } from '@pascal-app/core'

import { CATALOG_ITEMS } from '../components/ui/item-catalog/catalog-items'

/**
 * Looks up a catalog entry by its `src` path (e.g. `/items/tesla/model.glb`) for programmatic / voice selection.
 *
 * @param src - Exact `AssetInput.src` string from the catalog.
 * @returns The matching asset or `null` if not found.
 */
export function findCatalogItemBySrc(src: string): AssetInput | null {
  const item = CATALOG_ITEMS.find((i) => i.src === src)
  return item ?? null
}
