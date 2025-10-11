import {invoke} from "@tauri-apps/api/core";
import {open} from "@tauri-apps/plugin-dialog";
import {useId, useState} from "react";
import {Button} from "@/components/ui/button";
import {Checkbox} from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {Slider} from "@/components/ui/slider";
import {useFileList} from "@/hooks/use-file-list";

type ImageFormat = "webp" | "jpeg" | "png" | "avif" | "gif" | "bmp" | "tiff";

interface ConversionResult {
  original_name: string;
  converted_name: string;
  original_size: number;
  converted_size: number;
  saved_path: string;
}

export function Footer() {
  const {fileList} = useFileList();
  const [targetFormat, setTargetFormat] = useState<ImageFormat>("webp");
  const [quality, setQuality] = useState(80);
  const [preserveExif, setPreserveExif] = useState(true);
  const [preserveTimestamps, setPreserveTimestamps] = useState(true);
  const exifCheckboxId = useId();
  const timestampCheckboxId = useId();

  // 변환되지 않은 파일만 카운트
  const unconvertedFiles = fileList.filter((f) => !f.converted);
  const unconvertedCount = unconvertedFiles.length;

  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-auto min-h-24 flex-col gap-3 px-4 py-3">
        {/* 첫 번째 줄: 포맷 선택 + Quality/Compression 슬라이더 */}
        <div className="flex items-center gap-4">
          {/* 타겟 포맷 선택 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Format:</span>
            <Select
              value={targetFormat}
              onValueChange={(value) => setTargetFormat(value as ImageFormat)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="webp">WebP</SelectItem>
                <SelectItem value="jpeg">JPEG</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="avif">AVIF</SelectItem>
                <SelectItem value="gif">GIF</SelectItem>
                <SelectItem value="bmp">BMP</SelectItem>
                <SelectItem value="tiff">TIFF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quality/Compression 옵션 (포맷별 조건부) */}
          {(targetFormat === "webp" ||
            targetFormat === "jpeg" ||
            targetFormat === "avif") && (
            <div className="flex flex-1 items-center gap-2 max-w-md">
              <span className="text-sm font-medium">Quality:</span>
              <Slider
                value={[quality]}
                onValueChange={(value) => setQuality(value[0])}
                min={0}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-8">{quality}</span>
            </div>
          )}

          {targetFormat === "png" && (
            <div className="flex flex-1 items-center gap-2 max-w-md">
              <span className="text-sm font-medium">Compression:</span>
              <Slider
                value={[quality]}
                onValueChange={(value) => setQuality(value[0])}
                min={0}
                max={9}
                step={1}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-8">{quality}</span>
            </div>
          )}
        </div>

        {/* 두 번째 줄: 보존 옵션 + Convert 버튼 */}
        <div className="flex items-center gap-4">
          {/* 보존 옵션들 */}
          <div className="flex items-center gap-4">
            {/* EXIF 보존 */}
            <div className="flex items-center gap-2">
              <Checkbox
                id={exifCheckboxId}
                checked={preserveExif}
                onCheckedChange={(checked) => setPreserveExif(checked === true)}
              />
              <label
                htmlFor={exifCheckboxId}
                className="text-sm font-medium cursor-pointer"
              >
                Preserve EXIF
              </label>
            </div>

            {/* 타임스탬프 보존 */}
            <div className="flex items-center gap-2">
              <Checkbox
                id={timestampCheckboxId}
                checked={preserveTimestamps}
                onCheckedChange={(checked) =>
                  setPreserveTimestamps(checked === true)
                }
              />
              <label
                htmlFor={timestampCheckboxId}
                className="text-sm font-medium cursor-pointer"
              >
                Keep dates
              </label>
            </div>
          </div>

          {/* Convert 버튼 */}
          <Button
            disabled={unconvertedCount === 0}
            onClick={async () => {
              try {
                // 저장 폴더 선택
                const outputDir = await open({
                  directory: true,
                  multiple: false,
                  title: "Select output folder for converted images",
                });

                if (!outputDir || Array.isArray(outputDir)) return;

                // 변환 실행
                const results = await invoke<ConversionResult[]>(
                  "convert_images",
                  {
                    targetFormat,
                    quality,
                    preserveExif,
                    preserveTimestamps,
                    outputDir,
                  },
                );

                console.log("Conversion complete:", results);
                alert(
                  `Successfully converted ${results.length} image(s) to ${targetFormat.toUpperCase()}`,
                );
              } catch (error) {
                console.error("Conversion failed:", error);
                alert(`Conversion failed: ${error}`);
              }
            }}
            className="ml-auto"
          >
            Convert {unconvertedCount > 0 && `(${unconvertedCount})`}
          </Button>
        </div>
      </div>
    </footer>
  );
}
