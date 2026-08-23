import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HOVER_START, dragonPoseAt, scrollState } from "./motion";

export function CameraRig({ curve }: { curve: THREE.CatmullRomCurve3 }) {
  useFrame(({ camera }) => {
    const t = scrollState.progress;
    const ct = Math.min(t, HOVER_START);
    const camPos = curve.getPointAt(ct);
    const lookTarget = dragonPoseAt(curve, t).pos;

    camera.position.copy(camPos);
    camera.lookAt(lookTarget);
  });
  return null;
}
