import { useState } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import { simulationAPI } from '../services/api';

type MitigationMethod = 'kinetic' | 'gravity' | 'nuclear';

interface MitigationParams {
  method: MitigationMethod;
  warningYears: number;
  impactorMass: number;
}

export default function MitigationPanel() {
  const { asteroidParams, deflectionResult, setDeflectionResult } = useSimulationStore();
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<MitigationMethod>('kinetic');
  const [warningYears, setWarningYears] = useState(10);
  const [impactorMass, setImpactorMass] = useState(500);

  const methods = {
    kinetic: {
      icon: '🚀',
      name: 'Kinetic Impactor',
      description: 'High-speed spacecraft collides with asteroid to change its velocity',
      example: 'NASA DART Mission (2022)',
      color: 'blue',
    },
    gravity: {
      icon: '🛸',
      name: 'Gravity Tractor',
      description: 'Spacecraft uses gravitational pull to slowly alter asteroid orbit',
      example: 'Proposed for long-term deflection',
      color: 'purple',
    },
    nuclear: {
      icon: '☢️',
      name: 'Nuclear Deflection',
      description: 'Nuclear explosion near asteroid surface to vaporize material and create thrust',
      example: 'Last resort for large threats',
      color: 'red',
    },
  };

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      const result = await simulationAPI.simulateDeflection({
        asteroidDiameter: asteroidParams.diameter,
        asteroidDensity: asteroidParams.density,
        warningTime: warningYears * 365, // Convert years to days
        missDistance: 100000, // Default 100,000 km miss distance
        method: selectedMethod,
      });
      setDeflectionResult(result);
    } catch (error) {
      console.error('Deflection simulation failed:', error);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <span>🛡️</span> Asteroid Deflection Strategies
        </h2>
        <p className="text-sm text-white/70">
          Simulate planetary defense methods to prevent asteroid impacts. Test different strategies
          and evaluate their effectiveness based on warning time and asteroid properties.
        </p>
      </div>

      {/* Method Selection */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4">Select Deflection Method</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(methods).map(([key, method]) => (
            <button
              key={key}
              onClick={() => setSelectedMethod(key as MitigationMethod)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedMethod === key
                  ? `border-${method.color}-500 bg-${method.color}-500/20 glow`
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="text-4xl mb-2">{method.icon}</div>
              <h4 className="font-semibold mb-1">{method.name}</h4>
              <p className="text-xs text-white/60 mb-2">{method.description}</p>
              <p className="text-xs text-white/40 italic">Example: {method.example}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Parameters */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4">Mission Parameters</h3>
        <div className="space-y-4">
          {/* Warning Time */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Warning Time: <span className="text-blue-400">{warningYears} years</span>
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={warningYears}
              onChange={(e) => setWarningYears(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-white/50 mt-1">
              <span>1 year</span>
              <span>50 years</span>
            </div>
          </div>

          {/* Impactor Mass (only for kinetic) */}
          {selectedMethod === 'kinetic' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Impactor Mass: <span className="text-blue-400">{impactorMass} kg</span>
              </label>
              <input
                type="range"
                min="100"
                max="10000"
                step="100"
                value={impactorMass}
                onChange={(e) => setImpactorMass(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-white/50 mt-1">
                <span>100 kg (Small probe)</span>
                <span>10,000 kg (Heavy spacecraft)</span>
              </div>
            </div>
          )}

          {/* Target Asteroid Info */}
          <div className="p-4 bg-white/5 rounded-lg">
            <h4 className="text-sm font-semibold mb-2">Target Asteroid Properties:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-white/60">Diameter:</span>
                <span className="ml-2 font-semibold">{asteroidParams.diameter} m</span>
              </div>
              <div>
                <span className="text-white/60">Velocity:</span>
                <span className="ml-2 font-semibold">{asteroidParams.velocity} km/s</span>
              </div>
              <div>
                <span className="text-white/60">Density:</span>
                <span className="ml-2 font-semibold">{asteroidParams.density} kg/m³</span>
              </div>
              <div>
                <span className="text-white/60">Type:</span>
                <span className="ml-2 font-semibold capitalize">{asteroidParams.composition}</span>
              </div>
            </div>
          </div>

          {/* Simulate Button */}
          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-500 disabled:to-gray-600 rounded-lg font-semibold transition-all glow"
          >
            {isSimulating ? '⏳ Simulating Deflection...' : '🚀 Simulate Deflection Mission'}
          </button>
        </div>
      </div>

      {/* Results */}
      {deflectionResult && (
        <div className="card">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>📊</span> Deflection Mission Results
          </h3>

          {/* Success Indicator */}
          <div
            className={`p-4 rounded-lg mb-4 ${
              deflectionResult.feasible
                ? 'bg-green-900/20 border border-green-500/30'
                : 'bg-red-900/20 border border-red-500/30'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="text-3xl">
                {deflectionResult.feasible ? '✅' : '❌'}
              </div>
              <div>
                <h4 className="font-semibold text-lg">
                  {deflectionResult.feasible ? 'Mission Feasible' : 'Mission Not Feasible'}
                </h4>
                <p className="text-sm text-white/70">{deflectionResult.description}</p>
              </div>
            </div>
          </div>

          {/* Mission Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 rounded-lg">
              <h5 className="text-sm font-semibold mb-2 text-white/80">Required Delta-V:</h5>
              <p className="text-2xl font-bold text-blue-400">
                {deflectionResult.requiredDeltaV.toFixed(3)} m/s
              </p>
              <p className="text-xs text-white/60 mt-1">Velocity change needed</p>
            </div>

            <div className="p-4 bg-white/5 rounded-lg">
              <h5 className="text-sm font-semibold mb-2 text-white/80">Success Probability:</h5>
              <p className="text-2xl font-bold text-green-400">
                {(deflectionResult.successProbability * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-white/60 mt-1">Based on current technology</p>
            </div>

            <div className="p-4 bg-white/5 rounded-lg">
              <h5 className="text-sm font-semibold mb-2 text-white/80">Required Warning Time:</h5>
              <p className="text-2xl font-bold text-yellow-400">
                {deflectionResult.warningTimeNeeded} years
              </p>
              <p className="text-xs text-white/60 mt-1">Minimum advance notice</p>
            </div>

            {selectedMethod === 'kinetic' && (
              <div className="p-4 bg-white/5 rounded-lg">
                <h5 className="text-sm font-semibold mb-2 text-white/80">Impactor Mass Used:</h5>
                <p className="text-2xl font-bold text-purple-400">
                  {deflectionResult.impactorMass.toLocaleString()} kg
                </p>
                <p className="text-xs text-white/60 mt-1">Spacecraft mass</p>
              </div>
            )}
          </div>

          {/* Recommendations */}
          <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <span>💡</span> Recommendations:
            </h5>
            <ul className="text-sm text-white/80 space-y-1">
              {deflectionResult.successProbability < 0.5 && (
                <li>⚠️ Low success probability - consider combining multiple methods</li>
              )}
              {warningYears < deflectionResult.warningTimeNeeded && (
                <li>⚠️ Insufficient warning time - increase detection capabilities</li>
              )}
              {deflectionResult.feasible && (
                <li>✅ Mission parameters are within acceptable ranges</li>
              )}
              {selectedMethod === 'kinetic' && impactorMass < 1000 && (
                <li>💡 Consider larger impactor mass for better effectiveness</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
