import {filesize} from "filesize";
import {FileImage, X} from "lucide-react";
import {Button} from "@/components/ui/button";
import type {FileItem} from "@/stores/file-store";
import {useFileStore} from "@/stores/file-store";

interface FileListItemProps {
  file: FileItem;
}

export function FileListItem({file}: FileListItemProps) {
  const removeFile = useFileStore((state) => state.removeFile);

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3 text-card-foreground shadow-sm transition-colors hover:bg-accent/50">
      {/* 파일 아이콘 */}
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
        <FileImage className="size-5 text-muted-foreground" />
      </div>

      {/* 파일 정보 */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {filesize(file.size)}
          {file.path && ` • ${file.path}`}
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
    </div>
  );
}
