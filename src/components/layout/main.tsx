import {Upload} from "lucide-react";
import {useCallback} from "react";
import {useDropzone} from "react-dropzone";

export function Main() {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // TODO: Implement file upload logic
    console.log("Dropped files:", acceptedFiles);
  }, []);

  const {getRootProps, getInputProps, isDragActive} = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"],
    },
    multiple: true,
  });

  return (
    <main className="flex-1 overflow-y-auto bg-muted/20 [scrollbar-gutter:stable]">
      <div
        {...getRootProps()}
        className={`m-4 flex h-[calc(100vh-8rem)] cursor-pointer flex-col items-center justify-center rounded-lg transition-colors ${
          isDragActive ? "bg-muted/40" : "bg-muted/30 hover:bg-muted/35"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mb-4 size-12 text-muted-foreground/40" />
        {isDragActive ? (
          <p className="text-lg text-muted-foreground/60">
            Drop the files here...
          </p>
        ) : (
          <div className="text-center">
            <p className="text-lg font-medium text-muted-foreground/50">
              Drag and drop images here
            </p>
            <p className="mt-2 text-sm text-muted-foreground/40">
              or click to select files
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
