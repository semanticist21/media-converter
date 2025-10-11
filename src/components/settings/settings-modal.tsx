import {invoke} from "@tauri-apps/api/core";
import {useEffect, useId, useState} from "react";
import {Button} from "@/components/ui/button";
import {Checkbox} from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Slider} from "@/components/ui/slider";
import {useConversionSettings} from "@/stores/conversion-settings-store";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({open, onOpenChange}: SettingsModalProps) {
  const {
    maxConcurrentConversions,
    setMaxConcurrentConversions,
    useSourceDirectory,
    createSubfolder,
    setCreateSubfolder,
    subfolderName,
    setSubfolderName,
  } = useConversionSettings();
  const [cpuCores, setCpuCores] = useState<number>(0);
  const sliderId = useId();
  const subfolderCheckboxId = useId();
  const subfolderInputId = useId();

  // Fetch CPU core count
  useEffect(() => {
    invoke<number>("get_cpu_count")
      .then(setCpuCores)
      .catch((error) => console.error("Failed to get CPU count:", error));
  }, []);

  const displayValue =
    maxConcurrentConversions === 0
      ? `Auto (${cpuCores})`
      : maxConcurrentConversions;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure conversion performance and behavior
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Max Concurrent Conversions */}
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <label htmlFor={sliderId} className="text-sm font-medium">
                Max Concurrent Conversions
              </label>
              <output className="text-sm font-medium text-muted-foreground">
                {displayValue}
              </output>
            </div>
            <p className="text-xs text-muted-foreground">
              Maximum number of images to convert simultaneously.{" "}
              <strong>0 = Auto</strong> (default: uses CPU core count of{" "}
              {cpuCores})
            </p>
            <Slider
              id={sliderId}
              value={[maxConcurrentConversions]}
              onValueChange={(value) => setMaxConcurrentConversions(value[0])}
              min={0}
              max={cpuCores * 2}
              step={1}
            />
          </div>

          {/* Subfolder Options - Only show when Use Source Folder is enabled */}
          {useSourceDirectory && (
            <div className="grid gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={subfolderCheckboxId}
                  checked={createSubfolder}
                  onCheckedChange={(checked) =>
                    setCreateSubfolder(checked === true)
                  }
                />
                <label
                  htmlFor={subfolderCheckboxId}
                  className="text-sm font-medium"
                >
                  Create subfolder in source directory
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                When enabled, converted images will be saved in a subfolder
                within the original file's directory. If disabled, images are
                saved directly in the source folder.
              </p>
              <Input
                id={subfolderInputId}
                value={subfolderName}
                onChange={(e) => setSubfolderName(e.target.value)}
                disabled={!createSubfolder}
                placeholder="converted"
                className="mt-1"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
