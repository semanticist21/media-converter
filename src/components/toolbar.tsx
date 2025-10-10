import {Info, Plus, ScrollText, Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {ButtonGroup, ButtonGroupSeparator} from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Toolbar() {
  const handleUploadFromDevice = () => {
    // TODO: Implement file upload from device logic
    console.log("Upload from device clicked");
  };

  const handleUploadFromUrl = () => {
    // TODO: Implement file upload from URL logic
    console.log("Upload from URL clicked");
  };

  const handleHistory = () => {
    // TODO: Implement conversion history logic
    console.log("History clicked");
  };

  const handleClearCompleted = () => {
    // TODO: Implement clear completed logic
    console.log("Clear completed clicked");
  };

  const handleInfo = () => {
    // TODO: Implement info dialog logic
    console.log("Info clicked");
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">AnyImage Converter</h1>
        </div>

        <ButtonGroup>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" aria-label="Upload files">
                <Plus className="fill-lime-100 text-lime-500" />
                Add
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleUploadFromDevice}>
                From device
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleUploadFromUrl}>
                From url
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ButtonGroupSeparator />

          <Button
            variant="outline"
            size="sm"
            onClick={handleHistory}
            aria-label="View conversion history"
          >
            <ScrollText className="fill-orange-50 text-orange-300" />
            History
          </Button>

          <ButtonGroupSeparator />

          <Button
            variant="outline"
            size="sm"
            onClick={handleClearCompleted}
            aria-label="Clear all completed conversions"
          >
            <Trash2 className="fill-slate-100 text-slate-500" />
            Clear
          </Button>

          <ButtonGroupSeparator />

          <Button
            variant="outline"
            size="icon-sm"
            onClick={handleInfo}
            aria-label="Application information"
          >
            <Info className="fill-blue-50 text-blue-400" />
          </Button>
        </ButtonGroup>
      </div>
    </header>
  );
}
