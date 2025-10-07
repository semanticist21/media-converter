# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Tauri desktop application** with a React + TypeScript frontend. Tauri uses Rust for the backend (native OS integration) and web technologies for the UI.

**Key Architecture Pattern**: Frontend-Backend Communication via Tauri Commands
- React frontend calls Rust backend using `invoke()` from `@tauri-apps/api/core`
- Rust functions marked with `#[tauri::command]` are exposed to frontend
- All Tauri commands must be registered in `src-tauri/src/lib.rs` via `invoke_handler`

## Development Commands

### Frontend Development
```bash
bun dev           # Start Vite dev server (frontend only, no Tauri window)
bun build         # Build frontend (TypeScript compilation + Vite bundle)
bun preview       # Preview production build
```

### Tauri Development
```bash
bun tauri dev     # Start Tauri app with hot-reload (opens native window)
bun tauri build   # Build production app (creates native installer)
```

### Type Checking
```bash
tsc --noEmit      # Run TypeScript compiler without emitting files
```

**Note**: Use `bun tauri dev` (not `bun dev`) for full app development with native features.

## Code Conventions

**IMPORTANT**: This project follows strict conventions from CONVENTION.md (Korean forum project conventions). While some may not apply to this media converter app, respect these when present:

### TypeScript Rules
- **Never use `any` type** - use `unknown` or `never` instead
- **Type-only imports**: Use `import type` for types (enforced by `verbatimModuleSyntax` in tsconfig)
- **Strict mode enabled**: All strict TypeScript checks are active

### File Naming
- **kebab-case for all files**: `media-converter.tsx`, `file-utils.ts`
- **No barrel files**: Import directly from specific files, don't create `index.ts` re-exports

### React Patterns
- **Inline handlers for non-reusable logic**: Keep simple handlers inline unless reused
- **Comments in Korean**: Code comments use Korean (if following original conventions)

## Project Structure

```
media-converter/
├── src/                    # React frontend source
│   ├── App.tsx            # Main React component
│   ├── main.tsx           # React app entry point
│   └── assets/            # Static assets (images, etc.)
├── src-tauri/             # Rust backend source
│   ├── src/
│   │   ├── lib.rs         # Main Tauri app logic & command registration
│   │   └── main.rs        # Binary entry point (calls lib.rs)
│   ├── Cargo.toml         # Rust dependencies
│   ├── tauri.conf.json    # Tauri app configuration
│   └── icons/             # App icons for different platforms
└── public/                # Static assets served by Vite
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

**Frontend build**: `tsc && vite build`
- TypeScript compilation must pass (no type errors)
- Vite bundles to `dist/`

**Tauri build**: Creates platform-specific installers in `src-tauri/target/release/`
- macOS: `.dmg` and `.app`
- Windows: `.msi` and `.exe`
- Linux: `.deb`, `.AppImage`

## TypeScript Configuration

- **Target**: ES2020
- **Module**: ESNext with bundler resolution
- **JSX**: react-jsx (React 17+ transform)
- **Strict mode**: Enabled with unused variable/parameter checks

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

## Testing Strategy

- **Frontend**: Standard React testing (not yet configured)
- **Rust**: Use `cargo test` in `src-tauri/` directory
- **E2E**: Tauri supports WebDriver integration for full app testing

## Platform-Specific Considerations

Tauri apps run on **macOS, Windows, and Linux**. Consider platform differences when:
- Working with file paths (use Tauri's path APIs)
- Using OS-specific features
- Designing UI (native window controls vary)
