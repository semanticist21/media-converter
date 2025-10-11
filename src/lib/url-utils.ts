import validator from "validator";

/**
 * URL 유효성 검증 (프로토콜 있든 없든 검증)
 */
export function validateUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;

  // 프로토콜이 있는 경우와 없는 경우 모두 검증
  return validator.isURL(trimmed, {
    protocols: ["http", "https"],
    require_protocol: false,
    require_host: true,
  });
}

/**
 * URL 정규화: 프로토콜이 없으면 https:// 추가
 */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  // 프로토콜이 없으면 https:// 추가
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return trimmed;
}
