import {motion} from "framer-motion";
import {Moon, Sun} from "lucide-react";
import {useTheme} from "next-themes";
import {Button} from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

  const isDark = theme === "dark";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <motion.div
              animate={{
                scale: isDark ? 0 : 1,
                rotate: isDark ? -90 : 0,
              }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 20,
              }}
            >
              <Sun className="size-4 text-yellow-500" />
            </motion.div>
            <motion.div
              className="absolute"
              animate={{
                scale: isDark ? 1 : 0,
                rotate: isDark ? 0 : 90,
              }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 20,
              }}
            >
              <Moon className="size-4 text-blue-500" />
            </motion.div>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Toggle between light and dark mode</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
