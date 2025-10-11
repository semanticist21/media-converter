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
        <TooltipContent>
          <p className="text-xs">
            Remove all files from the list.{" "}
            <strong>
              Files currently being converted will not be removed.
            </strong>
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
