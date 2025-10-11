import {create} from "zustand";

export interface FileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  lastModified: number; // 파일 수정 시간 (타임스탬프)
  path?: string; // Tauri 파일 경로 (로컬 파일의 경우)
  preview?: string; // 이미지 미리보기 URL (추후 사용)
}

interface FileStore {
  fileList: FileItem[];
  addFiles: (files: File[], paths?: string[]) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
}

export const useFileStore = create<FileStore>((set) => ({
  fileList: [],

  addFiles: (files, paths) =>
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
