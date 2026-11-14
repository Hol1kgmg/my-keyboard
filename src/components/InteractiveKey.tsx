import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Mesh, MeshStandardMaterial } from "three";
import type { Texture } from "three";
import type { KeyDefinition } from "../data/keyboard";
import type { KeyInteraction } from "../hooks/useKeyInteraction";

export function InteractiveKey({
  node,
  texture,
  definition,
  interaction,
  reducedMotion,
}: {
  node: Mesh;
  texture: Texture;
  definition: KeyDefinition;
  interaction: KeyInteraction;
  reducedMotion: boolean;
}) {
  const mesh = useRef<Mesh>(null);
  const { invalidate } = useThree();
  const pressed = interaction.pressedIds.has(definition.id);
  const highlighted = interaction.hoveredId === definition.id;
  const material = useMemo(() => {
    const material = (node.material as MeshStandardMaterial).clone();
    material.map = texture;
    return material;
  }, [node.material, texture]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    material.emissive.set(highlighted || pressed ? "#a58a50" : "#000000");
    material.emissiveIntensity = pressed ? 0.22 : 0.12;
    invalidate();
  }, [material, highlighted, pressed, invalidate]);
  useEffect(() => {
    invalidate();
  }, [pressed, invalidate]);
  useFrame((_, delta) => {
    if (!mesh.current) return;
    const target = node.position.y - (pressed ? definition.pressDistance : 0);
    const distance = target - mesh.current.position.y;
    mesh.current.position.y =
      reducedMotion || Math.abs(distance) < 0.000005
        ? target
        : mesh.current.position.y + distance * (1 - Math.exp(-delta * 32));
    if (mesh.current.position.y !== target) invalidate();
  });
  return (
    <mesh
      ref={mesh}
      name={definition.id}
      geometry={node.geometry}
      material={material}
      position={node.position}
      castShadow
      receiveShadow
      dispose={null}
      onPointerOver={(event) => {
        event.stopPropagation();
        interaction.setHoveredId(definition.id);
      }}
      onPointerOut={() => interaction.setHoveredId((id) => (id === definition.id ? null : id))}
      onPointerDown={(event) => {
        event.stopPropagation();
        interaction.beginPointer(definition.id, event.nativeEvent);
      }}
    />
  );
}
