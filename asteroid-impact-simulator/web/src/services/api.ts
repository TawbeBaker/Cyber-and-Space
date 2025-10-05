import axios from 'axios';
import type {
  AsteroidParams,
  ImpactLocation,
  SimulationResult,
  ZoneAnalysis,
  DeflectionResult,
  NeoData,
  SampleAsteroid,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7071';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    throw error;
  }
);

export const simulationAPI = {
  /**
   * Simulate asteroid impact
   */
  async simulateImpact(
    params: AsteroidParams,
    location: ImpactLocation
  ): Promise<{ simulation: SimulationResult; zoneAnalysis: ZoneAnalysis }> {
    const response = await api.post('/api/simulate/impact', {
      diameter: params.diameter,
      velocity: params.velocity,
      angle: params.angle,
      density: params.density,
      impactLocation: location,
    });
    return response.data;
  },

  /**
   * Simulate deflection strategy
   */
  async simulateDeflection(
    asteroidDiameter: number,
    asteroidDensity: number,
    warningTime: number,
    missDistance: number,
    method: 'kinetic' | 'gravity' | 'nuclear'
  ): Promise<DeflectionResult> {
    const response = await api.post('/api/simulate/deflection', {
      asteroidDiameter,
      asteroidDensity,
      warningTime,
      missDistance,
      method,
    });
    return response.data.deflection;
  },
};

export const neoAPI = {
  /**
   * Get NEO feed
   */
  async getNEOFeed(startDate?: string, endDate?: string): Promise<any> {
    const response = await api.get('/api/neo/feed', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },

  /**
   * Get specific asteroid by ID
   */
  async getAsteroidById(id: string): Promise<NeoData> {
    const response = await api.get(`/api/neo/asteroid/${id}`);
    return response.data;
  },

  /**
   * Get close approach events
   */
  async getCloseApproaches(
    dateMin?: string,
    dateMax?: string,
    distMax?: number
  ): Promise<any[]> {
    const response = await api.get('/api/neo/close-approaches', {
      params: { date_min: dateMin, date_max: dateMax, dist_max: distMax },
    });
    return response.data.data;
  },

  /**
   * Get potentially hazardous asteroids
   */
  async getPotentiallyHazardous(): Promise<NeoData[]> {
    const response = await api.get('/api/neo/potentially-hazardous');
    return response.data.data;
  },

  /**
   * Get Impactor-2025 scenario
   */
  async getImpactor2025(): Promise<NeoData> {
    const response = await api.get('/api/neo/impactor-2025');
    return response.data;
  },

  /**
   * Get sample asteroids
   */
  async getSampleAsteroids(): Promise<SampleAsteroid[]> {
    const response = await api.get('/api/neo/samples');
    return response.data.data;
  },
};

export const usgsAPI = {
  /**
   * Get elevation at coordinates
   */
  async getElevation(lat: number, lon: number): Promise<any> {
    const response = await api.get('/api/usgs/elevation', {
      params: { lat, lon },
    });
    return response.data;
  },

  /**
   * Get earthquake data
   */
  async getEarthquakes(
    lat?: number,
    lon?: number,
    radius?: number,
    minMagnitude?: number
  ): Promise<any> {
    const response = await api.get('/api/usgs/earthquakes', {
      params: {
        lat,
        lon,
        radius,
        min_magnitude: minMagnitude,
      },
    });
    return response.data;
  },

  /**
   * Analyze impact zone
   */
  async analyzeZone(
    lat: number,
    lon: number,
    radiusKm?: number
  ): Promise<ZoneAnalysis> {
    const response = await api.post('/api/usgs/analyze-zone', {
      lat,
      lon,
      radiusKm,
    });
    return response.data;
  },
};

export const healthAPI = {
  /**
   * Check API health
   */
  async checkHealth(): Promise<any> {
    const response = await api.get('/api/health');
    return response.data;
  },
};

export default api;
