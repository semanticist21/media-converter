// 이미지 확장자별 스타일 매핑
const extensionStyles = {
  webp: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  svg: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  png: "bg-green-500/10 text-green-600 dark:text-green-400",
  jpg: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  jpeg: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  gif: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  bmp: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  tiff: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  tif: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  avif: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  heic: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  heif: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
} as const;

/**
 * 파일 확장자에 따른 Tailwind CSS 클래스 반환
 * @param ext - 파일 확장자 (소문자)
 * @returns Tailwind CSS 클래스 문자열
 */
export function getExtensionStyle(ext: string): string {
  return (
    extensionStyles[ext as keyof typeof extensionStyles] ||
    "bg-primary/10 text-primary dark:text-primary"
  );
}

/**
 * 파일명에서 확장자 추출
 * @param filename - 파일명
 * @returns 소문자 확장자
 */
export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

/**
 * 확장자를 표시용으로 포맷팅 (대문자, 최대 4글자)
 * @param ext - 파일 확장자
 * @returns 포맷팅된 확장자 문자열
 */
export function formatExtensionDisplay(ext: string): string {
  return ext.toUpperCase().slice(0, 4);
}
