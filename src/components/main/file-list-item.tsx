import {invoke} from "@tauri-apps/api/core";
import {save} from "@tauri-apps/plugin-dialog";
import {revealItemInDir} from "@tauri-apps/plugin-opener";
import {filesize} from "filesize";
import {
  AlertCircle,
  ArrowDownToLine,
  Camera,
  CheckCircle2,
  FolderOpen,
  Loader2,
  X,
} from "lucide-react";
import {Button} from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  const {removeFile, convertingFiles, errorFiles} = useFileList();
  const isConverting = convertingFiles.has(file.id);
  const errorMessage = errorFiles.get(file.id);
  const hasError = errorMessage !== undefined;

  const extension = getFileExtension(file.name);
  const displayExt = formatExtensionDisplay(extension);
  const extStyle = getExtensionStyle(extension);

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
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400 select-none">
              <Camera className="size-3" />
              <span className="text-[10px] font-medium">EXIF</span>
            </span>
          )}
          {isConverting && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400 select-none">
              <Loader2 className="size-3 animate-spin" />
              <span className="text-[10px] font-medium">Converting</span>
            </span>
          )}
          {hasError && !isConverting && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-red-600 dark:bg-red-400/10 dark:text-red-400 select-none">
                    <AlertCircle className="size-3" />
                    <span className="text-[10px] font-medium">Error</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">{errorMessage}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {file.converted && !isConverting && !hasError && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-green-600 dark:bg-green-400/10 dark:text-green-400 select-none">
              <CheckCircle2 className="size-3" />
              <span className="text-[10px] font-medium">Converted</span>
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
            onClick={async () => {
              if (file.source_path) {
                try {
                  await revealItemInDir(file.source_path);
                } catch (error) {
                  console.error("Failed to open in Finder:", error);
                }
              }
            }}
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
            onClick={async () => {
              try {
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

                await invoke("save_file", {
                  id: file.id,
                  savePath,
                });
              } catch (error) {
                console.error("Failed to download file:", error);
              }
            }}
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
