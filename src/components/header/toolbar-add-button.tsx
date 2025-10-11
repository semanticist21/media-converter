import {open} from "@tauri-apps/plugin-dialog";
import {Plus} from "lucide-react";
import {useState} from "react";
import {AddUrlDialog} from "@/components/header/toolbar-add-button-modal";
import {Button} from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {useFileList} from "@/hooks/use-file-list";

export function ToolbarAddButton() {
  const {addFileFromPath} = useFileList();
  const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" aria-label="Upload files">
            <Plus className="fill-green-100 text-green-500" />
            Add
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" alignOffset={8}>
          <DropdownMenuItem
            onClick={async () => {
              // Tauri 파일 다이얼로그로 이미지 선택
              const selected = await open({
                multiple: true,
                filters: [
                  {
                    name: "Images",
                    extensions: [
                      "jpg",
                      "jpeg",
                      "png",
                      "gif",
                      "webp",
                      "bmp",
                      "svg",
                      "heic",
                      "avif",
                    ],
                  },
                ],
              });

              if (!selected) return;

              const filePaths = Array.isArray(selected) ? selected : [selected];

              // Add files from paths (Rust handles file reading and EXIF extraction)
              await Promise.all(filePaths.map((path) => addFileFromPath(path)));
            }}
          >
            From device
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsUrlDialogOpen(true)}>
            From URL
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddUrlDialog
        isOpen={isUrlDialogOpen}
        onOpenChange={setIsUrlDialogOpen}
      />
    </>
  );
}
