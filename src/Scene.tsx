import { Sparkles, useAnimations, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
// Temporarily disabled — see the EffectComposer comment further down.
// import {
//   Bloom,
//   EffectComposer,
//   Noise,
//   Vignette,
// } from "@react-three/postprocessing";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

gsap.registerPlugin(ScrollTrigger);

// Scroll progress store (0 -> 1), driven by GSAP outside R3F
const scrollState = { progress: 0 };

function useScrollDriver(totalHeight: number) {
  useEffect(() => {
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      scrollState.progress = max > 0 ? window.scrollY / max : 0;
    };
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [totalHeight]);
}

// Jagged mountain terrain via displaced plane
function Terrain() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(400, 400, 120, 120);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const worldZ = -y;
      const dist = Math.hypot(x, y);
      const ridge = Math.sin(x * 0.05) * Math.cos(y * 0.04) * 8;
      const jag = (Math.random() - 0.5) * 2;
      const falloff = Math.max(0, 1 - dist / 220);
      const pathClearance =
        THREE.MathUtils.smoothstep(worldZ, 8, 34) *
        (1 - THREE.MathUtils.smoothstep(worldZ, 48, 78)) *
        (1 - THREE.MathUtils.smoothstep(Math.abs(x - 6), 16, 42));
      const h = THREE.MathUtils.lerp(
        (ridge + jag) * falloff * 6,
        -3,
        pathClearance,
      );
      pos.setZ(i, h);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <mesh
      geometry={geo}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -3, 0]}
      receiveShadow
    >
      <meshStandardMaterial
        color="#1c222c"
        roughness={1}
        metalness={0}
        flatShading
      />
    </mesh>
  );
}

// Scroll fraction where the dragon's approach finishes and it settles into its hover
const HOVER_START = 0.78;
const FAR_ENTRY_DIST = 92; // starts far back toward the user-facing side of the camera path
const HOVER_DIST = 15; // closes in until it is near the camera's resting spot
const DRAGON_LEFT_OFFSET = 12;
const LANDING_SURFACE_Y = -2.35;
const LANDING_CENTER_Y = 2.25;
const TAKEOFF_END = 0.16;
const dummy = new THREE.Object3D();
const worldUp = new THREE.Vector3(0, 1, 0);

function dragonPositionAt(curve: THREE.CatmullRomCurve3, t: number) {
  const ct = Math.min(t, HOVER_START);
  const camPos = curve.getPointAt(ct);
  const tangent = curve.getTangentAt(ct);

  const approachT = THREE.MathUtils.smoothstep(t, 0, HOVER_START);
  const dist = THREE.MathUtils.lerp(FAR_ENTRY_DIST, HOVER_DIST, approachT);
  const rearDir = tangent.clone().multiplyScalar(-1).normalize();
  const sideDir = new THREE.Vector3()
    .crossVectors(worldUp, rearDir)
    .normalize();
  const weaveFade =
    1 - THREE.MathUtils.smoothstep(t, HOVER_START - 0.12, HOVER_START);
  const weaveAmp = THREE.MathUtils.lerp(22, 5, approachT) * weaveFade;
  const zigzag = Math.sin(t * Math.PI * 7) * weaveAmp;
  const flightLift = THREE.MathUtils.lerp(8, 3.25, approachT);
  const takeoffT = THREE.MathUtils.smoothstep(t, 0.03, TAKEOFF_END);
  const landingT = THREE.MathUtils.smoothstep(
    t,
    HOVER_START - 0.14,
    HOVER_START,
  );
  const lift =
    flightLift + Math.sin(t * Math.PI * 5) * 2.2 * weaveFade - landingT * 3.25;

  const pos = camPos
    .clone()
    .add(rearDir.multiplyScalar(dist))
    .add(sideDir.multiplyScalar(zigzag + DRAGON_LEFT_OFFSET))
    .add(new THREE.Vector3(0, lift - 4, 0));
  pos.y = THREE.MathUtils.lerp(LANDING_CENTER_Y, pos.y, takeoffT);
  pos.y = THREE.MathUtils.lerp(pos.y, LANDING_CENTER_Y, landingT);

  return pos;
}

// Single pose function used by both the dragon and the camera's lookAt target, so the two
// always agree on where the dragon actually is. The dragon now flies on the user-facing side
// of the camera path, weaving left and right while drawing closer, then eases into a hover.
function dragonPoseAt(
  curve: THREE.CatmullRomCurve3,
  t: number,
  direction: 1 | -1 = 1,
) {
  const ct = Math.min(t, HOVER_START);
  const camPos = curve.getPointAt(ct);
  const pos = dragonPositionAt(curve, t);
  const lookAheadT = THREE.MathUtils.clamp(
    t + 0.01 * direction,
    0,
    HOVER_START,
  );
  const nextPos = dragonPositionAt(curve, lookAheadT);
  const travelDir = nextPos.sub(pos).normalize();
  if (travelDir.lengthSq() < 0.0001) {
    travelDir.copy(new THREE.Vector3(1, 0, 0));
  }

  dummy.position.copy(pos);
  dummy.lookAt(pos.clone().add(travelDir));
  const travelQuat = dummy.quaternion.clone();

  dummy.lookAt(camPos);
  const faceCameraQuat = dummy.quaternion.clone();

  const startFaceT = 1 - THREE.MathUtils.smoothstep(t, 0.03, TAKEOFF_END);
  const endFaceT = THREE.MathUtils.smoothstep(
    t,
    HOVER_START - 0.16,
    HOVER_START,
  );
  const faceT = direction === 1 ? Math.max(startFaceT, endFaceT) : 0;
  const quat = travelQuat.clone().slerp(faceCameraQuat, faceT);

  return { pos, quat, turnT: faceT };
}

// Mountain Dragon (rigged, with a flight/moves animation): approaches from the distance facing
// its direction of travel, then settles into a stationary hover seen in profile. Its own baked
// animation plays as a looping flap/idle cycle throughout, while dragonPoseAt drives world
// position and orientation.
//
// The model is recentered and rescaled from its own bounding box at load time rather than via
// any hardcoded bone name or scale constant — different exports of "the same" asset (e.g.
// Sketchfab's "original" vs "converted" GLB downloads) rename bones with uniqueness suffixes
// (root_01 -> root_01_8) and normalize world-space scale completely differently, so anything
// asset-specific silently breaks on the next download.
// Sized to read as "flying at a distance" rather than filling the frame, at the ~22-unit
// chase distance the flight offset above puts the camera at (dragon subtends ~23° of the 55°
// vertical FOV) — the model's own authoring scale varies per export, so this is a deliberate
// framing choice, not a reflection of the asset's "real" size.
const DRAGON_TARGET_SIZE = 19; // world units for the model's largest bbox dimension

function Dragon({ curve }: { curve: THREE.CatmullRomCurve3 }) {
  const group = useRef<THREE.Group>(null!);
  const modelScale = useRef<THREE.Group>(null!);
  const inner = useRef<THREE.Group>(null!);
  const lastProgress = useRef(scrollState.progress);
  const scrollDirection = useRef<1 | -1>(1);

  const gltf = useGLTF("/models/dragon.glb", true, true);
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
      }
    });

    // Recenter and scale from the model's own bounding box (bind pose) instead of any node
    // name or hardcoded constant, so this works regardless of the export's authoring scale
    // or bone-naming scheme.
    // updateWorldMatrix(true, false) only refreshes `scene`'s own matrix from its parents —
    // the `false` skips descendants, so Box3.setFromObject was reading each child's stale
    // (near-identity) matrixWorld. That made `maxDim` come out far too small, so
    // TARGET_SIZE/maxDim became a huge multiplier instead of a shrink factor — the dragon was
    // rendering at roughly its raw multi-thousand-unit size the whole time, which is why
    // no amount of camera-distance or lighting tweaking ever visibly helped.
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;

    inner.current.position.copy(center).multiplyScalar(-1);
    // Scale lives on its own wrapper, not on `group` — `group` also parents the dedicated
    // light below, and letting the model's (auto-computed, can be tiny) scale apply to that
    // light collapsed its offset down near zero, putting an intensity-3000 light almost
    // coincident with the mesh. That blew out into a flat, full-screen bloom glow that read
    // as a layer sitting on top of the scene instead of a lit object inside it.
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
    // Gentle roll while approaching, fully damped out by the time it turns into profile — a
    // hovering dragon banking side to side would fight the "hovering in place" read.
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
      {/* Dedicated light so the dragon reads clearly even against the dim, moody scene
          lighting — kept outside the scaled subtree above so its offset stays in real world
          units regardless of the model's (asset-dependent) auto-computed scale. */}
      <pointLight
        position={[0, 15, 15]}
        intensity={85}
        color="#cdd8e8"
        distance={0}
        decay={2}
      />
    </group>
  );
}

useGLTF.preload("/models/dragon.glb");

function LandingShelf({
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

function LandingContactLight({ curve }: { curve: THREE.CatmullRomCurve3 }) {
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

function CameraRig({ curve }: { curve: THREE.CatmullRomCurve3 }) {
  useFrame(({ camera }) => {
    // Camera pose is a pure function of scroll position `t` — no real-time-based damping.
    // Damping/lerping toward a moving target integrates over wall-clock time, so the camera's
    // lag behind that target depends on scroll speed and direction history: scrolling up
    // doesn't retrace the same path scrolling down took, which read as "two different paths."
    // Deriving pose directly from t makes the ride perfectly reversible and scrub-safe.
    const t = scrollState.progress;

    // Dollies forward along the curve, clamped at HOVER_START — curve.getPointAt is itself
    // continuous, so this holds still there with no separate blend/snap needed.
    const ct = Math.min(t, HOVER_START);
    const camPos = curve.getPointAt(ct);
    const lookTarget = dragonPoseAt(curve, t).pos;

    camera.position.copy(camPos);
    camera.lookAt(lookTarget);
  });
  return null;
}

function SceneContent() {
  // Straight dolly down the z-axis: starts back near the viewer (z=100) and eases
  // in toward the scene (z=0 and just beyond, into the landing peak). Only mild y/x
  // drift, so there's no lateral weaving — the "no sharp turns" ask, taken further.
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

export default function Scene() {
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
          <SceneContent />
        </Canvas>
      </div>
      <Overlay />
      <RestartButton />
    </>
  );
}

function RestartButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      const t = max > 0 ? window.scrollY / max : 0;
      setVisible(t > 0.92);
    };
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      onClick={handleClick}
      style={{
        position: "fixed",
        bottom: "8%",
        left: "50%",
        transform: "translateX(-50%)",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 0.6s ease",
        background: "transparent",
        border: "1px solid rgba(232,226,216,0.5)",
        color: "#e8e2d8",
        fontFamily: "Georgia, serif",
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        fontSize: "0.9rem",
        padding: "0.9em 2em",
        cursor: "pointer",
        borderRadius: "2px",
        backdropFilter: "blur(4px)",
        zIndex: 10,
      }}
    >
      Restart
    </button>
  );
}

function Overlay() {
  const ref = useRef<HTMLDivElement>(null!);
  useEffect(() => {
    const el = ref.current;
    gsap.fromTo(
      el,
      { opacity: 1 },
      {
        opacity: 0,
        scrollTrigger: {
          trigger: document.body,
          start: 0,
          end: "20% top",
          scrub: true,
        },
      },
    );
  }, []);
  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#e8e2d8",
        fontFamily: "Georgia, serif",
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        fontSize: "2rem",
        pointerEvents: "none",
        textShadow: "0 0 20px rgba(255,90,30,0.4)",
      }}
    >
      Scroll
    </div>
  );
}
