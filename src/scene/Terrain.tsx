import { useMemo } from "react";
import * as THREE from "three";

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
