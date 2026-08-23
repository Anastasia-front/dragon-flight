import * as THREE from "three";

export const DRAGON_MODEL_PATH = `${import.meta.env.BASE_URL}models/dragon.glb`;

export const scrollState = { progress: 0 };

export const HOVER_START = 0.78;
export const FAR_ENTRY_DIST = 92;
export const HOVER_DIST = 15;
export const DRAGON_LEFT_OFFSET = 12;
export const LANDING_SURFACE_Y = -2.35;
export const LANDING_CENTER_Y = 2.25;
export const START_LANDING_CENTER_Y = 1.35;
export const TAKEOFF_END = 0.16;
export const DRAGON_TARGET_SIZE = 19;

const dummy = new THREE.Object3D();
const worldUp = new THREE.Vector3(0, 1, 0);

export function dragonPositionAt(curve: THREE.CatmullRomCurve3, t: number) {
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
  const startGroundT = 1 - takeoffT;
  const lift =
    flightLift + Math.sin(t * Math.PI * 5) * 2.2 * weaveFade - landingT * 3.25;

  const pos = camPos
    .clone()
    .add(rearDir.multiplyScalar(dist))
    .add(sideDir.multiplyScalar(zigzag + DRAGON_LEFT_OFFSET - startGroundT * 18))
    .add(new THREE.Vector3(0, lift - 4, 0));
  pos.y = THREE.MathUtils.lerp(START_LANDING_CENTER_Y, pos.y, takeoffT);
  pos.y = THREE.MathUtils.lerp(pos.y, LANDING_CENTER_Y, landingT);

  return pos;
}

export function dragonPoseAt(
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
