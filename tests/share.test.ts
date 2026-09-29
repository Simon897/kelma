import { describe, expect, it } from "vitest";
import { shareText } from "../lib/share";

describe("shareText", () => {
  it("puts the mode and puzzle number in the title", () => {
    const lines = shareText({ mode: "tqila", day: 11, guesses: ["TIBNA", "SAĦTA"], solution: "SAĦTA", won: true, highContrast: false }).split("\n");
    expect(lines[0]).toBe("Kelma Tqila #12 2/6");
    expect(lines[1]).toBe("🟨⬜⬜⬜🟩");
    expect(lines[2]).toBe("🟩🟩🟩🟩🟩");
  });

  it("uses X/6 on a loss, and Normali in the title", () => {
    const guesses = ["KAMRA", "TIFEL", "MEJDA", "BAĦAR", "FESTA", "KTIEB"];
    const lines = shareText({ mode: "normali", day: 0, guesses, solution: "SKOLA", won: false, highContrast: false }).split("\n");
    expect(lines[0]).toBe("Kelma Normali #1 X/6");
    expect(lines).toHaveLength(7);
  });

  it("uses orange and blue in high-contrast mode", () => {
    const text = shareText({ mode: "tqila", day: 0, guesses: ["TIBNA", "SAĦTA"], solution: "SAĦTA", won: true, highContrast: true });
    expect(text).toContain("🟧🟧🟧🟧🟧");
    expect(text).toContain("🟦");
    expect(text).not.toMatch(/🟩|🟨/u);
  });
});
