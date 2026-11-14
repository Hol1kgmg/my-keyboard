import { describe, expect, it } from "vite-plus/test";
import { keyboardLayout } from "../scripts/keyboard-layout.mjs";

describe("指定されたキー配列", () => {
  it("空欄と記号を含めて4行の指定どおりに並ぶ", () => {
    const labels = Array.from({ length: 4 }, (_, row) =>
      keyboardLayout.filter((key) => key.row === row).map((key) => key.legend),
    );
    expect(labels).toEqual([
      ["Q", "W", "E", "R", "T", "", "", "", "Y", "U", "I", "O", "P"],
      ["A", "S", "D", "F", "G", "tab", "", "esc", "H", "J", "K", "L", ";"],
      ["Z", "X", "C", "V", "B", "", "", "-", "N", "M", ",", ".", "/"],
      ["", "", "", "英数", "⌫", "shift", "space", "↩︎", "ひら", "", "", ""],
    ]);
  });
  it("最下段の4キーを1.25uに保ち、空欄には物理入力を割り当てない", () => {
    expect(keyboardLayout.filter((key) => key.widthU === 1.25).map((key) => key.id)).toEqual([
      "Key_Backspace",
      "Key_Shift",
      "Key_Space",
      "Key_Enter",
    ]);
    const blanks = keyboardLayout.filter((key) => !key.legend);
    expect(blanks).toHaveLength(12);
    for (const key of blanks) expect(key.codes).toEqual([]);
    const codes = keyboardLayout.flatMap((key) => key.codes);
    expect(new Set(codes).size).toBe(codes.length);
    expect(keyboardLayout.find((key) => key.id === "Key_Eisu").codes).toEqual(["Lang2"]);
    expect(keyboardLayout.find((key) => key.id === "Key_Hiragana").codes).toEqual(["Lang1"]);
  });
});
