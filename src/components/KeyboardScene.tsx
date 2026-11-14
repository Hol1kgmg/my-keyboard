import { Environment } from "@react-three/drei";
import { addAfterEffect, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { assetUrl } from "../data/keyboard";
import type { KeyInteraction } from "../hooks/useKeyInteraction";
import { CameraController } from "./CameraController";
import type { ViewRequest } from "./CameraController";
import { KeyboardModel } from "./KeyboardModel";

function SceneReady({ onReady }: { onReady: () => void }) {
  const frameStarted = useRef(false);
  const { invalidate } = useThree();
  useFrame(() => {
    frameStarted.current = true;
  });
  useEffect(() => {
    frameStarted.current = false;
    // useFrameは描画前に実行されるため、完了通知は描画後のコールバックで行う。
    const unsubscribe = addAfterEffect(() => {
      if (!frameStarted.current) return;
      unsubscribe();
      onReady();
    });
    invalidate();
    return unsubscribe;
  }, [invalidate, onReady]);
  return null;
}

function FrameMetrics() {
  const { gl } = useThree();
  const lastTime = useRef(0);
  useFrame(() => {
    if (!import.meta.env.DEV) return;
    const now = performance.now();
    if (lastTime.current && now - lastTime.current < 150) {
      performance.measure("keyboard-frame", {
        start: lastTime.current,
        end: now,
        detail: {
          calls: gl.info.render.calls,
          triangles: gl.info.render.triangles,
          dpr: gl.getPixelRatio(),
        },
      });
      if (performance.getEntriesByName("keyboard-frame").length > 600)
        performance.clearMeasures("keyboard-frame");
    }
    lastTime.current = now;
  });
  return null;
}

export function KeyboardScene({
  interaction,
  view,
  reducedMotion,
  onReady,
}: {
  interaction: KeyInteraction;
  view: ViewRequest;
  reducedMotion: boolean;
  onReady: () => void;
}) {
  return (
    <>
      <SceneReady onReady={onReady} />
      <CameraController view={view} reducedMotion={reducedMotion} />
      <Environment
        files={assetUrl("environment/studio_small_03_1k.hdr")}
        environmentIntensity={0.25}
      />
      <ambientLight intensity={0.2} />
      <directionalLight
        position={[-0.1, 0.4, 0.15]}
        intensity={1.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-0.22}
        shadow-camera-right={0.22}
        shadow-camera-top={0.17}
        shadow-camera-bottom={-0.17}
        shadow-camera-near={0.01}
        shadow-camera-far={1}
        shadow-bias={-0.00003}
        shadow-normalBias={0.0002}
        shadow-radius={3}
      />
      <KeyboardModel interaction={interaction} reducedMotion={reducedMotion} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.0005, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <shadowMaterial transparent opacity={0.18} />
      </mesh>
      <FrameMetrics />
    </>
  );
}
