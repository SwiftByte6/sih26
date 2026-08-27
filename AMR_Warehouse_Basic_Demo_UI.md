# AMR Warehouse Simulator --- Basic Demo UI

## Goal

Create a **basic demo-only UI** inspired by Cisco Packet Tracer.

This version is **visual only**.

Do NOT implement:

-   Real simulation
-   ROS 2
-   WebSockets
-   Backend
-   AI
-   Map reconstruction
-   Real drag/drop
-   Real task allocation
-   Collision detection
-   Database
-   Authentication

The purpose is only to create a convincing **SIH presentation/prototype
UI**.

------------------------------------------------------------------------

# 1. Overall Style

The application should look like:

> **Cisco Packet Tracer for Autonomous Warehouse Robots**

Use:

-   Light grey application chrome
-   White/light warehouse workspace
-   Thin borders
-   Compact toolbars
-   Small technical text
-   Blue selection accents
-   Bottom component palette
-   Dense engineering-tool layout

Avoid:

-   Large hero sections
-   Gradients
-   Glassmorphism
-   Huge rounded cards
-   Excessive shadows
-   Marketing-style UI

------------------------------------------------------------------------

# 2. Technology

Use only:

``` text
React
TypeScript
Vite
Tailwind CSS
React-Konva
```

For this demo, no backend is required.

Use separate React components.

------------------------------------------------------------------------

# 3. Component Structure

Use this structure:

``` text
src/
├── components/
│   ├── Header/
│   │   ├── TitleBar.tsx
│   │   ├── MenuBar.tsx
│   │   └── Toolbar.tsx
│   │
│   ├── Workspace/
│   │   ├── WarehouseWorkspace.tsx
│   │   ├── WarehouseMap.tsx
│   │   ├── Shelf.tsx
│   │   ├── Robot.tsx
│   │   ├── Obstacle.tsx
│   │   ├── Path.tsx
│   │   └── MapGrid.tsx
│   │
│   ├── Palette/
│   │   ├── ComponentPalette.tsx
│   │   └── PaletteItem.tsx
│   │
│   ├── Inspector/
│   │   ├── InspectorPanel.tsx
│   │   └── RobotDetails.tsx
│   │
│   └── Simulation/
│       ├── SimulationControls.tsx
│       └── FleetStatus.tsx
│
├── pages/
│   └── Simulator.tsx
│
├── data/
│   └── demoWarehouse.ts
│
├── styles/
│   └── globals.css
│
└── App.tsx
```

Keep each visual section as a separate component.

------------------------------------------------------------------------

# 4. Main Application Layout

The main screen should look approximately like:

``` text
┌─────────────────────────────────────────────────────────────┐
│ AMR Warehouse Simulator                                     │
├─────────────────────────────────────────────────────────────┤
│ File  Edit  View  Warehouse  Robot  Simulation  Tools Help │
├─────────────────────────────────────────────────────────────┤
│ New Open Save │ ↶ ↷ │ Select Pan Zoom │ Grid │ ▶ Run       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│                  WAREHOUSE WORKSPACE                        │
│                                                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ COMPONENT PALETTE                                           │
├─────────────────────────────────────────────────────────────┤
│ ▶ Run │ ⏸ Pause │ ■ Stop │ Reset │ Robots: 3 │ Tasks: 6   │
└─────────────────────────────────────────────────────────────┘
```

------------------------------------------------------------------------

# 5. Header

## Title bar

Height:

``` text
32px
```

Text:

``` text
AMR Warehouse Simulator
```

Use:

``` text
font-size: 14px
font-weight: 600
```

Background:

``` text
#D9E1E8
```

------------------------------------------------------------------------

# 6. Menu Bar

Height:

``` text
30px
```

Items:

``` text
File
Edit
View
Warehouse
Robot
Simulation
Tools
Help
```

Use small text:

``` text
12px
```

Each menu item should have subtle hover styling.

No actual menu functionality is required.

------------------------------------------------------------------------

# 7. Toolbar

Height:

``` text
36px
```

Buttons:

``` text
New
Open
Save
Undo
Redo
Select
Pan
Zoom +
Zoom -
Fit
Grid
Run
```

Button size:

``` text
28–32px height
```

Use small icons with labels where appropriate.

------------------------------------------------------------------------

# 8. Main Workspace

The workspace should take approximately:

``` text
70–75% of the screen height
```

Background:

``` text
#F7F8FA
```

Add a subtle grid.

Grid spacing:

``` text
20px
```

Grid lines should be very light.

The warehouse map should appear centered.

------------------------------------------------------------------------

# 9. Demo Warehouse

Create a realistic-looking **2D warehouse layout**.

Example:

``` text
┌──────────────────────────────────────────────────────┐
│                                                      │
│   ┌──────┐     ┌──────┐     ┌──────┐               │
│   │SHELF │     │SHELF │     │SHELF │               │
│   └──────┘     └──────┘     └──────┘               │
│                                                      │
│   ──────────────────────────────────────────────     │
│                                                      │
│        ●────────────●────────────●                   │
│        │            │            │                   │
│        │     🤖R1   │            │                   │
│        │            │      🤖R2  │                   │
│        ●────────────●────────────●                   │
│                         │                            │
│                         │                            │
│                     🧱 OBSTACLE                      │
│                         │                            │
│        ●────────────●───●────────────●              │
│                                                      │
│                    📦 PICKUP                         │
│                                                      │
│                                   🎯 DROP            │
│                                                      │
└──────────────────────────────────────────────────────┘
```

The map should look like an actual warehouse rather than a generic
flowchart.

------------------------------------------------------------------------

# 10. Warehouse Objects

Display these objects visually:

### Shelves

Use rectangular blocks.

``` text
████████
SHELF
████████
```

Use neutral grey.

### Aisles

Represent them with open white/light areas between shelves.

### Paths

Use thin blue lines.

### Intersections

Use small circular nodes.

### Robots

Use simple top-view robot icons.

Example:

``` text
   ▲
 ┌───┐
 │R1 │
 └───┘
```

Use different labels:

``` text
AMR-01
AMR-02
AMR-03
```

### Obstacles

Use a red/orange technical marker.

Example:

``` text
┌────────┐
│   !    │
│OBSTACLE│
└────────┘
```

### Pickup

Use:

``` text
P
```

with label:

``` text
PICKUP
```

### Drop

Use:

``` text
D
```

with label:

``` text
DROP
```

### Charger

Use:

``` text
⚡
CHARGER
```

------------------------------------------------------------------------

# 11. Robot Visual Style

Robot should be one of the strongest visual elements.

Example:

``` text
      ▲
   ┌─────┐
   │ R01 │
   └─────┘
```

Robot label:

``` text
AMR-01
```

Status underneath:

``` text
MOVING
```

Example:

``` text
      ▲
   ┌─────┐
   │ R01 │
   └─────┘
    AMR-01
    MOVING
```

Keep the robot compact.

------------------------------------------------------------------------

# 12. Robot Paths

Show demo paths for each robot.

Example:

``` text
AMR-01
───────────────→

AMR-02
─────────╲
          ╲────→

AMR-03
───────────────→
```

Use thin lines.

Do not make paths visually overpower the warehouse.

------------------------------------------------------------------------

# 13. Right Inspector Panel

Add a compact right-side inspector.

Width:

``` text
220–260px
```

Example:

``` text
┌──────────────────────┐
│ INSPECTOR             │
├──────────────────────┤
│ Selected Robot        │
│                      │
│ AMR-02               │
│                      │
│ Status               │
│ ● Moving             │
│                      │
│ Battery              │
│ ███████████░  78%    │
│                      │
│ Speed                │
│ 1.4 m/s              │
│                      │
│ Current Task         │
│ PICKUP → DROP        │
│                      │
│ Position             │
│ X: 14.2              │
│ Y: 8.4               │
└──────────────────────┘
```

This is visual only.

Use static demo values.

------------------------------------------------------------------------

# 14. Component Palette

The bottom section should strongly resemble the device palette in Cisco
Packet Tracer.

Height:

``` text
90–110px
```

Example:

``` text
┌────────────────────────────────────────────────────────────┐
│ COMPONENTS                                                 │
│                                                            │
│ [🤖 AMR] [▦ SHELF] [■ OBSTACLE] [P PICKUP] [D DROP]       │
│ [⚡ CHARGER] [● INTERSECTION] [│ WALL] [→ PATH]            │
└────────────────────────────────────────────────────────────┘
```

Each item:

``` text
70–100px wide
50–65px high
```

Use a small icon and label.

No actual drag/drop functionality is required.

------------------------------------------------------------------------

# 15. Simulation Bar

At the bottom:

``` text
┌────────────────────────────────────────────────────────────┐
│ ▶ RUN   ⏸ PAUSE   ■ STOP   ↻ RESET     SPEED: 1x          │
└────────────────────────────────────────────────────────────┘
```

Buttons can be non-functional.

Use a blue accent for RUN.

------------------------------------------------------------------------

# 16. Fleet Status Bar

Show static demo metrics:

``` text
Robots: 3
Active: 3
Tasks: 8
Completed: 5
Collisions: 0
Deadlocks: 0
Efficiency: +24%
```

Example:

``` text
┌─────────┬─────────┬─────────┬────────────┬──────────────┐
│ Robots  │ Tasks   │ Active  │ Collisions │ Improvement  │
│    3    │    8    │    3    │     0      │    +24%      │
└─────────┴─────────┴─────────┴────────────┴──────────────┘
```

These are **demo values only**.

------------------------------------------------------------------------

# 17. Map Upload Button

Since the final application will eventually support map upload, show the
UI for it even though it does not need to work.

Toolbar:

``` text
Import Map
```

or:

``` text
File → Import Warehouse Map
```

A visual upload dialog can be designed:

``` text
┌─────────────────────────────────────┐
│ IMPORT WAREHOUSE MAP                │
├─────────────────────────────────────┤
│                                     │
│       ┌───────────────────┐         │
│       │                   │         │
│       │  Drop map here    │         │
│       │                   │         │
│       │  or Browse Files  │         │
│       │                   │         │
│       └───────────────────┘         │
│                                     │
│ Supported: PNG JPG PDF SVG          │
│                                     │
│ [ Cancel ]       [ Preview ]        │
└─────────────────────────────────────┘
```

For the basic demo, this can simply be a visual modal.

------------------------------------------------------------------------

# 18. Map Reconstruction Preview

Show a second demo modal:

``` text
┌────────────────────────────────────────────────┐
│ MAP RECONSTRUCTION                              │
├──────────────────────┬─────────────────────────┤
│ ORIGINAL             │ RECREATED               │
│                      │                         │
│ [floor plan image]   │ [warehouse graph]       │
│                      │                         │
├──────────────────────┴─────────────────────────┤
│ Detected:                                       │
│ Walls: 24    Shelves: 16    Aisles: 8          │
│                                                 │
│ [ Cancel ]                    [ Use Map ]       │
└────────────────────────────────────────────────┘
```

Again, no actual processing is required for this UI demo.

------------------------------------------------------------------------

# 19. Contextual Visual States

Show one or two demo states to make the UI feel alive.

Example conflict:

``` text
           ⚠ CONFLICT
              ↓
AMR-01 ───────●───────
              ↑
AMR-02 ───────●
```

Inspector:

``` text
CONFLICT DETECTED

Location:
Intersection I-04

Robots:
AMR-01
AMR-02

Resolution:
Rerouting AMR-02
```

This can be static.

------------------------------------------------------------------------

# 20. Color Palette

Use:

``` text
Application Chrome
#D9E1E8

Toolbar
#E8EDF1

Workspace
#F7F8FA

Panel
#E3E8EC

Border
#9AA7B2

Text
#17212B

Muted Text
#52606D

Primary Blue
#008CC9

Path Blue
#2878C8

Success
#2E8B57

Warning
#D99A00

Danger
#C83E3E
```

Keep most of the UI neutral.

Use blue/yellow/red only for states and interaction.

------------------------------------------------------------------------

# 21. Border and Radius

Use subtle borders.

``` text
border: 1px solid #9AA7B2
```

Radius:

``` text
2px–6px
```

Do not use large rounded cards.

------------------------------------------------------------------------

# 22. Shadows

Use almost no shadows.

Preferred:

``` text
box-shadow: none
```

For floating dialogs only:

``` text
small subtle shadow
```

The application should feel like a desktop engineering tool.

------------------------------------------------------------------------

# 23. Tailwind CSS

Create custom Tailwind tokens for:

``` text
app
toolbar
workspace
panel
border
text
muted
accent
success
warning
danger
```

Do not scatter hardcoded colors throughout the JSX.

Use reusable classes/components.

------------------------------------------------------------------------

# 24. Important UI Principle

The main focus must always be:

``` text
WAREHOUSE MAP
```

Not:

``` text
Dashboard cards
```

The hierarchy should be:

``` text
Warehouse Map
      ↓
Robot / Object visualization
      ↓
Component palette
      ↓
Inspector
      ↓
Status / metrics
```

------------------------------------------------------------------------

# 25. Final Demo Screen

The completed demo should visually resemble:

``` text
┌─────────────────────────────────────────────────────────────────────┐
│ AMR WAREHOUSE SIMULATOR                                             │
├─────────────────────────────────────────────────────────────────────┤
│ File Edit View Warehouse Robot Simulation Tools Help               │
├─────────────────────────────────────────────────────────────────────┤
│ New Open Save │ Undo Redo │ Select Pan Zoom Fit Grid │ ▶ Run       │
├───────────────────────────────────────────────────────┬─────────────┤
│                                                       │             │
│                                                       │ INSPECTOR   │
│                                                       │             │
│                 WAREHOUSE MAP                         │ AMR-02      │
│                                                       │ ● MOVING    │
│     ██████       ██████       ██████                 │             │
│     █SHELF█      █SHELF█      █SHELF█                │ Battery 78% │
│     ██████       ██████       ██████                 │ Speed 1.4   │
│                                                       │             │
│       ●──────────●──────────●                         │ Task PICK-4 │
│       │          │          │                         │             │
│       │    🤖R01 │      🤖R02                        │             │
│       │          │          │                         │             │
│       ●──────────●──────────●                         │             │
│                     │                                 │             │
│                  🧱 OBSTACLE                          │             │
│                     │                                 │             │
│              📦 PICKUP                 🎯 DROP        │             │
│                                                       │             │
├───────────────────────────────────────────────────────┴─────────────┤
│ COMPONENTS                                                          │
│ [🤖 AMR] [▦ SHELF] [■ OBSTACLE] [P PICKUP] [D DROP] [⚡ CHARGER] │
├─────────────────────────────────────────────────────────────────────┤
│ ▶ RUN  ⏸ PAUSE  ■ STOP  ↻ RESET │ Robots: 3 │ Tasks: 8 │ Collisions: 0 │
└─────────────────────────────────────────────────────────────────────┘
```

## Final instruction for implementation

Build **only this visual prototype** first.

Do not spend time implementing robotics functionality yet.

The first milestone is:

> **A polished Cisco Packet Tracer-style desktop UI where the warehouse,
> robots, obstacles, paths, component palette, inspector and simulation
> status are visually represented.**

Functionality can be connected later without redesigning the UI.
