"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

/** Aurora "operating grid": a receding register plane whose cells glow violet -> blue -> teal,
 *  with a bright current-period column and a sweeping fill-wave. Bloom makes the bright cells bloom. */
const COLS = 9;
const ROWS = 6;
const STEP = 1.05;

type Cell = { r: number; c: number; kind: number };

function Grid() {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const count = COLS * ROWS;

  const cells = useMemo<Cell[]>(() => {
    const out: Cell[] = [];
    for (let i = 0; i < count; i++) {
      const r = Math.floor(i / COLS);
      const c = i % COLS;
      const h = Math.sin(i * 127.1 + 311.7) * 43758.5453;
      const seed = h - Math.floor(h);
      let kind = 0;
      if (seed > 0.78) kind = 3;
      else if (seed > 0.58) kind = 1;
      else if (seed > 0.42) kind = 2;
      out.push({ r, c, kind });
    }
    return out;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const col = useMemo(() => new THREE.Color(), []);
  const tmp = useMemo(() => new THREE.Color(), []);
  const base = useMemo(() => new THREE.Color("#101a36"), []);
  const azure = useMemo(() => new THREE.Color("#2563eb"), []);
  const iris = useMemo(() => new THREE.Color("#7c3aed"), []);
  const aqua = useMemo(() => new THREE.Color("#14b8a6"), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const now = Math.floor(t * 0.45) % COLS;
    const sweep = (t * 2.2) % (COLS + ROWS + 5);
    for (let i = 0; i < count; i++) {
      const { r, c, kind } = cells[i];
      const x = (c - (COLS - 1) / 2) * STEP;
      const y = ((ROWS - 1) / 2 - r) * STEP;
      const appear = THREE.MathUtils.clamp((t - (r * 0.1 + c * 0.04)) * 2.0, 0, 1);
      const e = appear * appear * (3 - 2 * appear);
      const wave = Math.max(0, 1 - Math.abs(c + r - sweep) * 0.85);
      dummy.position.set(x, y, (1 - e) * 1.8);
      const s = 0.02 + e * 0.95;
      const isNow = c === now;
      dummy.scale.set(s, s, isNow ? 0.3 : 0.12 + wave * 0.16);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);

      tmp.setHSL(0.5 + 0.13 * Math.sin((c + r) * 0.4 + t * 0.5), 0.74, 0.58);
      if (isNow) col.copy(tmp).multiplyScalar(1.42 + 0.28 * Math.sin(t * 3 + r));
      else if (wave > 0.35) col.copy(aqua).lerp(azure, 0.5).multiplyScalar(1.02 + wave * 0.55);
      else if (kind === 1) col.copy(azure).multiplyScalar(0.55);
      else if (kind === 2) col.copy(iris).multiplyScalar(0.5);
      else if (kind === 3) col.copy(aqua).multiplyScalar(0.5);
      else col.copy(base);
      col.multiplyScalar(0.22 + 0.78 * e);
      mesh.current.setColorAt(i, col);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined as never, undefined as never, count]}>
      <boxGeometry args={[0.9, 0.9, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

function Rig() {
  useFrame((state) => {
    const { camera, pointer } = state;
    camera.position.x += (pointer.x * 0.8 - camera.position.x) * 0.03;
    camera.position.y += (pointer.y * 0.5 + 1.0 - camera.position.y) * 0.03;
    camera.lookAt(0, -0.3, 0);
  });
  return null;
}

export default function OperatingGrid() {
  return (
    <Canvas
      flat
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 1.0, 13.5], fov: 30 }}
      style={{ width: "100%", height: "100%" }}
    >
      <group rotation={[-0.9, -0.16, 0.02]} position={[0.8, -0.45, 0]}>
        <Grid />
      </group>
      <Rig />
      <EffectComposer>
        <Bloom intensity={0.82} luminanceThreshold={0.58} luminanceSmoothing={0.3} mipmapBlur radius={0.7} />
      </EffectComposer>
    </Canvas>
  );
}
