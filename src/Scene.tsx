import { Canvas } from "@react-three/fiber";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Suspense, useState } from "react";
import { CTAText, Loading, RestartButton } from "./scene/Overlays";
import { SceneContent } from "./scene/SceneContent";
import { useScrollDriver } from "./scene/useScrollDriver";

gsap.registerPlugin(ScrollTrigger);

export default function Scene() {
  const [ready, setReady] = useState(false);
  useScrollDriver(4000);

  return (
    <>
      <div style={{ height: "400vh" }} />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <Canvas
          camera={{ fov: 55, near: 0.1, far: 500 }}
          gl={{ antialias: true }}
        >
          <color attach="background" args={["#1c2431"]} />
          <Suspense fallback={null}>
            <SceneContent onReady={() => setReady(true)} />
          </Suspense>
        </Canvas>
      </div>
      {!ready && <Loading />}
      {ready && <CTAText />}
      <RestartButton />
    </>
  );
}
