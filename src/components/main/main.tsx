import {invoke} from "@tauri-apps/api/core";
import {getCurrentWindow} from "@tauri-apps/api/window";
import {readFile} from "@tauri-apps/plugin-fs";
import {Sparkles} from "lucide-react";
import {OverlayScrollbarsComponent} from "overlayscrollbars-react";
import {useEffect, useState} from "react";
import {FileListItem} from "@/components/main/file-list-item";
import {cn} from "@/lib/utils";
import type {ExifData} from "@/stores/file-store";
import {useFileStore} from "@/stores/file-store";

export function Main() {
  const {fileList, addFiles} = useFileStore();
  const [isDragActive, setIsDragActive] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let isProcessing = false;

    getCurrentWindow()
      .onDragDropEvent(async (event) => {
        if (event.payload.type === "enter" || event.payload.type === "over") {
          setIsDragActive(true);
        } else if (event.payload.type === "drop") {
          // Tauri v2 버그로 인한 중복 이벤트 방지 (macOS Issue #14134)
          if (isProcessing) return;

          isProcessing = true;
          const filePaths = event.payload.paths;

          // 파일 경로에서 File 객체 생성 및 EXIF 추출
          const filesWithExif = await Promise.all(
            filePaths.map(async (path) => {
              const fileData = await readFile(path);
              const fileName = path.split("/").pop() || "unknown";
              const extension = fileName.split(".").pop();

              const file = new File([new Blob([fileData])], fileName, {
                type: `image/${extension}`,
              });

              // Extract EXIF data
              let exif: ExifData | null = null;
              try {
                exif = await invoke<ExifData | null>("extract_exif", {
                  data: Array.from(fileData),
                });
              } catch (error) {
                console.warn("Failed to extract EXIF:", error);
              }

              return {file, exif};
            }),
          );

          const files = filesWithExif.map((f) => f.file);
          const exifs = filesWithExif.map((f) => f.exif);

          addFiles(files, filePaths, undefined, exifs);
          setIsDragActive(false);

          // 100ms 후 플래그 리셋
          setTimeout(() => {
            isProcessing = false;
          }, 100);
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
  }, [addFiles]);

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
