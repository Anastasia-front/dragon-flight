import { useMemo } from "react";
import * as THREE from "three";
import { HOVER_START, LANDING_SURFACE_Y, dragonPositionAt } from "./motion";

export function LandingShelf({
  curve,
  t,
  scale = 1,
}: {
  curve: THREE.CatmullRomCurve3;
  t: number;
  scale?: number;
}) {
  const landingPos = useMemo(() => dragonPositionAt(curve, t), [curve, t]);

  return (
    <group position={[landingPos.x, LANDING_SURFACE_Y - 0.35, landingPos.z]}>
      <mesh rotation={[0, Math.PI / 7, 0]} receiveShadow>
        <cylinderGeometry args={[11 * scale, 15 * scale, 0.7, 7]} />
        <meshStandardMaterial color="#171d26" roughness={1} flatShading />
      </mesh>
      <mesh
        position={[0, -1.3, 0]}
        rotation={[0, Math.PI / 7, 0]}
        receiveShadow
      >
        <cylinderGeometry args={[15 * scale, 24 * scale, 2.2, 7]} />
        <meshStandardMaterial color="#111720" roughness={1} flatShading />
      </mesh>
    </group>
  );
}

export function LandingContactLight({
  curve,
}: {
  curve: THREE.CatmullRomCurve3;
}) {
  const position = useMemo(() => {
    const landingPos = dragonPositionAt(curve, HOVER_START);
    const camPos = curve.getPointAt(HOVER_START);
    const frontDir = camPos.sub(landingPos).normalize();

    return landingPos
      .clone()
      .add(frontDir.multiplyScalar(8))
      .add(new THREE.Vector3(0, 1.5, 0));
  }, [curve]);

  return (
    <pointLight
      position={position}
      intensity={82}
      color="#d6c3a4"
      distance={24}
      decay={2}
    />
  );
}
