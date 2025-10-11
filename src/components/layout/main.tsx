import {getCurrentWindow} from "@tauri-apps/api/window";
import {readFile} from "@tauri-apps/plugin-fs";
import {Upload} from "lucide-react";
import {useEffect, useState} from "react";
import {FileListItem} from "@/components/file-list-item";
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

          // 파일 경로에서 File 객체 생성
          const files = await Promise.all(
            filePaths.map(async (path) => {
              const fileData = await readFile(path);
              const fileName = path.split("/").pop() || "unknown";
              const extension = fileName.split(".").pop();

              return new File([new Blob([fileData])], fileName, {
                type: `image/${extension}`,
              });
            }),
          );

          addFiles(files, filePaths);
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
    <main className="flex flex-1 flex-col overflow-y-auto [scrollbar-gutter:stable] bg-muted/80">
      {fileList.length > 0 ? (
        <div className="m-4 flex flex-col gap-2">
          {fileList.map((file) => (
            <FileListItem key={file.id} file={file} />
          ))}
        </div>
      ) : (
        <div className="m-4 flex flex-1 flex-col items-center justify-center rounded-lg transition-colors">
          <Upload className="mb-4 size-12 text-muted-foreground/40" />
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
    </main>
  );
}
