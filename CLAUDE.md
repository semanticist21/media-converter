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
- **React 19 - No forwardRef**: React 19 automatically forwards refs, never use `React.forwardRef`
- **Inline handlers for non-reusable logic**: Keep simple handlers inline unless reused
- **Use `useId()` for element IDs**: Never use static string IDs to avoid duplicate IDs when component is rendered multiple times
- **Comments in Korean**: Code comments should be written in Korean

### UI Component Patterns
- **Radix UI Primitives**: Base for all interactive components (Dialog, Dropdown, Separator, etc.)
- **React 19 Component Pattern**: Use regular function components with `data-slot` attributes instead of `forwardRef`
  ```typescript
  // ✅ Correct - React 19 pattern
  function Input({className, type, ...props}: React.ComponentProps<"input">) {
    return <input type={type} data-slot="input" className={cn(...)} {...props} />;
  }

  // ❌ Wrong - Old React 18 pattern
  const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
    ({ className, type, ...props }, ref) => {
      return <input ref={ref} type={type} className={cn(...)} {...props} />;
    }
  );
  ```
- **Class Variance Authority (CVA)**: Define component variants with `cva()` for consistent styling
- **cn() Utility**: Always use `cn()` from `@/lib/utils` to merge Tailwind classes safely
- **Slot Pattern**: Use `<Slot>` from Radix for polymorphic components (e.g., `asChild` prop)
- **data-slot Attributes**: Add `data-slot` attributes to all UI components for easier debugging and testing

## Project Structure

```
anyimage-converter/
├── src/                    # React frontend source
│   ├── app.tsx            # Main React component (kebab-case)
│   ├── main.tsx           # React app entry point
│   ├── index.css          # Global styles + Tailwind CSS v4
│   ├── components/        # React components
│   │   ├── ui/            # Reusable UI primitives (Button, Dropdown, etc.)
│   │   ├── layout/        # Layout components (Main, Footer)
│   │   └── toolbar.tsx    # Feature components
│   ├── lib/               # Utility functions (cn() helper)
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

**Path Aliases**:
- `@/*` maps to `./src/*` (configured in `tsconfig.json` and `vite.config.ts`)
- Use absolute imports: `import {cn} from "@/lib/utils"`

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
- Tailwind CSS v4 with `tailwindcss-animate` plugin
- Vite 7.0
- UI Components: Radix UI primitives + custom components
- Styling: `clsx` + `tailwind-merge` via `cn()` utility
- Icons: Lucide React

**Backend (Rust)**:
- Tauri 2
- Image processing: `image`, `resvg`, `usvg`, `libheif-rs`
- Serialization: `serde`, `serde_json`

**Tooling**:
- Biome for linting/formatting (replaces ESLint + Prettier)
- Bun as package manager and runtime

## Common Patterns and Gotchas

### Drag-and-Drop Race Conditions

**CRITICAL**: When handling multiple files via drag-and-drop, avoid calling `refresh()` for each file individually:

```typescript
// ❌ WRONG - Race condition with multiple refreshes
await Promise.all(filePaths.map((path) => addFileFromPath(path)));
// Each addFileFromPath calls refresh(), causing race conditions

// ✅ CORRECT - Batch invoke, single refresh
try {
  await Promise.all(
    filePaths.map((path) =>
      invoke("add_file_from_path", {path}).catch(console.error)
    )
  );
  await refresh(); // Single refresh after all files added
} catch (error) {
  console.error("Failed to add files:", error);
}
```

**Why**: Multiple concurrent `refresh()` calls can create race conditions where some files don't render. Always batch Tauri commands and refresh once at the end.

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

### Tauri Event System (Real-Time Updates)

For real-time communication from Rust → React, use Tauri's event system:

```rust
// Rust: Emit event
use tauri::Emitter; // Required import

window.emit("event-name", EventPayload {
    field: value,
})?;
```

```typescript
// React: Listen for events
import {listen} from "@tauri-apps/api/event";

useEffect(() => {
  const unlisten = listen<EventPayload>("event-name", (event) => {
    console.log("Received:", event.payload);
    // Update React state
  });

  return () => {
    unlisten.then((fn) => fn());
  };
}, []);
```

**Use Cases**:
- Progress updates during long-running operations
- File conversion status tracking
- Background task notifications

### State Management
For app-wide state shared between Rust and React, use Tauri's state management or pass data through commands.

## Theme Management

**System Theme Integration**: Managed by `next-themes` package with class-based dark mode.

- **Theme Provider**: Uses `next-themes` for theme state management
- **Dark Mode Implementation**: `.dark` class on root element (not media queries)
- **CSS Variables**: Theme colors defined in `src/index.css` using oklch color space
- **System Detection**: Automatically detects and respects system theme preference
- **Custom Variant**: Uses `@custom-variant dark (&:is(.dark *))` for Tailwind v4 dark mode

## Testing Strategy

- **Frontend**: Standard React testing (not yet configured)
- **Rust**: Use `cargo test` in `src-tauri/` directory
- **E2E**: Tauri supports WebDriver integration for full app testing

## Platform-Specific Considerations

Tauri apps run on **macOS, Windows, and Linux**. Consider platform differences when:
- Working with file paths (use Tauri's path APIs)
- Using OS-specific features
- Designing UI (native window controls vary)

## State Management Architecture

**Centralized State in Rust Backend** (refactored from Zustand):

The application uses a **server-side state pattern** where all file data is managed in Rust using `Mutex<Vec<FileItem>>`, with React as a thin UI layer.

### Core Architecture Pattern

**State Flow**: `Rust Backend (Source of Truth)` → `React Context (UI State)` → `Components (View)`

```rust
// src-tauri/src/lib.rs - Centralized state
struct FileListState(Mutex<Vec<FileItem>>);

struct FileItem {
    id: String,
    name: String,
    data: Vec<u8>,        // Actual image bytes stored in Rust
    exif: Option<ExifData>,
    timestamps: Option<FileTimestamps>,
    converted: bool,      // Conversion tracking
    // ...
}
```

```typescript
// src/hooks/use-file-list.tsx - React Context wrapper
export function FileListProvider({children}) {
  const [fileList, setFileList] = useState<FileItemResponse[]>([]);
  const [convertingFiles, setConvertingFiles] = useState<Set<string>>(new Set());

  const refresh = async () => {
    const list = await invoke<FileItemResponse[]>("get_file_list");
    setFileList(list);
  };

  // ... addFileFromPath, removeFile, etc.
}
```

### Key Benefits of This Architecture

1. **Single Source of Truth**: File data (including image bytes) lives in Rust memory only
2. **Efficient Memory**: Frontend only receives metadata (no image bytes transferred)
3. **Native Performance**: Image processing happens in Rust without serialization overhead
4. **Automatic Deduplication**: Rust backend prevents duplicate files by path/URL checking

### State Operations

**Adding Files**:
- `invoke("add_file_from_path")` → Rust reads file → Extracts EXIF → Stores in Mutex
- Frontend receives `FileItemResponse` (metadata only, no image data)
- For multiple files (drag-and-drop): batch invoke then single `refresh()` to avoid race conditions

**Converting Images**:
- Rust clones file data from Mutex → Releases lock immediately
- Heavy processing in `tokio::task::spawn_blocking` (non-blocking)
- Real-time progress via Tauri events: `window.emit("conversion-progress", ...)`
- Updates `converted: true` flag after successful conversion

## Image Conversion System

### Async Conversion Architecture

The conversion system is designed to keep the UI responsive during heavy image processing:

```rust
// src-tauri/src/lib.rs
#[tauri::command]
async fn convert_images(
    target_format: String,
    quality: u8,
    preserve_timestamps: bool,
    window: tauri::Window,
    state: tauri::State<'_, FileListState>,
) -> Result<Vec<ConversionResult>, String> {
    // 1. Quick lock to clone file data, filtering unconverted files
    let files_to_convert = {
        let file_list = state.0.lock().unwrap();
        file_list.iter()
            .filter(|f| !f.converted)  // Skip already converted
            .map(|f| (f.id.clone(), f.name.clone(), f.data.clone(), ...))
            .collect()
    }; // Lock released immediately

    // 2. Heavy work in blocking thread pool (doesn't block UI)
    tokio::task::spawn_blocking(move || {
        for (id, name, data, ...) in files_to_convert {
            // Emit progress event
            window.emit("conversion-progress", ConversionProgress {
                file_id: id, status: "converting"
            });

            // Convert image...

            // Emit completion event
            window.emit("conversion-progress", ConversionProgress {
                file_id: id, status: "completed"
            });
        }
    }).await
}
```

### Real-Time Progress Tracking

**Event System**: Tauri events bridge Rust backend and React frontend for real-time updates.

```typescript
// src/hooks/use-file-list.tsx
useEffect(() => {
  listen<ConversionProgress>("conversion-progress", (event) => {
    const {file_id, status} = event.payload;

    if (status === "converting") {
      setConvertingFiles(prev => new Set(prev).add(file_id));
    } else if (status === "completed") {
      setConvertingFiles(prev => { /* remove */ });
      refresh(); // Update UI
    }
  });
}, []);
```

**UI States**: File list items show 3 states:
1. **Default**: No badge
2. **Converting** (amber): `<Loader2 className="animate-spin" />` + "Converting"
3. **Converted** (green): `<CheckCircle2 />` + "Converted"

### Format-Specific Optimization

Different image formats use optimized encoders:

- **WebP**: Uses `webp` crate (libwebp bindings) for better compression than `image` crate
- **JPEG**: Uses `image::codecs::jpeg::JpegEncoder` with quality control
- **PNG**: Uses `image::codecs::png::PngEncoder` with compression levels (0-9)
- **Other formats**: Falls back to `image` crate's default encoders

### Timestamp Preservation

Original file timestamps (created/modified) can be preserved:

```rust
struct FileTimestamps {
    accessed: SystemTime,
    modified: SystemTime,
}

// Extracted when adding files from local paths
let timestamps = std::fs::metadata(&path).ok().and_then(|metadata| {
    Some(FileTimestamps {
        accessed: metadata.accessed().ok()?,
        modified: metadata.modified().ok()?,
    })
});

// Applied after conversion if requested
if preserve_timestamps {
    filetime::set_file_times(&output_path,
        FileTime::from_system_time(timestamps.accessed),
        FileTime::from_system_time(timestamps.modified));
}
```

**Note**: URL-sourced files don't have original timestamps (set to `None`).

## UI Component Development

### Adding shadcn/ui Components

**IMPORTANT**: shadcn CLI generates React 18 patterns with `forwardRef`. Always convert to React 19 pattern manually.

**Process**:
1. Install via CLI: `bunx --bun shadcn@latest add [component]`
2. Manual conversion required:
   - Remove `React.forwardRef`
   - Remove `displayName` assignments
   - Convert to regular function components
   - Add `data-slot` attributes
   - Ensure proper TypeScript types with `React.ComponentProps`

**Example Conversion**:
```typescript
// ❌ shadcn CLI output (React 18)
const Dialog = React.forwardRef<HTMLDivElement, DialogProps>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Root ref={ref} className={cn(...)} {...props} />
  )
);
Dialog.displayName = "Dialog";

// ✅ Convert to React 19 pattern
function Dialog({className, ...props}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" className={cn(...)} {...props} />;
}
```

### File Extension Badge System

Color-coded extension badges are used in `FileListItem` component:
- Utility functions in `src/lib/file-utils.ts`:
  - `getExtensionStyle(ext)` - Returns Tailwind classes for extension badge
  - `getFileExtension(filename)` - Extracts file extension
  - `formatExtensionDisplay(ext)` - Formats extension for display (uppercase, max 4 chars)
- Supported formats: webp, svg, png, jpg, jpeg, gif, bmp, tiff, avif, heic, heif
- Each format has distinct color scheme for light/dark mode

## Important Notes

### shadcn/ui Components
- CLI installation creates React 18 patterns - manual conversion to React 19 is required
- Always use `bunx --bun shadcn@latest add [component]` for installation
- All UI components should have `data-slot` attributes for debugging

### CONVENTION.md Context
- CONVENTION.md is from a different project (Kobbokkom Forum)
- Only applicable conventions: file naming (kebab-case), TypeScript strict mode, Biome config, inline handlers
- NOT applicable: DB/service layer patterns, query patterns, barrel files prohibition
