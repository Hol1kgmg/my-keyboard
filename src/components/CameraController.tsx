import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { ComponentRef } from "react";
import { MathUtils, Vector3 } from "three";

export type ViewPreset = "perspective" | "top" | "low";
export type ViewRequest = { preset: ViewPreset; revision: number };
const positions: Record<ViewPreset, [number, number, number]> = {
  perspective: [0.065, 0.15, 0.21],
  top: [0, 0.36, 0.0001],
  low: [0.12, 0.065, 0.25],
};

export function CameraController({
  view,
  reducedMotion,
}: {
  view: ViewRequest;
  reducedMotion: boolean;
}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const destination = useRef<Vector3 | null>(null);
  const { camera, size, invalidate } = useThree();
  const aspect = size.width / size.height;
  useEffect(() => {
    const position = new Vector3(...positions[view.preset]);
    position.multiplyScalar(Math.max(1, 1.35 / aspect));
    destination.current = position;
    if (reducedMotion) camera.position.copy(position);
    controls.current?.target.set(0, 0.008, 0);
    controls.current?.update();
    invalidate();
  }, [view, aspect, camera, invalidate, reducedMotion]);
  useFrame((_, delta) => {
    const target = destination.current;
    if (!target) return;
    camera.position.lerp(target, 1 - Math.exp(-delta * 10));
    controls.current?.update();
    if (camera.position.distanceTo(target) < 0.0001) {
      camera.position.copy(target);
      destination.current = null;
    } else invalidate();
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.12}
      minDistance={0.17}
      maxDistance={0.9}
      minPolarAngle={0}
      maxPolarAngle={MathUtils.degToRad(86)}
      rotateSpeed={0.65}
      zoomSpeed={0.7}
      target={[0, 0.008, 0]}
      onStart={() => {
        destination.current = null;
      }}
    />
  );
}
