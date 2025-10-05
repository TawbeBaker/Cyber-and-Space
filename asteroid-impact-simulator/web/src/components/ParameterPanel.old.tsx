import { useSimulationStore } from '../store/useSimulationStore';
import { simulationAPI, neoAPI } from '../services/api';
import { useState, useEffect } from 'react';
import type { SampleAsteroid } from '../types';
import ScenarioSelector from './ScenarioSelector';

export default function ParameterPanel() {
  const {
    asteroidParams,
    setAsteroidParams,
    impactLocation,
    setSimulationStep,
    setLoading,
    setError,
    setSimulationResult,
  } = useSimulationStore();

  const [sampleAsteroids, setSampleAsteroids] = useState<SampleAsteroid[]>([]);

  useEffect(() => {
    neoAPI.getSampleAsteroids()
      .then(setSampleAsteroids)
      .catch(console.error);
  }, []);

  const handleSimulate = async () => {
    if (!impactLocation) {
      setSimulationStep('location');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { simulation, zoneAnalysis } = await simulationAPI.simulateImpact(
        asteroidParams,
        impactLocation
      );
      setSimulationResult(simulation, zoneAnalysis);
    } catch (error: any) {
      setError(error.message || 'Simulation failed');
      setLoading(false);
    }
  };

  const loadSampleAsteroid = (sample: SampleAsteroid) => {
    setAsteroidParams({
      diameter: sample.diameter,
      velocity: sample.velocity,
    });
  };

  return (
    <div className="space-y-6">
      {/* Predefined Scenarios */}
      <ScenarioSelector />

      {/* Parameters */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>⚙️</span> Asteroid Parameters
        </h2>

        <div className="space-y-4">
          {/* Diameter */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Diameter: {asteroidParams.diameter} meters
            </label>
            <input
              type="range"
              min="10"
              max="10000"
              step="10"
              value={asteroidParams.diameter}
              onChange={(e) => setAsteroidParams({ diameter: Number(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-white/60 mt-1">
              <span>10m</span>
              <span>10km</span>
            </div>
          </div>

          {/* Velocity */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Velocity: {asteroidParams.velocity} km/s
            </label>
            <input
              type="range"
              min="5"
              max="50"
              step="0.5"
              value={asteroidParams.velocity}
              onChange={(e) => setAsteroidParams({ velocity: Number(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-white/60 mt-1">
              <span>5 km/s</span>
              <span>50 km/s</span>
            </div>
          </div>

          {/* Angle */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Impact Angle: {asteroidParams.angle}°
            </label>
            <input
              type="range"
              min="15"
              max="90"
              step="5"
              value={asteroidParams.angle}
              onChange={(e) => setAsteroidParams({ angle: Number(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-white/60 mt-1">
              <span>15° (shallow)</span>
              <span>90° (vertical)</span>
            </div>
          </div>

          {/* Composition */}
          <div>
            <label className="block text-sm font-medium mb-2">Composition</label>
            <select
              value={asteroidParams.composition}
              onChange={(e) => {
                const composition = e.target.value as 'rocky' | 'iron' | 'icy';
                const densityMap = { rocky: 3000, iron: 7800, icy: 1000 };
                setAsteroidParams({
                  composition,
                  density: densityMap[composition],
                });
              }}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="rocky">🪨 Rocky (3000 kg/m³)</option>
              <option value="iron">⚙️ Iron (7800 kg/m³)</option>
              <option value="icy">❄️ Icy (1000 kg/m³)</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          {!impactLocation ? (
            <button
              onClick={() => setSimulationStep('location')}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-all glow"
            >
              📍 Select Impact Location
            </button>
          ) : (
            <>
              <div className="text-sm text-center text-white/70">
                Location: {impactLocation.lat.toFixed(2)}°, {impactLocation.lon.toFixed(2)}°
              </div>
              <button
                onClick={handleSimulate}
                className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 rounded-lg font-semibold transition-all glow-red"
              >
                💥 Simulate Impact
              </button>
              <button
                onClick={() => setSimulationStep('location')}
                className="w-full px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-all"
              >
                Change Location
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
