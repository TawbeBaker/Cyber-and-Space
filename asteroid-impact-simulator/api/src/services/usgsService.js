const axios = require('axios');
const NodeCache = require('node-cache');

/**
 * USGS Data Integration Service
 * Elevation data and earthquake information
 */
class USGSService {
    constructor() {
        this.elevationAPI = process.env.USGS_ELEVATION_API || 'https://epqs.nationalmap.gov/v1';
        this.earthquakeAPI = process.env.USGS_EARTHQUAKE_API || 'https://earthquake.usgs.gov/fdsnws/event/1';
        this.cache = new NodeCache({ stdTTL: 7200 }); // 2 hour cache
    }

    /**
     * Get elevation at specific coordinates
     * @param {number} latitude
     * @param {number} longitude
     * @returns {Promise<Object>} Elevation data
     */
    async getElevation(latitude, longitude) {
        const cacheKey = `elevation_${latitude}_${longitude}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        try {
            const response = await axios.get(`${this.elevationAPI}/json`, {
                params: {
                    x: longitude,
                    y: latitude,
                    units: 'Meters',
                    output: 'json'
                }
            });

            const elevation = response.data.value;
            const isOcean = elevation <= 0;
            const waterDepth = isOcean ? Math.abs(elevation) : 0;

            const result = {
                latitude,
                longitude,
                elevation,
                isOcean,
                waterDepth,
                terrainType: this.classifyTerrain(elevation, isOcean)
            };

            this.cache.set(cacheKey, result);
            return result;
        } catch (error) {
            console.error(`Error fetching elevation for ${latitude}, ${longitude}:`, error.message);
            // Return approximate value if API fails
            return {
                latitude,
                longitude,
                elevation: 0,
                isOcean: false,
                waterDepth: 0,
                terrainType: 'unknown',
                error: 'API unavailable'
            };
        }
    }

    /**
     * Get elevations for multiple points (impact zone analysis)
     * @param {Array} coordinates - Array of {lat, lon} objects
     * @returns {Promise<Array>} Elevation data for all points
     */
    async getElevationBatch(coordinates) {
        const promises = coordinates.map(coord =>
            this.getElevation(coord.lat, coord.lon)
        );

        return Promise.all(promises);
    }

    /**
     * Classify terrain based on elevation
     * @private
     */
    classifyTerrain(elevation, isOcean) {
        if (isOcean) {
            const depth = Math.abs(elevation);
            if (depth < 200) return 'Shallow Ocean/Continental Shelf';
            if (depth < 1000) return 'Ocean';
            if (depth < 4000) return 'Deep Ocean';
            return 'Abyssal Ocean';
        } else {
            if (elevation < 100) return 'Lowland/Plains';
            if (elevation < 500) return 'Hills';
            if (elevation < 1500) return 'Mountains';
            if (elevation < 3000) return 'High Mountains';
            return 'Extreme Altitude';
        }
    }

    /**
     * Get historical earthquake data for a region
     * @param {Object} params - Query parameters
     * @returns {Promise<Object>} Earthquake catalog data
     */
    async getEarthquakes(params = {}) {
        const {
            minMagnitude = 5.0,
            maxMagnitude = 10.0,
            latitude = null,
            longitude = null,
            maxRadiusKm = 500,
            startTime = null,
            endTime = null,
            limit = 100
        } = params;

        const cacheKey = `earthquakes_${latitude}_${longitude}_${minMagnitude}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        try {
            const queryParams = {
                format: 'geojson',
                minmagnitude: minMagnitude,
                maxmagnitude: maxMagnitude,
                limit: limit
            };

            if (latitude && longitude) {
                queryParams.latitude = latitude;
                queryParams.longitude = longitude;
                queryParams.maxradiuskm = maxRadiusKm;
            }

            if (startTime) queryParams.starttime = startTime;
            if (endTime) queryParams.endtime = endTime;

            const response = await axios.get(`${this.earthquakeAPI}/query`, {
                params: queryParams
            });

            const formatted = this.formatEarthquakeData(response.data);
            this.cache.set(cacheKey, formatted);
            return formatted;
        } catch (error) {
            console.error('Error fetching earthquake data:', error.message);
            return {
                count: 0,
                events: [],
                error: 'API unavailable'
            };
        }
    }

    /**
     * Format earthquake data from USGS API
     * @private
     */
    formatEarthquakeData(data) {
        if (!data.features) return { count: 0, events: [] };

        const events = data.features.map(feature => ({
            id: feature.id,
            magnitude: feature.properties.mag,
            place: feature.properties.place,
            time: new Date(feature.properties.time),
            coordinates: {
                longitude: feature.geometry.coordinates[0],
                latitude: feature.geometry.coordinates[1],
                depth: feature.geometry.coordinates[2]
            },
            type: feature.properties.type,
            tsunami: feature.properties.tsunami === 1
        }));

        return {
            count: events.length,
            events: events
        };
    }

    /**
     * Analyze impact zone characteristics
     * @param {number} latitude - Impact latitude
     * @param {number} longitude - Impact longitude
     * @param {number} radiusKm - Analysis radius
     * @returns {Promise<Object>} Zone analysis
     */
    async analyzeImpactZone(latitude, longitude, radiusKm = 100) {
        const cacheKey = `zone_${latitude}_${longitude}_${radiusKm}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        // Get elevation at impact point
        const centerElevation = await this.getElevation(latitude, longitude);

        // Sample points around the impact zone (8 directions)
        const samplePoints = this.generateSamplePoints(latitude, longitude, radiusKm);
        const elevations = await this.getElevationBatch(samplePoints);

        // Analyze terrain
        const terrainAnalysis = this.analyzeTerrain(centerElevation, elevations);

        // Get historical seismic activity
        const earthquakes = await this.getEarthquakes({
            latitude,
            longitude,
            maxRadiusKm: radiusKm * 2,
            minMagnitude: 4.0
        });

        const result = {
            impactPoint: centerElevation,
            terrainAnalysis,
            historicalSeismicity: {
                eventCount: earthquakes.count,
                maxMagnitude: earthquakes.events.length > 0 ?
                    Math.max(...earthquakes.events.map(e => e.magnitude)) : 0,
                tsunamiHistory: earthquakes.events.filter(e => e.tsunami).length
            },
            populationRisk: this.estimatePopulationRisk(latitude, longitude, centerElevation.isOcean),
            tsunamiRisk: this.assessTsunamiRisk(centerElevation, elevations)
        };

        this.cache.set(cacheKey, result);
        return result;
    }

    /**
     * Generate sample points in a circle around center
     * @private
     */
    generateSamplePoints(lat, lon, radiusKm) {
        const points = [];
        const earthRadiusKm = 6371;

        // 8 cardinal and intercardinal directions
        for (let angle = 0; angle < 360; angle += 45) {
            const angleRad = angle * Math.PI / 180;

            // Calculate new position
            const latRad = lat * Math.PI / 180;
            const lonRad = lon * Math.PI / 180;
            const angularDistance = radiusKm / earthRadiusKm;

            const newLat = Math.asin(
                Math.sin(latRad) * Math.cos(angularDistance) +
                Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(angleRad)
            );

            const newLon = lonRad + Math.atan2(
                Math.sin(angleRad) * Math.sin(angularDistance) * Math.cos(latRad),
                Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(newLat)
            );

            points.push({
                lat: newLat * 180 / Math.PI,
                lon: newLon * 180 / Math.PI
            });
        }

        return points;
    }

    /**
     * Analyze terrain characteristics
     * @private
     */
    analyzeTerrain(center, surroundingPoints) {
        const elevations = surroundingPoints.map(p => p.elevation);
        const avgElevation = elevations.reduce((a, b) => a + b, 0) / elevations.length;
        const elevationRange = Math.max(...elevations) - Math.min(...elevations);

        const oceanPoints = surroundingPoints.filter(p => p.isOcean).length;
        const landPoints = surroundingPoints.length - oceanPoints;

        return {
            averageElevation: avgElevation,
            elevationRange: elevationRange,
            terrainRoughness: elevationRange > 500 ? 'Rough' : elevationRange > 100 ? 'Moderate' : 'Flat',
            coastalProximity: (oceanPoints > 0 && landPoints > 0) ? 'Coastal' : center.isOcean ? 'Ocean' : 'Inland',
            oceanPercentage: (oceanPoints / surroundingPoints.length) * 100
        };
    }

    /**
     * Estimate population risk category
     * @private
     */
    estimatePopulationRisk(lat, lon, isOcean) {
        // Simplified population density estimation based on coordinates
        // In a real implementation, this would use actual population data

        if (isOcean) return 'Low (Ocean impact)';

        // Major population centers (very simplified)
        const majorCities = [
            { lat: 40.7, lon: -74.0, name: 'New York' },
            { lat: 34.0, lon: -118.2, name: 'Los Angeles' },
            { lat: 51.5, lon: -0.1, name: 'London' },
            { lat: 35.7, lon: 139.7, name: 'Tokyo' },
            { lat: -33.9, lon: 151.2, name: 'Sydney' }
        ];

        for (const city of majorCities) {
            const distance = this.calculateDistance(lat, lon, city.lat, city.lon);
            if (distance < 100) return `Extreme (Near ${city.name})`;
            if (distance < 500) return `Very High (${city.name} region)`;
        }

        // General latitude-based estimation
        if (Math.abs(lat) < 60) return 'Moderate to High';
        return 'Low (Remote area)';
    }

    /**
     * Assess tsunami risk
     * @private
     */
    assessTsunamiRisk(center, surroundingPoints) {
        if (!center.isOcean) {
            return {
                risk: 'None',
                reason: 'Land impact'
            };
        }

        const coastalPoints = surroundingPoints.filter(p => !p.isOcean).length;

        if (coastalPoints === 0) {
            return {
                risk: 'Low',
                reason: 'Open ocean, distant from coastlines'
            };
        }

        if (center.waterDepth < 200) {
            return {
                risk: 'Moderate',
                reason: 'Shallow water near coast'
            };
        }

        return {
            risk: 'High',
            reason: 'Deep water impact near populated coastlines'
        };
    }

    /**
     * Calculate great circle distance between two points
     * @private
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}

module.exports = USGSService;
