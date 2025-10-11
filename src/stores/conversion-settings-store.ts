import {create} from "zustand";
import {persist} from "zustand/middleware";

type ImageFormat =
  | "webp"
  | "jpeg"
  | "png"
  | "avif"
  | "gif"
  | "bmp"
  | "tiff"
  | "error";

/**
 * 이미지 변환 설정
 * @property {ImageFormat} targetFormat - 변환 대상 포맷
 * @property {boolean} preserveExif - EXIF 메타데이터 보존 여부
 * @property {boolean} preserveTimestamps - 파일 타임스탬프 보존 여부
 * @property {boolean} useSourceDirectory - 원본 파일과 같은 폴더에 저장할지 여부
 * @property {boolean} createSubfolder - 원본 폴더 내에 하위 폴더 생성 여부 (useSourceDirectory가 true일 때만 적용)
 * @property {string} subfolderName - 생성할 하위 폴더 이름 (createSubfolder가 true일 때 사용)
 * @property {Record<ImageFormat, number>} qualityByFormat - 각 포맷별 품질 설정 (0-100 또는 압축 레벨)
 * @property {number} avifSpeed - AVIF 인코딩 속도 (1-10, 낮을수록 압축률 높음)
 * @property {number} maxConcurrentConversions - 동시 변환 개수 (0 = 자동/CPU 코어 수, 1 이상 = 수동 설정)
 */
export interface ConversionSettings {
  targetFormat: ImageFormat;
  preserveExif: boolean;
  preserveTimestamps: boolean;
  useSourceDirectory: boolean;
  createSubfolder: boolean;
  subfolderName: string;
  qualityByFormat: Record<ImageFormat, number>;
  avifSpeed: number;
  maxConcurrentConversions: number;
}

// Store 인터페이스
interface ConversionSettingsStore extends ConversionSettings {
  setTargetFormat: (format: ImageFormat) => void;
  setPreserveExif: (value: boolean) => void;
  setPreserveTimestamps: (value: boolean) => void;
  setUseSourceDirectory: (value: boolean) => void;
  setCreateSubfolder: (value: boolean) => void;
  setSubfolderName: (value: string) => void;
  setQualityForFormat: (format: ImageFormat, value: number) => void;
  setAvifSpeed: (value: number) => void;
  setMaxConcurrentConversions: (value: number) => void;
  reset: () => void;
}

// ImageFormat 타입 export
export type {ImageFormat};

// 기본값
const defaultSettings: ConversionSettings = {
  targetFormat: "webp",
  preserveExif: true,
  preserveTimestamps: true,
  useSourceDirectory: false,
  createSubfolder: false,
  subfolderName: "converted",
  qualityByFormat: {
    webp: 80,
    jpeg: 80,
    png: 6,
    avif: 80,
    gif: 0,
    bmp: 0,
    tiff: 0,
    error: 0,
  },
  avifSpeed: 6,
  maxConcurrentConversions: 0, // 0 = auto (CPU cores)
};

// Zustand store with localStorage persistence
export const useConversionSettings = create<ConversionSettingsStore>()(
  persist(
    (set) => ({
      // 기본 설정값
      ...defaultSettings,

      // Setters
      setTargetFormat: (format) => set({targetFormat: format}),
      setPreserveExif: (value) => set({preserveExif: value}),
      setPreserveTimestamps: (value) => set({preserveTimestamps: value}),
      setUseSourceDirectory: (value) => set({useSourceDirectory: value}),
      setCreateSubfolder: (value) => set({createSubfolder: value}),
      setSubfolderName: (value) => set({subfolderName: value}),
      setQualityForFormat: (format, value) =>
        set((state) => ({
          qualityByFormat: {
            ...state.qualityByFormat,
            [format]: value,
          },
        })),
      setAvifSpeed: (value) => set({avifSpeed: value}),
      setMaxConcurrentConversions: (value) =>
        set({maxConcurrentConversions: value}),

      // Reset to defaults
      reset: () => set(defaultSettings),
    }),
    {
      name: "conversion-settings", // localStorage key
    },
  ),
);
