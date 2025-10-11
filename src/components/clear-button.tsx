import {Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";

export function ClearButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => console.log("Clear completed clicked")}
      aria-label="Clear all completed conversions"
    >
      <Trash2 className="fill-slate-100 text-slate-500" />
      Clear
    </Button>
  );
}
