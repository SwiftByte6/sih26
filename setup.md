# AMR Fleet Simulator - Setup & Development Guide

This document outlines the requirements and commands needed to set up, develop, and build the AMR Fleet Simulator desktop application.

## 1. Prerequisites

Since this project has been converted into a native desktop application using **Tauri**, you need tools for both the web frontend (Next.js) and the native backend (Rust).

### Frontend Requirements
* **Node.js** (v18 or newer)
* **pnpm** (The package manager used by this project. Install via `npm install -g pnpm`)

### Backend (Desktop) Requirements
* **Rust**: Install via [rustup.rs](https://rustup.rs/)
* **Visual Studio C++ Build Tools**: Required for compiling Rust on Windows. When installing the Build Tools, ensure you check **"Desktop development with C++"**.

*(For detailed Tauri prerequisites, see the [Tauri Windows Setup Guide](https://v2.tauri.app/start/prerequisites/#windows)).*

---

## 2. Installation

1. Open your terminal in the project directory (`c:\Users\VANITA\Desktop\sih26`).
2. Install the Node.js dependencies:

```bash
pnpm install
```

*(This will also install the Tauri CLI and native file APIs).*

---

## 3. Development Workflow

You can develop the application in two different modes:

### Web-Only Mode (Browser)
If you only want to work on the UI components without compiling the native desktop window:

```bash
pnpm run dev
```
* Open `http://localhost:3000` in your browser.
* *Note: Native file dialogs will fall back to visual UI modals in web mode.*

### Desktop Mode (Native Window)
To launch the application as a standalone desktop window with full native features (like file pickers):

```bash
pnpm run tauri:dev
```
* This command builds the frontend and compiles the Rust backend.
* It supports hot-reloading (changes to React files will instantly update the desktop window).

---

## 4. Building for Production

To create a distributable Windows installer (`.exe` or `.msi`):

```bash
pnpm run tauri:build
```

**What this command does:**
1. Next.js creates a highly optimized static web build into the `out/` directory.
2. Tauri packages that frontend inside a native WebView2 binary.
3. Tauri generates installers for distribution.

### Build Outputs
Once the build is complete, you can find your production-ready executables here:
* **Standalone Installer:** `src-tauri/target/release/bundle/nsis/amr-fleet-simulator_0.1.0_x64-setup.exe`
* **MSI Installer:** `src-tauri/target/release/bundle/msi/amr-fleet-simulator_0.1.0_x64_en-US.msi`
* **Raw Executable:** `src-tauri/target/release/amr-fleet-simulator.exe`

---

## 5. Project Architecture

* `app/`, `components/`, `store/`: Next.js frontend code (UI, Map rendering, Simulation State).
* `next.config.mjs`: Configured for `output: "export"` to support desktop embedding.
* `src-tauri/`: Native desktop configuration.
  * `tauri.conf.json`: Window configurations (Title, Size, Build Commands).
  * `Cargo.toml`: Rust dependencies and Tauri plugins (Dialog, File System).
  * `capabilities/default.json`: Security restrictions enforcing minimum required OS permissions.
