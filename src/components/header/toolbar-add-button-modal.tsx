import {Check, X} from "lucide-react";
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
import {Input} from "@/components/ui/input";
import {normalizeUrl, validateUrl} from "@/lib/url-utils";
import {useFileStore} from "@/stores/file-store";

interface AddUrlDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddUrlDialog({isOpen, onOpenChange}: AddUrlDialogProps) {
  const addFiles = useFileStore((state) => state.addFiles);
  const [url, setUrl] = useState("");
  const [isValidUrl, setIsValidUrl] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddFromUrl = async () => {
    if (!validateUrl(url)) return;
    const normalizedUrl = normalizeUrl(url);

    setIsLoading(true);
    try {
      const response = await fetch(normalizedUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image (${response.status})`);
      }

      const blob = await response.blob();
      const responseType =
        blob.type || response.headers.get("content-type") || "application/octet-stream";

      let fileName = "image";
      try {
        const {pathname} = new URL(normalizedUrl);
        const candidate = pathname.split("/").filter(Boolean).pop();
        if (candidate) {
          fileName = candidate;
        }
      } catch {
        // Ignore invalid URL parsing errors and keep default filename
      }

      if (!fileName.includes(".")) {
        const inferredExt = responseType.split("/")[1]?.split(";")[0];
        if (inferredExt) {
          fileName = `${fileName}.${inferredExt}`;
        }
      }

      const file = new File([blob], fileName, {type: responseType});
      addFiles([file]);
      onOpenChange(false);
      setUrl("");
      setIsValidUrl(false);
    } catch (error) {
      console.error("Failed to fetch image from URL:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Image from URL</DialogTitle>
          <DialogDescription>
            Enter the URL of the image you want to convert.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="https://example.com/image.jpg"
              value={url}
              onChange={(e) => {
                const newUrl = e.target.value;
                setUrl(newUrl);
                setIsValidUrl(validateUrl(newUrl));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isValidUrl && !isLoading) {
                  void handleAddFromUrl();
                }
              }}
              disabled={isLoading}
            />
            {url.trim() && (
              <div className="shrink-0">
                {isValidUrl ? (
                  <Check className="size-5 text-green-500" />
                ) : (
                  <X className="size-5 text-red-500" />
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setUrl("");
              setIsValidUrl(false);
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              void handleAddFromUrl();
            }}
            disabled={!isValidUrl || isLoading}
            loading={isLoading}
          >
            Add Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
