import {ToolbarAddButton} from "@/components/header/toolbar-add-button";
import {ToolbarClearButton} from "@/components/header/toolbar-clear-button";
import {ToolbarInfoButton} from "@/components/header/toolbar-info-button";
import {ToolbarRemoveAllButton} from "@/components/header/toolbar-remove-all-button";
import {ToolbarSettingsButton} from "@/components/header/toolbar-settings-button";
import {ToolbarThemeToggleButton} from "@/components/header/toolbar-theme-toggle-button";
import {ButtonGroup, ButtonGroupSeparator} from "@/components/ui/button-group";

export function Toolbar() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Left: File Actions */}
        <ButtonGroup>
          <ToolbarAddButton />
          <ButtonGroupSeparator />
          <ToolbarRemoveAllButton />
          <ButtonGroupSeparator />
          <ToolbarClearButton />
        </ButtonGroup>

        {/* Right: App Actions */}
        <ButtonGroup>
          <ToolbarThemeToggleButton />
          <ButtonGroupSeparator />
          <ToolbarSettingsButton />
          <ButtonGroupSeparator />
          <ToolbarInfoButton />
        </ButtonGroup>
      </div>
    </header>
  );
}
