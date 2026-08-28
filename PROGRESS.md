# Project Progress Tracker

This document tracks the implemented features and components for the Next.js AMR Warehouse Simulator prototype.

## ✅ Phase 1: Core UI Layout (Completed)
- `[x]` Initialize Next.js App Router with Tailwind CSS v4 and React-Konva
- `[x]` Create desktop-style application chrome (light grey, thin borders)
- `[x]` Implement `TitleBar` component
- `[x]` Implement static `MenuBar` component
- `[x]` Implement `Toolbar` with functional simulation toggle and map zoom/pan tools
- `[x]` Add "Import Map" toolbar button and visual upload dialog
- `[x]` Add "Map Reconstruction" preview dialog
- `[x]` Implement `WarehouseWorkspace` wrapper with background grid styling
- `[x]` Setup `ComponentPalette` at the bottom with standard drag-ready icons
- `[x]` Build dynamic `InspectorPanel` to show selected object properties
- `[x]` Build `SimulationControls` for bottom status bar

## ✅ Phase 2: Map Rendering & State (Completed)
- `[x]` Create global Zustand state (`warehouseStore.ts`) to manage simulation data
- `[x]` Add mock static data (`demoWarehouse.ts`) for robots, shelves, paths, obstacles, and POIs
- `[x]` Build `WarehouseMap` using React-Konva to render 2D canvas 
- `[x]` Render robot elements with paths, status, battery, and dynamic color changes based on state
- `[x]` Render warehouse structures (Shelves, POIs, Intersections, and Paths)
- `[x]` Link workspace object selection with `InspectorPanel` data updates
- `[x]` Fix React-Konva Next.js client-side rendering (`"use client"`) hooks issue

## ✅ Phase 3: Obstacle Drag & Drop Editor (Completed)
- `[x]` Enable HTML5 `draggable` on Component Palette Obstacle item
- `[x]` Add translucent drag-preview overlay when hovering over the `WarehouseWorkspace`
- `[x]` Calculate precise dropping coordinates taking Konva stage pan and scale into account
- `[x]` Implement `20px` grid snapping on drop
- `[x]` Store new obstacles securely in Zustand state with unique `OBS-XXX` IDs
- `[x]` Refactor obstacles into dedicated React-Konva `Obstacle.tsx` component
- `[x]` Support drag-to-move for existing obstacles on the map with grid snapping
- `[x]` Auto-select newly added objects to instantly load them in the Inspector
- `[x]` Implement obstacle deletion via the Inspector `[ Delete ]` button
- `[x]` Implement obstacle deletion via the `Delete`/`Backspace` keyboard shortcuts

## ⏳ Phase 4: Pending Features (To-Do)
- `[ ]` Draggable implementation for other palette objects (Robots, Shelves, POIs)
- `[ ]` Real pan & zoom interactions for the Konva map canvas
- `[ ]` Dynamic robot animation for "RUN" simulation states
- `[ ]` Duplicate functionality (e.g. `Ctrl+C` / `Ctrl+V`) for map objects
