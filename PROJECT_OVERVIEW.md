# Autonomous Mobile Robot (AMR) Warehouse Simulator
**Project Functional & Technical Overview**

This project is an advanced decentralized Autonomous Mobile Robot (AMR) warehouse simulator built with **Next.js**, **React**, **Zustand**, and **React-Konva**. It enables users to dynamically design a warehouse floor plan, configure 3D models, and observe simulated AMRs intelligently allocating tasks and navigating the environment using peer-to-peer (P2P) negotiations.

---

## Key Features & System Modules

### 1. Figma-Style 2D Canvas Navigation & Controls
- **Spacebar Hold Panning:** Holding `Spacebar` transforms the cursor into a grab hand, allowing fluid canvas panning from anywhere regardless of active tool selection.
- **Middle-Mouse Drag:** Click and drag using the middle mouse button for instant canvas navigation.
- **WASD & Arrow Navigation:** Use `Arrow Keys` or `W / A / S / D` to pan the workspace.
- **Figma Zoom & View Shortcuts:**
  - `Ctrl` + `+` / `=` : Zoom In (+20%)
  - `Ctrl` + `-` : Zoom Out (-20%)
  - `Ctrl` + `0` / `Shift` + `1` : Zoom to Fit
  - `Shift` + `0` : Reset View (100% Scale)

### 2. Warehouse Layout & Pathfinding Engine (`warehouseStore`)
- **Interactive Workspace Builder:** Render a scalable 2D/3D grid with customizable Shelves, Obstacles, Pallets, Points of Interest (POIs), Chargers, and Boundary Walls.
- **Dynamic A* Pathfinding (`engine/pathfinding.ts`):** Calculates shortest-path trajectories, automatically falls back to nearest walkable adjacent cells when targets lie on occupied structures, and deconflicts paths dynamically around stationary and moving obstacles.
- **Default Grid Overlay Toggle:** Clean grid toggle controls with configurable grid snap boundaries.

### 3. Decentralized P2P Communication & Contract Net Protocol (`p2pStore` & `SimulatedP2PNetwork`)
- **Per-Robot Isolated Communication Logs:** Independent P2P chat feeds per robot that filter and display messages directly associated with that specific AMR node (`senderId` or `receiverId`).
- **Priority Gated Allocation:** Tasks are processed through a strict priority gate (`URGENT` → `NORMAL` → `LOW`).
- **State-Aware Bidding & Consensus:**
  - Free/Idle robots evaluate distance, battery reserve, and payload capacity to submit competitive `TASK_BID`s.
  - Active/Moving robots submit ineligible bids, ensuring secondary tasks are assigned to free peers (e.g. AMR-02, AMR-03) without fleet stalling.
  - Accelerated re-announcements with incremented `allocationRound` numbers resolve stalled consensus rounds automatically.
- **Coordinate Resolution Guards:** Tasks with unresolvable coordinates (`isTaskResolvable`) are auto-failed gracefully before dispatching.

### 4. Advanced Collision Avoidance & Cooperative Sidestepping (`CollisionCoordinator`)
- **Proactive Ahead-of-Time Deconfliction:** Analyzes projected AMR trajectories to detect future corridor intersections before movements occur.
- **Cooperative Sidestepping:** Idle AMRs blocking active routes receive `YIELD_REQUEST` messages and automatically step into adjacent walkable cells (`idleSidestepRequests`).
- **Adjacent Docking Completion:** Detects when an AMR is adjacent (<= 1 cell) to its pickup or drop POI to execute item pickup/drop without getting blocked by docking geometry.
- **Reactive Dynamic Replanning:** Blocked AMRs automatically compute deconflicted detour paths (`findDeconflictedPathAStar`) around other active peers.

### 5. Component Palette & 3D Assets
- **Spacious Component Palette:** Redesigned bottom bar with card padding (`92x42px`), clean icon/label spacing, and category filters (Robots, Obstacles, Decorations, Favorites).
- **3D Asset Library:** Supports built-in 3D GLTF models including custom AMR robots (`cute_home_robot`, `cyberpunk_robot`, `zeery_delivery`), warehouse shelving units, EV charging stations, forklifts, and industrial machinery.

### 6. Failure Recovery & Task Handover (`FailureRecoveryManager` & `TaskHandoverManager`)
- **Decentralized Task Handover:** When an AMR encounters a critical failure or battery drop, it broadcasts a `TASK_HANDOVER_REQUEST`. Peer AMRs negotiate via P2P consensus to intercept the payload and complete the task without manual server intervention.
