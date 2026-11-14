import { describe, expect, it } from "vite-plus/test";
import { isDrag } from "./useKeyInteraction";

describe("クリックとカメラドラッグの区別", () => {
  it("6px以内の手ぶれをクリックとして扱う", () => {
    expect(isDrag({ x: 30, y: 20 }, 33, 24)).toBe(false);
    expect(isDrag({ x: 30, y: 20 }, 36, 20)).toBe(false);
  });
  it("斜めの移動も含め、6pxを超えるとドラッグとして扱う", () => {
    expect(isDrag({ x: 30, y: 20 }, 35, 25)).toBe(true);
    expect(isDrag({ x: 30, y: 20 }, 23, 20)).toBe(true);
  });
});
