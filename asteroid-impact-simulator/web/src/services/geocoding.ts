/**
 * Geocoding service for reverse geocoding (lat/lon to location name)
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 */

interface NominatimResponse {
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    country?: string;
    state?: string;
    ocean?: string;
    sea?: string;
  };
}

/**
 * Get location name from latitude and longitude
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string> {
  try {
    // Normalize longitude to -180 to 180 range
    let normalizedLon = ((longitude + 180) % 360) - 180;

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${normalizedLon}&zoom=10&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AsteroidImpactSimulator/1.0',
      },
    });

    if (!response.ok) {
      return getOceanOrGenericLocation(latitude, normalizedLon);
    }

    const data: NominatimResponse = await response.json();

    if (data.display_name) {
      return data.display_name;
    }

    return getOceanOrGenericLocation(latitude, normalizedLon);
  } catch (error) {
    console.error('Geocoding error:', error);
    return getOceanOrGenericLocation(latitude, longitude);
  }
}

/**
 * Fallback for ocean or unknown locations
 */
function getOceanOrGenericLocation(lat: number, lon: number): string {
  // Major ocean regions
  const oceanRegions = [
    {
      name: 'Pacific Ocean',
      bounds: { latMin: -60, latMax: 60, lonMin: -180, lonMax: -70 },
    },
    {
      name: 'Atlantic Ocean',
      bounds: { latMin: -60, latMax: 60, lonMin: -70, lonMax: 20 },
    },
    {
      name: 'Indian Ocean',
      bounds: { latMin: -60, latMax: 30, lonMin: 20, lonMax: 120 },
    },
    {
      name: 'Arctic Ocean',
      bounds: { latMin: 60, latMax: 90, lonMin: -180, lonMax: 180 },
    },
    {
      name: 'Southern Ocean',
      bounds: { latMin: -90, latMax: -60, lonMin: -180, lonMax: 180 },
    },
  ];

  for (const ocean of oceanRegions) {
    if (
      lat >= ocean.bounds.latMin &&
      lat <= ocean.bounds.latMax &&
      lon >= ocean.bounds.lonMin &&
      lon <= ocean.bounds.lonMax
    ) {
      return ocean.name;
    }
  }

  return `Unknown location (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`;
}

/**
 * Get a more detailed description of the impact location
 */
export async function getImpactLocationDetails(
  latitude: number,
  longitude: number
): Promise<{
  name: string;
  isOcean: boolean;
  continent?: string;
  country?: string;
}> {
  try {
    const locationName = await reverseGeocode(latitude, longitude);

    // Check if it's an ocean location
    const isOcean =
      locationName.includes('Ocean') ||
      locationName.includes('Sea') ||
      locationName.includes('Gulf') ||
      locationName.includes('Bay');

    return {
      name: locationName,
      isOcean,
    };
  } catch (error) {
    console.error('Error getting location details:', error);
    return {
      name: `Location (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`,
      isOcean: false,
    };
  }
}
