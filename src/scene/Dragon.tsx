import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  DRAGON_MODEL_PATH,
  DRAGON_TARGET_SIZE,
  HOVER_START,
  TAKEOFF_END,
  dragonPoseAt,
  scrollState,
} from "./motion";

export function Dragon({ curve }: { curve: THREE.CatmullRomCurve3 }) {
  const group = useRef<THREE.Group>(null!);
  const modelScale = useRef<THREE.Group>(null!);
  const inner = useRef<THREE.Group>(null!);
  const lastProgress = useRef(scrollState.progress);
  const scrollDirection = useRef<1 | -1>(1);

  const gltf = useGLTF(DRAGON_MODEL_PATH, true, true);
  const scene = useMemo(
    () => cloneSkeleton(gltf.scene) as THREE.Group,
    [gltf.scene],
  );
  const { actions, names } = useAnimations(gltf.animations, inner);

  useEffect(() => {
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.frustumCulled = false;
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map((material) => material.clone())
          : mesh.material.clone();

        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];

        materials.forEach((material) => {
          if (
            material instanceof THREE.MeshStandardMaterial ||
            material instanceof THREE.MeshPhongMaterial
          ) {
            material.emissive.set("#241b13");
            material.emissiveIntensity = Math.max(
              material.emissiveIntensity,
              0.08,
            );
            material.needsUpdate = true;
          }
        });
      }
    });

    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;

    inner.current.position.copy(center).multiplyScalar(-1);
    modelScale.current.scale.setScalar(DRAGON_TARGET_SIZE / maxDim);
  }, [scene]);

  useEffect(() => {
    const clip = names[0];
    if (!clip) return;
    const action = actions[clip];
    action?.reset().play();
    return () => {
      action?.stop();
    };
  }, [actions, names]);

  useFrame((state) => {
    const t = scrollState.progress;
    const delta = t - lastProgress.current;
    if (Math.abs(delta) > 0.0005) {
      scrollDirection.current = delta > 0 ? 1 : -1;
      lastProgress.current = t;
    }
    const takeoffT = THREE.MathUtils.smoothstep(t, 0.03, TAKEOFF_END);
    const landingT = THREE.MathUtils.smoothstep(
      t,
      HOVER_START - 0.14,
      HOVER_START,
    );
    const airT = takeoffT * (1 - landingT);
    const bob = Math.sin(state.clock.elapsedTime * 1.4) * 0.6 * airT;
    const { pos, quat, turnT } = dragonPoseAt(
      curve,
      t,
      scrollDirection.current,
    );

    group.current.position.copy(pos).setY(pos.y + bob);
    if (t > HOVER_START - 0.04) {
      group.current.quaternion.slerp(quat, 0.08);
    } else {
      group.current.quaternion.copy(quat);
    }
    group.current.rotation.z +=
      Math.sin(state.clock.elapsedTime * 1.4) * 0.08 * airT * (1 - turnT);
  });

  return (
    <group ref={group}>
      <group ref={modelScale}>
        <group ref={inner}>
          <primitive object={scene} />
        </group>
      </group>
      <pointLight
        position={[4, 8, 10]}
        intensity={115}
        color="#d8c2a2"
        distance={34}
        decay={2}
      />
    </group>
  );
}

useGLTF.preload(DRAGON_MODEL_PATH);
