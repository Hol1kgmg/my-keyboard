import { CanvasTexture, SRGBColorSpace } from "three";
import type { Texture } from "three";
import { keys } from "../data/keyboard";

const FONT = 'Arial, "Hiragino Sans", "Yu Gothic", "Segoe UI Symbol", "Apple Symbols", sans-serif';

export function createKeycapTexture(source: Texture, maxAnisotropy: number) {
  const { width, height } = source.image as { width: number; height: number };
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Keycap labels could not be drawn.");
  // 提供GLBのUVに合わせ、元アトラスの8列と256pxのキー寸法を維持する。
  const cellWidth = width / 8;
  const cellHeight = height / Math.ceil(keys.length / 8);
  const pixelsPerMm = 256 / 18.1;
  context.fillStyle = "#ecebee";
  context.fillRect(0, 0, width, height);
  for (const [index, key] of keys.entries()) {
    const x = (index % 8) * cellWidth;
    const y = Math.floor(index / 8) * cellHeight;
    if (key.dark) {
      context.fillStyle = "#202023";
      context.fillRect(x, y, cellWidth, cellHeight);
    }
    if (!key.legend) continue;
    context.fillStyle = key.dark ? "#f5f5f5" : "#46464c";
    const capWidth = 256 + (key.widthU - 1) * 19.05 * pixelsPerMm;
    const footprintLeft = x + (cellWidth - capWidth) / 2;
    const alpha = /^[A-Z]$/.test(key.legend);
    const centered = !/^[A-Z;,./-]$/u.test(key.legend);
    const fontSize = /^[a-z]{2,}$/u.test(key.legend) ? 43 : 66;
    context.font = `${alpha ? "italic " : ""}${fontSize}px ${FONT}`;
    if (centered) {
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(key.legend, x + cellWidth / 2, y + cellHeight / 2);
    } else {
      context.textAlign = "left";
      context.textBaseline = "alphabetic";
      const ascent = context.measureText(key.legend).actualBoundingBoxAscent;
      context.fillText(
        key.legend,
        footprintLeft + 3.45 * pixelsPerMm,
        y + 4 + 2.9 * pixelsPerMm + ascent,
      );
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.flipY = source.flipY;
  texture.anisotropy = Math.min(8, maxAnisotropy);
  return texture;
}
