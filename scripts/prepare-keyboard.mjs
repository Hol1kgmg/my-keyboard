import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { keyboardLayout } from "./keyboard-layout.mjs";

const root = new URL("../", import.meta.url);
const source = await readFile(new URL("assets/source/keyboard.glb", root));
if (
  source.toString("ascii", 0, 4) !== "glTF" ||
  source.readUInt32LE(4) !== 2 ||
  source.readUInt32LE(8) !== source.length
) {
  throw new Error("assets/source/keyboard.glb must be a complete glTF 2.0 binary.");
}
const jsonSize = source.readUInt32LE(12);
const doc = JSON.parse(source.subarray(20, 20 + jsonSize).toString());
const binary = source.subarray(28 + jsonSize);
const chunks = [binary];
let binaryLength = binary.length;
const capNode = doc.nodes.find((node) => node.name === "keycaps");
if (!capNode) throw new Error("Expected the provided keycaps node.");
const capMesh = capNode.mesh;
const primitive = doc.meshes[capMesh].primitives[0];
const componentBytes = { 5123: 2, 5125: 4, 5126: 4 };
const components = { SCALAR: 1, VEC2: 2, VEC3: 3 };
function readAccessor(index) {
  const accessor = doc.accessors[index];
  const view = doc.bufferViews[accessor.bufferView];
  const width = components[accessor.type];
  const bytes = componentBytes[accessor.componentType];
  if (!width || !bytes || accessor.sparse) throw new Error("Unsupported source accessor.");
  const read = { 5123: "readUInt16LE", 5125: "readUInt32LE", 5126: "readFloatLE" }[
    accessor.componentType
  ];
  return Array.from({ length: accessor.count }, (_, i) =>
    Array.from({ length: width }, (_, c) =>
      binary[read](
        (view.byteOffset ?? 0) +
          (accessor.byteOffset ?? 0) +
          i * (view.byteStride ?? width * bytes) +
          c * bytes,
      ),
    ),
  );
}
function addAccessor(values, type, componentType = 5126) {
  const width = components[type];
  const bytes = componentBytes[componentType];
  const buffer = Buffer.alloc(Math.ceil((values.length * width * bytes) / 4) * 4);
  values.forEach((value, i) =>
    value.forEach((v, c) => {
      if (componentType === 5123) buffer.writeUInt16LE(v, (i * width + c) * bytes);
      else buffer.writeFloatLE(v, (i * width + c) * bytes);
    }),
  );
  const view =
    doc.bufferViews.push({
      buffer: 0,
      byteOffset: binaryLength,
      byteLength: values.length * width * bytes,
    }) - 1;
  binaryLength += buffer.length;
  chunks.push(buffer);
  return (
    doc.accessors.push({
      bufferView: view,
      componentType,
      type,
      count: values.length,
      ...(type === "VEC3"
        ? {
            min: Array.from({ length: 3 }, (_, c) => Math.min(...values.map((v) => v[c]))),
            max: Array.from({ length: 3 }, (_, c) => Math.max(...values.map((v) => v[c]))),
          }
        : {}),
    }) - 1
  );
}
const positions = readAccessor(primitive.attributes.POSITION);
const normals = readAccessor(primitive.attributes.NORMAL);
const uvs = readAccessor(primitive.attributes.TEXCOORD_0);
const indices = readAccessor(primitive.indices).flat();
const owners = positions.map(([x, y]) => {
  const matches = keyboardLayout.filter(
    (key) =>
      Math.abs(x - key.centerMm[0]) <= (18.1 + (key.widthU - 1) * 19.05) / 2 + 0.001 &&
      Math.abs(y - key.centerMm[1]) <= 18.1 / 2 + 0.001,
  );
  if (matches.length !== 1) throw new Error(`Ambiguous key vertex at ${x}, ${y}`);
  return matches[0].id;
});
const triangles = new Map(keyboardLayout.map((key) => [key.id, []]));
for (let i = 0; i < indices.length; i += 3) {
  const triangle = indices.slice(i, i + 3);
  if (!triangle.every((index) => owners[index] === owners[triangle[0]]))
    throw new Error("A triangle spans multiple keys.");
  triangles.get(owners[triangle[0]]).push(...triangle);
}
const staticNodes = doc.nodes.filter((node) => node !== capNode);
const staticMeshes = staticNodes.map((node) => doc.meshes[node.mesh]);
staticNodes.forEach((node, i) => {
  node.mesh = i;
});
doc.meshes = staticMeshes;
doc.nodes = staticNodes;
for (const key of keyboardLayout) {
  const keyIndices = triangles.get(key.id);
  if (!keyIndices.length) throw new Error(`No geometry for ${key.id}`);
  const vertices = [...new Set(keyIndices)];
  const remap = new Map(vertices.map((index, i) => [index, i]));
  const [cx, cy] = key.centerMm;
  const position = vertices.map((index) => {
    const [x, y, z] = positions[index];
    return [(x - cx) / 1000, (z - 13.5) / 1000, -(y - cy) / 1000];
  });
  const normal = vertices.map((index) => [
    normals[index][0],
    normals[index][2],
    -normals[index][1],
  ]);
  const mesh =
    doc.meshes.push({
      name: key.id,
      primitives: [
        {
          attributes: {
            POSITION: addAccessor(position, "VEC3"),
            NORMAL: addAccessor(normal, "VEC3"),
            TEXCOORD_0: addAccessor(
              vertices.map((index) => uvs[index]),
              "VEC2",
            ),
          },
          indices: addAccessor(
            keyIndices.map((index) => [remap.get(index)]),
            "SCALAR",
            5123,
          ),
          material: primitive.material,
          mode: 4,
        },
      ],
    }) - 1;
  doc.nodes.push({ name: key.id, mesh, translation: [cx / 1000, 0.0135, -cy / 1000] });
}
doc.scenes = [{ nodes: doc.nodes.map((_, i) => i) }];
doc.scene = 0;
const allBinary = Buffer.concat(chunks);
const usedAccessors = new Set(
  doc.meshes.flatMap((mesh) =>
    mesh.primitives.flatMap((p) => [p.indices, ...Object.values(p.attributes)]),
  ),
);
const accessorRemap = new Map([...usedAccessors].map((index, i) => [index, i]));
doc.accessors = [...usedAccessors].map((index) => doc.accessors[index]);
for (const mesh of doc.meshes)
  for (const p of mesh.primitives) {
    p.indices = accessorRemap.get(p.indices);
    for (const name of Object.keys(p.attributes))
      p.attributes[name] = accessorRemap.get(p.attributes[name]);
  }
const usedViews = new Set([
  ...doc.accessors.map((a) => a.bufferView),
  ...doc.images.map((i) => i.bufferView),
]);
const viewRemap = new Map();
const compact = [];
let compactLength = 0;
const compactViews = [];
for (const index of usedViews) {
  const view = doc.bufferViews[index];
  const data = Buffer.alloc(Math.ceil(view.byteLength / 4) * 4);
  allBinary.copy(data, 0, view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
  viewRemap.set(index, compactViews.length);
  compactViews.push({ ...view, byteOffset: compactLength });
  compactLength += data.length;
  compact.push(data);
}
doc.bufferViews = compactViews;
for (const a of doc.accessors) a.bufferView = viewRemap.get(a.bufferView);
for (const i of doc.images) i.bufferView = viewRemap.get(i.bufferView);
doc.buffers = [{ byteLength: compactLength }];
const json = Buffer.from(JSON.stringify(doc));
const paddedJson = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20);
json.copy(paddedJson);
const header = Buffer.alloc(20);
header.write("glTF");
header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + paddedJson.length + compactLength, 8);
header.writeUInt32LE(paddedJson.length, 12);
header.writeUInt32LE(0x4e4f534a, 16);
const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(compactLength);
binHeader.writeUInt32LE(0x004e4942, 4);
await mkdir(new URL("public/models/", root), { recursive: true });
await mkdir(new URL("src/data/", root), { recursive: true });
await writeFile(
  new URL("public/models/keyboard.glb", root),
  Buffer.concat([header, paddedJson, binHeader, ...compact]),
);
await writeFile(
  new URL("src/data/keys.json", root),
  JSON.stringify(keyboardLayout, null, 2) + "\n",
);
console.log(
  `${keyboardLayout.length} keys, ${doc.nodes.length} nodes → ${fileURLToPath(new URL("public/models/keyboard.glb", root))}`,
);
