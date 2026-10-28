import { describe, expect, it } from "vitest";
import { shortcodeInstagram } from "@/lib/instagram";

describe("shortcodeInstagram", () => {
  it.each([
    "https://www.instagram.com/p/De-Mr-gBsLA/",
    "https://instagram.com/p/De-Mr-gBsLA",
    "https://www.instagram.com/reel/De-Mr-gBsLA/?igsh=abc",
  ])("extrai de %s", (url) => {
    expect(shortcodeInstagram(url)).toBe("De-Mr-gBsLA");
  });

  it.each(["https://youtube.com/x", "", undefined, "https://www.instagram.com/carrozza/"])("null para %s", (url) => {
    expect(shortcodeInstagram(url)).toBeNull();
  });
});
