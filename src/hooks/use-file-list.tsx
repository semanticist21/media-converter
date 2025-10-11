import {invoke} from "@tauri-apps/api/core";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

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

export interface FileItemResponse {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  source_path?: string;
  source_url?: string;
  exif?: ExifData;
}

interface FileListContextType {
  fileList: FileItemResponse[];
  isLoading: boolean;
  addFileFromPath: (path: string) => Promise<void>;
  addFileFromUrl: (url: string) => Promise<void>;
  removeFile: (id: string) => Promise<void>;
  clearFiles: () => Promise<void>;
  refresh: () => Promise<void>;
}

const FileListContext = createContext<FileListContextType | undefined>(
  undefined,
);

export function FileListProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [fileList, setFileList] = useState<FileItemResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const list = await invoke<FileItemResponse[]>("get_file_list");
      setFileList(list);
    } catch (error) {
      console.error("Failed to get file list:", error);
    }
  }, []);

  const addFileFromPath = useCallback(
    async (path: string) => {
      try {
        setIsLoading(true);
        await invoke<FileItemResponse>("add_file_from_path", {path});
        await refresh();
      } catch (error) {
        console.error("Failed to add file from path:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [refresh],
  );

  const addFileFromUrl = useCallback(
    async (url: string) => {
      try {
        setIsLoading(true);
        await invoke<FileItemResponse>("add_file_from_url", {url});
        await refresh();
      } catch (error) {
        console.error("Failed to add file from URL:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [refresh],
  );

  const removeFile = useCallback(
    async (id: string) => {
      try {
        await invoke("remove_file", {id});
        await refresh();
      } catch (error) {
        console.error("Failed to remove file:", error);
        throw error;
      }
    },
    [refresh],
  );

  const clearFiles = useCallback(async () => {
    try {
      await invoke("clear_files");
      await refresh();
    } catch (error) {
      console.error("Failed to clear files:", error);
      throw error;
    }
  }, [refresh]);

  // Load file list on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <FileListContext.Provider
      value={{
        fileList,
        isLoading,
        addFileFromPath,
        addFileFromUrl,
        removeFile,
        clearFiles,
        refresh,
      }}
    >
      {children}
    </FileListContext.Provider>
  );
}

export function useFileList() {
  const context = useContext(FileListContext);
  if (context === undefined) {
    throw new Error("useFileList must be used within a FileListProvider");
  }
  return context;
}
