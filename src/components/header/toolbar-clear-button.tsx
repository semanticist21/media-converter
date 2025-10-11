import {Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";

export function ToolbarClearButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => console.log("Clear completed clicked")}
      aria-label="Clear all completed conversions"
    >
      <Trash2 className="size-4 text-slate-400" />
      Clear Done
    </Button>
  );
}
