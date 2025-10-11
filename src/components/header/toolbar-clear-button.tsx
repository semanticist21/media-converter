import {Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {useFileList} from "@/hooks/use-file-list";

export function ToolbarClearButton() {
  const {removeConvertedFiles} = useFileList();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => removeConvertedFiles()}
            aria-label="Clear all completed conversions"
          >
            <Trash2 className="size-4 text-slate-400" />
            Clear Done
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Remove all successfully converted files from the list
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
