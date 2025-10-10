# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AnyImage Converter** - A Tauri desktop application for converting image formats.

This is a **Tauri v2 desktop application** with React 19 + TypeScript 7.0 frontend. Tauri uses Rust for the backend (native OS integration) and web technologies for the UI.

**Key Architecture Pattern**: Frontend-Backend Communication via Tauri Commands
- React frontend calls Rust backend using `invoke()` from `@tauri-apps/api/core`
- Rust functions marked with `#[tauri::command]` are exposed to frontend
- All Tauri commands must be registered in `src-tauri/src/lib.rs` via `invoke_handler`

**Media Processing Libraries** (Rust):
- `image` crate: jpg, png, webp, avif, gif, bmp, tiff support with quality control
- `resvg` + `usvg`: SVG rendering and conversion
- `libheif-rs`: HEIC/HEIF format support

## Development Commands

### Tauri Development (Primary)
```bash
bun tauri dev     # Start Tauri app with hot-reload (opens native window)
bun tauri build   # Build production app (creates native installer)
```

### Frontend Only
```bash
bun dev           # Start Vite dev server (frontend only, no Tauri window)
bun build         # Build frontend (TypeScript compilation + Vite bundle)
bun preview       # Preview production build
```

### Code Quality
```bash
bun lint          # Run Biome linter
bun format        # Format code with Biome
bun check         # Lint + format + auto-fix
bun typecheck     # TypeScript type checking (alias for tsgo --noEmit)
```

**Note**: Use `bun tauri dev` (not `bun dev`) for full app development with native features.

## Code Conventions

**Source**: Inherited from CONVENTION.md (Korean forum project). Key rules applicable to this project:

### TypeScript Rules
- **Never use `any` type** - use `unknown` or `never` instead
- **Strict mode enabled**: All strict TypeScript checks are active (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`)

### File Naming
- **kebab-case for all files**: `image-converter.tsx`, `format-utils.ts`
- **No barrel files**: Import directly from specific files, don't create `index.ts` re-exports

### Biome Configuration
- **Double quotes** for strings (`jsxQuoteStyle: "double"`, `quoteStyle: "double"`)
- **No bracket spacing** (`bracketSpacing: false`)
- **Trailing commas**: Always (`trailingCommas: "all"`)
- **Semicolons**: Always required (`semicolons: "always"`)
- **Import organization**: Auto-organize on save (`organizeImports: "on"`)
- **Line width**: 80 characters

### React Patterns
- **Inline handlers for non-reusable logic**: Keep simple handlers inline unless reused
- **Use `useId()` for element IDs**: Never use static string IDs to avoid duplicate IDs when component is rendered multiple times

## Project Structure

```
anyimage-converter/
├── src/                    # React frontend source
│   ├── app.tsx            # Main React component (kebab-case)
│   ├── main.tsx           # React app entry point
│   ├── index.css          # Global styles + Tailwind CSS v4
│   ├── lib/               # Utility functions
│   └── assets/            # Static assets (images, etc.)
├── src-tauri/             # Rust backend source
│   ├── src/
│   │   ├── lib.rs         # Main Tauri app logic & command registration
│   │   └── main.rs        # Binary entry point (calls lib.rs)
│   ├── Cargo.toml         # Rust dependencies (image processing libraries)
│   ├── tauri.conf.json    # Tauri app configuration
│   ├── capabilities/      # Tauri permission definitions
│   └── icons/             # App icons for different platforms
├── public/                # Static assets served by Vite
├── biome.json             # Biome linter/formatter configuration
└── CONVENTION.md          # Code conventions reference
```

## Adding Tauri Commands (Rust ↔ React Communication)

**Pattern for exposing Rust functions to React:**

1. **Define command in `src-tauri/src/lib.rs`**:
```rust
#[tauri::command]
fn my_command(param: String) -> Result<String, String> {
    // Rust logic here
    Ok(format!("Result: {}", param))
}
```

2. **Register in invoke_handler**:
```rust
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            greet,        // existing command
            my_command    // ADD NEW COMMAND HERE
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

3. **Call from React**:
```typescript
import { invoke } from "@tauri-apps/api/core";

const result = await invoke<string>("my_command", { param: "value" });
```

**CRITICAL**: Every Tauri command must be added to `invoke_handler` or it won't be accessible from frontend.

## Tauri Plugins

Current plugins installed:
- `tauri-plugin-opener` - Open URLs/files with system default apps

To add plugins, modify both:
- `src-tauri/Cargo.toml` (Rust dependency)
- `src-tauri/src/lib.rs` (register with `.plugin()`)

## Development Server Configuration

Vite dev server runs on **port 1420** (fixed port for Tauri integration). If port conflict occurs, Vite will fail (strict mode enabled).

HMR (Hot Module Reload) uses port 1421 for WebSocket communication with Tauri.

## Build Process

**Frontend build**: Uses TypeScript 7.0 native preview (`tsgo`) + Vite
- `bun build` command: `tsgo && vite build`
- TypeScript compilation must pass (no type errors)
- Vite bundles to `dist/`

**Tauri build**: Creates platform-specific installers in `src-tauri/target/release/`
- macOS: `.dmg` and `.app`
- Windows: `.msi` and `.exe`
- Linux: `.deb`, `.AppImage`

**Rust library name**: `anyimage_converter_lib` (note: uses snake_case for crate name)

## Technology Stack

**Frontend**:
- React 19.1
- TypeScript 7.0 (native preview via `@typescript/native-preview`)
- Tailwind CSS v4
- Vite 7.0

**Backend (Rust)**:
- Tauri 2
- Image processing: `image`, `resvg`, `usvg`, `libheif-rs`
- Serialization: `serde`, `serde_json`

**Tooling**:
- Biome for linting/formatting (replaces ESLint + Prettier)
- Bun as package manager and runtime

## Common Patterns

### Async Tauri Commands
```typescript
// React
const result = await invoke("async_command", { data });

// Rust
#[tauri::command]
async fn async_command(data: String) -> Result<String, String> {
    // async Rust code
}
```

### Error Handling
```typescript
try {
    const result = await invoke("fallible_command");
} catch (error) {
    console.error("Tauri command failed:", error);
}
```

### State Management
For app-wide state shared between Rust and React, use Tauri's state management or pass data through commands.

## Theme Management

**System Theme Integration**: The app follows system theme preferences automatically.

- `tauri.conf.json` has no explicit `theme` field → follows system theme
- CSS uses `@media (prefers-color-scheme: dark)` for theme-specific styles
- Background colors in `src/index.css`:
  - Light mode: `#f6f6f6`
  - Dark mode: `#2f2f2f`
- Native window title bar color automatically matches system theme

## Testing Strategy

- **Frontend**: Standard React testing (not yet configured)
- **Rust**: Use `cargo test` in `src-tauri/` directory
- **E2E**: Tauri supports WebDriver integration for full app testing

## Platform-Specific Considerations

Tauri apps run on **macOS, Windows, and Linux**. Consider platform differences when:
- Working with file paths (use Tauri's path APIs)
- Using OS-specific features
- Designing UI (native window controls vary)
