import {invoke} from "@tauri-apps/api/core";
import {save} from "@tauri-apps/plugin-dialog";
import {revealItemInDir} from "@tauri-apps/plugin-opener";
import {filesize} from "filesize";
import {
  AlertCircle,
  ArrowDownToLine,
  Camera,
  CheckCircle2,
  FileCheck,
  FileCheck2,
  FolderOpen,
  Loader2,
  X,
} from "lucide-react";
import {useState} from "react";
import {toast} from "sonner";
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
import {cn} from "@/lib/utils";

interface FileListItemProps {
  file: FileItemResponse;
}

export function FileListItem({file}: FileListItemProps) {
  const {removeFile, convertingFiles, errorFiles, skippedFiles} = useFileList();
  const isConverting = convertingFiles.has(file.id);
  const errorMessage = errorFiles.get(file.id);
  const hasError = errorMessage !== undefined;
  const skipReason = skippedFiles.get(file.id);
  const isSkipped = skipReason !== undefined;

  // 다운로드된 파일의 저장 경로
  const [downloadedPath, setDownloadedPath] = useState<string | null>(null);

  const extension = getFileExtension(file.name);
  const displayExt = formatExtensionDisplay(extension);
  const extStyle = getExtensionStyle(extension);

  return (
    <li className="flex items-center gap-4 border-b bg-card p-4 transition-colors hover:bg-accent/60">
      {/* 파일 확장자 배지 */}
      <div
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-md select-none",
          extStyle,
        )}
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
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-orange-600 dark:bg-orange-400/10 dark:text-orange-400 select-none">
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
          {isSkipped && !isConverting && !hasError && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400 select-none">
                    <AlertCircle className="size-3" />
                    <span className="text-[10px] font-medium">Skip</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{skipReason}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
                  <p className="max-w-xs">{errorMessage}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {file.converted && !isConverting && !hasError && !isSkipped && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-600/10 px-2 py-0.5 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 select-none">
              <CheckCircle2 className="size-3" />
              <span className="text-[10px] font-medium">Converted</span>
            </span>
          )}
        </div>
      </div>

      {/* 액션 버튼들 */}
      <div className="flex items-center gap-1 shrink-0">
        {/* 변환된 파일 경로 열기 버튼 */}
        {file.converted && file.converted_path && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (file.converted_path) {
                      try {
                        await revealItemInDir(file.converted_path);
                      } catch (error) {
                        console.error("Failed to open in Finder:", error);
                        toast.error("Failed to open in Finder", {
                          description:
                            error instanceof Error
                              ? error.message
                              : String(error),
                        });
                      }
                    }
                  }}
                  className="size-8 p-0"
                  aria-label={`Open converted ${file.name} in Finder`}
                >
                  <FileCheck className="size-4 fill-blue-400 stroke-blue-700 dark:fill-white dark:stroke-blue-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open converted file in Finder</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Finder 열기 버튼 (로컬 파일) */}
        {file.source_path && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (file.source_path) {
                      try {
                        await revealItemInDir(file.source_path);
                      } catch (error) {
                        console.error("Failed to open in Finder:", error);
                        toast.error("Failed to open in Finder", {
                          description:
                            error instanceof Error
                              ? error.message
                              : String(error),
                        });
                      }
                    }
                  }}
                  className="size-8 p-0"
                  aria-label={`Open ${file.name} in Finder`}
                >
                  <FolderOpen className="size-4 fill-amber-400 stroke-amber-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open original file in Finder</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* 다운로드 버튼 (URL 파일) 또는 폴더 열기 버튼 (다운로드 완료 후) */}
        {file.source_url && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    // 다운로드 완료된 파일이면 폴더 열기
                    if (downloadedPath) {
                      try {
                        await revealItemInDir(downloadedPath);
                      } catch (error) {
                        console.error("Failed to open in Finder:", error);
                        toast.error("Failed to open in Finder", {
                          description:
                            error instanceof Error
                              ? error.message
                              : String(error),
                        });
                      }
                      return;
                    }

                    // 다운로드 아직 안 했으면 다운로드
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

                      // 다운로드 성공 시 경로 저장
                      setDownloadedPath(savePath);
                      toast.success("File downloaded successfully");
                    } catch (error) {
                      console.error("Failed to download file:", error);
                      toast.error("Failed to download file", {
                        description:
                          error instanceof Error
                            ? error.message
                            : String(error),
                      });
                    }
                  }}
                  className="size-8 p-0"
                  aria-label={
                    downloadedPath
                      ? `Open ${file.name} in Finder`
                      : `Download ${file.name}`
                  }
                >
                  {downloadedPath ? (
                    <FolderOpen className="size-4 fill-amber-400 stroke-amber-600" />
                  ) : (
                    <ArrowDownToLine className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {downloadedPath
                  ? "Open downloaded file in Finder"
                  : "Download file"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* 삭제 버튼 */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(file.id)}
                disabled={isConverting}
                className="size-8 p-0"
                aria-label={`Remove ${file.name}`}
              >
                <X className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isConverting
                ? "Cannot remove while converting"
                : "Remove this file from the list"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </li>
  );
}
