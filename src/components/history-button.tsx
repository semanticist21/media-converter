import {ScrollText} from "lucide-react";
import {Button} from "@/components/ui/button";

export function HistoryButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => console.log("History clicked")}
      aria-label="View conversion history"
    >
      <ScrollText className="fill-orange-50 text-orange-300" />
      History
    </Button>
  );
}
