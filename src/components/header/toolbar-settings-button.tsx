import {Settings} from "lucide-react";
import {Button} from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ToolbarSettingsButton() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // TODO: 설정 기능 구현
              console.log("Settings button clicked");
            }}
            aria-label="Settings"
          >
            <Settings className="size-4 fill-slate-600 stroke-slate-600 dark:fill-slate-400 dark:stroke-slate-400" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Application settings</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
