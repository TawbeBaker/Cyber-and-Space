/**
 * NASA Asteroid Data Loader
 * Loads and processes the 200 closest asteroids from Luis's dataset
 */

import { dateToJulian } from '../utils/orbitalMechanics';

const AU = 149597870.7; // Astronomical Unit in km

export interface NASAAsteroidRaw {
  id: string;
  name: string;
  full_name: string;
  is_potentially_hazardous_asteroid: boolean;
  absolute_magnitude_h: number;
  estimated_diameter: {
    kilometers: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
  };
  orbital_data: {
    orbit_id: string;
    epoch_osculation: number;
    eccentricity: string;
    semi_major_axis: string;
    inclination: string;
    ascending_node_longitude: string;
    perihelion_argument: string;
    mean_anomaly: string;
    mean_motion: string;
    orbit_class: {
      orbit_class_type: string;
    };
  };
  close_approach_data: Array<{
    close_approach_date: string;
    close_approach_date_full: string;
    relative_velocity: {
      kilometers_per_second: string;
      kilometers_per_hour: string;
    };
    miss_distance: {
      astronomical: string;
      kilometers: string;
      lunar: string;
    };
    orbiting_body: string;
  }>;
}

export interface OrbitalElements {
  a: number; // Semi-major axis (km)
  e: number; // Eccentricity
  i: number; // Inclination (radians)
  Omega: number; // Longitude of ascending node (radians)
  omega: number; // Argument of perihelion (radians)
  M0: number; // Mean anomaly at epoch (radians)
  n: number; // Mean motion (radians/second)
  epoch: number; // Epoch (Julian date)
}

export interface ProcessedAsteroid {
  id: string;
  name: string;
  fullName: string;
  isHazardous: boolean;
  magnitude: number;
  diameter: {
    min: number;
    max: number;
    avg: number;
  };
  elements: OrbitalElements;
  orbitClass: string;
  closeApproaches: Array<{
    date: Date;
    julianDate: number;
    velocity: number; // km/s
    distance: number; // km
    distanceAU: number;
  }>;
  // For sorting/filtering
  closestDistance: number; // km
  closestDistanceAU: number;
}

/**
 * Process raw NASA asteroid data into usable format
 */
export function processNASAAsteroid(raw: NASAAsteroidRaw): ProcessedAsteroid {
  const orbital = raw.orbital_data;

  // Convert orbital elements to proper units
  const elements: OrbitalElements = {
    a: parseFloat(orbital.semi_major_axis) * AU, // Convert AU to km
    e: parseFloat(orbital.eccentricity),
    i: (parseFloat(orbital.inclination) * Math.PI) / 180, // Convert deg to rad
    Omega: (parseFloat(orbital.ascending_node_longitude) * Math.PI) / 180,
    omega: (parseFloat(orbital.perihelion_argument) * Math.PI) / 180,
    M0: (parseFloat(orbital.mean_anomaly) * Math.PI) / 180,
    n: ((parseFloat(orbital.mean_motion) * Math.PI) / 180) / 86400, // Convert deg/day to rad/s
    epoch: orbital.epoch_osculation,
  };

  // Process close approaches
  const closeApproaches = raw.close_approach_data
    .filter((ca) => ca.orbiting_body === 'Earth')
    .map((ca) => ({
      date: new Date(ca.close_approach_date_full),
      julianDate: dateToJulian(new Date(ca.close_approach_date_full)),
      velocity: parseFloat(ca.relative_velocity.kilometers_per_second),
      distance: parseFloat(ca.miss_distance.kilometers),
      distanceAU: parseFloat(ca.miss_distance.astronomical),
    }));

  // Find closest approach
  const closestApproach = closeApproaches.reduce((min, ca) =>
    ca.distance < min.distance ? ca : min
  , closeApproaches[0]);

  return {
    id: raw.id,
    name: raw.name,
    fullName: raw.full_name,
    isHazardous: raw.is_potentially_hazardous_asteroid,
    magnitude: raw.absolute_magnitude_h,
    diameter: {
      min: raw.estimated_diameter.kilometers.estimated_diameter_min,
      max: raw.estimated_diameter.kilometers.estimated_diameter_max,
      avg:
        (raw.estimated_diameter.kilometers.estimated_diameter_min +
          raw.estimated_diameter.kilometers.estimated_diameter_max) / 2,
    },
    elements,
    orbitClass: orbital.orbit_class.orbit_class_type,
    closeApproaches,
    closestDistance: closestApproach?.distance || Infinity,
    closestDistanceAU: closestApproach?.distanceAU || Infinity,
  };
}

/**
 * Load all asteroid data from JSON file
 */
export async function loadAsteroidData(): Promise<ProcessedAsteroid[]> {
  try {
    const response = await fetch('/data/asteroids.json');
    const data = await response.json();

    const asteroids = data.asteroids.map(processNASAAsteroid);

    // Sort by closest distance
    asteroids.sort((a, b) => a.closestDistance - b.closestDistance);

    console.log(`✅ Loaded ${asteroids.length} asteroids from NASA data`);
    return asteroids;
  } catch (error) {
    console.error('❌ Failed to load asteroid data:', error);
    return [];
  }
}

/**
 * Filter asteroids by various criteria
 */
export function filterAsteroids(
  asteroids: ProcessedAsteroid[],
  options: {
    limit?: number;
    hazardousOnly?: boolean;
    searchQuery?: string;
    minDistance?: number; // km
    maxDistance?: number; // km
  }
): ProcessedAsteroid[] {
  let filtered = [...asteroids];

  // Filter by hazardous status
  if (options.hazardousOnly) {
    filtered = filtered.filter((a) => a.isHazardous);
  }

  // Filter by distance range
  if (options.minDistance !== undefined) {
    filtered = filtered.filter((a) => a.closestDistance >= options.minDistance!);
  }
  if (options.maxDistance !== undefined) {
    filtered = filtered.filter((a) => a.closestDistance <= options.maxDistance!);
  }

  // Filter by search query
  if (options.searchQuery) {
    const query = options.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.name.toLowerCase().includes(query) ||
        a.id.toLowerCase().includes(query) ||
        a.fullName.toLowerCase().includes(query)
    );
  }

  // Apply limit
  if (options.limit !== undefined) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered;
}

/**
 * Get asteroid statistics
 */
export function getAsteroidStats(asteroids: ProcessedAsteroid[]) {
  return {
    total: asteroids.length,
    hazardous: asteroids.filter((a) => a.isHazardous).length,
    closestDistance: Math.min(...asteroids.map((a) => a.closestDistance)),
    farthestDistance: Math.max(...asteroids.map((a) => a.closestDistance)),
    averageDistance:
      asteroids.reduce((sum, a) => sum + a.closestDistance, 0) / asteroids.length,
    orbitClasses: [...new Set(asteroids.map((a) => a.orbitClass))],
  };
}
