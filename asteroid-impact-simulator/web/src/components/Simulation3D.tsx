import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Line as DreiLine } from '@react-three/drei';
import * as THREE from 'three';
import {
  AsteroidSimulation3D,
  createSimulation,
  type CollisionInfo,
  type Vector3D,
} from '../physics/AsteroidSimulation3D';
import { reverseGeocode } from '../services/geocoding';
import JogShuttleControl from './JogShuttleControl';
import CollisionCountdown from './CollisionCountdown';
import OrbitalViewMode from './OrbitalViewMode';

// Scale factor for visualization (distances are in km, but we scale for better viewing)
const SCALE = 1 / 1000; // 1 unit = 1000 km

// Earth component with high-quality texture
function EarthSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const [earthTexture, setEarthTexture] = useState<THREE.Texture | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load Earth texture from NASA Blue Marble
    const loader = new THREE.TextureLoader();

    // Try multiple texture sources for reliability
    const textureSources = [
      'https://raw.githubusercontent.com/turban/webgl-earth/master/images/2_no_clouds_4k.jpg',
      'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
      'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg'
    ];

    let currentIndex = 0;

    const tryLoadTexture = () => {
      if (currentIndex >= textureSources.length) {
        console.warn('All Earth texture sources failed, using fallback color');
        setIsLoading(false);
        return;
      }

      loader.load(
        textureSources[currentIndex],
        (texture) => {
          console.log('Earth texture loaded successfully from:', textureSources[currentIndex]);
          setEarthTexture(texture);
          setIsLoading(false);
        },
        undefined,
        (error) => {
          console.warn(`Failed to load texture from ${textureSources[currentIndex]}:`, error);
          currentIndex++;
          tryLoadTexture();
        }
      );
    };

    tryLoadTexture();
  }, []);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001; // Slow rotation for realism
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[6.371, 64, 64]} />
      {earthTexture ? (
        <meshStandardMaterial
          map={earthTexture}
          roughness={0.7}
          metalness={0.1}
        />
      ) : (
        <meshStandardMaterial
          color={isLoading ? "#1a5fd8" : "#2a5fd8"}
          roughness={0.6}
          metalness={0.2}
        />
      )}
      {/* Atmosphere glow effect */}
      <mesh scale={1.02}>
        <sphereGeometry args={[6.371, 32, 32]} />
        <meshBasicMaterial
          color="#4a9eff"
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>
    </mesh>
  );
}

// Trajectory line
interface TrajectoryProps {
  positions: Vector3D[];
  color?: string;
}

function Trajectory({ positions, color = '#ff4444' }: TrajectoryProps) {
  if (positions.length < 2) return null;

  // Sample positions for performance (every 10th point)
  const sampledPositions = positions.filter((_, i) => i % 10 === 0 || i === positions.length - 1);
  const points = sampledPositions.map((p) => new THREE.Vector3(p.x * SCALE, p.y * SCALE, p.z * SCALE));

  return (
    <DreiLine
      points={points}
      color={color}
      lineWidth={3}
    />
  );
}

// Animated asteroid
interface AnimatedAsteroidProps {
  positions: Vector3D[];
  currentIndex: number;
  radiusKm: number;
}

function AnimatedAsteroid({ positions, currentIndex, radiusKm }: AnimatedAsteroidProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (meshRef.current && positions[currentIndex]) {
      const pos = positions[currentIndex];
      const scaledPos = {
        x: pos.x * SCALE,
        y: pos.y * SCALE,
        z: pos.z * SCALE
      };
      meshRef.current.position.set(scaledPos.x, scaledPos.y, scaledPos.z);
      if (glowRef.current) {
        glowRef.current.position.set(scaledPos.x, scaledPos.y, scaledPos.z);
      }

      // Log position for debugging (only every 100 frames)
      if (currentIndex % 100 === 0) {
        console.log(`Frame ${currentIndex}: Asteroid at`, scaledPos);
      }
    }
  }, [currentIndex, positions]);

  // Make asteroid visible (minimum 0.5 units)
  const visualRadius = Math.max(radiusKm * SCALE * 5, 0.5);

  return (
    <group>
      {/* Main asteroid */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[visualRadius, 16, 16]} />
        <meshStandardMaterial
          color="#ff4422"
          emissive="#ff3300"
          emissiveIntensity={0.6}
          roughness={0.8}
        />
      </mesh>
      {/* Glow effect */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[visualRadius * 1.5, 16, 16]} />
        <meshBasicMaterial
          color="#ff6644"
          transparent
          opacity={0.3}
        />
      </mesh>
    </group>
  );
}

// Impact marker
interface ImpactMarkerProps {
  latitude: number;
  longitude: number;
}

function ImpactMarker({ latitude, longitude }: ImpactMarkerProps) {
  const earthRadius = 6.371;
  const latRad = (latitude * Math.PI) / 180;
  const lonRad = (longitude * Math.PI) / 180;

  // Calculate position on Earth's surface
  const x = earthRadius * Math.cos(latRad) * Math.cos(lonRad);
  const y = earthRadius * Math.cos(latRad) * Math.sin(lonRad);
  const z = earthRadius * Math.sin(latRad);

  const markerRef = useRef<THREE.Mesh>(null);
  const ringRef1 = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (markerRef.current) {
      markerRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.3);
    }
    if (ringRef1.current && ringRef1.current.material && 'opacity' in ringRef1.current.material) {
      ringRef1.current.scale.setScalar(1.5 + Math.sin(clock.elapsedTime * 2) * 0.5);
      ringRef1.current.material.opacity = 0.4 - Math.sin(clock.elapsedTime * 2) * 0.2;
    }
    if (ringRef2.current && ringRef2.current.material && 'opacity' in ringRef2.current.material) {
      ringRef2.current.scale.setScalar(2 + Math.sin(clock.elapsedTime * 2 + Math.PI) * 0.7);
      ringRef2.current.material.opacity = 0.3 - Math.sin(clock.elapsedTime * 2 + Math.PI) * 0.15;
    }
  });

  // Slightly elevated to be visible on surface
  const elevationFactor = 1.01;

  return (
    <group position={[x * elevationFactor, y * elevationFactor, z * elevationFactor]}>
      {/* Central marker */}
      <mesh ref={markerRef}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      {/* Pulsing ring 1 */}
      <mesh ref={ringRef1}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial color="#ff3300" transparent opacity={0.4} />
      </mesh>
      {/* Pulsing ring 2 */}
      <mesh ref={ringRef2}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial color="#ff6600" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

// Main component
export default function Simulation3D() {
  const [simulation, setSimulation] = useState<AsteroidSimulation3D | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [simulationComplete, setSimulationComplete] = useState(false);
  const [collisionInfo, setCollisionInfo] = useState<CollisionInfo | null>(null);
  const [progress, setProgress] = useState(0);

  // Simulation parameters
  const [asteroidRadius, setAsteroidRadius] = useState(0.5); // km
  const [initialDistance, setInitialDistance] = useState(100000); // km
  const [velocity, setVelocity] = useState(20); // km/s

  // Time control from Luis's jog/shuttle
  const [timeSpeed, setTimeSpeed] = useState(1);
  const [timeDirection, setTimeDirection] = useState(1); // 1 = forward, -1 = backward

  // View mode toggle
  const [showOrbitalView, setShowOrbitalView] = useState(false);

  const animationRef = useRef<number>();

  // Initialize simulation
  const initializeSimulation = async () => {
    try {
      setSimulationComplete(false);
      setCollisionInfo(null);
      setProgress(0);
      setCurrentFrame(0);
      setIsPlaying(false);

      const density = 2500e9;

      // Direct impact trajectory with slight offset for curved path
      // Start from an angled position to create visible curve via gravity
      const angleOffset = 10; // 10 degrees offset from direct line
      const angleRad = (angleOffset * Math.PI) / 180;

      // Position with slight Y offset
      const startX = initialDistance * Math.cos(angleRad);
      const startY = initialDistance * Math.sin(angleRad);

      // Velocity aimed slightly below center to ensure impact
      const impactAimY = -startY * 0.3; // Aim 30% back towards center
      const velocityMagnitude = velocity;
      const directionX = -startX;
      const directionY = impactAimY - startY;
      const directionMagnitude = Math.sqrt(directionX * directionX + directionY * directionY);

      const sim = createSimulation({
        asteroidRadiusKm: asteroidRadius,
        asteroidDensityKg: density,
        initialPositionKm: { x: startX, y: startY, z: 0 },
        initialVelocityKmS: {
          x: (directionX / directionMagnitude) * velocityMagnitude,
          y: (directionY / directionMagnitude) * velocityMagnitude,
          z: 0
        },
      });

      const result = await sim.run(100000, 10, (prog) => {
        setProgress(prog);
      });

      console.log('Simulation completed');
      console.log('Result:', result);
      console.log('Trajectory points:', sim.asteroids[0]?.positions.length);

      if (result) {
        const locationName = await reverseGeocode(result.latitude, result.longitude);
        result.location = locationName;
        console.log('Impact location:', locationName);
      }

      setSimulation(sim);
      setCollisionInfo(result);
      setSimulationComplete(true);

      if (!result) {
        alert('No impact detected. Try reducing distance or increasing velocity.');
      } else {
        console.log('Impact detected! Starting at frame 0, total frames:', sim.asteroids[0].positions.length);
      }
    } catch (error) {
      console.error('Simulation error:', error);
      alert('Error running simulation. Please try again.');
      setSimulationComplete(true);
    }
  };

  // Animation loop with time control support
  useEffect(() => {
    if (isPlaying && simulation && simulation.asteroids[0]) {
      const maxFrames = simulation.asteroids[0].positions.length;

      const animate = () => {
        setCurrentFrame((prev) => {
          // Apply time speed and direction
          const frameStep = Math.ceil(timeSpeed) * timeDirection;
          let newFrame = prev + frameStep;

          // Handle boundaries
          if (timeDirection > 0 && newFrame >= maxFrames - 1) {
            setIsPlaying(false);
            return maxFrames - 1;
          }

          if (timeDirection < 0 && newFrame <= 0) {
            return 0;
          }

          // Clamp to valid range
          return Math.max(0, Math.min(newFrame, maxFrames - 1));
        });

        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, simulation, timeSpeed, timeDirection]);

  const handlePlayPause = () => {
    if (!simulation || !simulationComplete) return;
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentFrame(0);
    setIsPlaying(false);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  return (
    <div className="glass-card">
      <h2 className="text-3xl font-bold mb-4 flex items-center gap-3 text-white">
        <span>🌌</span> 3D Asteroid Trajectory Simulation
      </h2>

      {/* Enhanced with Luis's Code Banner */}
      <div className="mb-6 p-3 bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/40 rounded-lg">
        <p className="text-xs text-purple-200">
          ✨ Enhanced with high-precision orbital mechanics and professional time controls from{' '}
          <a
            href="https://github.com/TawbeBaker/Cyber-and-Space/tree/main/Hackathon"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-purple-100"
          >
            Luis's Asteroid Visualizer
          </a>
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={() => setShowOrbitalView(false)}
          className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
            !showOrbitalView
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          🎯 Impact Simulation
        </button>
        <button
          onClick={() => setShowOrbitalView(true)}
          className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
            showOrbitalView
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          🌍 Orbital View (200 NASA Asteroids)
        </button>
      </div>

      {/* Orbital View Mode */}
      {showOrbitalView && <OrbitalViewMode />}

      {/* Impact Simulation Mode */}
      {!showOrbitalView && (
      <>
      {/* Welcome Message - Impact Mode */}
      {!simulation && (
        <div className="mb-6 p-4 bg-blue-900/30 border border-blue-500/50 rounded-lg">
          <h3 className="text-lg font-bold text-blue-300 mb-2">👋 Impact Simulation Mode</h3>
          <p className="text-sm text-gray-300">
            This simulation calculates the exact trajectory of an asteroid heading towards Earth
            using real Newtonian physics. Adjust the parameters below and click "Run Simulation"
            to see the 3D visualization. <strong>Default settings will show impact in ~1.4 hours.</strong>
          </p>
        </div>
      )}

      {/* Control Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-cyan-300 mb-2">
            Asteroid Radius (km)
          </label>
          <input
            type="number"
            value={asteroidRadius}
            onChange={(e) => setAsteroidRadius(parseFloat(e.target.value))}
            className="w-full px-3 py-2 bg-gray-800 border border-cyan-500/30 rounded text-white"
            min="0.1"
            max="10"
            step="0.1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-purple-300 mb-2">
            Initial Distance (km)
          </label>
          <input
            type="number"
            value={initialDistance}
            onChange={(e) => setInitialDistance(parseFloat(e.target.value))}
            className="w-full px-3 py-2 bg-gray-800 border border-purple-500/30 rounded text-white"
            min="10000"
            max="500000"
            step="10000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-green-300 mb-2">
            Velocity (km/s)
          </label>
          <input
            type="number"
            value={velocity}
            onChange={(e) => setVelocity(parseFloat(e.target.value))}
            className="w-full px-3 py-2 bg-gray-800 border border-green-500/30 rounded text-white"
            min="1"
            max="50"
            step="1"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={initializeSimulation}
          disabled={progress > 0 && !simulationComplete}
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {progress > 0 && !simulationComplete
            ? `🔄 Computing... ${progress.toFixed(1)}%`
            : '🚀 Run Simulation'}
        </button>

        {simulationComplete && simulation && (
          <>
            <button
              onClick={handlePlayPause}
              className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all"
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>

            <button
              onClick={handleReset}
              className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-all"
            >
              🔄 Reset
            </button>
          </>
        )}
      </div>

      {/* Collision Info with Countdown */}
      {collisionInfo && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
          <h3 className="text-xl font-bold text-red-300 mb-3">💥 Impact Detected!</h3>

          {/* Collision Countdown Component from Luis */}
          <div className="mb-4">
            <CollisionCountdown
              targetDate={new Date(Date.now() + collisionInfo.timeToImpact * 1000)}
              currentTime={new Date()}
              onImpact={() => console.log('Impact occurred!')}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
            <div>
              <span className="text-gray-400">Latitude:</span>
              <p className="text-white font-semibold">{collisionInfo.latitude.toFixed(2)}°</p>
            </div>
            <div>
              <span className="text-gray-400">Longitude:</span>
              <p className="text-white font-semibold">{collisionInfo.longitude.toFixed(2)}°</p>
            </div>
            <div>
              <span className="text-gray-400">Impact Angle:</span>
              <p className="text-white font-semibold">{collisionInfo.impactAngle.toFixed(1)}°</p>
            </div>
            <div>
              <span className="text-gray-400">Time to Impact:</span>
              <p className="text-white font-semibold">{formatTime(collisionInfo.timeToImpact)}</p>
            </div>
          </div>
          {collisionInfo.location && (
            <div className="mt-2 pt-3 border-t border-red-500/30">
              <span className="text-gray-400 text-sm">Impact Location:</span>
              <p className="text-white font-semibold text-lg">{collisionInfo.location}</p>
            </div>
          )}
        </div>
      )}

      {/* 3D Canvas */}
      <div className="w-full h-[600px] bg-gradient-to-b from-gray-900 via-blue-950 to-black rounded-lg overflow-hidden border border-cyan-500/30">
        {!simulationComplete && progress > 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🔄</div>
              <div className="text-2xl font-bold text-white mb-2">Computing Trajectory...</div>
              <div className="text-lg text-cyan-400">{progress.toFixed(1)}% complete</div>
              <div className="mt-4 w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <Canvas
            camera={{ position: [150, 80, 150], fov: 50 }}
            gl={{ antialias: true, alpha: false }}
          >
            {/* Lighting */}
            <ambientLight intensity={0.4} />
            <directionalLight position={[100, 50, 100]} intensity={1.5} castShadow />
            <pointLight position={[-50, -50, -50]} intensity={0.5} color="#4a9eff" />

            {/* Stars background */}
            <Stars radius={300} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

            {/* Earth */}
            <EarthSphere />

            {/* Trajectory and Asteroid */}
            {simulation && simulation.asteroids[0] && simulation.asteroids[0].positions.length > 0 && (
              <>
                <Trajectory positions={simulation.asteroids[0].positions} />
                <AnimatedAsteroid
                  positions={simulation.asteroids[0].positions}
                  currentIndex={currentFrame}
                  radiusKm={asteroidRadius}
                />
              </>
            )}

            {/* Impact marker */}
            {collisionInfo && (
              <ImpactMarker
                latitude={collisionInfo.latitude}
                longitude={collisionInfo.longitude}
              />
            )}

            {/* Controls */}
            <OrbitControls
              enablePan
              enableZoom
              enableRotate
              minDistance={10}
              maxDistance={500}
              target={[0, 0, 0]}
            />
          </Canvas>
        )}
      </div>

      {/* Jog/Shuttle Time Control from Luis */}
      {simulation && simulationComplete && (
        <div className="mt-4">
          <JogShuttleControl
            onSpeedChange={(speed, direction) => {
              setTimeSpeed(speed);
              setTimeDirection(direction);
            }}
            normalSpeed={1}
          />
        </div>
      )}

      {/* Timeline Slider */}
      {simulation && simulation.asteroids[0] && simulation.asteroids[0].positions.length > 0 && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Timeline: Frame {currentFrame} / {simulation.asteroids[0].positions.length - 1}
            {timeSpeed !== 1 && ` • Speed: ${timeSpeed.toFixed(1)}x ${timeDirection < 0 ? '⏪' : '⏩'}`}
          </label>
          <input
            type="range"
            min="0"
            max={simulation.asteroids[0].positions.length - 1}
            value={currentFrame}
            onChange={(e) => setCurrentFrame(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <h3 className="text-lg font-bold text-blue-300 mb-2">ℹ️ 3D View Controls</h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• <strong>Rotate</strong>: Left-click and drag</li>
          <li>• <strong>Zoom</strong>: Scroll wheel or pinch</li>
          <li>• <strong>Pan</strong>: Right-click and drag</li>
          <li>• <strong>Earth</strong>: Blue sphere with rotating atmosphere</li>
          <li>• <strong>Trajectory</strong>: Red line showing asteroid path</li>
          <li>• <strong>Asteroid</strong>: Red glowing sphere (size exaggerated for visibility)</li>
          <li>• <strong>Impact</strong>: Pulsing red marker on Earth's surface</li>
        </ul>
      </div>
      </>
      )}
    </div>
  );
}
