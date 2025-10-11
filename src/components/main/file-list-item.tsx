import {invoke} from "@tauri-apps/api/core";
import {save} from "@tauri-apps/plugin-dialog";
import {revealItemInDir} from "@tauri-apps/plugin-opener";
import {filesize} from "filesize";
import {ArrowDownToLine, Camera, FolderOpen, X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {type FileItemResponse, useFileList} from "@/hooks/use-file-list";
import {
  formatExtensionDisplay,
  getExtensionStyle,
  getFileExtension,
} from "@/lib/file-utils";

interface FileListItemProps {
  file: FileItemResponse;
}

export function FileListItem({file}: FileListItemProps) {
  const {removeFile} = useFileList();

  const extension = getFileExtension(file.name);
  const displayExt = formatExtensionDisplay(extension);
  const extStyle = getExtensionStyle(extension);

  // Finder에서 파일 위치 열기 (로컬 파일)
  const handleOpenInFinder = async () => {
    if (file.source_path) {
      try {
        await revealItemInDir(file.source_path);
      } catch (error) {
        console.error("Failed to open in Finder:", error);
      }
    }
  };

  // 파일 다운로드 (URL 파일)
  const handleDownload = async () => {
    try {
      // 저장 위치 선택 Dialog
      const savePath = await save({
        defaultPath: file.name,
        filters: [
          {
            name: "Images",
            extensions: [extension || "*"],
          },
        ],
      });

      if (!savePath) return;

      // Rust command 호출하여 파일 저장
      await invoke("save_file", {
        id: file.id,
        savePath,
      });
    } catch (error) {
      console.error("Failed to download file:", error);
    }
  };

  return (
    <li className="flex items-center gap-4 border-b bg-card p-4 transition-colors hover:bg-accent/60">
      {/* 파일 확장자 배지 */}
      <div
        className={`flex size-12 shrink-0 items-center justify-center rounded-md ${extStyle}`}
      >
        <span className="text-xs font-semibold">{displayExt}</span>
      </div>

      {/* 파일 정보 */}
      <div className="min-w-0 flex-1">
        <p className="mb-1 line-clamp-1 text-sm font-medium">{file.name}</p>
        {(file.source_url || file.source_path) && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {file.source_url || file.source_path}
          </p>
        )}
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground/70">
          <span>{filesize(file.size)}</span>
          {file.exif && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400">
              <Camera className="size-3" />
              <span className="text-[10px] font-medium">EXIF</span>
            </span>
          )}
        </div>
      </div>

      {/* 액션 버튼들 */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Finder 열기 버튼 (로컬 파일) */}
        {file.source_path && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenInFinder}
            className="size-8 p-0"
            aria-label={`Open ${file.name} in Finder`}
          >
            <FolderOpen className="size-4" />
          </Button>
        )}

        {/* 다운로드 버튼 (URL 파일) */}
        {file.source_url && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="size-8 p-0"
            aria-label={`Download ${file.name}`}
          >
            <ArrowDownToLine className="size-4" />
          </Button>
        )}

        {/* 삭제 버튼 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => removeFile(file.id)}
          className="size-8 p-0"
          aria-label={`Remove ${file.name}`}
        >
          <X className="size-4" />
        </Button>
      </div>
    </li>
  );
}
