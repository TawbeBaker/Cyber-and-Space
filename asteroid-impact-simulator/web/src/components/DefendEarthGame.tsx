import React, { useState, useEffect } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import { simulationAPI } from '../services/api';

interface GameState {
  level: number;
  score: number;
  lives: number;
  timeRemaining: number;
  currentThreat: ThreatData | null;
  gameStatus: 'menu' | 'playing' | 'success' | 'failed' | 'gameover';
}

interface ThreatData {
  name: string;
  diameter: number;
  velocity: number;
  warningTime: number; // days
  difficulty: 'easy' | 'medium' | 'hard';
  minDeltaV: number; // m/s required for deflection
}

const THREAT_SCENARIOS: ThreatData[] = [
  // Level 1 - Easy
  {
    name: 'Small Rocky Fragment',
    diameter: 50,
    velocity: 15,
    warningTime: 18250, // 50 years
    difficulty: 'easy',
    minDeltaV: 0.5
  },
  // Level 2 - Easy
  {
    name: 'Chelyabinsk-Type',
    diameter: 20,
    velocity: 19,
    warningTime: 10950, // 30 years
    difficulty: 'easy',
    minDeltaV: 0.3
  },
  // Level 3 - Medium
  {
    name: 'City Destroyer',
    diameter: 100,
    velocity: 20,
    warningTime: 7300, // 20 years
    difficulty: 'medium',
    minDeltaV: 1.2
  },
  // Level 4 - Medium
  {
    name: 'Regional Threat',
    diameter: 200,
    velocity: 25,
    warningTime: 5475, // 15 years
    difficulty: 'medium',
    minDeltaV: 2.5
  },
  // Level 5 - Hard
  {
    name: 'Continental Hazard',
    diameter: 500,
    velocity: 30,
    warningTime: 3650, // 10 years
    difficulty: 'hard',
    minDeltaV: 8.0
  },
  // Level 6 - Hard
  {
    name: 'Global Killer',
    diameter: 1000,
    velocity: 35,
    warningTime: 1825, // 5 years
    difficulty: 'hard',
    minDeltaV: 15.0
  }
];

export default function DefendEarthGame() {
  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    score: 0,
    lives: 3,
    timeRemaining: 60,
    currentThreat: null,
    gameStatus: 'menu'
  });

  const [selectedMethod, setSelectedMethod] = useState<'kinetic' | 'gravity' | 'nuclear'>('kinetic');
  const [warningYears, setWarningYears] = useState(10);
  const [isCalculating, setIsCalculating] = useState(false);
  const [deflectionResult, setDeflectionResult] = useState<any>(null);

  // Timer countdown
  useEffect(() => {
    if (gameState.gameStatus === 'playing' && gameState.timeRemaining > 0) {
      const timer = setInterval(() => {
        setGameState(prev => ({
          ...prev,
          timeRemaining: Math.max(0, prev.timeRemaining - 1)
        }));
      }, 1000);

      return () => clearInterval(timer);
    } else if (gameState.gameStatus === 'playing' && gameState.timeRemaining === 0) {
      // Time's up - lose a life
      handleFailure();
    }
  }, [gameState.gameStatus, gameState.timeRemaining]);

  const startGame = () => {
    setGameState({
      level: 1,
      score: 0,
      lives: 3,
      timeRemaining: 60,
      currentThreat: THREAT_SCENARIOS[0],
      gameStatus: 'playing'
    });
    setDeflectionResult(null);
  };

  const nextLevel = () => {
    const nextLevelNum = gameState.level + 1;

    if (nextLevelNum > THREAT_SCENARIOS.length) {
      // Game won!
      setGameState(prev => ({
        ...prev,
        gameStatus: 'success'
      }));
      return;
    }

    setGameState(prev => ({
      ...prev,
      level: nextLevelNum,
      currentThreat: THREAT_SCENARIOS[nextLevelNum - 1],
      timeRemaining: Math.max(30, 60 - (nextLevelNum * 5)), // Less time each level
      gameStatus: 'playing'
    }));
    setDeflectionResult(null);
  };

  const handleFailure = () => {
    const newLives = gameState.lives - 1;

    if (newLives === 0) {
      setGameState(prev => ({
        ...prev,
        lives: 0,
        gameStatus: 'gameover'
      }));
    } else {
      setGameState(prev => ({
        ...prev,
        lives: newLives,
        timeRemaining: 60
      }));
      setDeflectionResult(null);
    }
  };

  const attemptDeflection = async () => {
    if (!gameState.currentThreat) return;

    setIsCalculating(true);

    try {
      const result = await simulationAPI.simulateDeflection({
        asteroidDiameter: gameState.currentThreat.diameter,
        asteroidDensity: 3000,
        warningTime: warningYears * 365,
        missDistance: 100000,
        method: selectedMethod
      });

      setDeflectionResult(result);

      // Check if deflection succeeded
      const requiredDeltaV = gameState.currentThreat.minDeltaV;
      const achievedDeltaV = result.requiredDeltaV / 1000; // Convert m/s to km/s

      if (result.successProbability >= 70 && achievedDeltaV >= requiredDeltaV) {
        // Success!
        const timeBonus = gameState.timeRemaining * 10;
        const methodBonus = selectedMethod === 'gravity' ? 50 : selectedMethod === 'nuclear' ? 20 : 30;
        const levelScore = 100 + timeBonus + methodBonus;

        setGameState(prev => ({
          ...prev,
          score: prev.score + levelScore,
          gameStatus: 'success'
        }));
      } else {
        // Failed - lose a life
        handleFailure();
      }
    } catch (error) {
      console.error('Deflection calculation failed:', error);
      setGameState(prev => ({
        ...prev,
        gameStatus: 'failed'
      }));
    } finally {
      setIsCalculating(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-red-400';
      default: return 'text-white';
    }
  };

  return (
    <div className="card max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-2">🛡️ Defend Earth: Asteroid Defense Challenge</h2>
        <p className="text-white/70">
          Choose the right deflection strategy to save humanity!
        </p>
      </div>

      {/* Game Stats Bar */}
      {gameState.gameStatus === 'playing' && (
        <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
          <div>
            <div className="text-xs text-white/60">Level</div>
            <div className="text-2xl font-bold text-blue-400">{gameState.level}</div>
          </div>
          <div>
            <div className="text-xs text-white/60">Score</div>
            <div className="text-2xl font-bold text-yellow-400">{gameState.score}</div>
          </div>
          <div>
            <div className="text-xs text-white/60">Lives</div>
            <div className="text-2xl font-bold text-red-400">
              {'❤️'.repeat(gameState.lives)}
            </div>
          </div>
          <div>
            <div className="text-xs text-white/60">Time</div>
            <div className={`text-2xl font-bold ${gameState.timeRemaining < 20 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
              {gameState.timeRemaining}s
            </div>
          </div>
        </div>
      )}

      {/* Menu Screen */}
      {gameState.gameStatus === 'menu' && (
        <div className="text-center py-12">
          <div className="text-6xl mb-6">🌍</div>
          <h3 className="text-2xl font-bold mb-4">Protect Earth from Asteroid Impacts!</h3>
          <p className="text-white/70 mb-8 max-w-md mx-auto">
            You are the head of planetary defense. Select the right deflection method and timing
            to prevent catastrophic impacts. Each level gets harder with larger asteroids and less warning time.
          </p>
          <button
            onClick={startGame}
            className="px-8 py-4 bg-blue-500 hover:bg-blue-600 rounded-lg text-lg font-bold transition-all transform hover:scale-105"
          >
            🚀 Start Mission
          </button>

          <div className="mt-8 grid grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="text-green-400 font-bold mb-2">Levels 1-2: Easy</div>
              <div className="text-white/60">Small asteroids, long warning time</div>
            </div>
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="text-yellow-400 font-bold mb-2">Levels 3-4: Medium</div>
              <div className="text-white/60">City-killer threats</div>
            </div>
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="text-red-400 font-bold mb-2">Levels 5-6: Hard</div>
              <div className="text-white/60">Global extinction events</div>
            </div>
          </div>
        </div>
      )}

      {/* Playing Screen */}
      {gameState.gameStatus === 'playing' && gameState.currentThreat && (
        <div className="space-y-6">
          {/* Threat Info */}
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-red-400 mb-2">
                  ⚠️ Incoming Threat: {gameState.currentThreat.name}
                </h3>
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(gameState.currentThreat.difficulty)} bg-white/10`}>
                  {gameState.currentThreat.difficulty.toUpperCase()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-white/60">Diameter:</span>
                <span className="ml-2 font-bold">{gameState.currentThreat.diameter}m</span>
              </div>
              <div>
                <span className="text-white/60">Velocity:</span>
                <span className="ml-2 font-bold">{gameState.currentThreat.velocity} km/s</span>
              </div>
              <div>
                <span className="text-white/60">Warning Time:</span>
                <span className="ml-2 font-bold">{(gameState.currentThreat.warningTime / 365).toFixed(0)} years</span>
              </div>
            </div>
          </div>

          {/* Deflection Controls */}
          <div className="p-6 bg-white/5 rounded-lg border border-white/10">
            <h4 className="font-bold mb-4">Select Deflection Strategy:</h4>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <button
                onClick={() => setSelectedMethod('kinetic')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedMethod === 'kinetic'
                    ? 'border-blue-500 bg-blue-500/20'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="text-2xl mb-2">🎯</div>
                <div className="font-bold text-sm">Kinetic Impactor</div>
                <div className="text-xs text-white/60 mt-1">Fast & proven</div>
              </button>

              <button
                onClick={() => setSelectedMethod('gravity')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedMethod === 'gravity'
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="text-2xl mb-2">🛸</div>
                <div className="font-bold text-sm">Gravity Tractor</div>
                <div className="text-xs text-white/60 mt-1">Gentle & precise</div>
              </button>

              <button
                onClick={() => setSelectedMethod('nuclear')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedMethod === 'nuclear'
                    ? 'border-orange-500 bg-orange-500/20'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="text-2xl mb-2">☢️</div>
                <div className="font-bold text-sm">Nuclear</div>
                <div className="text-xs text-white/60 mt-1">Maximum power</div>
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Mission Lead Time: {warningYears} years
              </label>
              <input
                type="range"
                min="1"
                max={Math.min(50, gameState.currentThreat.warningTime / 365)}
                value={warningYears}
                onChange={(e) => setWarningYears(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <button
              onClick={attemptDeflection}
              disabled={isCalculating}
              className="w-full py-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 rounded-lg font-bold text-lg transition-all transform hover:scale-105 disabled:scale-100"
            >
              {isCalculating ? '⏳ Calculating...' : '🚀 Launch Deflection Mission'}
            </button>
          </div>

          {/* Results */}
          {deflectionResult && (
            <div className={`p-6 rounded-lg border-2 ${
              deflectionResult.successProbability >= 70
                ? 'bg-green-500/10 border-green-500/50'
                : 'bg-red-500/10 border-red-500/50'
            }`}>
              <h4 className="font-bold mb-3">Mission Results:</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-white/60">Success Probability:</span>
                  <span className="ml-2 font-bold">{deflectionResult.successProbability}%</span>
                </div>
                <div>
                  <span className="text-white/60">Required ΔV:</span>
                  <span className="ml-2 font-bold">{(deflectionResult.requiredDeltaV / 1000).toFixed(2)} km/s</span>
                </div>
                <div>
                  <span className="text-white/60">Feasibility:</span>
                  <span className="ml-2 font-bold">{deflectionResult.feasible ? '✅ Feasible' : '❌ Not Feasible'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Success Screen */}
      {gameState.gameStatus === 'success' && gameState.level <= THREAT_SCENARIOS.length && (
        <div className="text-center py-12">
          <div className="text-6xl mb-6">🎉</div>
          <h3 className="text-3xl font-bold text-green-400 mb-4">Level Complete!</h3>
          <p className="text-white/70 mb-8">
            You successfully deflected the asteroid and saved millions of lives!
          </p>
          <button
            onClick={nextLevel}
            className="px-8 py-4 bg-blue-500 hover:bg-blue-600 rounded-lg text-lg font-bold transition-all"
          >
            Next Level →
          </button>
        </div>
      )}

      {/* Game Won */}
      {gameState.gameStatus === 'success' && gameState.level > THREAT_SCENARIOS.length && (
        <div className="text-center py-12">
          <div className="text-6xl mb-6">🏆</div>
          <h3 className="text-3xl font-bold text-yellow-400 mb-4">Mission Complete!</h3>
          <p className="text-white/70 mb-4">
            You've mastered planetary defense and saved Earth from all threats!
          </p>
          <div className="text-4xl font-bold text-green-400 mb-8">
            Final Score: {gameState.score}
          </div>
          <button
            onClick={startGame}
            className="px-8 py-4 bg-blue-500 hover:bg-blue-600 rounded-lg text-lg font-bold transition-all"
          >
            Play Again
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState.gameStatus === 'gameover' && (
        <div className="text-center py-12">
          <div className="text-6xl mb-6">💥</div>
          <h3 className="text-3xl font-bold text-red-400 mb-4">Game Over</h3>
          <p className="text-white/70 mb-4">
            The asteroid impacted Earth. Better luck next time!
          </p>
          <div className="text-2xl font-bold mb-8">
            Score: {gameState.score}
          </div>
          <button
            onClick={startGame}
            className="px-8 py-4 bg-blue-500 hover:bg-blue-600 rounded-lg text-lg font-bold transition-all"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
