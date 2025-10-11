import {open} from "@tauri-apps/plugin-dialog";
import {readFile} from "@tauri-apps/plugin-fs";
import {Plus} from "lucide-react";
import {useState} from "react";
import {Button} from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Input} from "@/components/ui/input";
import {useFileStore} from "@/stores/file-store";

export function ToolbarAddButton() {
  const addFiles = useFileStore((state) => state.addFiles);
  const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false);
  const [url, setUrl] = useState("");

  return (
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
        <DropdownMenuItem onClick={() => setIsUrlDialogOpen(true)}>
          From url
        </DropdownMenuItem>
      </DropdownMenuContent>

      <Dialog open={isUrlDialogOpen} onOpenChange={setIsUrlDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Image from URL</DialogTitle>
            <DialogDescription>
              Enter the URL of the image you want to convert.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <Input
              placeholder="https://example.com/image.jpg"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  // TODO: URL에서 이미지 가져오기
                  console.log("Fetch image from URL:", url);
                  setIsUrlDialogOpen(false);
                  setUrl("");
                }
              }}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsUrlDialogOpen(false);
                setUrl("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                // TODO: URL에서 이미지 가져오기
                console.log("Fetch image from URL:", url);
                setIsUrlDialogOpen(false);
                setUrl("");
              }}
            >
              Add Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DropdownMenu>
  );
}
