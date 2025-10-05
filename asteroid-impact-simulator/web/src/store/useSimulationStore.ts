import { create } from 'zustand';
import type {
  AsteroidParams,
  ImpactLocation,
  SimulationResult,
  ZoneAnalysis,
  DeflectionResult,
  ViewMode,
  SimulationStep,
} from '../types';

interface SimulationStore {
  // Asteroid parameters
  asteroidParams: AsteroidParams;
  setAsteroidParams: (params: Partial<AsteroidParams>) => void;

  // Impact location
  impactLocation: ImpactLocation | null;
  setImpactLocation: (location: ImpactLocation) => void;

  // Simulation results
  simulationResult: SimulationResult | null;
  zoneAnalysis: ZoneAnalysis | null;
  deflectionResult: DeflectionResult | null;

  setSimulationResult: (result: SimulationResult, zone: ZoneAnalysis) => void;
  setDeflectionResult: (result: DeflectionResult) => void;

  // UI State
  viewMode: ViewMode;
  simulationStep: SimulationStep;
  isLoading: boolean;
  error: string | null;

  setViewMode: (mode: ViewMode) => void;
  setSimulationStep: (step: SimulationStep) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Actions
  resetSimulation: () => void;
}

const defaultAsteroidParams: AsteroidParams = {
  diameter: 100, // 100 meters
  velocity: 20, // 20 km/s
  angle: 45, // 45 degrees
  density: 3000, // 3000 kg/m³ (rocky)
  composition: 'rocky',
};

export const useSimulationStore = create<SimulationStore>((set) => ({
  // Initial state
  asteroidParams: defaultAsteroidParams,
  impactLocation: null,
  simulationResult: null,
  zoneAnalysis: null,
  deflectionResult: null,
  viewMode: 'simulation',
  simulationStep: 'parameters',
  isLoading: false,
  error: null,

  // Setters
  setAsteroidParams: (params) =>
    set((state) => ({
      asteroidParams: { ...state.asteroidParams, ...params },
    })),

  setImpactLocation: (location) =>
    set({ impactLocation: location }),

  setSimulationResult: (result, zone) =>
    set({
      simulationResult: result,
      zoneAnalysis: zone,
      simulationStep: 'results',
      isLoading: false,
    }),

  setDeflectionResult: (result) =>
    set({ deflectionResult: result }),

  setViewMode: (mode) =>
    set({ viewMode: mode }),

  setSimulationStep: (step) =>
    set({ simulationStep: step }),

  setLoading: (loading) =>
    set({ isLoading: loading }),

  setError: (error) =>
    set({ error, isLoading: false }),

  resetSimulation: () =>
    set({
      asteroidParams: defaultAsteroidParams,
      impactLocation: null,
      simulationResult: null,
      zoneAnalysis: null,
      deflectionResult: null,
      simulationStep: 'parameters',
      isLoading: false,
      error: null,
    }),
}));
