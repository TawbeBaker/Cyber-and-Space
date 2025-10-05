import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Text } from '@react-three/drei';
import * as THREE from 'three';

interface OrbitVisualization3DProps {
  asteroidParams: {
    diameter: number;
    velocity: number;
    angle: number;
    density: number;
    composition: string;
  };
  isAnimating?: boolean;
}

// Earth component
function Earth() {
  const earthRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.001; // Slow rotation
    }
  });

  return (
    <mesh ref={earthRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        color="#2563eb"
        emissive="#1e40af"
        emissiveIntensity={0.2}
        roughness={0.7}
        metalness={0.1}
      />
      {/* Atmosphere glow */}
      <mesh scale={1.05}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial
          color="#60a5fa"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
        />
      </mesh>
    </mesh>
  );
}

// Asteroid component with animation
function Asteroid({
  params,
  isAnimating
}: {
  params: OrbitVisualization3DProps['asteroidParams'];
  isAnimating: boolean
}) {
  const asteroidRef = useRef<THREE.Mesh>(null);
  const [progress, setProgress] = useState(0);

  // Calculate asteroid size (scaled down for visualization)
  const asteroidSize = Math.max(0.05, Math.min(0.3, params.diameter / 1000));

  // Calculate orbital path based on angle
  const { orbitPath, startPosition } = useMemo(() => {
    const angleRad = (params.angle * Math.PI) / 180;
    const distance = 5; // Starting distance from Earth

    // Create elliptical orbit path
    const path: THREE.Vector3[] = [];
    const steps = 200;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const theta = t * Math.PI * 2;

      // Elliptical orbit approaching Earth
      const a = distance * (1 - t * 0.8); // Semi-major axis shrinks
      const b = distance * 0.7 * (1 - t * 0.8); // Semi-minor axis

      const x = a * Math.cos(theta);
      const y = Math.sin(angleRad) * t * 0.5;
      const z = b * Math.sin(theta);

      path.push(new THREE.Vector3(x, y, z));
    }

    return {
      orbitPath: path,
      startPosition: new THREE.Vector3(distance, 0, 0)
    };
  }, [params.angle]);

  useFrame((state, delta) => {
    if (asteroidRef.current) {
      // Rotate asteroid
      asteroidRef.current.rotation.x += delta * 0.5;
      asteroidRef.current.rotation.y += delta * 0.3;

      if (isAnimating) {
        // Animate along orbit path
        setProgress((prev) => {
          const newProgress = (prev + delta * 0.1) % 1;
          const index = Math.floor(newProgress * (orbitPath.length - 1));
          const position = orbitPath[index];

          if (position) {
            asteroidRef.current!.position.copy(position);
          }

          return newProgress;
        });
      } else {
        // Static position at start
        asteroidRef.current.position.copy(startPosition);
      }
    }
  });

  // Color based on composition
  const asteroidColor = {
    'stony': '#8b7355',
    'iron': '#636363',
    'carbonaceous': '#2d2d2d',
    'icy': '#a8c5dd'
  }[params.composition] || '#8b7355';

  return (
    <mesh ref={asteroidRef}>
      <dodecahedronGeometry args={[asteroidSize, 1]} />
      <meshStandardMaterial
        color={asteroidColor}
        roughness={0.9}
        metalness={params.composition === 'iron' ? 0.7 : 0.1}
      />
    </mesh>
  );
}

// Orbital path line
function OrbitPath({ angle }: { angle: number }) {
  const points = useMemo(() => {
    const angleRad = (angle * Math.PI) / 180;
    const distance = 5;
    const path: THREE.Vector3[] = [];
    const steps = 200;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const theta = t * Math.PI * 2;

      const a = distance * (1 - t * 0.8);
      const b = distance * 0.7 * (1 - t * 0.8);

      const x = a * Math.cos(theta);
      const y = Math.sin(angleRad) * t * 0.5;
      const z = b * Math.sin(theta);

      path.push(new THREE.Vector3(x, y, z));
    }

    return path;
  }, [angle]);

  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [points]);

  return (
    <line geometry={lineGeometry}>
      <lineBasicMaterial
        color="#fbbf24"
        opacity={0.4}
        transparent
        linewidth={2}
      />
    </line>
  );
}

// Info labels
function InfoLabels({ params }: { params: OrbitVisualization3DProps['asteroidParams'] }) {
  return (
    <>
      <Text
        position={[0, -1.5, 0]}
        fontSize={0.15}
        color="#60a5fa"
        anchorX="center"
        anchorY="middle"
      >
        Earth
      </Text>
      <Text
        position={[5, 0.5, 0]}
        fontSize={0.12}
        color="#fbbf24"
        anchorX="center"
        anchorY="middle"
      >
        {`Asteroid: ${params.diameter}m`}
      </Text>
      <Text
        position={[5, 0.2, 0]}
        fontSize={0.1}
        color="#fbbf24"
        anchorX="center"
        anchorY="middle"
      >
        {`Velocity: ${params.velocity} km/s`}
      </Text>
    </>
  );
}

// Main scene
function Scene({ params, isAnimating }: { params: OrbitVisualization3DProps['asteroidParams']; isAnimating: boolean }) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      {/* Stars background */}
      <Stars radius={100} depth={50} count={5000} factor={4} fade speed={1} />

      {/* Earth */}
      <Earth />

      {/* Asteroid */}
      <Asteroid params={params} isAnimating={isAnimating} />

      {/* Orbital path */}
      <OrbitPath angle={params.angle} />

      {/* Info labels */}
      <InfoLabels params={params} />

      {/* Camera controls */}
      <OrbitControls
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={20}
      />
    </>
  );
}

export default function OrbitVisualization3D({ asteroidParams, isAnimating = false }: OrbitVisualization3DProps) {
  return (
    <div className="card h-[500px]">
      <div className="mb-4">
        <h3 className="text-xl font-semibold mb-2">🌍 3D Orbital Trajectory</h3>
        <p className="text-sm text-white/60">
          Visualizing asteroid approach path • Use mouse to rotate, scroll to zoom
        </p>
      </div>
      <div className="h-[420px] rounded-lg overflow-hidden bg-black/50">
        <Canvas
          camera={{ position: [4, 3, 6], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
        >
          <Scene params={asteroidParams} isAnimating={isAnimating} />
        </Canvas>
      </div>
    </div>
  );
}
