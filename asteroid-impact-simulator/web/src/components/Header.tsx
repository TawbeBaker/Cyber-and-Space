import { useState } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';

interface HeaderProps {
  apiHealth: 'checking' | 'healthy' | 'error';
}

export default function Header({ apiHealth }: HeaderProps) {
  const { viewMode, setViewMode, resetSimulation } = useSimulationStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const healthStatus = {
    checking: { color: 'bg-yellow-500', text: 'Checking...' },
    healthy: { color: 'bg-green-500', text: 'Online' },
    error: { color: 'bg-red-500', text: 'Offline' },
  };

  const handleNavClick = (mode: typeof viewMode) => {
    setViewMode(mode);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-white/5 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="text-2xl">☄️</div>
            <div>
              <h1 className="text-base md:text-xl font-bold text-white">
                Asteroid Impact Simulator
              </h1>
              <p className="text-xs text-white/60 hidden sm:block">NASA Space Apps Challenge 2025</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex gap-1">
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
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${healthStatus[apiHealth].color}`} />
              <span className="hidden sm:inline text-white/70 text-xs">
                {healthStatus[apiHealth].text}
              </span>
            </div>
            <button
              onClick={resetSimulation}
              className="hidden sm:block px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors text-white"
            >
              Reset
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <nav className="lg:hidden mt-4 pb-2 border-t border-white/10 pt-4">
            <div className="flex flex-col gap-2">
              <MobileNavButton
                active={viewMode === 'simulation'}
                onClick={() => handleNavClick('simulation')}
              >
                🎯 Simulation
              </MobileNavButton>
              <MobileNavButton
                active={viewMode === '3d'}
                onClick={() => handleNavClick('3d')}
              >
                🌌 3D Trajectory
              </MobileNavButton>
              <MobileNavButton
                active={viewMode === 'scenario'}
                onClick={() => handleNavClick('scenario')}
              >
                📋 Scenarios
              </MobileNavButton>
              <MobileNavButton
                active={viewMode === 'mitigation'}
                onClick={() => handleNavClick('mitigation')}
              >
                🛡️ Mitigation
              </MobileNavButton>
              <MobileNavButton
                active={viewMode === 'education'}
                onClick={() => handleNavClick('education')}
              >
                🎓 Learn
              </MobileNavButton>
              <MobileNavButton
                active={viewMode === 'game'}
                onClick={() => handleNavClick('game')}
              >
                🎮 Game
              </MobileNavButton>
              <button
                onClick={() => {
                  resetSimulation();
                  setMobileMenuOpen(false);
                }}
                className="w-full px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors text-white text-left"
              >
                🔄 Reset
              </button>
            </div>
          </nav>
        )}
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

function MobileNavButton({
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
      className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
        active
          ? 'bg-blue-500 text-white'
          : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
