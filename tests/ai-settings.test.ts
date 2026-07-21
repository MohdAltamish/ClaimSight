import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/ai-settings";

describe("encrypted Gemini settings", () => {
  const key = Buffer.alloc(32, 7);
  const secret = "test-gemini-key-that-must-not-appear-in-storage";

  it("round-trips a key without keeping plaintext in the stored envelope", () => {
    const encrypted = encryptSecret(secret, key);
    expect(encrypted).not.toContain(secret);
    expect(encrypted.split(".")).toHaveLength(4);
    expect(decryptSecret(encrypted, key)).toBe(secret);
  });

  it("rejects a tampered encrypted value", () => {
    const encrypted = encryptSecret(secret, key);
    const parts = encrypted.split(".");
    parts[3] = (parts[3][0] === "A" ? "B" : "A") + parts[3].slice(1);
    const tampered = parts.join(".");
    expect(() => decryptSecret(tampered, key)).toThrow("could not be decrypted");
  });
});
