import { useState, useEffect } from 'react';
import { useSimulationStore } from './store/useSimulationStore';
import { healthAPI } from './services/api';
import Header from './components/Header';
import ParameterPanel from './components/ParameterPanel';
import ImpactMapLeaflet from './components/ImpactMapLeaflet';
import ResultsDashboard from './components/ResultsDashboard';
import LoadingScreen from './components/LoadingScreen';
import ErrorBanner from './components/ErrorBanner';
import MitigationPanel from './components/MitigationPanel';
import EducationalTooltips from './components/EducationalTooltips';
import DefendEarthGame from './components/DefendEarthGame';
import ScenarioSelector from './components/ScenarioSelector';
import Simulation3D from './components/Simulation3D';

function App() {
  const [apiHealth, setApiHealth] = useState<'checking' | 'healthy' | 'error'>('checking');
  const { viewMode, simulationStep, isLoading, error } = useSimulationStore();

  useEffect(() => {
    // Check API health on mount
    healthAPI
      .checkHealth()
      .then(() => setApiHealth('healthy'))
      .catch(() => setApiHealth('error'));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <Header apiHealth={apiHealth} />

      {error && <ErrorBanner message={error} />}

      {isLoading && <LoadingScreen />}

      <main>
        {/* Show different views based on viewMode */}
        {viewMode === 'scenario' ? (
          <div className="container mx-auto px-4 py-6">
            <ScenarioSelector />
          </div>
        ) : viewMode === 'mitigation' ? (
          <div className="container mx-auto px-4 py-6">
            <MitigationPanel />
          </div>
        ) : viewMode === 'education' ? (
          <div className="container mx-auto px-4 py-6">
            <EducationalTooltips />
          </div>
        ) : viewMode === 'game' ? (
          <div className="container mx-auto px-4 py-6">
            <DefendEarthGame />
          </div>
        ) : viewMode === '3d' ? (
          <div className="container mx-auto px-4 py-6">
            <Simulation3D />
          </div>
        ) : viewMode === 'simulation' ? (
          <div className="container mx-auto px-4 py-6">
            {/* Top Section - Parameters and Map */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Left Panel - Parameters */}
              <div className="lg:col-span-1">
                <ParameterPanel />
              </div>

              {/* Right Panel - Map */}
              <div className="lg:col-span-2">
                <div className="glass-card">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-white">
                    <span>🌍</span> Impact Location
                  </h2>
                  <ImpactMapLeaflet />
                </div>
              </div>
            </div>

            {/* Bottom Section - Full Width Results */}
            {simulationStep === 'results' && (
              <div className="w-full">
                <ResultsDashboard />
              </div>
            )}
          </div>
        ) : null}
      </main>

    </div>
  );
}

export default App;
