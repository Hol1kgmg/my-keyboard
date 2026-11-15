import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { ComponentRef } from "react";
import { MathUtils } from "three";

export const initialCameraPosition: [number, number, number] = [0.065, 0.15, 0.21];

export function CameraController() {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera, size, invalidate } = useThree();
  const aspect = size.width / size.height;
  useEffect(() => {
    camera.position.set(...initialCameraPosition).multiplyScalar(Math.max(1, 1.35 / aspect));
    controls.current?.update();
    invalidate();
  }, [aspect, camera, invalidate]);
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
    />
  );
}
