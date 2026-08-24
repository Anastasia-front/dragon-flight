import { useMemo } from "react";
import * as THREE from "three";
import { LANDING_SURFACE_Y } from "./motion";

function mountainBump(
  x: number,
  z: number,
  centerX: number,
  centerZ: number,
  width: number,
  depth: number,
  height: number,
) {
  const normalizedDist = Math.hypot((x - centerX) / width, (z - centerZ) / depth);
  const falloff = Math.max(0, 1 - normalizedDist);

  return Math.pow(falloff, 1.8) * height;
}

export function Terrain() {
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
      const leftMountain =
        mountainBump(x, worldZ, -68, 174, 112, 92, 28) +
        mountainBump(x, worldZ, -32, 162, 96, 78, 16);
      const leftRouteRidge =
        mountainBump(x, worldZ, -78, 116, 44, 64, 48) +
        mountainBump(x, worldZ, -74, 58, 40, 52, 42);
      const rightMountain =
        mountainBump(x, worldZ, 78, 180, 54, 52, 48) +
        mountainBump(x, worldZ, 98, 150, 60, 66, 52);
      const rightRouteRidge =
        mountainBump(x, worldZ, 58, 116, 42, 64, 40) +
        mountainBump(x, worldZ, 54, 58, 38, 52, 36);
      const centerRidgeCut = mountainBump(x, worldZ, -2, 168, 76, 70, 28);
      const startPlateau =
        THREE.MathUtils.smoothstep(worldZ, 170, 184) *
        (1 - THREE.MathUtils.smoothstep(worldZ, 200, 214)) *
        (1 - THREE.MathUtils.smoothstep(Math.abs(x), 24, 46));
      const pathClearance =
        THREE.MathUtils.smoothstep(worldZ, 8, 34) *
        (1 - THREE.MathUtils.smoothstep(worldZ, 48, 78)) *
        (1 - THREE.MathUtils.smoothstep(Math.abs(x - 6), 16, 42));
      const baseHeight = (ridge + jag) * falloff * 5.8;
      const naturalHeight = Math.max(
        baseHeight +
          leftMountain +
          leftRouteRidge +
          rightMountain +
          rightRouteRidge -
          centerRidgeCut,
        -2,
      );
      const h = THREE.MathUtils.lerp(
        THREE.MathUtils.lerp(
          naturalHeight,
          LANDING_SURFACE_Y + 3,
          startPlateau,
        ),
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
