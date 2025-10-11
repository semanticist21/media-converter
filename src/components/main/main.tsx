import {invoke} from "@tauri-apps/api/core";
import {getCurrentWindow} from "@tauri-apps/api/window";
import {Sparkles} from "lucide-react";
import {OverlayScrollbarsComponent} from "overlayscrollbars-react";
import {useEffect, useRef, useState} from "react";
import {FileListItem} from "@/components/main/file-list-item";
import {useFileList} from "@/hooks/use-file-list";
import {cn} from "@/lib/utils";

export function Main() {
  const {fileList, refresh} = useFileList();
  const [isDragActive, setIsDragActive] = useState(false);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    getCurrentWindow()
      .onDragDropEvent(async (event) => {
        if (event.payload.type === "enter" || event.payload.type === "over") {
          setIsDragActive(true);
        } else if (event.payload.type === "drop") {
          // Tauri v2 버그로 인한 중복 이벤트 방지 (macOS Issue #14134)
          if (isProcessingRef.current) return;

          isProcessingRef.current = true;
          const filePaths = event.payload.paths;

          // Add files from paths (invoke Rust command directly to avoid multiple refreshes)
          try {
            await Promise.all(
              filePaths.map((path) =>
                invoke("add_file_from_path", {path}).catch((error) => {
                  console.error(`Failed to add file ${path}:`, error);
                }),
              ),
            );
            // Refresh once after all files are added
            await refresh();
          } catch (error) {
            console.error("Failed to add files:", error);
          }

          setIsDragActive(false);

          // 300ms 후 플래그 리셋 (더 긴 시간으로 변경)
          setTimeout(() => {
            isProcessingRef.current = false;
          }, 300);
        } else if (event.payload.type === "leave") {
          setIsDragActive(false);
        }
      })
      .then((unlistenFn) => {
        unlisten = unlistenFn;
      });

    return () => {
      unlisten?.();
    };
  }, [refresh]);

  return (
    <OverlayScrollbarsComponent
      element="main"
      options={{
        scrollbars: {
          autoHide: "move",
          autoHideDelay: 800,
        },
      }}
      defer
      className={cn(
        "flex flex-1 flex-col bg-muted/80 transition-colors",
        isDragActive &&
          "bg-muted/60 outline-2 outline-dashed outline-primary/50",
      )}
    >
      <div className="flex min-h-full flex-col">
        {fileList.length > 0 ? (
          <ul className="flex list-none flex-col">
            {fileList.map((file) => (
              <FileListItem key={file.id} file={file} />
            ))}
          </ul>
        ) : (
          <div className="m-4 flex flex-1 flex-col items-center justify-center rounded-lg transition-colors select-none">
            <div className="relative mb-6 p-8">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-300/50 via-slate-400/50 to-slate-300/50 blur-3xl dark:from-slate-800/30 dark:via-slate-700/30 dark:to-slate-800/30" />
              <Sparkles className="relative size-16 text-slate-400 dark:text-slate-500" />
            </div>
            {isDragActive ? (
              <p className="text-lg text-muted-foreground/60">
                Drop the files here...
              </p>
            ) : (
              <p className="text-lg font-medium text-muted-foreground/50">
                Drag and drop images here
              </p>
            )}
          </div>
        )}
      </div>
    </OverlayScrollbarsComponent>
  );
}
