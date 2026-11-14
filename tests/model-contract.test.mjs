import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vite-plus/test";
import { keyboardLayout } from "../scripts/keyboard-layout.mjs";

function readGlb(path) {
  const bytes = readFileSync(new URL(path, import.meta.url));
  const jsonSize = bytes.readUInt32LE(12);
  return {
    bytes,
    doc: JSON.parse(bytes.subarray(20, 20 + jsonSize)),
    binary: bytes.subarray(28 + jsonSize),
  };
}
const original = readGlb("../keyboard.glb");
const output = readGlb("../public/models/keyboard.glb");

describe("配信用モデルの契約", () => {
  it("元モデルの51キーすべてに、一意なノードとメタデータがある", () => {
    const names = output.doc.nodes
      .filter((node) => node.name.startsWith("Key_"))
      .map((node) => node.name);
    expect(names).toHaveLength(51);
    expect(new Set(names).size).toBe(51);
    expect(names.sort()).toEqual(keyboardLayout.map((key) => key.id).sort());
    expect(output.doc.nodes).toHaveLength(56);
    for (const key of keyboardLayout) {
      const node = output.doc.nodes.find((node) => node.name === key.id);
      expect(node.translation).toEqual([key.centerMm[0] / 1000, 0.0135, -key.centerMm[1] / 1000]);
      expect(key.pressDistance).toBeGreaterThan(0);
      expect(key.pressDistance).toBeLessThan(0.003);
    }
  });
  it("三角形を増減せず、キーを分離する", () => {
    const count = ({ doc }) =>
      doc.meshes.reduce(
        (total, mesh) =>
          total + mesh.primitives.reduce((n, p) => n + doc.accessors[p.indices].count / 3, 0),
        0,
      );
    expect(count(output)).toBe(count(original));
    for (const node of output.doc.nodes.filter((node) => node.name.startsWith("Key_"))) {
      const p = output.doc.meshes[node.mesh].primitives[0];
      const position = output.doc.accessors[p.attributes.POSITION];
      expect(position.min[1]).toBeCloseTo(0, 5);
      expect(position.max[1]).toBeCloseTo(0.0038, 5);
      expect(position.max[0] - position.min[0]).toBeLessThan(0.025);
      expect(position.max[2] - position.min[2]).toBeCloseTo(0.0181, 5);
      expect(output.doc.accessors[p.attributes.NORMAL].count).toBe(position.count);
      expect(output.doc.accessors[p.attributes.TEXCOORD_0].count).toBe(position.count);
    }
  });
  it("材質と埋め込み刻印画像をそのまま維持する", () => {
    expect(output.doc.materials).toEqual(original.doc.materials);
    const hash = ({ doc, binary }) => {
      const view = doc.bufferViews[doc.images[0].bufferView];
      return createHash("sha256")
        .update(binary.subarray(view.byteOffset, view.byteOffset + view.byteLength))
        .digest("hex");
    };
    expect(hash(output)).toBe(hash(original));
  });
  it("GLBの長さと全アクセサの参照が有効である", () => {
    expect(output.bytes.toString("ascii", 0, 4)).toBe("glTF");
    expect(output.bytes.readUInt32LE(4)).toBe(2);
    expect(output.bytes.readUInt32LE(8)).toBe(output.bytes.length);
    expect(output.binary.length).toBe(output.doc.buffers[0].byteLength);
    for (const accessor of output.doc.accessors) {
      const view = output.doc.bufferViews[accessor.bufferView];
      expect(view.byteOffset % 4).toBe(0);
      expect(view.byteOffset + view.byteLength).toBeLessThanOrEqual(output.binary.length);
    }
  });
});
