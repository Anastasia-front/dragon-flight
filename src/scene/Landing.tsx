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
  const { position, facePosition, faceTarget } = useMemo(() => {
    const landingPos = dragonPositionAt(curve, HOVER_START);
    const camPos = curve.getPointAt(HOVER_START);
    const frontDir = camPos.sub(landingPos).normalize();

    const groundLightPos = landingPos
      .clone()
      .add(frontDir.clone().multiplyScalar(8))
      .add(new THREE.Vector3(0, 1.5, 0));
    const dragonFaceLightPos = landingPos
      .clone()
      .add(frontDir.multiplyScalar(14))
      .add(new THREE.Vector3(0, 5, 0));
    const dragonFaceTarget = new THREE.Object3D();
    dragonFaceTarget.position.copy(
      landingPos.clone().add(new THREE.Vector3(0, 2.4, 0)),
    );

    return {
      position: groundLightPos,
      facePosition: dragonFaceLightPos,
      faceTarget: dragonFaceTarget,
    };
  }, [curve]);

  return (
    <>
      <primitive object={faceTarget} />
      <pointLight
        position={position}
        intensity={82}
        color="#d6c3a4"
        distance={24}
        decay={2}
      />
      <spotLight
        position={facePosition}
        target={faceTarget}
        intensity={135}
        color="#d6c3a4"
        distance={32}
        angle={0.42}
        penumbra={0.75}
        decay={2}
      />
    </>
  );
}
