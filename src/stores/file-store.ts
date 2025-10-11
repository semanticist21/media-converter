import {create} from "zustand";

export interface ExifData {
  date_time?: string;
  camera_make?: string;
  camera_model?: string;
  iso?: string;
  shutter_speed?: string;
  aperture?: string;
  focal_length?: string;
  orientation?: number;
  width?: number;
  height?: number;
  gps_latitude?: string;
  gps_longitude?: string;
}

export interface FileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  lastModified: number; // 파일 수정 시간 (타임스탬프)
  path?: string; // Tauri 파일 경로 (로컬 파일의 경우)
  url?: string; // URL에서 가져온 파일의 원본 URL
  preview?: string; // 이미지 미리보기 URL (추후 사용)
  exif?: ExifData; // EXIF 메타데이터
}

interface FileStore {
  fileList: FileItem[];
  addFiles: (
    files: File[],
    paths?: string[],
    urls?: string[],
    exifs?: (ExifData | null)[],
  ) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
}

export const useFileStore = create<FileStore>((set) => ({
  fileList: [],

  addFiles: (files, paths, urls, exifs) =>
    set((state) => {
      // 같은 경로의 파일 중복 추가 방지 (Tauri v2 드래그앤드롭 버그 대응)
      const existingPaths = new Set(
        state.fileList.map((item) => item.path).filter(Boolean),
      );

      const newFiles = files
        .map((file, index) => ({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          path: paths?.[index],
          url: urls?.[index],
          exif: exifs?.[index] ?? undefined,
        }))
        .filter((item) => !item.path || !existingPaths.has(item.path));

      return {
        fileList: [...state.fileList, ...newFiles],
      };
    }),

  removeFile: (id) =>
    set((state) => ({
      fileList: state.fileList.filter((item) => item.id !== id),
    })),

  clearFiles: () => set({fileList: []}),
}));
