import {AddButton} from "@/components/add-button";
import {ClearButton} from "@/components/clear-button";
import {HistoryButton} from "@/components/history-button";
import {InfoButton} from "@/components/info-button";
import {ButtonGroup, ButtonGroupSeparator} from "@/components/ui/button-group";

export function Toolbar() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">AnyImage Converter</h1>
        </div>

        <ButtonGroup>
          <AddButton />
          <ButtonGroupSeparator />
          <HistoryButton />
          <ButtonGroupSeparator />
          <ClearButton />
          <ButtonGroupSeparator />
          <InfoButton />
        </ButtonGroup>
      </div>
    </header>
  );
}
