import {AnimatePresence, motion} from "framer-motion";
import {AlertCircle, Check, Link, X} from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {useFileList} from "@/hooks/use-file-list";
import {normalizeUrl, validateUrl} from "@/lib/url-utils";

interface AddUrlDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddUrlDialog({isOpen, onOpenChange}: AddUrlDialogProps) {
  const {addFileFromUrl} = useFileList();
  const [url, setUrl] = useState("");
  const [isValidUrl, setIsValidUrl] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAddFromUrl = async () => {
    if (!validateUrl(url)) return;
    const normalizedUrl = normalizeUrl(url);

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Add file from URL (Rust handles fetching and EXIF extraction)
      await addFileFromUrl(normalizedUrl);

      // Close modal and reset state
      onOpenChange(false);
      setUrl("");
      setIsValidUrl(false);
      setErrorMessage(null);
    } catch (error) {
      // Set error message for display
      const message =
        typeof error === "string" ? error : "Failed to fetch image from URL";
      setErrorMessage(message);
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
                // 사용자가 입력을 수정하면 에러 상태 초기화
                if (errorMessage) {
                  setErrorMessage(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isValidUrl && !isLoading) {
                  void handleAddFromUrl();
                }
              }}
              disabled={isLoading}
            />
            <div className="shrink-0">
              <AnimatePresence mode="wait">
                {errorMessage ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          key="error"
                          initial={{opacity: 0, scale: 0.8}}
                          animate={{opacity: 1, scale: 1}}
                          exit={{opacity: 0, scale: 0.8}}
                          transition={{
                            type: "spring",
                            stiffness: 700,
                            damping: 25,
                          }}
                        >
                          <AlertCircle className="size-5 text-red-500" />
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>{errorMessage}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : url.trim() ? (
                  isValidUrl ? (
                    <motion.div
                      key="valid"
                      initial={{opacity: 0, scale: 0.8}}
                      animate={{opacity: 1, scale: 1}}
                      exit={{opacity: 0, scale: 0.8}}
                      transition={{type: "spring", stiffness: 700, damping: 25}}
                    >
                      <Check className="size-5 text-green-500" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="invalid"
                      initial={{opacity: 0, scale: 0.8}}
                      animate={{opacity: 1, scale: 1}}
                      exit={{opacity: 0, scale: 0.8}}
                      transition={{type: "spring", stiffness: 700, damping: 25}}
                    >
                      <X className="size-5 text-red-500" />
                    </motion.div>
                  )
                ) : (
                  <motion.div
                    key="empty"
                    initial={{opacity: 0, scale: 0.8}}
                    animate={{opacity: 1, scale: 1}}
                    exit={{opacity: 0, scale: 0.8}}
                    transition={{type: "spring", stiffness: 700, damping: 25}}
                  >
                    <Link className="size-5 text-gray-400" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setUrl("");
              setIsValidUrl(false);
              setErrorMessage(null);
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
            {errorMessage ? "Retry" : "Add Image"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
