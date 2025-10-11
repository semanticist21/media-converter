import {Moon, Sun} from "lucide-react";
import {useTheme} from "next-themes";
import {Button} from "@/components/ui/button";

export function ToolbarThemeToggleButton() {
  const {theme, setTheme} = useTheme();

  const toggleTheme = () => {
    // Disable transitions temporarily
    document.documentElement.classList.add("no-transition");

    setTheme(theme === "dark" ? "light" : "dark");

    // Re-enable transitions after theme change
    setTimeout(() => {
      document.documentElement.classList.remove("no-transition");
    }, 0);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      <Sun className="size-4 rotate-0 scale-100 text-yellow-500 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-4 rotate-90 scale-0 text-blue-500 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
