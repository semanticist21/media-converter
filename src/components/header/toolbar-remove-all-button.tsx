import {X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useFileStore} from "@/stores/file-store";

export function ToolbarRemoveAllButton() {
  const {clearFiles} = useFileStore();

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
