import { Sparkles } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { CameraRig } from "./CameraRig";
import { Dragon } from "./Dragon";
import { LandingContactLight, LandingShelf } from "./Landing";
import { HOVER_START } from "./motion";
import { Terrain } from "./Terrain";

export function SceneContent({ onReady }: { onReady: () => void }) {
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0, 8, 100),
        new THREE.Vector3(-2, 7, 70),
        new THREE.Vector3(2, 6, 40),
        new THREE.Vector3(0, 5, 15),
        new THREE.Vector3(0, 5, 0),
        new THREE.Vector3(0, 4, -8),
      ],
      false,
      "catmullrom",
      0.5,
    );
  }, []);

  useEffect(() => {
    onReady();
  }, [onReady]);

  return (
    <>
      <fog attach="fog" args={["#1c2431", 20, 160]} />
      <ambientLight intensity={0.9} color="#71849f" />
      <directionalLight
        position={[-45, 65, 35]}
        intensity={1.25}
        color="#d4deee"
      />
      <hemisphereLight args={["#607795", "#18140f", 1.05]} />
      <directionalLight
        position={[35, 8, 75]}
        intensity={0.3}
        color="#b88a5a"
      />

      <Terrain />
      <LandingShelf curve={curve} t={0} scale={0.85} />
      <LandingShelf curve={curve} t={HOVER_START} />
      <LandingContactLight curve={curve} />
      <Dragon curve={curve} />
      <CameraRig curve={curve} />

      <Sparkles
        count={200}
        scale={[80, 40, 80]}
        size={2}
        speed={0.3}
        color="#ff6a2a"
        opacity={0.5}
      />

      {/* TEMPORARILY DISABLED for testing — a real, reproducible GPU error
          (GL_INVALID_OPERATION: glBlitFramebuffer, depth/stencil read+write same image)
          has been firing every frame on this machine's ANGLE Metal WebGL backend during
          scroll/animation, most likely from this multi-pass postprocessing chain (Bloom's
          mipmapBlur in particular does extra blit passes). Testing whether removing this
          makes the dragon visible. */}
      {/* <EffectComposer>
        <Bloom
          intensity={0.45}
          luminanceThreshold={0.55}
          luminanceSmoothing={0.6}
          mipmapBlur
          radius={0.9}
        />
        <Noise opacity={0.04} />
        <Vignette darkness={0.7} />
      </EffectComposer> */}
    </>
  );
}
