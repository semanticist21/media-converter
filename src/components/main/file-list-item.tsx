import dayjs from "dayjs";
import {filesize} from "filesize";
import {X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {
  formatExtensionDisplay,
  getExtensionStyle,
  getFileExtension,
} from "@/lib/file-utils";
import type {FileItem} from "@/stores/file-store";
import {useFileStore} from "@/stores/file-store";

interface FileListItemProps {
  file: FileItem;
}

export function FileListItem({file}: FileListItemProps) {
  const removeFile = useFileStore((state) => state.removeFile);

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
        {file.path && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {file.path}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {filesize(file.size)} •{" "}
          {dayjs(file.lastModified).format("YY.MM.DD HH:mm:ss")}
        </p>
      </div>

      {/* 삭제 버튼 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => removeFile(file.id)}
        className="size-8 shrink-0 p-0"
        aria-label={`Remove ${file.name}`}
      >
        <X className="size-4" />
      </Button>
    </li>
  );
}
