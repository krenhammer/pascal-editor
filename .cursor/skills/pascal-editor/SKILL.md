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
