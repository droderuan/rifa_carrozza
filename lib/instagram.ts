export const REGEX_INSTAGRAM = /^https:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)\/?(?:\?.*)?$/;

export function shortcodeInstagram(url: string | undefined): string | null {
  return url?.trim().match(REGEX_INSTAGRAM)?.[1] ?? null;
}
