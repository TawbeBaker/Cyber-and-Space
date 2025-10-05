import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import AsteroidSelector from './AsteroidSelector';
import OrbitalTrajectories3D from './OrbitalTrajectories3D';
import { loadAsteroidData, ProcessedAsteroid, filterAsteroids } from '../services/nasaDataLoader';

/**
 * Orbital View Mode - Shows NASA's 200 closest asteroids
 * Based on Luis's visualizer data
 */
export default function OrbitalViewMode() {
  const [nasaAsteroids, setNasaAsteroids] = useState<ProcessedAsteroid[]>([]);
  const [selectedAsteroid, setSelectedAsteroid] = useState<ProcessedAsteroid | null>(null);
  const [displayLimit, setDisplayLimit] = useState(50);
  const [currentDate] = useState(new Date());

  // Load NASA asteroid data
  useEffect(() => {
    loadAsteroidData().then((asteroids) => {
      setNasaAsteroids(asteroids);
      console.log(`📡 Loaded ${asteroids.length} NASA asteroids`);
    });
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Asteroid Selector Panel */}
      <div className="lg:col-span-1">
        <AsteroidSelector
          asteroids={nasaAsteroids}
          selectedAsteroid={selectedAsteroid}
          onSelectAsteroid={setSelectedAsteroid}
          displayLimit={displayLimit}
          onDisplayLimitChange={setDisplayLimit}
        />
      </div>

      {/* 3D Orbital View */}
      <div className="lg:col-span-2">
        <div className="w-full h-[600px] bg-gradient-to-b from-black via-indigo-950 to-black rounded-lg overflow-hidden border border-purple-500/30">
          <Canvas camera={{ position: [300, 150, 300], fov: 60 }}>
            <ambientLight intensity={0.3} />
            <pointLight position={[0, 0, 0]} intensity={2} color="#ffdd00" />

            <Stars radius={500} depth={50} count={5000} factor={4} saturation={0} />

            <OrbitalTrajectories3D
              asteroids={filterAsteroids(nasaAsteroids, { limit: displayLimit })}
              selectedAsteroid={selectedAsteroid}
              currentDate={currentDate}
            />

            <OrbitControls
              enablePan
              enableZoom
              enableRotate
              minDistance={50}
              maxDistance={800}
              target={[0, 0, 0]}
            />
          </Canvas>
        </div>

        {/* Orbital View Controls */}
        <div className="mt-4 p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-lg">
          <h4 className="text-sm font-bold text-indigo-300 mb-2">ℹ️ Orbital View Controls</h4>
          <ul className="text-xs text-gray-300 space-y-1">
            <li>• <strong>Yellow sphere</strong>: Sun (at origin)</li>
            <li>• <strong>Blue sphere</strong>: Earth's current position</li>
            <li>• <strong>Blue orbit</strong>: Earth's orbit</li>
            <li>• <strong>Cyan orbit</strong>: Selected asteroid</li>
            <li>• <strong>Orange orbits</strong>: Potentially hazardous asteroids</li>
            <li>• <strong>Blue orbits</strong>: Normal asteroids</li>
            <li>• Scale: 1 unit = 1 million km</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
