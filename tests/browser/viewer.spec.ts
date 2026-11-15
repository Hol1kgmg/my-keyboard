import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { PerspectiveCamera, Vector3 } from "three";

async function openViewer(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("viewer")).toHaveAttribute("data-ready", "true", {
    timeout: 45_000,
  });
  await page.waitForLoadState("networkidle");
}

const keyQ = new Vector3(-0.1143, 0.0173, -0.028575);

async function keyQPoint(page: Page) {
  const box = (await page.locator("canvas").boundingBox())!;
  const aspect = box.width / box.height;
  const camera = new PerspectiveCamera(38, aspect);
  // CameraController の初期位置と揃える。ずれると Q を外してテストが失敗する。
  camera.position.set(0.065, 0.15, 0.21).multiplyScalar(Math.max(1, 1.35 / aspect));
  camera.lookAt(0, 0.008, 0);
  camera.updateMatrixWorld();
  const ndc = keyQ.clone().project(camera);
  return {
    x: box.x + ((ndc.x + 1) / 2) * box.width,
    y: box.y + ((1 - ndc.y) / 2) * box.height,
  };
}

for (const [asset, pattern] of [
  ["モデル", "**/models/keyboard.glb"],
  ["照明", "**/environment/*.hdr"],
]) {
  test(`${asset}の読込中はローディングを表示し、初回描画後に終了する`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.addInitScript(() => {
      const original = Object.getOwnPropertyDescriptor(
        WebGL2RenderingContext.prototype,
        "drawElements",
      )!.value as WebGL2RenderingContext["drawElements"];
      Object.defineProperty(WebGL2RenderingContext.prototype, "drawElements", {
        value: function (
          this: WebGL2RenderingContext,
          ...args: Parameters<WebGL2RenderingContext["drawElements"]>
        ) {
          Reflect.apply(original, this, args);
          if (
            !performance.getEntriesByName("keyboard-first-draw").length &&
            this.getParameter(this.DRAW_FRAMEBUFFER_BINDING) === null
          ) {
            performance.mark("keyboard-first-draw");
          }
        },
      });
    });
    for (const reload of [false, true]) {
      let release!: () => void;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route(pattern, async (route) => {
        await pending;
        await route.continue();
      });
      const requested = page.waitForRequest(pattern);
      if (reload) await page.reload({ waitUntil: "domcontentloaded" });
      else await page.goto("/", { waitUntil: "domcontentloaded" });
      try {
        await requested;
        await expect(page.getByRole("status")).toHaveText("キーボードを読み込んでいます");
        await expect(page.getByTestId("viewer")).toHaveAttribute("data-ready", "false");
        if (!reload && asset === "モデル") {
          await page.screenshot({ path: "test-results/loading.png", fullPage: true });
        }
      } finally {
        release();
      }
      await expect(page.getByTestId("viewer")).toHaveAttribute("data-ready", "true", {
        timeout: 45_000,
      });
      await expect(page.getByText("キーボードを読み込んでいます")).toHaveCount(0);
      const timing = await page.evaluate(() => ({
        drawn: performance.getEntriesByName("keyboard-first-draw")[0]?.startTime,
        ready: performance.getEntriesByName("keyboard-ready")[0]?.startTime,
      }));
      expect(timing.drawn).toBeDefined();
      expect(timing.ready).toBeGreaterThanOrEqual(timing.drawn);
      await page.unroute(pattern);
    }
  });
}

test("実モデルを表示し、ホバー・個別の押下・復帰を行える", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") console.log("Browser:", message.text());
  });
  page.on("requestfailed", (request) =>
    console.log("Request failed:", request.url(), request.failure()),
  );
  page.on("pageerror", (error) => errors.push(error.message));
  await openViewer(page);
  const q = await keyQPoint(page);
  await page.mouse.move(q.x, q.y);
  await expect(page.getByTestId("viewer")).toHaveAttribute("data-hovered", "Key_Q");
  await page.mouse.down();
  await expect(page.getByTestId("viewer")).toHaveAttribute("data-pressed", "Key_Q");
  await page.mouse.up();
  await expect(page.getByTestId("viewer")).toHaveAttribute("data-pressed", "");
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("キーからのドラッグは押下せず、外側で離しても押し続けない", async ({ page }) => {
  await openViewer(page);
  const q = await keyQPoint(page);
  await page.mouse.move(q.x, q.y);
  await page.mouse.down();
  await page.mouse.move(q.x + 70, q.y + 20, { steps: 3 });
  await page.mouse.up();
  await expect(page.getByTestId("viewer")).toHaveAttribute("data-pressed", "");
  await openViewer(page);
  await page.mouse.move(q.x, q.y);
  await page.mouse.down();
  await expect(page.getByTestId("viewer")).toHaveAttribute("data-pressed", "Key_Q");
  await page.mouse.move(5, 5);
  await page.mouse.up();
  await expect(page.getByTestId("viewer")).toHaveAttribute("data-pressed", "");
});

test("押下中にフォーカスを失うと押下を解除する", async ({ page }) => {
  await openViewer(page);
  const q = await keyQPoint(page);
  await page.mouse.move(q.x, q.y);
  await page.mouse.down();
  await expect(page.getByTestId("viewer")).toHaveAttribute("data-pressed", "Key_Q");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.getByTestId("viewer")).toHaveAttribute("data-pressed", "");
  await page.mouse.up();
});

test("刻印用Canvasに新配列の記号・日本語刻印を描く", async ({ page }) => {
  await page.addInitScript(() => {
    const original = Object.getOwnPropertyDescriptor(
      CanvasRenderingContext2D.prototype,
      "fillText",
    )!.value as CanvasRenderingContext2D["fillText"];
    const recorded: string[] = [];
    (window as unknown as { keycapLegends: string[] }).keycapLegends = recorded;
    Object.defineProperty(CanvasRenderingContext2D.prototype, "fillText", {
      value: function (this: CanvasRenderingContext2D, text: string, ...args: number[]) {
        recorded.push(text);
        return Reflect.apply(original, this, [text, ...args]);
      },
    });
  });
  await openViewer(page);
  const legends = await page.evaluate(
    () => (window as unknown as { keycapLegends: string[] }).keycapLegends,
  );
  expect(legends).toEqual(
    expect.arrayContaining(["⌫", "↩︎", "英数", "ひら", ";", "-", ",", ".", "/"]),
  );
  expect(legends).not.toContain("pgup");
  await page.screenshot({ path: "test-results/layout.png", fullPage: true });
});

test("回転・ズーム操作中のフレームを計測する", async ({ page }) => {
  await openViewer(page);
  const box = (await page.locator("canvas").boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 220, box.y + 60, { steps: 30 });
  await page.mouse.up();
  await page.mouse.wheel(0, -5000);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "test-results/zoom.png", fullPage: true });
  const metrics = await page.evaluate(() => {
    const frames = performance.getEntriesByName("keyboard-frame") as PerformanceMeasure[];
    return {
      frames: frames.length,
      meanFrameMs: frames.reduce((n, frame) => n + frame.duration, 0) / frames.length,
      render: frames.at(-1)?.detail,
    };
  });
  console.log("Render measurements", metrics);
  expect(metrics.frames).toBeGreaterThan(0);
});

test("モデルの読込失敗を表示する", async ({ page }) => {
  await page.route("**/models/keyboard.glb", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("キーボードを表示できませんでした");
  await expect(page.getByRole("button", { name: "再読み込み" })).toBeVisible();
});

test("環境照明の読込失敗を表示する", async ({ page }) => {
  await page.route("**/environment/*.hdr", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("キーボードを表示できませんでした");
});

test("WebGL非対応時は読み込み表示を出さず、非対応の案内を表示する", async ({ page }) => {
  await page.addInitScript(() => {
    const original = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "getContext")!
      .value as HTMLCanvasElement["getContext"];
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      value: function (this: HTMLCanvasElement, name: string, ...args: unknown[]) {
        if (name === "webgl2") return null;
        return Reflect.apply(original, this, [name, ...args]);
      },
    });
  });
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("このブラウザでは3D表示を利用できません");
  await expect(page.getByText("キーボードを読み込んでいます")).toHaveCount(0);
});

test("WebGLコンテキスト喪失時に案内を表示し、押下を解除する", async ({ page }) => {
  await openViewer(page);
  const q = await keyQPoint(page);
  await page.mouse.move(q.x, q.y);
  await page.mouse.down();
  await expect(page.getByTestId("viewer")).toHaveAttribute("data-pressed", "Key_Q");
  await page
    .locator("canvas")
    .evaluate((canvas) =>
      canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
    );
  await expect(page.getByRole("alert")).toContainText("3D表示が中断されました");
  await expect(page.getByTestId("viewer")).toHaveAttribute("data-pressed", "");
  await page.mouse.up();
});

test("モバイルで横にはみ出さず、タッチで個別キーを押せる", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await openViewer(page);
  const q = await keyQPoint(page);
  // タップの押下は160msで戻るため、属性の変化を記録して確かめる。
  await page.getByTestId("viewer").evaluate((viewer) => {
    const seen: string[] = [];
    (window as unknown as { pressedHistory: string[] }).pressedHistory = seen;
    new MutationObserver(() => seen.push(viewer.dataset.pressed ?? "")).observe(viewer, {
      attributeFilter: ["data-pressed"],
    });
  });
  await page.touchscreen.tap(q.x, q.y);
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { pressedHistory: string[] }).pressedHistory),
    )
    .toContain("Key_Q");
  await expect(page.getByTestId("viewer")).toHaveAttribute("data-pressed", "");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  await context.close();
});
