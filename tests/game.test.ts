import { describe, expect, it } from "vitest";
import { KEYBOARD_ROWS, REVEAL_MS, keyboardStates, normaliseKey, scoreGuess, tiles } from "../lib/game";

describe("scoreGuess", () => {
  it("scores the worked example BAĦAR / ARENA", () => {
    expect(scoreGuess("ARENA", "BAĦAR")).toEqual(["present", "present", "absent", "absent", "present"]);
  });

  it("uses up a letter on a correct match before giving present (SODDA / DAWRA)", () => {
    expect(scoreGuess("DAWRA", "SODDA")).toEqual(["present", "absent", "absent", "absent", "correct"]);
  });

  it("never gives more colours than the solution has copies", () => {
    // Solution has one E; the guess has three
    expect(scoreGuess("EEEXA", "BEZZA")).toEqual(["absent", "correct", "absent", "absent", "correct"]);
    expect(scoreGuess("LELLA", "SKOLA")).toEqual(["absent", "absent", "absent", "correct", "correct"]);
    expect(scoreGuess("TATTA", "KTIEB")).toEqual(["present", "absent", "absent", "absent", "absent"]);
  });

  it("gives present to every copy the solution can cover", () => {
    expect(scoreGuess("AABBX", "BBAAX")).toEqual(["present", "present", "present", "present", "correct"]);
  });

  it("treats Maltese letters as single tiles", () => {
    expect(tiles("ĦSIEB")).toHaveLength(5);
    expect(scoreGuess("BAĦAR", "BAĦAR")).toEqual(Array(5).fill("correct"));
    expect(scoreGuess("ĦSIEB", "BAĦAR")).toEqual(["present", "absent", "absent", "absent", "present"]);
  });
});

describe("keyboardStates", () => {
  it("keeps the best state: correct > present > absent", () => {
    // gold in guess 1, green in guess 2
    const s = keyboardStates(["KAMRA", "SKOLA"], "SKOLA");
    expect(s.K).toBe("correct");
    expect(s.M).toBe("absent");
    // green first, then gold later: stays green
    const t = keyboardStates(["SKOLA", "KAMRA"], "SKOLA");
    expect(t.K).toBe("correct");
    expect(t.A).toBe("correct");
  });

  it("present beats absent for the same letter", () => {
    const s = keyboardStates(["DAWRA"], "SODDA");
    expect(s.A).toBe("correct");
    expect(s.D).toBe("present");
    const u = keyboardStates(["LELLA", "BELLA"], "SKOLA");
    expect(u.L).toBe("correct");
  });
});

describe("normaliseKey", () => {
  it("maps C to Ċ, both cases", () => {
    expect(normaliseKey("c")).toBe("Ċ");
    expect(normaliseKey("C")).toBe("Ċ");
    expect(normaliseKey("ċ")).toBe("Ċ");
  });
  it("accepts Maltese letters and uppercases", () => {
    expect(normaliseKey("ġ")).toBe("Ġ");
    expect(normaliseKey("ħ")).toBe("Ħ");
    expect(normaliseKey("Ż")).toBe("Ż");
    expect(normaliseKey("a")).toBe("A");
    expect(normaliseKey("z")).toBe("Z");
  });
  it("rejects everything else", () => {
    for (const k of ["1", " ", "Enter", "é", "ß", "-", "Shift", "à", "'", "y", "Y"]) expect(normaliseKey(k)).toBeNull();
  });
});

describe("keyboard layout and timing", () => {
  it("has 30 keys with the Maltese letters beside their base letters, and no C or Y", () => {
    expect(KEYBOARD_ROWS.flat()).toHaveLength(30);
    expect(KEYBOARD_ROWS[0].join(" ")).toBe("Q W E R T U I O P");
    expect(KEYBOARD_ROWS.flat()).not.toContain("Y");
    expect(KEYBOARD_ROWS[1].join(" ")).toBe("A S D F G Ġ H Ħ J K L");
    expect(KEYBOARD_ROWS[2].join(" ")).toBe("ENTER Z Ż X Ċ V B N M BACKSPACE");
    expect(KEYBOARD_ROWS.flat()).not.toContain("C");
  });
  it("locks input for the full reveal", () => {
    expect(REVEAL_MS).toBe(1070);
  });
});
