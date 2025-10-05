import { useSimulationStore } from '../store/useSimulationStore';

interface HeaderProps {
  apiHealth: 'checking' | 'healthy' | 'error';
}

export default function Header({ apiHealth }: HeaderProps) {
  const { viewMode, setViewMode, resetSimulation } = useSimulationStore();

  const healthStatus = {
    checking: { color: 'bg-yellow-500', text: 'Checking...' },
    healthy: { color: 'bg-green-500', text: 'Online' },
    error: { color: 'bg-red-500', text: 'Offline' },
  };

  return (
    <header className="bg-white/5 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="text-3xl">☄️</div>
            <div>
              <h1 className="text-xl font-bold text-white">
                Asteroid Impact Simulator
              </h1>
              <p className="text-xs text-white/60">NASA Space Apps Challenge 2025</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex gap-1">
            <NavButton
              active={viewMode === 'simulation'}
              onClick={() => setViewMode('simulation')}
            >
              Simulation
            </NavButton>
            <NavButton
              active={viewMode === '3d'}
              onClick={() => setViewMode('3d')}
            >
              3D Trajectory
            </NavButton>
            <NavButton
              active={viewMode === 'scenario'}
              onClick={() => setViewMode('scenario')}
            >
              Scenarios
            </NavButton>
            <NavButton
              active={viewMode === 'mitigation'}
              onClick={() => setViewMode('mitigation')}
            >
              Mitigation
            </NavButton>
            <NavButton
              active={viewMode === 'education'}
              onClick={() => setViewMode('education')}
            >
              Learn
            </NavButton>
            <NavButton
              active={viewMode === 'game'}
              onClick={() => setViewMode('game')}
            >
              Game
            </NavButton>
          </nav>

          {/* Status & Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${healthStatus[apiHealth].color}`} />
              <span className="hidden sm:inline text-white/70 text-xs">
                {healthStatus[apiHealth].text}
              </span>
            </div>
            <button
              onClick={resetSimulation}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors text-white"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-blue-500 text-white'
          : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
