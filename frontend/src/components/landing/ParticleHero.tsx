"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

function buildSprite() {
  const s = 64;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,234,190,0.85)");
  g.addColorStop(1, "rgba(255,234,190,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(cv);
}

function sampleText(text: string, worldWidth = 6.6, gap = 4): [number, number, number][] {
  const W = 1600, H = 440;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "800 240px 'Bricolage Grotesque', system-ui, sans-serif";
  ctx.fillText(text, W / 2, H / 2 + 6);
  const d = ctx.getImageData(0, 0, W, H).data;
  const raw: [number, number][] = [];
  for (let y = 0; y < H; y += gap) for (let x = 0; x < W; x += gap) {
    if (d[(y * W + x) * 4 + 3] > 130) raw.push([x, y]);
  }
  let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
  for (const [x, y] of raw) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  const scale = worldWidth / (maxx - minx || 1);
  const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
  return raw.map(([x, y]) => [(x - cx) * scale, -(y - cy) * scale, (Math.random() - 0.5) * 0.35]);
}

function Particles() {
  const ref = useRef<THREE.Points>(null!);
  const { positions, targets, starts, seeds, count, sprite } = useMemo(() => {
    const t = sampleText("Erpcore");
    const count = t.length;
    const positions = new Float32Array(count * 3);
    const targets = new Float32Array(count * 3);
    const starts = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      targets[i * 3] = t[i][0]; targets[i * 3 + 1] = t[i][1]; targets[i * 3 + 2] = t[i][2];
      const a = Math.random() * Math.PI * 2, r = 5 + Math.random() * 7;
      starts[i * 3] = Math.cos(a) * r;
      starts[i * 3 + 1] = (Math.random() - 0.5) * 9;
      starts[i * 3 + 2] = Math.sin(a) * r - 3;
      positions[i * 3] = starts[i * 3]; positions[i * 3 + 1] = starts[i * 3 + 1]; positions[i * 3 + 2] = starts[i * 3 + 2];
      seeds[i] = Math.random();
    }
    return { positions, targets, starts, seeds, count, sprite: buildSprite() };
  }, []);

  // Track the cursor globally — the canvas sits behind the content layer, so it never
  // receives its own pointer events. Init far off-screen so there's no hole until you move.
  const pointer = useRef({ x: 99, y: 99 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((state) => {
    const tt = state.clock.elapsedTime;
    const arr = ref.current.geometry.attributes.position.array as Float32Array;
    const form = 2.9;
    const { width, height } = state.viewport;
    const px = pointer.current.x * width / 2;
    const py = pointer.current.y * height / 2;
    const repR2 = 1.35 * 1.35;
    const scrollY = typeof window !== "undefined" ? window.scrollY : 0;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const disperseInv = 1 - THREE.MathUtils.clamp(scrollY / (vh * 0.85), 0, 1);
    for (let i = 0; i < count; i++) {
      const sd = seeds[i];
      let p = THREE.MathUtils.clamp((tt - sd * 1.5) / form, 0, 1);
      p = p * p * (3 - 2 * p);
      p *= disperseInv;
      const ix = i * 3, sw = 1 - p;
      const sx = starts[ix] + Math.sin(tt * 0.6 + sd * 40) * sw * 1.5;
      const sy = starts[ix + 1] + Math.cos(tt * 0.5 + sd * 30) * sw * 1.2;
      const sz = starts[ix + 2] + Math.sin(tt * 0.4 + sd * 25) * sw * 1.0;
      const sh = p * 0.015;
      let x = sx + (targets[ix] - sx) * p + Math.sin(tt * 1.7 + sd * 60) * sh;
      let y = sy + (targets[ix + 1] - sy) * p + Math.cos(tt * 1.7 + sd * 55) * sh;
      if (p > 0.55) {
        const dx = x - px, dy = y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < repR2 && d2 > 1e-4) {
          const f = (1 - d2 / repR2) * 0.95;
          const inv = 1 / Math.sqrt(d2);
          x += dx * inv * f; y += dy * inv * f;
        }
      }
      arr[ix] = x;
      arr[ix + 1] = y;
      arr[ix + 2] = sz + (targets[ix + 2] - sz) * p;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
    ref.current.rotation.y = Math.sin(tt * 0.18) * 0.07;
    ref.current.rotation.x = Math.sin(tt * 0.12) * 0.03;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.055} map={sprite} color="#FFDFA6" transparent depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation toneMapped={false} />
    </points>
  );
}

function AmbientDust() {
  const ref = useRef<THREE.Points>(null!);
  const { positions, vel, count, sprite } = useMemo(() => {
    const count = 900;
    const positions = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 9.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
      vel[i * 3] = (Math.random() - 0.5) * 0.012;
      vel[i * 3 + 1] = 0.012 + Math.random() * 0.04;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.008;
    }
    return { positions, vel, count, sprite: buildSprite() };
  }, []);
  useFrame((state) => {
    const arr = ref.current.geometry.attributes.position.array as Float32Array;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      arr[ix] += vel[ix] + Math.sin(t * 0.3 + i * 0.7) * 0.0025;
      arr[ix + 1] += vel[ix + 1];
      arr[ix + 2] += vel[ix + 2];
      if (arr[ix + 1] > 5.5) { arr[ix + 1] = -5.5; arr[ix] = (Math.random() - 0.5) * 15; }
      if (arr[ix] > 8.5) arr[ix] = -8.5;
      else if (arr[ix] < -8.5) arr[ix] = 8.5;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.034} map={sprite} color="#E9C879" transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation toneMapped={false} />
    </points>
  );
}

export default function ParticleHero() {
  return (
    <Canvas flat dpr={[1, 2]} gl={{ antialias: true, alpha: true }} camera={{ position: [0, 0, 9], fov: 42 }} style={{ width: "100%", height: "100%" }}>
      <Particles />
      <AmbientDust />
      <EffectComposer>
        <Bloom intensity={0.7} luminanceThreshold={0.12} luminanceSmoothing={0.42} mipmapBlur radius={0.62} />
      </EffectComposer>
    </Canvas>
  );
}
