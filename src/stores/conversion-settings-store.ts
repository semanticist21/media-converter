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

// 변환 설정 인터페이스
export interface ConversionSettings {
  targetFormat: ImageFormat;
  preserveExif: boolean;
  preserveTimestamps: boolean;
  useSourceDirectory: boolean;
  qualityByFormat: Record<ImageFormat, number>;
  avifSpeed: number;
}

// Store 인터페이스
interface ConversionSettingsStore extends ConversionSettings {
  setTargetFormat: (format: ImageFormat) => void;
  setPreserveExif: (value: boolean) => void;
  setPreserveTimestamps: (value: boolean) => void;
  setUseSourceDirectory: (value: boolean) => void;
  setQualityForFormat: (format: ImageFormat, value: number) => void;
  setAvifSpeed: (value: number) => void;
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
      setQualityForFormat: (format, value) =>
        set((state) => ({
          qualityByFormat: {
            ...state.qualityByFormat,
            [format]: value,
          },
        })),
      setAvifSpeed: (value) => set({avifSpeed: value}),

      // Reset to defaults
      reset: () => set(defaultSettings),
    }),
    {
      name: "conversion-settings", // localStorage key
    },
  ),
);
