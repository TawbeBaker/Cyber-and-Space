// Asteroid types
export interface AsteroidParams {
  diameter: number; // meters
  velocity: number; // km/s
  angle: number; // degrees
  density: number; // kg/m³
  composition: 'rocky' | 'iron' | 'icy';
}

export interface ImpactLocation {
  lat: number;
  lon: number;
  isOcean?: boolean;
  depth?: number;
}

// Simulation result types
export interface SimulationResult {
  asteroidProperties: {
    diameter: number;
    mass: number;
    velocity: number;
    density: number;
    angle: number;
  };
  energy: {
    joules: number;
    tntTons: number;
    megatons: number;
  };
  crater: {
    diameter: number;
    depth: number;
    volume: number;
  } | null;
  seismic: {
    magnitude: number;
    description: string;
    radiusKm: number;
  };
  blast: {
    fireball: number;
    radiationRadius: number;
    airblastRadius: number;
    thermalRadius: number;
  };
  tsunami: {
    initialWaveHeight: number;
    wavelength: number;
    propagationSpeed: number;
    speedKmh: number;
    affectedRadiusKm: number;
  } | null;
  casualties: {
    estimatedCasualties: number;
    estimatedInjured: number;
    totalAffected: number;
    severity: string;
    zones: {
      [key: string]: {
        radius: number;
        area: number;
        populationAffected: number;
        casualties: number;
        injured: number;
        mortalityRate: number;
        description: string;
        affectedCities?: Array<{
          name: string;
          distance: number;
          population: number;
          affectedPopulation: number;
          overlapFactor: number;
        }>;
      };
    };
    affectedCities?: Array<{
      name: string;
      distance: number;
      population: number;
      affectedPopulation: number;
    }>;
    note: string;
  };
  impactLocation: ImpactLocation;
}

export interface ZoneAnalysis {
  impactPoint: {
    latitude: number;
    longitude: number;
    elevation: number;
    isOcean: boolean;
    waterDepth: number;
    terrainType: string;
  };
  terrainAnalysis: {
    averageElevation: number;
    elevationRange: number;
    terrainRoughness: string;
    coastalProximity: string;
    oceanPercentage: number;
  };
  historicalSeismicity: {
    eventCount: number;
    maxMagnitude: number;
    tsunamiHistory: number;
  };
  populationRisk: string;
  tsunamiRisk: {
    risk: string;
    reason: string;
  };
}

export interface DeflectionResult {
  method: string;
  description: string;
  requiredDeltaV: number;
  impactorMass: number;
  feasible: boolean;
  warningTimeNeeded: number;
  successProbability: number;
}

// NASA NEO types
export interface NeoData {
  id: string;
  name: string;
  designation: string;
  isPotentiallyHazardous: boolean;
  closeApproachDate: string;
  estimatedDiameter: {
    min: number;
    max: number;
    average: number;
  };
  relativeVelocity: {
    kmPerSecond: number;
    kmPerHour: number;
  };
  missDistance: {
    astronomical: number;
    lunar: number;
    kilometers: number;
  };
  absoluteMagnitude?: number;
  orbitalData?: {
    semiMajorAxis: number;
    eccentricity: number;
    inclination: number;
    longitudeOfAscendingNode: number;
    argumentOfPeriapsis: number;
    trueAnomaly: number;
  };
}

export interface SampleAsteroid {
  name: string;
  diameter: number;
  velocity: number;
  description: string;
}

// UI State types
export type ViewMode = 'simulation' | 'scenario' | 'education' | 'mitigation' | 'game' | '3d';
export type SimulationStep = 'parameters' | 'location' | 'results' | 'mitigation';
