import {X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useFileList} from "@/hooks/use-file-list";

export function ToolbarRemoveAllButton() {
  const {clearFiles} = useFileList();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={clearFiles}
      aria-label="Remove all files"
    >
      <X className="size-4 text-red-500" />
      Remove
    </Button>
  );
}
