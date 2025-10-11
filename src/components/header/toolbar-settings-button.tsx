import {Settings} from "lucide-react";
import {useState} from "react";
import {SettingsModal} from "@/components/settings/settings-modal";
import {Button} from "@/components/ui/button";

export function ToolbarSettingsButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Settings"
      >
        <Settings className="size-4 fill-slate-400 stroke-slate-500 dark:fill-slate-400 dark:stroke-slate-500" />
      </Button>
      <SettingsModal open={open} onOpenChange={setOpen} />
    </>
  );
}
