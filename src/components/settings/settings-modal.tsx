import {invoke} from "@tauri-apps/api/core";
import {open as openDialog} from "@tauri-apps/plugin-dialog";
import {Folder, FolderTree, Link, Zap} from "lucide-react";
import {OverlayScrollbarsComponent} from "overlayscrollbars-react";
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
    urlFilesFallbackDir,
    setUrlFilesFallbackDir,
  } = useConversionSettings();
  const [cpuCores, setCpuCores] = useState<number>(0);
  const sliderId = useId();
  const buttonId = useId();
  const subfolderCheckboxId = useId();
  const subfolderInputId = useId();

  // 폴더 선택 핸들러
  const handleSelectFolder = async () => {
    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
        title: "Select default folder for URL files",
      });

      if (selected && !Array.isArray(selected)) {
        setUrlFilesFallbackDir(selected);
      }
    } catch (error) {
      console.error("Failed to select folder:", error);
    }
  };

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
      <DialogContent className="sm:max-w-[425px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure conversion performance and behavior
          </DialogDescription>
        </DialogHeader>

        <OverlayScrollbarsComponent
          options={{
            scrollbars: {
              autoHide: "move",
              autoHideDelay: 800,
            },
          }}
          defer
        >
          <div className="grid gap-8 py-4 pr-4">
            {/* Performance Settings */}
            <div className="grid gap-3">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-amber-500" />
                <h3 className="text-sm font-semibold">Performance</h3>
              </div>
              <div className="ml-6 grid gap-3">
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
                  onValueChange={(value) =>
                    setMaxConcurrentConversions(value[0])
                  }
                  min={0}
                  max={cpuCores * 2}
                  step={1}
                />
              </div>
            </div>

            {/* Output Directory Settings - Only show when Use Source Folder is enabled */}
            {useSourceDirectory && (
              <div className="grid gap-3">
                <div className="flex items-center gap-2">
                  <Folder className="size-4 text-blue-500" />
                  <h3 className="text-sm font-semibold">Output Directory</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  These options are only available when "Use source folder" is
                  enabled in the footer.
                </p>

                {/* URL Files Fallback */}
                <div className="ml-6 grid gap-4">
                  <div className="grid gap-3">
                    <div className="flex items-center gap-2">
                      <Link className="size-3.5 text-blue-400" />
                      <label className="text-sm font-medium" htmlFor={buttonId}>
                        URL Files Source Directory
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Source directory for images fetched from URLs. Leave empty
                      to use Downloads folder. Subfolder settings below will
                      also apply.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={urlFilesFallbackDir || "Downloads (default)"}
                        readOnly
                        placeholder="Downloads (default)"
                        className="flex-1 h-9"
                      />
                      <Button
                        id={buttonId}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectFolder}
                        className="shrink-0 h-9"
                      >
                        <Folder className="size-4 mr-2" />
                        Choose
                      </Button>
                    </div>
                    {urlFilesFallbackDir && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setUrlFilesFallbackDir("")}
                        className="ml-auto text-xs"
                      >
                        Reset to default
                      </Button>
                    )}
                  </div>

                  {/* Subfolder Options */}
                  <div className="grid gap-3">
                    <div className="flex items-center gap-2">
                      <FolderTree className="size-3.5 text-green-400" />
                      <span className="text-sm font-medium">
                        Local Files Subfolder
                      </span>
                    </div>
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
                        className="text-sm font-medium cursor-pointer"
                      >
                        Create subfolder in source directory
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      When enabled, converted images will be saved in a
                      subfolder within the original file's directory. If
                      disabled, images are saved directly in the source folder.
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
                </div>
              </div>
            )}
          </div>
        </OverlayScrollbarsComponent>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
