import {open} from "@tauri-apps/plugin-dialog";
import {readFile} from "@tauri-apps/plugin-fs";
import {Plus} from "lucide-react";
import {useState} from "react";
import {Button} from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {AddUrlDialog} from "@/components/header/toolbar-add-button-modal";
import {useFileStore} from "@/stores/file-store";

export function ToolbarAddButton() {
  const addFiles = useFileStore((state) => state.addFiles);
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

              // 파일 경로에서 File 객체 생성
              const files = await Promise.all(
                filePaths.map(async (path) => {
                  const fileData = await readFile(path);
                  const fileName = path.split("/").pop() || "unknown";
                  const extension = fileName.split(".").pop();

                  return new File([new Blob([fileData])], fileName, {
                    type: `image/${extension}`,
                  });
                }),
              );

              addFiles(files, filePaths);
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
