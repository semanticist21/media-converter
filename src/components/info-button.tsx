import {Info} from "lucide-react";
import {Button} from "@/components/ui/button";

export function InfoButton() {
  return (
    <Button
      variant="outline"
      size="icon-sm"
      onClick={() => console.log("Info clicked")}
      aria-label="Application information"
    >
      <Info className="fill-blue-50 text-blue-400" />
    </Button>
  );
}
