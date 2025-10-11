import {X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {useFileList} from "@/hooks/use-file-list";

export function ToolbarRemoveAllButton() {
  const {clearFiles} = useFileList();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={clearFiles}
            aria-label="Remove all files"
          >
            <X className="size-4 text-red-500" />
            Remove
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          Remove all files from the list.{" "}
          <b>Files currently being converted will not be removed.</b>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
