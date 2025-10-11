import {AddButton} from "@/components/add-button";
import {ClearButton} from "@/components/clear-button";
import {HistoryButton} from "@/components/history-button";
import {InfoButton} from "@/components/info-button";
import {RemoveAllButton} from "@/components/remove-all-button";
import {ThemeToggleButton} from "@/components/theme-toggle-button";
import {ButtonGroup, ButtonGroupSeparator} from "@/components/ui/button-group";

export function Toolbar() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Left: File Actions */}
        <ButtonGroup>
          <AddButton />
          <ButtonGroupSeparator />
          <RemoveAllButton />
          <ButtonGroupSeparator />
          <ClearButton />
        </ButtonGroup>

        {/* Right: App Actions */}
        <ButtonGroup>
          <HistoryButton />
          <ButtonGroupSeparator />
          <ThemeToggleButton />
          <ButtonGroupSeparator />
          <InfoButton />
        </ButtonGroup>
      </div>
    </header>
  );
}
