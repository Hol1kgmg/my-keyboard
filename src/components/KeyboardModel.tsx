import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { Mesh, MeshStandardMaterial } from "three";
import { assetUrl, keys } from "../data/keyboard";
import type { KeyInteraction } from "../hooks/useKeyInteraction";
import { InteractiveKey } from "./InteractiveKey";
import { createKeycapTexture } from "../rendering/keycapTexture";

export function KeyboardModel({
  interaction,
  reducedMotion,
}: {
  interaction: KeyInteraction;
  reducedMotion: boolean;
}) {
  const { scene } = useGLTF(assetUrl("models/keyboard.glb"));
  const { gl } = useThree();
  const nodes = useMemo(() => {
    const nodes = new Map<string, Mesh>();
    scene.traverse((node) => {
      if (node instanceof Mesh) nodes.set(node.name, node);
    });
    for (const key of keys) if (!nodes.has(key.id)) throw new Error(`Missing key: ${key.id}`);
    return nodes;
  }, [scene]);
  const keycapTexture = useMemo(() => {
    const map = (nodes.get(keys[0].id)!.material as MeshStandardMaterial).map;
    if (!map) throw new Error("The keycap atlas is missing.");
    return createKeycapTexture(map, gl.capabilities.getMaxAnisotropy());
  }, [nodes, gl]);
  useEffect(() => () => keycapTexture.dispose(), [keycapTexture]);
  return (
    <group dispose={null}>
      {[...nodes.values()]
        .filter((node) => !node.name.startsWith("Key_"))
        .map((node) => (
          <mesh
            key={node.name}
            name={node.name}
            geometry={node.geometry}
            material={node.material}
            position={node.position}
            rotation={node.rotation}
            scale={node.scale}
            castShadow
            receiveShadow
            onPointerOver={(event) => {
              event.stopPropagation();
            }}
          />
        ))}
      {keys.map((key) => (
        <InteractiveKey
          key={key.id}
          definition={key}
          node={nodes.get(key.id)!}
          texture={keycapTexture}
          interaction={interaction}
          reducedMotion={reducedMotion}
        />
      ))}
    </group>
  );
}
