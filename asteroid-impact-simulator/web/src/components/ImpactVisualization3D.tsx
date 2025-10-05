import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

interface ImpactVisualization3DProps {
  craterData?: {
    diameter: number;
    depth: number;
    volume: number;
  };
  blastZones?: {
    fireball: { radius: number };
    thermalRadiation: { radius: number };
    airblast: { radius: number };
    ionizingRadiation: { radius: number };
  };
  showAnimation?: boolean;
}

// Terrain surface
function Terrain({ craterDiameter, craterDepth }: { craterDiameter: number; craterDepth: number }) {
  const terrainRef = useRef<THREE.Mesh>(null);

  // Create terrain with crater
  const geometry = useMemo(() => {
    const size = 50;
    const segments = 100;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);

    const positions = geo.attributes.position;
    const craterRadius = (craterDiameter / 1000) * 5; // Scale for visualization
    const craterDepthScaled = (craterDepth / 1000) * 2;

    // Create crater depression
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);

      const distance = Math.sqrt(x * x + y * y);

      if (distance < craterRadius) {
        // Crater bowl shape
        const factor = 1 - distance / craterRadius;
        const depth = -craterDepthScaled * Math.pow(factor, 2);
        positions.setZ(i, depth);
      } else if (distance < craterRadius * 1.2) {
        // Crater rim
        const rimFactor = (distance - craterRadius) / (craterRadius * 0.2);
        const rimHeight = craterDepthScaled * 0.15 * (1 - rimFactor);
        positions.setZ(i, rimHeight);
      } else {
        // Flat terrain
        positions.setZ(i, 0);
      }
    }

    geo.computeVertexNormals();
    return geo;
  }, [craterDiameter, craterDepth]);

  return (
    <mesh ref={terrainRef} rotation={[-Math.PI / 2, 0, 0]} geometry={geometry}>
      <meshStandardMaterial
        color="#8b7355"
        roughness={0.9}
        wireframe={false}
      />
    </mesh>
  );
}

// Blast zone rings
function BlastZones({ zones }: { zones: ImpactVisualization3DProps['blastZones'] }) {
  if (!zones) return null;

  const zoneConfig = [
    { name: 'Fireball', radius: zones.fireball.radius, color: '#ef4444', opacity: 0.6 },
    { name: 'Thermal', radius: zones.thermalRadiation.radius, color: '#f59e0b', opacity: 0.3 },
    { name: 'Air Blast', radius: zones.airblast.radius, color: '#3b82f6', opacity: 0.2 },
    { name: 'Radiation', radius: zones.ionizingRadiation.radius, color: '#8b5cf6', opacity: 0.15 }
  ];

  return (
    <>
      {zoneConfig.map((zone, index) => {
        const radiusScaled = (zone.radius / 1000) * 5; // Scale for visualization

        return (
          <group key={zone.name}>
            {/* Ring at ground level */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
              <ringGeometry args={[radiusScaled * 0.95, radiusScaled, 64]} />
              <meshBasicMaterial
                color={zone.color}
                transparent
                opacity={zone.opacity}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Hemisphere dome */}
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[radiusScaled, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshBasicMaterial
                color={zone.color}
                transparent
                opacity={zone.opacity * 0.3}
                side={THREE.DoubleSide}
                wireframe
              />
            </mesh>

            {/* Label */}
            <Text
              position={[radiusScaled * 0.7, 2 + index * 0.5, 0]}
              fontSize={0.4}
              color={zone.color}
              anchorX="center"
              anchorY="middle"
            >
              {`${zone.name}: ${zone.radius.toFixed(1)} m`}
            </Text>
          </group>
        );
      })}
    </>
  );
}

// Animated impact effect
function ImpactEffect({ show }: { show: boolean }) {
  const [scale, setScale] = useState(0);
  const effectRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (show && scale < 1) {
      setScale((prev) => Math.min(prev + delta * 0.5, 1));
    }

    if (effectRef.current) {
      effectRef.current.rotation.z += delta * 0.5;
    }
  });

  if (!show) return null;

  return (
    <group ref={effectRef} position={[0, 2, 0]} scale={scale}>
      {/* Shockwave ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2, 3, 32]} />
        <meshBasicMaterial
          color="#ff6b00"
          transparent
          opacity={0.6 * (1 - scale)}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Fireball sphere */}
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial
          color="#ff3300"
          transparent
          opacity={0.7 * (1 - scale)}
          emissive="#ff6600"
          emissiveIntensity={2}
        />
      </mesh>

      {/* Particles */}
      {[...Array(20)].map((_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const radius = 2;
        const x = Math.cos(angle) * radius * scale;
        const z = Math.sin(angle) * radius * scale;
        const y = Math.random() * 3 * scale;

        return (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshBasicMaterial
              color="#ff9900"
              transparent
              opacity={0.8 * (1 - scale)}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// Main scene
function Scene({
  craterData,
  blastZones,
  showAnimation
}: ImpactVisualization3DProps) {
  const craterDiameter = craterData?.diameter || 1000;
  const craterDepth = craterData?.depth || 300;

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#ff6600" />

      {/* Terrain with crater */}
      <Terrain craterDiameter={craterDiameter} craterDepth={craterDepth} />

      {/* Blast zones */}
      {blastZones && <BlastZones zones={blastZones} />}

      {/* Impact animation */}
      <ImpactEffect show={showAnimation || false} />

      {/* Grid helper */}
      <gridHelper args={[50, 50, '#444444', '#222222']} position={[0, -0.1, 0]} />

      {/* Camera controls */}
      <OrbitControls
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  );
}

export default function ImpactVisualization3D({
  craterData,
  blastZones,
  showAnimation = false
}: ImpactVisualization3DProps) {
  return (
    <div className="card h-[500px]">
      <div className="mb-4">
        <h3 className="text-xl font-semibold mb-2">💥 3D Impact Visualization</h3>
        <p className="text-sm text-white/60">
          {craterData
            ? `Crater: ${craterData.diameter.toFixed(0)}m diameter, ${craterData.depth.toFixed(0)}m deep`
            : 'Run simulation to see impact crater and blast zones'
          }
        </p>
      </div>
      <div className="h-[420px] rounded-lg overflow-hidden bg-black/50">
        <Canvas
          camera={{ position: [15, 15, 15], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
        >
          <Scene
            craterData={craterData}
            blastZones={blastZones}
            showAnimation={showAnimation}
          />
        </Canvas>
      </div>
    </div>
  );
}
