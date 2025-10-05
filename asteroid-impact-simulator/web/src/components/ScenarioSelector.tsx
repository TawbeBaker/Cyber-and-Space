import { useState } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import { simulationAPI } from '../services/api';
import ImpactMapLeaflet from './ImpactMapLeaflet';
import ResultsDashboard from './ResultsDashboard';

interface Scenario {
  id: string;
  name: string;
  icon: string;
  description: string;
  historical: boolean;
  year?: number;
  params: {
    diameter: number;
    velocity: number;
    angle: number;
    density: number;
    composition: 'rocky' | 'iron' | 'icy';
  };
  location?: {
    lat: number;
    lon: number;
    name: string;
  };
}

const PREDEFINED_SCENARIOS: Scenario[] = [
  {
    id: 'chelyabinsk',
    name: 'Chelyabinsk Meteor',
    icon: '💨',
    description: 'Russian meteor airburst - 1,500 injured by shockwave, 7,200 buildings damaged',
    historical: true,
    year: 2013,
    params: {
      diameter: 20,        // 17-20m documented
      velocity: 19,        // 19.16 km/s documented
      angle: 18,           // ~18° documented shallow entry
      density: 3300,       // LL5 chondrite ~3,300 kg/m³
      composition: 'rocky',
    },
    location: {
      lat: 55.1644,
      lon: 61.4368,
      name: 'Chelyabinsk, Russia',
    },
  },
  {
    id: 'tunguska',
    name: 'Tunguska Event',
    icon: '🌲',
    description: 'Siberian forest devastation - 2,000 km² flattened, no crater found (airburst)',
    historical: true,
    year: 1908,
    params: {
      diameter: 60,        // 50-60m estimated for airburst
      velocity: 27,        // 27 km/s estimated
      angle: 30,           // 30-45° estimated shallow angle
      density: 1800,       // Low density comet/carbonaceous ~1,800 kg/m³
      composition: 'icy',  // Likely comet or carbonaceous chondrite
    },
    location: {
      lat: 60.8858,
      lon: 101.8939,
      name: 'Tunguska, Siberia',
    },
  },
  {
    id: 'apophis',
    name: 'Apophis (99942)',
    icon: '⚠️',
    description: 'Near-miss asteroid - will pass closer than satellites on April 13, 2029',
    historical: false,
    params: {
      diameter: 370,       // 370m measured by radar
      velocity: 31,        // ~30.7 km/s typical NEO
      angle: 45,           // Hypothetical impact angle
      density: 3200,       // Rocky S-type asteroid
      composition: 'rocky',
    },
  },
  {
    id: 'bennu',
    name: 'Bennu (101955)',
    icon: '🎯',
    description: 'OSIRIS-REx target - 1 in 2,700 chance of impact between 2175-2199',
    historical: false,
    params: {
      diameter: 490,       // 490m measured by spacecraft
      velocity: 28,        // ~28 km/s relative velocity
      angle: 45,           // Hypothetical impact angle
      density: 1190,       // Very low density rubble pile
      composition: 'icy',  // B-type carbonaceous asteroid
    },
  },
  {
    id: 'chicxulub',
    name: 'Chicxulub Impact',
    icon: '🦖',
    description: 'Dinosaur extinction - 10-15 km asteroid, 180 km crater, 66 million years ago',
    historical: true,
    year: -66000000,
    params: {
      diameter: 10000,     // 10-15 km estimated
      velocity: 20,        // 20-40 km/s estimated
      angle: 60,           // ~60° from horizontal (recent study 2020)
      density: 2600,       // Carbonaceous chondrite
      composition: 'icy',
    },
    location: {
      lat: 21.3,
      lon: -89.5,
      name: 'Yucatán Peninsula, Mexico',
    },
  },
  {
    id: 'city_killer',
    name: 'City Killer (100m)',
    icon: '🏙️',
    description: 'Hypothetical 100m urban impact - expected every 10,000 years',
    historical: false,
    params: {
      diameter: 100,
      velocity: 20,
      angle: 45,
      density: 3000,
      composition: 'rocky',
    },
  },
];

export default function ScenarioSelector() {
  const {
    asteroidParams,
    setAsteroidParams,
    impactLocation,
    setImpactLocation,
    setSimulationStep,
    simulationStep,
    setSimulationResult,
    setLoading,
    setError,
  } = useSimulationStore();
  const [hoveredScenario, setHoveredScenario] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);

  const loadScenario = async (scenario: Scenario) => {
    // Set asteroid parameters
    setAsteroidParams(scenario.params);
    setSelectedScenario(scenario);

    // Set location if provided
    if (scenario.location) {
      const location = {
        lat: scenario.location.lat,
        lon: scenario.location.lon,
      };
      setImpactLocation(location);
      setSimulationStep('location');

      // Auto-simulate for scenarios with known locations
      setLoading(true);
      setError(null);

      try {
        const { simulation, zoneAnalysis } = await simulationAPI.simulateImpact(
          scenario.params,
          location
        );

        if (!simulation || !zoneAnalysis) {
          throw new Error('Invalid simulation response');
        }

        setSimulationResult(simulation, zoneAnalysis);
        setSimulationStep('results');
      } catch (error: any) {
        console.error('Simulation error:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Simulation failed. Please check API connection.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    } else {
      setSimulationStep('location');
    }
  };

  const handleSimulate = async () => {
    if (!impactLocation) {
      setError('Please select an impact location on the map');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { simulation, zoneAnalysis } = await simulationAPI.simulateImpact(
        asteroidParams,
        impactLocation
      );

      if (!simulation || !zoneAnalysis) {
        throw new Error('Invalid simulation response');
      }

      setSimulationResult(simulation, zoneAnalysis);
      setSimulationStep('results');
    } catch (error: any) {
      console.error('Simulation error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Simulation failed. Please check API connection.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Section - Scenarios and Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left - Scenarios List */}
        <div className="glass-card">
          <h3 className="text-xl font-semibold mb-4 text-white">Impact Scenarios</h3>
          <p className="text-sm text-white/70 mb-4">
            Select a scenario to load parameters and impact location
          </p>

          {/* Scenario list */}
          <div className="space-y-2">
            {PREDEFINED_SCENARIOS.map((scenario) => (
              <div key={scenario.id}>
                <button
                  onClick={() => loadScenario(scenario)}
                  onMouseEnter={() => setHoveredScenario(scenario.id)}
                  onMouseLeave={() => setHoveredScenario(null)}
                  className={`w-full text-left px-4 py-2.5 border rounded-lg transition-all group ${
                    selectedScenario?.id === scenario.id
                      ? 'bg-blue-500/20 border-blue-500/70'
                      : 'bg-white/5 hover:bg-blue-500/10 border-white/10 hover:border-blue-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm group-hover:text-blue-300 transition-colors text-white">
                        {scenario.icon} {scenario.name}
                        {scenario.historical && scenario.year && (
                          <span className="ml-2 text-xs text-yellow-400">
                            ({scenario.year > 0 ? scenario.year : `${Math.abs(scenario.year).toLocaleString()} BCE`})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-white/60 mt-0.5">
                        Ø {scenario.params.diameter}m · {scenario.params.velocity} km/s
                      </div>
                    </div>
                    <div className="text-white/40 text-xs">→</div>
                  </div>
                </button>

                {/* Tooltip on hover */}
                {hoveredScenario === scenario.id && (
                  <div className="mt-2 p-3 bg-gray-900/95 border border-white/20 rounded-lg">
                    <p className="text-xs text-white/80 mb-2">{scenario.description}</p>
                    <div className="flex flex-wrap gap-1 text-xs">
                      <span className="px-2 py-0.5 bg-blue-500/30 text-blue-200 rounded">
                        Diameter: {scenario.params.diameter}m
                      </span>
                      <span className="px-2 py-0.5 bg-purple-500/30 text-purple-200 rounded">
                        Velocity: {scenario.params.velocity} km/s
                      </span>
                      <span className="px-2 py-0.5 bg-green-500/30 text-green-200 rounded capitalize">
                        {scenario.params.composition}
                      </span>
                      <span className="px-2 py-0.5 bg-orange-500/30 text-orange-200 rounded">
                        Angle: {scenario.params.angle}°
                      </span>
                    </div>
                    {scenario.location && (
                      <p className="text-xs text-white/60 mt-2">📍 {scenario.location.name}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Current parameters */}
          {selectedScenario && (
            <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
              <h4 className="text-sm font-semibold text-white mb-2">Loaded Parameters</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-white/60">Diameter:</span>
                  <span className="ml-2 text-blue-400 font-medium">{asteroidParams.diameter}m</span>
                </div>
                <div>
                  <span className="text-white/60">Velocity:</span>
                  <span className="ml-2 text-cyan-400 font-medium">{asteroidParams.velocity} km/s</span>
                </div>
                <div>
                  <span className="text-white/60">Angle:</span>
                  <span className="ml-2 text-purple-400 font-medium">{asteroidParams.angle}°</span>
                </div>
                <div>
                  <span className="text-white/60">Density:</span>
                  <span className="ml-2 text-green-400 font-medium">{asteroidParams.density} kg/m³</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right - Map */}
        <div className="glass-card">
          <h3 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
            <span>🌍</span> Impact Location
          </h3>

          {/* Info message */}
          {selectedScenario ? (
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-300">
                ✓ Location loaded: <span className="font-semibold">{selectedScenario.location?.name}</span>
              </p>
              <p className="text-xs text-white/60 mt-1">
                Simulation will run automatically when you select a scenario
              </p>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded-lg">
              <p className="text-sm text-white/70">
                Select a scenario from the left to simulate its impact
              </p>
            </div>
          )}

          {/* Map */}
          <ImpactMapLeaflet />
        </div>
      </div>

      {/* Bottom Section - Full Width Results */}
      {simulationStep === 'results' && (
        <div className="w-full">
          <ResultsDashboard />
        </div>
      )}
    </div>
  );
}
