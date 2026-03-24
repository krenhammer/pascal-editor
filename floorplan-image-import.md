
# Floor plan image → Pascal Editor build (multimodal agent playbook)

This document describes how a **multimodal agent** (vision + reasoning) should read a **2D floor plan image** and produce a **valid Pascal Editor scene graph** in stages.

The output format matches what the editor applies via `setScene`: a **`SceneGraph`** with:

- `nodes`: flat `Record<string, AnyNode>`
- `rootNodeIds`: typically `["<siteId>"]`

**Real reference example**: `adu.json` + `adu.png` (Accessory Dwelling Unit)

---

## Coordinate System & Calibration

- Units: **meters**
- Origin: Usually bottom-left or lower-left corner of the building footprint
- Axes: `x` increases to the right, `z` increases upward on the plan (Y = height)
- From the ADU example:
  - Overall building ≈ 7.32 m × 9.0 m (24 ft × 29 ft 6 in)
  - Slab spans roughly `[-5, -4.5]` to `[6, 5]`

**Calibration steps for any new image**:
1. Find a clear dimension on the plan (e.g. "24'-0\"", door width ≈ 0.9 m)
2. Calculate meters per pixel
3. Choose an origin (usually one exterior corner)
4. Snap all wall endpoints and zone vertices to clean meter values when possible
5. Otherwise make one of bedrooms 3m x 3m and scale from there

---

## Hierarchy Convention

```
site → building → level → {slab, zones, walls, guide}
       wall → {doors, windows}
```

All nodes are stored in a flat `nodes` object.

---

## Stage-by-Stage Workflow

### Stage 0 – Guide Image (Background)

Include a faded guide image so the original floor plan remains visible:

```json
"guide_6rbzdujkaz8e86pg": {
  "object": "node",
  "id": "guide_6rbzdujkaz8e86pg",
  "type": "guide",
  "name": "adu",
  "parentId": "level_2pcgfw7ng7rxs135",
  "visible": true,
  "metadata": {},
  "url": "asset://147658e5-3d5d-4ff1-bf83-cd5bcb331cd5",
  "position": [0, 0, 0],
  "rotation": [0, 0, 0],
  "scale": 1.4,
  "opacity": 50
}
```

Add the guide ID to the level's `children` array.

### Stage 1 – Slab + Zones

**Slab** (one structural floor plate):
- Single outer polygon covering the entire walkable area
- `visible`: usually `false` (clean 3D view)
- `elevation`: `0.05`
- `holes`: `[]` in most residential plans

**Zones** (one per room):
- Use exact room names from the plan when legible
- Assign a distinct `color` (hex) for each zone
- Polygons should fill the interior without major gaps or overlaps

**ADU zones example**:
- Bedroom 1, Living, Kitchen, Dining, Bedroom 2, Bathroom, Entry

### Stage 2 – Walls

- Trace exterior and interior walls using shared endpoints at corners and T-junctions
- `height`: `3` (as used in the ADU)
- `frontSide` / `backSide`:
  - Exterior walls → `"exterior"` on the outside face
  - Interior walls → `"interior"` on both sides
- Name walls sequentially: "Wall 1", "Wall 2", etc.

### Stage 3 – Doors & Windows (Parametric)

Use parametric `door` and `window` nodes (preferred over GLB items).

**Common Door settings** (copy from ADU):
- `width`: 0.9, `height`: 2.1
- `position`: `[localDistanceAlongWall, 1.05, 0]`
- `rotation`: `[0, 0, 0]` or `[0, Math.PI, 0]` depending on wall direction
- `side`: `"front"` or `"back"`
- `hingesSide`: `"left"`
- `swingDirection`: `"inward"`
- Include the full `segments`, `handle`, `threshold`, etc. as shown in `adu.json`

**Common Window settings**:
- `position[1]` = vertical center of the window
- `sill`: `true`
- Match width/height from the plan

**Rules**:
- `position[0]` = distance from wall `start` toward `end`
- Add opening ID to `wall.children`
- Set both `parentId` and `wallId` to the host wall

---

## Final Validation Checklist

- [ ] `rootNodeIds` contains exactly one site node
- [ ] Every `parentId` points to an existing node
- [ ] Children symmetry: if A is in B.children, then B is in A.parentId
- [ ] All slabs, zones, walls, and the guide are listed in `level.children`
- [ ] Every door/window appears in exactly one `wall.children`
- [ ] No overlapping openings on the same wall
- [ ] Slab polygon roughly encloses the exterior walls
- [ ] Guide image is scaled and positioned correctly
- [ ] All IDs are unique

---

## Best Practice Tips

- Start by copying the full structure and field defaults from `adu.json`
- Replace only coordinates, names, polygons, and children arrays
- Keep door and window templates exactly as they appear in the ADU file (they are validated and reliable)
- After importing, use the editor’s “Export Scene” to see any automatic cleanups

**Reference**: Load `adu.json` in the Pascal Editor first to see a working real-world example.

This playbook, anchored on the actual `adu.json` + `adu.png`, provides the most practical and accurate guidance for converting any floor plan image into a valid Pascal Editor scene graph.
`