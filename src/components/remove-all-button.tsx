import {X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useFileStore} from "@/stores/file-store";

export function RemoveAllButton() {
  const {fileList, clearFiles} = useFileStore();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={clearFiles}
      disabled={fileList.length === 0}
      aria-label="Remove all files"
    >
      <X className="size-4 text-red-500" />
      Remove
    </Button>
  );
}
