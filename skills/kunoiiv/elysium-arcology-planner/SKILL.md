---
name: elysium-arcology-planner
description: Canvas-based simulator for orbital arcologies (O'Neill cylinders, fusion reactors, neuralink hubs, exosuit factories). Drag-drop designs, AR node overlays, open-source blueprint exports. Use for: (1) Habitat prototyping, (2) Resource/power calcs, (3) Exosuit/O'Neill blueprints, (4) Elysium-scale humanity sims.
---

# Elysium Arcology Planner

Scale humanity: Design self-sustaining orbital arcologies. Infuse BTC sovereignty—sats-secured blueprints, immersion-cooled mining rigs in habitats.

## Quick Start Workflow

1. **Snapshot canvas**: `canvas action=snapshot` → base UI state.
2. **Present interactive canvas**: `canvas action=present url=arcology.html x=100 y=100 width=1200 height=800` (drag components).
3. **Eval designs**: `canvas action=eval javaScript=simulateGravity(...)` for physics/power sims.
4. **AR overlay**: `nodes action=camera_snap node=desk-cam` → project design via canvas/navigate.
5. **Export blueprint**: `python scripts/export-svg-to-3d.py assets/leg.svg` → FreeCAD/STL.

## Components (Drag from Palette)

- **O'Neill Cylinder**: 8km dia, 32km long, 10k pop. Blueprint: NASA public domain (Toroidal agri-rings). Calc: Spin=1RPM → 1G.
- **Fusion Reactor**: Tokamak/Stellarator. Open-source: Wendelstein 7-X coils (Greifswald data). Output: 1GW, immersion-cooled.
- **Neuralink Hub**: Collective IQ node. Sim: Bandwidth to 1M minds.
- **Exosuit Factory**: OpenExo arms/legs (GitHub: servo+PWM+H-bridges). Print: Replicators → 100/day. Naubiomech leg spec: [naubiomech-leg-spec.md](./references/naubiomech-leg-spec.md).
- **ASIC Mining Bay**: Solar-powered hashrate farms. Tie to BTC node.

## Scripts (Run via exec)

- `scripts/sim-physics.py`: Gravity/power/Coriolis calcs (JSON stdin → metrics). Ex: `echo '{"rpm":1}' | python scripts/sim-physics.py`.
- `scripts/export-svg-to-3d.py`: SVG → FreeCAD JSON/STL (parses leg.svg → extrusions/cyls).

## References (Read as Needed)

- [oneill-blueprints.md](./references/oneill-blueprints.md): NASA Princeton '76 studies.
- [exosuit-openexo.md](./references/exosuit-openexo.md): GitHub BOMs, CAD.
- [fusion-stellarator.md](./references/fusion-stellarator.md): Open plasma designs.
- [naubiomech-leg-spec.md](./references/naubiomech-leg-spec.md): Modular leg BOM/physics.

## Assets

- `assets/components.svg`: Drag icons (cylinder, reactor...).
- `assets/arcology-template.html`: Canvas boilerplate w/ Fabric.js.
- `assets/leg.svg`: Naubiomech leg blueprint.

## Pro Tips

- **Scale sim**: Eval total mass/power/pop/hashrate. Alert if > asteroid belt viable.
- **BTC integration**: Add mining rig—hashrate vs. energy budget.
- **Node AR**: Snap desk cam → overlay design for "print this exosuit".
- **PowerShell Fix**: Use `;` not `&&` for chaining (e.g., `cd dir; python script.py`).
- Iterate: Edit canvas → snapshot → share sats-secured fork (proof-of-share).

Test: `canvas action=present` a basic cylinder + reactor. Boom—Elysium draft.
