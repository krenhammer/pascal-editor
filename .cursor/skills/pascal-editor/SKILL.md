---
name: pascal-editor
description: Guides work on the Pascal Editor V2 monorepo (Turborepo, core/viewer/editor split, scene graph, R3F). Use when editing this repo, adding nodes/systems/renderers/tools, building or validating scene export JSON (Site→Building→Level, wall-local doors/windows, parentId/children invariants), turning floorplan images into export JSON, or answering architecture questions. Does not cover vowel-* integration unless the user explicitly asks.
---

# Pascal Editor V2

## Out of scope (unless the user asks)

Treat **vowel** integration as separate: `vowel-actions`, `vowel-wrapper`, and related paths under `apps/editor/components/vowel-*` are not part of the default mental model for core/editor/viewer work. Do not assume vowel hooks or patterns when changing schema, systems, or the viewer.

## Monorepo layout

| Path | Role |
|------|------|
| `packages/core` | Schema, `useScene`, systems, events, hooks (`useRegistry`, `useSpatialGrid`), lib — **no UI, no Three** |
| `packages/viewer` | `<Viewer>`, renderers per node type, viewer systems, `useViewer` — **no imports from `apps/editor`** |
| `apps/editor` | Next.js 16 app: tools, editor UI, routes; composes core + viewer |

Full narrative: repo root `CLAUDE.md` or `AGENTS.md`.

## Data flow

```
pointer/keyboard → tool (apps/editor/components/tools/) → useScene mutations
  → core systems recompute geometry → renderers update meshes → useViewer selection/hover
```

## Non-negotiable conventions

- **Flat nodes** — `nodes: Record<id, AnyNode>`; tree via `parentId`.
- **System vs renderer** — Systems own logic and derived state; renderers own meshes/materials. Do not merge concerns.
- **Viewer isolation** — `@pascal-app/viewer` must never import `apps/editor`.
- **Registry** — `useRegistry()` for id → `THREE.Object3D`; avoid scene walks for hot paths.
- **Spatial grid** — `useSpatialGrid` for 2D neighbourhood queries on walls/zones; avoid O(n²) scans where the grid applies.
- **Creating nodes** — `NodeType.parse({ … })` then `createNode(node, parentId)`; do not hand-roll untyped node objects.

## Where to change what

| Task | Primary locations |
|------|-------------------|
| New or changed node shape / validation | `packages/core/schema/` |
| Geometry or constraints for a type | `packages/core/systems/` (`*System`) |
| How something looks in 3D | `packages/viewer/components/renderers/` |
| Selection, levels, cutaways, viewer-only behaviour | `packages/viewer/systems/`, `packages/viewer/store/` |
| User tool or edit interaction | `apps/editor/components/tools/`, `ToolManager` |
| Editor chrome, phases, modes | `apps/editor/store/use-editor.tsx`, `components/editor/` |

## Tech stack (reference)

Three.js (WebGPU) + R3F, Next.js 16, React 19, Zustand + Zundo, Radix + Tailwind 4, Supabase + Drizzle, better-auth, Biome, TypeScript 5.9.

## Agent habits

- Match existing patterns in the touched package; read neighbours before editing.
- Prefer small, task-scoped diffs; do not refactor unrelated vowel or editor code.
- Run builds or typecheck when verifying changes if the user allows; do not start dev servers unless asked.

---

## Scene export JSON (complete reference)

Authoritative schemas live under `packages/core/src/schema/nodes/`. The editor loads arbitrary JSON via `setScene` (with migrations); **hand-written files should still follow the invariants below** so tools, wall cutouts, and selection behave correctly.

### Canonical shape

```typescript
type SceneGraph = {
  nodes: Record<string, AnyNode> // every node by id — flat map
  rootNodeIds: string[] // usually exactly one site id
}
```

Every node includes at least: `object: "node"`, `id`, `type`, `parentId` (`null` or string), `visible`, `metadata` (object). See `BaseNode` in `packages/core/src/schema/base.ts`.

### `rootNodeIds`

- **Intended layout:** `rootNodeIds === [siteId]` — one `type: "site"` node owns the project.
- **Do not** leave a `building` as the only root unless you are intentionally emulating a broken/legacy file; `syncEditorSelectionFromCurrentScene` in `packages/editor/src/lib/scene.ts` expects to resolve `site → building → level` from `rootNodeIds[0]`.
- Any node with `parentId: null` that is **not** listed in `rootNodeIds` is inconsistent (either add it to roots or set a parent).

### Site → Building → Level

| Node | `parentId` | `children` | Notes |
|------|------------|------------|--------|
| **Site** | `null` (and listed in `rootNodeIds`) | Building ids **or** embedded building objects | Zod schema allows **full nested** `BuildingNode` objects in `site.children` (`SiteNode.parse({ children: [building] })`). In **hand-written JSON**, an array of **string ids** (e.g. `["building_…"]`) is fine: the editor resolves strings when walking the graph (`resolve` in `scene.ts`). |
| **Building** | Site’s `id` | **Level ids only** (strings) | `position` / `rotation` are in **site** space. |
| **Level** | Building’s `id` | Ids of walls, slabs, zones, ceilings, roofs, scans, guides, **and** free-standing **items** | Exported scenes often list many node types here; `createNodesAction` also appends ids when parenting. Every id in `level.children` should exist and point back with `parentId === level.id`. |

**Programmatic hierarchy (matches `loadScene` in `use-scene.ts`):**

```typescript
const level = LevelNode.parse({ level: 0, children: [] })
const building = BuildingNode.parse({ children: [level.id] })
const site = SiteNode.parse({ children: [building] }) // embedded building object — still also store `building` in `nodes`

createNodes([
  { node: site, parentId: null },
  { node: building, parentId: site.id },
  { node: level, parentId: building.id },
])
```

### Walls, doors, windows (critical)

**Walls** live under the **level**: `parentId === levelId`. `start` / `end` are `[x, z]` in **level** coordinates (horizontal plane); wall height/thickness are node fields.

**Parametric `door` and `window` nodes** (types `"door"` / `"window"`) are **children of the wall they cut**, not the level:

- Set `parentId` to the wall’s `id` (same as `wallId`).
- Call `createNode(door, wall.id)` — **not** `createNode(door, level.id)`. This matches the door/window tools in `packages/editor/src/components/tools/door/` and `window/`.

**Wall-mounted `item` nodes** (GLB windows, etc.) also use `parentId === wallId` and appear in `wall.children`.

**Wall-local coordinate frame** (see `wallLocalToWorld` in `packages/editor/src/components/tools/door/door-math.ts` and `window/window-math.ts`):

- **Origin** of the wall-local frame: wall **`start`** point in level `[x, z]`.
- **Local X**: distance **along** the wall from `start` toward `end` (meters). A door centered 2 m along a 5 m wall uses `position[0] === 2` (before clamping).
- **Local Y**: height **above the wall base** in meters (not world Y). For doors, the editor uses **`Y = height / 2`** (leaf center); schema describes this as the door center in wall-local space (`DoorNode` description in `packages/core/src/schema/nodes/door.ts`).
- **Local Z**: offset through the wall thickness; **`0` is standard** for centered openings.
- **World position** (for debugging): rotate local `(localX, localY)` by the wall angle in the XZ plane and add `start`, then add slab/level vertical offsets as in `wallLocalToWorld`.

**`side`:** `'front' | 'back'` — which face of the wall the opening sits on; should agree with how the mesh was authored.

**`rotation`:** Typically `[0, y, 0]` with **Y** aligned to the wall heading (door/window tools compute this from the hit normal).

### DoorNode / WindowNode quick fields

- **Door:** `wallId`, `position`, `rotation`, `side`, `width`, `height`, `hingesSide`, `swingDirection`, optional `segments`, frame/handle flags — see `packages/core/src/schema/nodes/door.ts`.
- **Window:** `wallId`, `position` (center in wall-local space), `rotation`, `side`, `width`, `height`, frame + pane ratios — see `packages/core/src/schema/nodes/window.ts`.

Default door height in schema is **2.1** m; floorplan defaults in the table below may use **2.03** m for US doors — both are acceptable if consistent within a file.

### `parentId` ↔ `children` consistency checklist

Before treating a JSON file as **complete**:

1. **Coverage:** Every `id` referenced in any `children` array exists in `nodes`.
2. **Inverse:** For every non-root node, `nodes[node.parentId]` exists (unless `parentId` is null).
3. **Mutual listing:** If `child.parentId === parent.id`, then `parent.children` should include `child.id` (the store’s `createNodesAction` enforces this for new nodes; hand files should match).
4. **No dangling references:** No `wallId` on doors/windows pointing to missing walls.
5. **Single structural root:** Prefer one site in `rootNodeIds`; building `parentId` = that site; each level’s `parentId` = its building.
6. **Orphans:** No extra entries in `nodes` that are never referenced and have a non-null `parentId` pointing to a missing node (delete or fix).

### Container `children` typing (schema vs export)

- Zod `LevelNode` lists specific child id types; **real exports** may still contain **item** ids on the level — treat exported JSON as truth and keep `parentId` consistent.
- `WallNode` schema defaults `children` to item ids; **runtime walls** also list **door** and **window** ids in `children` after tools run.

### Exporting and loading in app code

```typescript
import { useScene } from '@pascal-app/core'

const { nodes, rootNodeIds } = useScene.getState()
const sceneGraph = { nodes, rootNodeIds }

useScene.getState().setScene(sceneGraph.nodes, sceneGraph.rootNodeIds)
```

### Reference demo file

`apps/editor/public/demos/demo_1.json` is maintained as a **complete** example: `rootNodeIds` points at a **site**, building and levels have correct `parentId`, and a parametric **`door`** illustrates wall-local placement and `wall.children`.

---

## Floorplan Import/Export Workflow

### Multimodal floorplan image to export JSON

When the user (or task) provides a **floorplan image** (PNG, JPG, PDF page raster, etc.), treat it as a vision input:

1. **Use multimodal / vision** — Describe and measure the drawing from the image: wall centerlines or thick wall strokes, **room boundaries** (zones), **door** swings and openings, **window** symbols and sill/header cues, stairs, fixtures, and any **dimension strings**, scale bars, or grid spacing.
2. **Relative geometry first** — Even without printed dimensions, infer **topology** (which walls bound which room, door/window placement along a wall as a fraction of wall length) and **proportions** (room A is ~1.2× as wide as room B). Convert to meters only after fixing scale (next step).
3. **Scale when dimensions are missing** — If the plan has **no usable dimensions or scale bar**, **anchor scale to the master bedroom (primary suite)**: assume it is **3 m × 3 m** in real space. Map that room’s pixel width/depth to 3 m to obtain meters-per-pixel (or uniform scale); apply the same scale to the rest of the level. If no room is clearly the master bedroom, pick the **largest labeled bedroom** and still apply **3 m × 3 m** as the calibration anchor unless the user specifies otherwise.
4. **Build the scene** — Follow [Creating Nodes from Floorplan Image](#creating-nodes-from-floorplan-image): hierarchy `Site → Building → Level`, then walls, slabs, zones, then **doors/windows parented to walls**, using [Default Dimensions for Floorplan Import](#default-dimensions-for-floorplan-import) where the drawing is silent.
5. **Deliver as export JSON** — Produce `{ nodes, rootNodeIds }` with **[Export JSON checklist](#parentid--children-consistency-checklist)** satisfied. Prefer `*Node.parse()` + `createNodes` in code; for hand JSON, mirror `demo_1.json` and schema files.

You may emit a **SceneGraph-shaped** JSON without running the editor; validate against the checklist above.

### Default Dimensions for Floorplan Import

When interpreting a floorplan image without explicit measurements, use these defaults (American construction standards). **Overall plan scale** must still be set from dimensions on the drawing or, if none, from the **3 m × 3 m master bedroom** anchor.

| Element | Default Value | Notes |
|---------|---------------|-------|
| Wall height | 2.0m | Editor default; US finished ceiling often ~2.44m / 8ft |
| Wall thickness | 0.12m | Interior 2×4 wall ~0.12m |
| Exterior wall thickness | 0.165m | Exterior 2×6 ~0.165m |
| Door width | 0.91m | Standard interior (36") |
| Door height | 2.03m | 80" slab; schema default for `DoorNode` is 2.1m — pick one per file |
| Window height | 1.22m | Common 48" |
| Window sill height | 0.91m | From floor (36") |
| Slab elevation | 0.05m | Slight lift above 0 to reduce z-fighting |

### Creating Nodes from Floorplan Image

**Step 1 — Analyze** — Walls, openings, rooms, scale (same as earlier workflow).

**Step 2 — Hierarchy** — Use the Site → Building → Level `createNodes` batch shown in [Site → Building → Level](#site--building--level).

**Step 3 — Walls** — `WallNode.parse({ start, end, height, thickness, … })` then `createNode(wall, level.id)`.

**Step 4 — Slabs / zones** — `SlabNode` / `ZoneNode` with polygons `[x,z][]`; parent = **level**.

**Step 5 — Parametric doors and windows**

```typescript
import { DoorNode, WindowNode } from '@pascal-app/core'

const door = DoorNode.parse({
  position: [2.5, doorHeight / 2, 0], // along wall, vertical center, through-wall offset
  width: 0.91,
  height: 2.03,
  wallId: wall.id,
  side: 'front',
  hingesSide: 'left',
  swingDirection: 'inward',
})

createNode(door, wall.id) // parent is the wall

const window = WindowNode.parse({
  position: [1.5, 1.5, 0], // center in wall-local space
  width: 1.2,
  height: 1.2,
  wallId: wall.id,
  side: 'front',
})

createNode(window, wall.id)
```

**Step 6 — Free-standing items** — Furniture on the floor: `createNode(item, level.id)`; `position` is `[x, y, z]` in **level** space (world-like with Y up).

### Complete floorplan import example (correct wall parenting)

```typescript
import {
  SiteNode,
  BuildingNode,
  LevelNode,
  WallNode,
  SlabNode,
  DoorNode,
  ZoneNode,
  useScene,
  type AnyNode,
} from '@pascal-app/core'

export function importFloorplan(
  walls: Array<{ start: [number, number]; end: [number, number]; exterior?: boolean }>,
  rooms: Array<{ name: string; polygon: [number, number][] }>,
  scale = 0.02,
): { nodes: Record<string, AnyNode>; rootNodeIds: string[] } {
  const { createNodes } = useScene.getState()

  const level = LevelNode.parse({ level: 0 })
  const building = BuildingNode.parse({ children: [level.id] })
  const site = SiteNode.parse({ children: [building] })

  const ops: { node: AnyNode; parentId?: string }[] = [
    { node: site, parentId: null },
    { node: building, parentId: site.id },
    { node: level, parentId: building.id },
  ]

  const wallByIndex: WallNode[] = []
  for (const w of walls) {
    const wall = WallNode.parse({
      start: [w.start[0] * scale, w.start[1] * scale],
      end: [w.end[0] * scale, w.end[1] * scale],
      thickness: w.exterior ? 0.165 : 0.12,
      height: 2.0,
    })
    wallByIndex.push(wall)
    ops.push({ node: wall, parentId: level.id })
  }

  for (const room of rooms) {
    const poly = room.polygon.map(([x, z]) => [x * scale, z * scale] as [number, number])
    ops.push({
      node: SlabNode.parse({ name: `${room.name} Floor`, polygon: poly, elevation: 0.05 }),
      parentId: level.id,
    })
    ops.push({
      node: ZoneNode.parse({ name: room.name, polygon: poly }),
      parentId: level.id,
    })
  }

  // Example: first door on first wall, centered
  if (wallByIndex.length > 0) {
    const w0 = wallByIndex[0]!
    const dx = w0.end[0] - w0.start[0]
    const dz = w0.end[1] - w0.start[1]
    const len = Math.hypot(dx, dz)
    const doorW = 0.91
    const doorH = 2.03
    const along = Math.max(doorW / 2, Math.min(len - doorW / 2, len / 2))
    const door = DoorNode.parse({
      position: [along, doorH / 2, 0],
      width: doorW,
      height: doorH,
      wallId: w0.id,
      side: 'front',
    })
    ops.push({ node: door, parentId: w0.id })
  }

  createNodes(ops)
  return { nodes: useScene.getState().nodes, rootNodeIds: [site.id] }
}
```

### Key points for agents

1. **Export JSON is a flat `nodes` map plus `rootNodeIds`** — hierarchy = `parentId` + container `children`.
2. **Site root** — `rootNodeIds: [siteId]`; building.parentId = site; levels parented to building.
3. **Doors/windows** — Wall-local `position`; `parentId` and `wallId` = wall; include id in `wall.children`.
4. **Floor furniture** — `parentId` = level.
5. **Always prefer `NodeType.parse`** when generating from code.
6. **Validate** with the [checklist](#parentid--children-consistency-checklist) before shipping hand-written JSON.
