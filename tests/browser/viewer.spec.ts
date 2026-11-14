import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function openViewer(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("viewer")).toHaveAttribute("data-ready", "true", {
    timeout: 45_000,
  });
  await page.waitForLoadState("networkidle");
}

async function topView(page: Page) {
  await page.getByRole("button", { name: "真上", exact: true }).click();
  await page.waitForTimeout(1100);
  const box = (await page.locator("canvas").boundingBox())!;
  const fit = Math.max(1, 1.35 / (box.width / box.height));
  const pixelsPerMetre = box.height / (2 * Math.tan((19 * Math.PI) / 180) * (0.36 * fit - 0.0173));
  return {
    x: box.x + box.width / 2 - 0.1143 * pixelsPerMetre,
    y: box.y + box.height / 2 - 0.028575 * pixelsPerMetre,
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
  const q = await topView(page);
  await page.mouse.move(q.x, q.y);
  await expect(page.locator(".readout-key")).toHaveText("Q");
  await page.mouse.down();
  await expect(page.getByTestId("viewer")).toHaveAttribute("data-pressed", "Key_Q");
  await page.mouse.up();
  await expect(page.getByTestId("viewer")).toHaveAttribute("data-pressed", "");
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("キーからのドラッグは押下せず、外側で離しても押し続けない", async ({ page }) => {
  await openViewer(page);
  const q = await topView(page);
  await page.mouse.move(q.x, q.y);
  await page.mouse.down();
  await page.mouse.move(q.x + 70, q.y + 20, { steps: 3 });
  await page.mouse.up();
  await expect(page.getByTestId("viewer")).toHaveAttribute("data-pressed", "");
  await expect(page.locator(".key-readout")).not.toContainText("押下中");
  await topView(page);
  await page.mouse.move(q.x, q.y);
  await page.mouse.down();
  await expect(page.getByTestId("viewer")).toHaveAttribute("data-pressed", "Key_Q");
  await page.mouse.move(5, 5);
  await page.mouse.up();
  await expect(page.getByTestId("viewer")).toHaveAttribute("data-pressed", "");
});

test("キー一覧を矢印・Enterで操作し、入力切替とフォーカス喪失で復帰する", async ({ page }) => {
  await openViewer(page);
  await page.getByText("キー一覧から操作する").click();
  const q = page.getByRole("button", { name: "Q キー", exact: true });
  await q.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("button", { name: "W キー", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(q).toBeFocused();
  await page.keyboard.down("Enter");
  await expect(q).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.up("Enter");
  await expect(q).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "キーボード入力" }).click();
  await page.keyboard.down("a");
  await expect(page.getByTestId("viewer")).toHaveAttribute("data-pressed", "Key_A");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.getByTestId("viewer")).toHaveAttribute("data-pressed", "");
  await page.keyboard.up("a");
  await page.getByRole("button", { name: "キーボード入力" }).click();
  await page.keyboard.press("a");
  await expect(page.getByTestId("viewer")).toHaveAttribute("data-pressed", "");
});

test("新配列の記号・日本語刻印と最下段の入力対応が一致する", async ({ page }) => {
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
  await page.getByText("キー一覧から操作する").click();
  await expect(page.getByRole("button", { name: "Backspace キー", exact: true })).toHaveText("⌫");
  await expect(page.getByRole("button", { name: "Enter キー", exact: true })).toHaveText("↩︎");
  await expect(page.getByRole("button", { name: /^無刻印 \d+ キー$/ })).toHaveCount(12);
  await page.getByRole("button", { name: "キーボード入力" }).click();
  await page.locator("canvas").click({ position: { x: 5, y: 5 } });
  for (const [code, id] of [
    ["Backspace", "Backspace"],
    ["Space", "Space"],
    ["Enter", "Enter"],
    ["ShiftLeft", "Shift"],
    ["Semicolon", "Semicolon"],
    ["Minus", "Minus"],
    ["Comma", "Comma"],
    ["Period", "Period"],
    ["Slash", "Slash"],
  ]) {
    await page.keyboard.down(code);
    await expect(page.getByTestId("viewer")).toHaveAttribute("data-pressed", `Key_${id}`);
    await page.keyboard.up(code);
    await expect(page.getByTestId("viewer")).toHaveAttribute("data-pressed", "");
  }
  for (const [code, id] of [
    ["Lang2", "Eisu"],
    ["Lang1", "Hiragana"],
  ]) {
    await page.evaluate(
      (code) => window.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true })),
      code,
    );
    await expect(page.getByTestId("viewer")).toHaveAttribute("data-pressed", `Key_${id}`);
    await page.evaluate(
      (code) => window.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true })),
      code,
    );
    await expect(page.getByTestId("viewer")).toHaveAttribute("data-pressed", "");
  }
  await page.getByRole("button", { name: "初期視点に戻す" }).focus();
  await page.keyboard.down("Tab");
  await expect(page.getByTestId("viewer")).toHaveAttribute("data-pressed", "Key_Tab");
  await expect(page.getByRole("button", { name: "キーボード入力" })).toBeFocused();
  await page.keyboard.up("Tab");
  await page.getByRole("button", { name: "真上", exact: true }).click();
  await page.waitForTimeout(1100);
  await page.screenshot({ path: "test-results/layout.png", fullPage: true });
});

test("ズーム・視点変更後に初期視点へ戻せる", async ({ page }) => {
  await openViewer(page);
  await topView(page);
  const canvas = page.locator("canvas");
  await canvas.hover();
  await page.mouse.wheel(0, -5000);
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "低い位置", exact: true }).click();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "初期視点に戻す" }).click();
  await expect(page.getByRole("button", { name: "斜め", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "test-results/reset.png", fullPage: true });
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

test("WebGL非対応時は読み込み表示を終了し、HTMLのキー一覧を利用できる", async ({ page }) => {
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
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText("キーボードを読み込んでいます")).toHaveCount(0);
  await page.getByText("キー一覧から操作する").click();
  await expect(page.getByRole("button", { name: "Q キー", exact: true })).toBeVisible();
});

test("WebGLコンテキスト喪失時に案内を表示し、押下を解除する", async ({ page }) => {
  await openViewer(page);
  await page.getByRole("button", { name: "キーボード入力" }).click();
  await page.keyboard.down("q");
  await expect(page.getByTestId("viewer")).toHaveAttribute("data-pressed", "Key_Q");
  await page
    .locator("canvas")
    .evaluate((canvas) =>
      canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
    );
  await expect(page.getByRole("alert")).toContainText("3D表示が中断されました");
  await expect(page.getByTestId("viewer")).toHaveAttribute("data-pressed", "");
  await page.keyboard.up("q");
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
  const q = await topView(page);
  await page.touchscreen.tap(q.x, q.y);
  await expect(page.locator(".readout-key")).toHaveText("Q");
  await expect(page.getByTestId("viewer")).toHaveAttribute("data-pressed", "");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  await context.close();
});
