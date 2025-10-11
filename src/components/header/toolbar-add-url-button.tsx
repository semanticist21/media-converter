import {useState} from "react";
import {Button} from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {useFileStore} from "@/stores/file-store";

export function ToolbarAddUrlButton() {
  const addFiles = useFileStore((state) => state.addFiles);
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState("");

  const handleAddImage = () => {
    // TODO: URL에서 이미지 가져오기
    console.log("Fetch image from URL:", url);
    setIsOpen(false);
    setUrl("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          From URL
        </Button>
      </DialogTrigger>
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
                handleAddImage();
              }
            }}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsOpen(false);
              setUrl("");
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleAddImage}>Add Image</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
