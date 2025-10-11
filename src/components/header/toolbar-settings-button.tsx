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
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        // TODO: 설정 기능 구현
        console.log("Settings button clicked");
      }}
      aria-label="Settings"
    >
      <Settings className="size-4 fill-slate-400 stroke-slate-500 dark:fill-slate-400 dark:stroke-slate-500" />
    </Button>
  );
}
