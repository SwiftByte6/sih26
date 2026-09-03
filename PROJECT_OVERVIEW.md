# Autonomous Mobile Robot (AMR) Warehouse Simulator
**Project Functional Overview**

This project is an advanced decentralized Autonomous Mobile Robot (AMR) warehouse simulator built with Next.js, React, Zustand, and React-Konva. It enables users to dynamically design a warehouse floor plan and observe simulated AMRs intelligently allocating tasks and navigating the environment using peer-to-peer (P2P) negotiations.

---

## 1. Warehouse Layout Engine (The `warehouseStore`)
- **Interactive Workspace Builder:** Uses React-Konva to render a scalable grid. Users can place and manipulate Shelves, Obstacles, Pallets, Points of Interest (POIs), and Walls.
- **Pathfinding:** Implements an A* algorithm allowing robots to navigate the grid while dynamically avoiding static obstacles and recalculating routes.
- **Simulation Tick Engine:** Drives the simulation via a centralized clock that updates robot positions, resolves spatial conflicts, and triggers P2P message evaluations iteratively.

## 2. Decentralized P2P Communication (`p2pStore`)
- **No Central Coordinator:** Unlike traditional top-down AMR fleets, these robots operate via a Simulated P2P Network, communicating via a decentralized messaging model (`HEARTBEAT`, `TASK_ANNOUNCE`, `TASK_BID`, `STATUS_UPDATE`).
- **Heartbeats & Topology:** Robots broadcast their presence. When a robot dies or drops offline, the peer network detects the lost heartbeat.
- **Task Allocation (Contract Net Protocol):** Unassigned tasks are announced to all active robots. Available robots evaluate their distance, battery life, and payload capability, then submit a `TASK_BID`. Decentralized consensus algorithms execute locally to determine the optimal winning bidder.

## 3. Task Management & Recovery (`taskStore` & `FailureRecoveryManager`)
- **Dynamic Reallocation:** If an assigned robot goes offline, critically depletes its battery, or is unable to find a clear path to the payload, the `FailureRecoveryManager` detects this failure state.
- **P2P Handover:** A failing robot broadcasts a `TASK_HANDOVER_REQUEST`. Available robots on the network evaluate the request, intercept the payload, and resume the task from the failure point without requiring a central server reboot.

## 4. Collision Avoidance (`CollisionCoordinator`)
- **Deterministic Yielding:** As robots move along their paths, a strict multi-step lookahead mechanism detects head-on collisions, intersection bottlenecks, and overlapping paths.
- **Dynamic Priority Rules:** The system attempts to recalculate bypass routes on the fly. If no bypass exists, the robot with a shorter path (or lower priority) gracefully yields (enters a `WAITING` state) until the intersection clears, effectively preventing gridlocks.

## 5. User Interface (UI)
- **Warehouse Map:** Visually renders the simulation grid, robot traversal paths, live telemetry (battery, load, status), and active communication links (visualized as dashed lines).
- **Inspector Panel:** Allows real-time inspection, editing, and spatial transformation of robots, shelves, and walls.
- **Robot Fleet Dashboard:** Displays comprehensive logs of the P2P audit trails, live task bidding results, and robot failure statuses.
