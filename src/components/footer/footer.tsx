import {invoke} from "@tauri-apps/api/core";
import {open} from "@tauri-apps/plugin-dialog";
import {useId} from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {useFileList} from "@/hooks/use-file-list";
import {
  type ImageFormat,
  useConversionSettings,
} from "@/stores/conversion-settings-store";

interface ConversionResult {
  original_name: string;
  converted_name: string;
  original_size: number;
  converted_size: number;
  saved_path: string;
}

export function Footer() {
  const {fileList, convertingFiles} = useFileList();

  // All settings from store
  const {
    targetFormat,
    qualityByFormat,
    avifSpeed,
    preserveExif,
    preserveTimestamps,
    useSourceDirectory,
    setTargetFormat,
    setQualityForFormat,
    setAvifSpeed,
    setPreserveExif,
    setPreserveTimestamps,
    setUseSourceDirectory,
  } = useConversionSettings();

  const exifCheckboxId = useId();
  const timestampCheckboxId = useId();
  const sourceDirectoryCheckboxId = useId();

  // 현재 포맷의 quality 값
  const quality = qualityByFormat[targetFormat];

  // Dev mode 감지
  const isDev = import.meta.env.DEV;

  // 변환되지 않은 파일만 카운트
  const unconvertedFiles = fileList.filter((f) => !f.converted);
  const unconvertedCount = unconvertedFiles.length;

  // EXIF 보존 지원 포맷 체크
  const exifSupportedFormats: ImageFormat[] = ["webp", "jpeg", "png"];
  const supportsExif = exifSupportedFormats.includes(targetFormat);

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
              onValueChange={(value) =>
                setTargetFormat(value as ImageFormat)
              }
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
                {isDev && (
                  <SelectItem value="error" className="text-red-600">
                    Error (Test)
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Quality/Compression 옵션 (포맷별 조건부) */}
          {(targetFormat === "webp" ||
            targetFormat === "jpeg" ||
            targetFormat === "avif") && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-1 items-center gap-2 max-w-md">
                    <span className="text-sm font-medium cursor-pointer">
                      Quality:
                    </span>
                    <Slider
                      value={[quality]}
                      onValueChange={(value) =>
                        setQualityForFormat(targetFormat, value[0])
                      }
                      min={0}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <output className="text-sm text-muted-foreground w-8">
                      {quality}
                    </output>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Image quality (0-100). Higher values produce better quality
                    but larger file sizes. <strong>Recommended: 80-90</strong>{" "}
                    for photos, <strong>90-100</strong> for graphics.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {targetFormat === "png" && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-1 items-center gap-2 max-w-md">
                    <span className="text-sm font-medium">Compression:</span>
                    <Slider
                      value={[quality]}
                      onValueChange={(value) =>
                        setQualityForFormat(targetFormat, value[0])
                      }
                      min={0}
                      max={9}
                      step={1}
                      className="flex-1"
                    />
                    <output className="text-sm text-muted-foreground w-8">
                      {quality}
                    </output>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    PNG compression level (0-9). Higher values produce smaller
                    files but take longer to compress. Lossless - no quality
                    loss at any level. <strong>Recommended: 6</strong> for
                    balanced speed/size.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* AVIF Speed 옵션 */}
          {targetFormat === "avif" && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-1 items-center gap-2 max-w-md">
                    <span className="text-sm font-medium cursor-pointer">
                      Speed:
                    </span>
                    <Slider
                      value={[avifSpeed]}
                      onValueChange={(value) => setAvifSpeed(value[0])}
                      min={1}
                      max={10}
                      step={1}
                      className="flex-1"
                    />
                    <output className="text-sm text-muted-foreground w-8">
                      {avifSpeed}
                    </output>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    AVIF encoding speed (1-10). Lower values = better
                    compression but slower. Higher values = faster but larger
                    files. <strong>Recommended: 4-6 for balanced</strong>, 8-10
                    for fast preview.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* 두 번째 줄: 보존 옵션 + Convert 버튼 */}
        <div className="flex items-center gap-4">
          {/* 보존 옵션들 */}
          <div className="flex items-center gap-4">
            {/* EXIF 보존 - 지원하는 포맷에만 표시 */}
            {supportsExif && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={exifCheckboxId}
                        checked={preserveExif}
                        onCheckedChange={(checked) => setPreserveExif(checked === true)}
                      />
                      <label
                        htmlFor={exifCheckboxId}
                        className="flex items-center gap-1.5 text-sm font-medium cursor-pointer"
                      >
                        EXIF
                      </label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Keep camera metadata (date, camera model, GPS, etc.) in
                      converted images. Supported for JPEG, PNG, and WebP
                      formats.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* 타임스탬프 보존 */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
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
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Preserve original file creation and modification dates for
                    converted images. Useful for maintaining photo organization
                    by date.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* 원본 폴더에 저장 */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={sourceDirectoryCheckboxId}
                      checked={useSourceDirectory}
                      onCheckedChange={(checked) =>
                        setUseSourceDirectory(checked === true)
                      }
                    />
                    <label
                      htmlFor={sourceDirectoryCheckboxId}
                      className="text-sm font-medium cursor-pointer"
                    >
                      Use source folder
                    </label>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Save converted images in the same folder as the original
                    files. If unchecked, you will be asked to select an output
                    folder.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Convert 버튼 */}
          <Button
            disabled={unconvertedCount === 0 || convertingFiles.size > 0}
            loading={convertingFiles.size > 0}
            onClick={async () => {
              try {
                let outputDir: string;

                if (useSourceDirectory) {
                  // 원본 폴더 사용 - 특수 값 전송
                  outputDir = "USE_SOURCE_DIR";
                } else {
                  // 저장 폴더 선택
                  const selected = await open({
                    directory: true,
                    multiple: false,
                    title: "Select output folder for converted images",
                  });

                  if (!selected || Array.isArray(selected)) return;
                  outputDir = selected;
                }

                // 변환 실행
                const results = await invoke<ConversionResult[]>(
                  "convert_images",
                  {
                    targetFormat,
                    quality,
                    avifSpeed,
                    preserveExif,
                    preserveTimestamps,
                    outputDir,
                  },
                );

                console.log("Conversion complete:", results);
              } catch (error) {
                console.error("Conversion failed:", error);
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
