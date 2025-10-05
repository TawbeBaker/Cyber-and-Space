import { useMemo } from 'react';
import { Line as DreiLine } from '@react-three/drei';
import * as THREE from 'three';
import { ProcessedAsteroid, OrbitalElements } from '../services/nasaDataLoader';
import {
  solveKeplerEquation,
  getEarthPosition,
  dateToJulian,
} from '../utils/orbitalMechanics';

interface OrbitalTrajectories3DProps {
  asteroids: ProcessedAsteroid[];
  selectedAsteroid: ProcessedAsteroid | null;
  currentDate: Date;
}

// Scale: 1 unit = 1 million km for solar system view
const SCALE = 1 / 1000000;

/**
 * Calculate position from orbital elements using Kepler's equations
 */
function calculateOrbitalPosition(
  elements: OrbitalElements,
  julianDate: number
): { x: number; y: number; z: number } {
  const { a, e, i, Omega, omega, M0, n, epoch } = elements;

  // Time since epoch (seconds)
  const deltaTime = (julianDate - epoch) * 86400;

  // Mean anomaly at current time
  const M = M0 + n * deltaTime;

  // Solve Kepler's equation for eccentric anomaly
  const E = solveKeplerEquation(M, e);

  // True anomaly
  const trueAnomaly =
    2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));

  // Distance from Sun
  const r = (a * (1 - e * e)) / (1 + e * Math.cos(trueAnomaly));

  // Position in orbital plane
  const x_orb = r * Math.cos(trueAnomaly);
  const y_orb = r * Math.sin(trueAnomaly);

  // Transform to heliocentric coordinates (3D rotation)
  const cosOmega = Math.cos(Omega);
  const sinOmega = Math.sin(Omega);
  const cosi = Math.cos(i);
  const sini = Math.sin(i);
  const cosomega = Math.cos(omega);
  const sinomega = Math.sin(omega);

  const x =
    (cosOmega * cosomega - sinOmega * sinomega * cosi) * x_orb +
    (-cosOmega * sinomega - sinOmega * cosomega * cosi) * y_orb;

  const y =
    (sinOmega * cosomega + cosOmega * sinomega * cosi) * x_orb +
    (-sinOmega * sinomega + cosOmega * cosomega * cosi) * y_orb;

  const z = sinomega * sini * x_orb + cosomega * sini * y_orb;

  return { x, y, z };
}

/**
 * Generate orbit line points
 */
function generateOrbitPoints(elements: OrbitalElements, segments: number = 100): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const { a, e, i, Omega, omega, M0 } = elements;

  for (let i_seg = 0; i_seg <= segments; i_seg++) {
    const M = (i_seg / segments) * 2 * Math.PI;
    const E = solveKeplerEquation(M, e);
    const trueAnomaly =
      2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));

    const r = (a * (1 - e * e)) / (1 + e * Math.cos(trueAnomaly));
    const x_orb = r * Math.cos(trueAnomaly);
    const y_orb = r * Math.sin(trueAnomaly);

    const cosOmega = Math.cos(Omega);
    const sinOmega = Math.sin(Omega);
    const cosi = Math.cos(i);
    const sini = Math.sin(i);
    const cosomega = Math.cos(omega);
    const sinomega = Math.sin(omega);

    const x =
      (cosOmega * cosomega - sinOmega * sinomega * cosi) * x_orb +
      (-cosOmega * sinomega - sinOmega * cosomega * cosi) * y_orb;

    const y =
      (sinOmega * cosomega + cosOmega * sinomega * cosi) * x_orb +
      (-sinOmega * sinomega + cosOmega * cosomega * cosi) * y_orb;

    const z = sinomega * sini * x_orb + cosomega * sini * y_orb;

    // Convert to Three.js coordinates (Y-up, scaled)
    points.push(new THREE.Vector3(x * SCALE, z * SCALE, -y * SCALE));
  }

  return points;
}

/**
 * Single orbit line component
 */
function OrbitLine({
  asteroid,
  isSelected,
}: {
  asteroid: ProcessedAsteroid;
  isSelected: boolean;
}) {
  const points = useMemo(
    () => generateOrbitPoints(asteroid.elements, isSelected ? 200 : 100),
    [asteroid.elements, isSelected]
  );

  const color = isSelected
    ? '#00ffff' // Cyan for selected
    : asteroid.isHazardous
    ? '#ff6600' // Orange for hazardous
    : '#4488ff'; // Blue for normal

  const opacity = isSelected ? 0.9 : 0.3;
  const lineWidth = isSelected ? 3 : 1;

  return (
    <DreiLine
      points={points}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
    />
  );
}

/**
 * Asteroid position marker
 */
function AsteroidMarker({
  asteroid,
  currentDate,
  isSelected,
}: {
  asteroid: ProcessedAsteroid;
  currentDate: Date;
  isSelected: boolean;
}) {
  const position = useMemo(() => {
    const julianDate = dateToJulian(currentDate);
    const pos = calculateOrbitalPosition(asteroid.elements, julianDate);
    return new THREE.Vector3(pos.x * SCALE, pos.z * SCALE, -pos.y * SCALE);
  }, [asteroid.elements, currentDate]);

  const size = isSelected ? 0.8 : asteroid.isHazardous ? 0.4 : 0.2;
  const color = isSelected
    ? '#00ffff'
    : asteroid.isHazardous
    ? '#ff6600'
    : '#ffffff';

  return (
    <mesh position={position}>
      <sphereGeometry args={[size, 8, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

/**
 * Earth orbit and position
 */
function EarthOrbit({ currentDate }: { currentDate: Date }) {
  const earthPosition = useMemo(() => {
    const julianDate = dateToJulian(currentDate);
    const pos = getEarthPosition(julianDate);
    return new THREE.Vector3(pos.x * SCALE, 0, -pos.y * SCALE);
  }, [currentDate]);

  // Earth orbit circle (simplified - assumes circular)
  const earthOrbitPoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const AU = 149597870.7;
    const segments = 100;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = AU * Math.cos(angle);
      const y = AU * Math.sin(angle);
      points.push(new THREE.Vector3(x * SCALE, 0, -y * SCALE));
    }

    return points;
  }, []);

  return (
    <>
      {/* Earth orbit line */}
      <DreiLine
        points={earthOrbitPoints}
        color="#4a9eff"
        lineWidth={2}
        transparent
        opacity={0.5}
      />

      {/* Earth position marker */}
      <mesh position={earthPosition}>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshBasicMaterial color="#2a5fd8" />
      </mesh>

      {/* Sun at origin */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[2, 16, 16]} />
        <meshBasicMaterial color="#ffdd00" />
      </mesh>
    </>
  );
}

/**
 * Main orbital trajectories component
 */
export default function OrbitalTrajectories3D({
  asteroids,
  selectedAsteroid,
  currentDate,
}: OrbitalTrajectories3DProps) {
  return (
    <>
      {/* Earth orbit and position */}
      <EarthOrbit currentDate={currentDate} />

      {/* Asteroid orbits */}
      {asteroids.map((asteroid) => (
        <OrbitLine
          key={asteroid.id}
          asteroid={asteroid}
          isSelected={selectedAsteroid?.id === asteroid.id}
        />
      ))}

      {/* Asteroid position markers */}
      {asteroids.map((asteroid) => (
        <AsteroidMarker
          key={asteroid.id}
          asteroid={asteroid}
          currentDate={currentDate}
          isSelected={selectedAsteroid?.id === asteroid.id}
        />
      ))}
    </>
  );
}
