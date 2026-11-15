import { Canvas } from "@react-three/fiber";
import { Component, Suspense, useCallback, useEffect, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { PCFShadowMap } from "three";
import type { KeyInteraction } from "../hooks/useKeyInteraction";
import { initialCameraPosition } from "./CameraController";
import { KeyboardScene } from "./KeyboardScene";

class ViewerErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Keyboard viewer failed", error, info.componentStack);
  }
  render() {
    if (this.state.failed)
      return (
        <div className="viewer-message error-message" role="alert">
          <span className="message-symbol">!</span>
          <h2>キーボードを表示できませんでした</h2>
          <p>通信環境と、ブラウザの3D表示への対応を確認してください。</p>
          <button className="primary-button" onClick={() => window.location.reload()}>
            再読み込み
          </button>
        </div>
      );
    return this.props.children;
  }
}

// Canvas の fallback は <canvas> の代替内容なので、canvas 対応・WebGL2 非対応のブラウザでは表示されない。
function supportsWebGL2() {
  const gl = document.createElement("canvas").getContext("webgl2");
  gl?.getExtension("WEBGL_lose_context")?.loseContext();
  return gl !== null;
}

function UnsupportedFallback() {
  return (
    <div className="viewer-message" role="alert">
      <h2>このブラウザでは3D表示を利用できません</h2>
      <p>WebGL対応のブラウザで開いてください。</p>
    </div>
  );
}

export function KeyboardViewer({ interaction }: { interaction: KeyInteraction }) {
  const [webgl2] = useState(supportsWebGL2);
  const [ready, setReady] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReducedMotion(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const onReady = useCallback(() => {
    setReady(true);
    performance.mark("keyboard-ready");
  }, []);
  return (
    <div
      className={`viewer-stage ${interaction.hoveredId ? "has-hover" : ""}`}
      data-testid="viewer"
      data-ready={ready && !contextLost}
      data-hovered={interaction.hoveredId ?? ""}
      data-pressed={[...interaction.pressedIds].join(",")}
      aria-label="キーボードの3Dビューア"
      aria-describedby="viewer-instructions"
    >
      {webgl2 ? (
        <ViewerErrorBoundary>
          {!ready && (
            <div className="viewer-message" role="status">
              <span className="loading-ring" />
              <p>キーボードを読み込んでいます</p>
            </div>
          )}
          {contextLost && (
            <div className="viewer-message error-message" role="alert">
              <h2>3D表示が中断されました</h2>
              <p>ページを再読み込みして、もう一度お試しください。</p>
              <button className="primary-button" onClick={() => window.location.reload()}>
                再読み込み
              </button>
            </div>
          )}
          <Canvas
            shadows={{ type: PCFShadowMap }}
            frameloop="demand"
            dpr={[1, 1.75]}
            camera={{ position: initialCameraPosition, fov: 38, near: 0.01, far: 10 }}
            gl={{ antialias: true, powerPreference: "high-performance" }}
            onCreated={({ gl }) => {
              gl.domElement.setAttribute(
                "aria-label",
                "ドラッグで回転、スクロールでズーム。キーをクリックすると押せます。",
              );
              gl.domElement.addEventListener(
                "webglcontextlost",
                (event) => {
                  event.preventDefault();
                  setContextLost(true);
                  interaction.clear();
                },
                { once: true },
              );
            }}
          >
            <Suspense fallback={null}>
              <KeyboardScene
                interaction={interaction}
                reducedMotion={reducedMotion}
                onReady={onReady}
              />
            </Suspense>
          </Canvas>
        </ViewerErrorBoundary>
      ) : (
        <UnsupportedFallback />
      )}
    </div>
  );
}
