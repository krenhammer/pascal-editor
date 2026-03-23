---
name: pascal-editor
description: Guides work on the Pascal Editor V2 monorepo (Turborepo, core/viewer/editor split, scene graph, R3F). Use when editing this repo, adding nodes/systems/renderers/tools, or answering architecture questions. Does not cover vowel-* integration unless the user explicitly asks.
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

## Floorplan Import/Export Workflow

### Scene Graph Format

The Pascal Editor uses a flat node structure with parent references. The export/import format is:

```typescript
type SceneGraph = {
  nodes: Record<string, AnyNode>  // Flat dictionary of all nodes
  rootNodeIds: string[]           // Top-level nodes (usually site node)
}
```

### Node Hierarchy

When creating a scene from a floorplan image, establish this hierarchy:

```
Site (site_*) → Building (building_*) → Level (level_*) → [Walls, Slabs, Doors, Windows, Zones, Items]
```

### Default Dimensions for Floorplan Import

When interpreting a floorplan image without explicit measurements, use these relative defaults:

| Element | Default Value | Notes |
|---------|---------------|-------|
| Wall height | 2.0m | Standard ceiling height |
| Wall thickness | 0.2m | Interior walls |
| Exterior wall thickness | 0.3m | Outer walls |
| Door width | 0.9m | Standard door |
| Door height | 2.1m | Standard door height |
| Window height | 1.5m | Standard window |
| Window sill height | 0.9m | From floor |
| Floor thickness (slab) | 0.15m | Default slab elevation |

### Creating Nodes from Floorplan Image

**Step 1: Analyze the floorplan**
- Identify wall lines (exterior vs interior)
- Detect door/window openings
- Recognize room boundaries for zones
- Estimate scale (assume a standard room is ~4m wide if no scale reference)

**Step 2: Create the hierarchy**
```typescript
import { SiteNode, BuildingNode, LevelNode, WallNode, SlabNode } from '@pascal-app/core'
import { useScene } from '@pascal-app/core'

// Create hierarchy from top down
const level = LevelNode.parse({ level: 0, children: [] })
const building = BuildingNode.parse({ children: [level.id] })
const site = SiteNode.parse({ children: [building] })

// Get the scene actions
const { createNodes } = useScene.getState()

// Create all nodes in a single batch
createNodes([
  { node: site, parentId: null },
  { node: building, parentId: site.id },
  { node: level, parentId: building.id },
])
```

**Step 3: Create walls from detected lines**
```typescript
// Wall coordinates are [x, z] tuples in level coordinate system
// Y is implicitly 0 (floor) to height (ceiling)
const wall = WallNode.parse({
  name: 'Wall 1',
  start: [0, 0],      // [x, z] in meters
  end: [5, 0],        // [x, z] in meters
  height: 2.0,        // meters
  thickness: 0.2,     // meters
})

createNode(wall, level.id)
```

**Step 4: Create slabs for rooms**
```typescript
// Slabs use polygon boundaries [x, z][]
const slab = SlabNode.parse({
  name: 'Living Room Floor',
  polygon: [
    [0, 0],     // corners in CCW or CW order
    [5, 0],
    [5, 4],
    [0, 4],
  ],
  holes: [],    // for interior cutouts
  elevation: 0.05,  // slightly above 0 to avoid z-fighting
})

createNode(slab, level.id)
```

**Step 5: Create doors and windows**
```typescript
import { DoorNode, WindowNode } from '@pascal-app/core'

// Doors are placed at wall-relative positions
const door = DoorNode.parse({
  position: [2.5, 1.05, 0],  // [along wall, height/2, 0]
  width: 0.9,
  height: 2.1,
  wallId: wall.id,
  side: 'front',
  hingesSide: 'left',
  swingDirection: 'inward',
})

createNode(door, level.id)

// Windows are similar
const window = WindowNode.parse({
  position: [1.5, 1.5, 0],  // center at 1.5m height
  width: 1.2,
  height: 1.2,
  wallId: wall.id,
  side: 'front',
})

createNode(window, level.id)
```

**Step 6: Create zones for rooms**
```typescript
import { ZoneNode } from '@pascal-app/core'

const zone = ZoneNode.parse({
  name: 'Living Room',
  polygon: [
    [0, 0],
    [5, 0],
    [5, 4],
    [0, 4],
  ],
  color: '#3b82f6',
})

createNode(zone, level.id)
```

### Exporting a Scene

The scene graph can be exported as JSON:

```typescript
import { useScene } from '@pascal-app/core'

function exportScene(): SceneGraph {
  const { nodes, rootNodeIds } = useScene.getState()
  return { nodes, rootNodeIds }
}

// Save to file
const sceneGraph = exportScene()
const blob = new Blob([JSON.stringify(sceneGraph, null, 2)], { type: 'application/json' })
```

### Loading a Scene

```typescript
import { useScene } from '@pascal-app/core'

function loadScene(sceneGraph: SceneGraph) {
  const { setScene } = useScene.getState()
  setScene(sceneGraph.nodes, sceneGraph.rootNodeIds)
}

// Or from JSON file
const sceneGraph = JSON.parse(await file.text())
loadScene(sceneGraph)
```

### Complete Floorplan Import Example

```typescript
import {
  SiteNode, BuildingNode, LevelNode, WallNode,
  SlabNode, DoorNode, ZoneNode, useScene
} from '@pascal-app/core'

/**
 * Import a floorplan from image analysis results
 * @param walls - Array of {start: [x,z], end: [x,z], thickness?: number}
 * @param rooms - Array of {name: string, polygon: [x,z][]}
 * @param scale - Meters per pixel (or estimated)
 */
export function importFloorplan(
  walls: Array<{start: [number, number], end: [number, number], exterior?: boolean}>,
  rooms: Array<{name: string, polygon: [number, number][]}>,
  scale: number = 0.02  // default: 2cm per pixel if unknown
): SceneGraph {
  const { createNodes } = useScene.getState()

  // Create hierarchy
  const level = LevelNode.parse({ level: 0 })
  const building = BuildingNode.parse({ children: [level.id] })
  const site = SiteNode.parse({ children: [building] })

  const nodes: {node: AnyNode, parentId?: string}[] = [
    { node: site },
    { node: building, parentId: site.id },
    { node: level, parentId: building.id },
  ]

  // Create walls (scaled)
  for (const w of walls) {
    const wall = WallNode.parse({
      start: [w.start[0] * scale, w.start[1] * scale],
      end: [w.end[0] * scale, w.end[1] * scale],
      thickness: w.exterior ? 0.3 : 0.2,
      height: 2.0,
    })
    nodes.push({ node: wall, parentId: level.id })
  }

  // Create slabs and zones for rooms
  for (const room of rooms) {
    const scaledPolygon = room.polygon.map(([x, z]) => [x * scale, z * scale] as [number, number])

    const slab = SlabNode.parse({
      name: `${room.name} Floor`,
      polygon: scaledPolygon,
      elevation: 0.05,
    })
    nodes.push({ node: slab, parentId: level.id })

    const zone = ZoneNode.parse({
      name: room.name,
      polygon: scaledPolygon,
    })
    nodes.push({ node: zone, parentId: level.id })
  }

  createNodes(nodes)

  return { nodes: useScene.getState().nodes, rootNodeIds: [site.id] }
}
```

### Key Points for AI Agents

1. **Always use `.parse()`** - Never construct nodes manually; use `WallNode.parse()`, `SlabNode.parse()`, etc. to ensure IDs and defaults are generated correctly.

2. **Coordinates are in meters** - The editor uses real-world meters. Convert pixels to meters using an estimated or provided scale.

3. **Wall coordinates are 2D** - Walls use `[x, z]` tuples. Height is a separate property. The Y-axis is up (height).

4. **Slab/Zone polygons are arrays of [x, z]** - Define room boundaries as closed polygons (first point does not need to repeat at the end).

5. **Batch creation with `createNodes`** - For importing many nodes, use `createNodes([{node, parentId}, ...])` rather than individual `createNode` calls.

6. **Parent IDs establish hierarchy** - All walls, slabs, doors, windows, zones, and items must have `parentId` set to a level node.

7. **Export includes everything** - The `nodes` dictionary contains all nodes flat; hierarchy is reconstructed via `parentId` references.
