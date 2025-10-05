const axios = require('axios');
const NodeCache = require('node-cache');

/**
 * NASA Near-Earth Object (NEO) API Service
 * Integrates with NASA's NEO Web Service
 */
class NASANeoService {
    constructor() {
        this.apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
        this.baseURL = 'https://api.nasa.gov/neo/rest/v1';
        this.ssdAPI = 'https://ssd-api.jpl.nasa.gov/cad.api'; // Close Approach Data
        this.sbdbAPI = 'https://ssd-api.jpl.nasa.gov/sbdb.api'; // Small-Body Database
        this.cache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache
    }

    /**
     * Get Near-Earth Objects feed for date range
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @returns {Promise<Object>} NEO feed data
     */
    async getNEOFeed(startDate, endDate) {
        const cacheKey = `neo_feed_${startDate}_${endDate}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        try {
            const response = await axios.get(`${this.baseURL}/feed`, {
                params: {
                    start_date: startDate,
                    end_date: endDate,
                    api_key: this.apiKey
                }
            });

            this.cache.set(cacheKey, response.data);
            return response.data;
        } catch (error) {
            console.error('Error fetching NEO feed:', error.message);
            throw new Error('Failed to fetch NEO data from NASA API');
        }
    }

    /**
     * Get specific asteroid details by ID
     * @param {string} asteroidId - NASA NEO ID
     * @returns {Promise<Object>} Asteroid details
     */
    async getAsteroidById(asteroidId) {
        const cacheKey = `asteroid_${asteroidId}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        try {
            const response = await axios.get(`${this.baseURL}/neo/${asteroidId}`, {
                params: {
                    api_key: this.apiKey
                }
            });

            this.cache.set(cacheKey, response.data);
            return response.data;
        } catch (error) {
            console.error(`Error fetching asteroid ${asteroidId}:`, error.message);
            throw new Error('Failed to fetch asteroid data');
        }
    }

    /**
     * Get close approach data for asteroids
     * @param {Object} filters - Query filters
     * @returns {Promise<Array>} Close approach events
     */
    async getCloseApproaches(filters = {}) {
        const {
            dateMin = new Date().toISOString().split('T')[0],
            dateMax = null,
            distMax = 0.05, // AU (Earth distance threshold)
            sort = 'date'
        } = filters;

        const cacheKey = `close_approach_${dateMin}_${distMax}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        try {
            const params = {
                'date-min': dateMin,
                'dist-max': distMax,
                sort: sort,
                fullname: true
            };

            if (dateMax) params['date-max'] = dateMax;

            const response = await axios.get(this.ssdAPI, { params });

            const data = this.parseCloseApproachData(response.data);
            this.cache.set(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Error fetching close approaches:', error.message);
            throw new Error('Failed to fetch close approach data');
        }
    }

    /**
     * Get detailed orbital elements for an asteroid
     * @param {string} designation - Asteroid designation (e.g., "2023 DW")
     * @returns {Promise<Object>} Orbital elements
     */
    async getOrbitalElements(designation) {
        const cacheKey = `orbital_${designation}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        try {
            const response = await axios.get(this.sbdbAPI, {
                params: {
                    sstr: designation,
                    phys: true
                }
            });

            const elements = this.parseOrbitalElements(response.data);
            this.cache.set(cacheKey, elements);
            return elements;
        } catch (error) {
            console.error(`Error fetching orbital elements for ${designation}:`, error.message);
            throw new Error('Failed to fetch orbital elements');
        }
    }

    /**
     * Get potentially hazardous asteroids
     * @returns {Promise<Array>} List of PHAs
     */
    async getPotentiallyHazardousAsteroids() {
        const cacheKey = 'phas';
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        try {
            const today = new Date();
            const endDate = new Date(today);
            endDate.setDate(endDate.getDate() + 7);

            const response = await axios.get(`${this.baseURL}/feed`, {
                params: {
                    start_date: today.toISOString().split('T')[0],
                    end_date: endDate.toISOString().split('T')[0],
                    api_key: this.apiKey
                }
            });

            const neos = response.data.near_earth_objects;
            const phas = [];

            for (const date in neos) {
                neos[date].forEach(neo => {
                    if (neo.is_potentially_hazardous_asteroid) {
                        phas.push(this.formatNEOData(neo));
                    }
                });
            }

            this.cache.set(cacheKey, phas);
            return phas;
        } catch (error) {
            console.error('Error fetching PHAs:', error.message);
            throw new Error('Failed to fetch potentially hazardous asteroids');
        }
    }

    /**
     * Create a hypothetical "Impactor-2025" scenario
     * @returns {Object} Fictional but realistic asteroid data
     */
    getImpactor2025Scenario() {
        return {
            id: 'IMPACTOR-2025',
            name: 'Impactor-2025',
            designation: '2025 IM',
            isPotentiallyHazardous: true,
            closeApproachDate: '2025-10-15',
            estimatedDiameter: {
                min: 150,
                max: 340,
                average: 245
            },
            relativeVelocity: {
                kmPerSecond: 18.5,
                kmPerHour: 66600,
                milesPerHour: 41387
            },
            missDistance: {
                astronomical: 0.0015, // Very close!
                lunar: 0.58,
                kilometers: 224400,
                miles: 139428
            },
            orbitalData: {
                semiMajorAxis: 1.45, // AU
                eccentricity: 0.23,
                inclination: 12.5, // degrees
                longitudeOfAscendingNode: 145.3,
                argumentOfPeriapsis: 234.7,
                trueAnomaly: 0
            },
            absoluteMagnitude: 21.5,
            impactProbability: 0.0012, // 0.12% - fictional but realistic
            description: 'Newly discovered near-Earth asteroid with uncertain trajectory. Close monitoring required.'
        };
    }

    /**
     * Parse close approach data from NASA CAD API
     * @private
     */
    parseCloseApproachData(data) {
        if (!data.data) return [];

        const fields = data.fields;
        const objects = data.data;

        return objects.map(obj => {
            const item = {};
            fields.forEach((field, index) => {
                item[field] = obj[index];
            });
            return item;
        });
    }

    /**
     * Parse orbital elements from SBDB API
     * @private
     */
    parseOrbitalElements(data) {
        if (!data.orbit) return null;

        const orbit = data.orbit.elements;
        return {
            semiMajorAxis: parseFloat(orbit.a),
            eccentricity: parseFloat(orbit.e),
            inclination: parseFloat(orbit.i),
            longitudeOfAscendingNode: parseFloat(orbit.om),
            argumentOfPeriapsis: parseFloat(orbit.w),
            meanAnomaly: parseFloat(orbit.ma),
            epoch: orbit.epoch,
            physicalData: data.phys || {}
        };
    }

    /**
     * Format NEO data for consistent output
     * @private
     */
    formatNEOData(neo) {
        const closeApproach = neo.close_approach_data?.[0] || {};

        return {
            id: neo.id,
            name: neo.name,
            designation: neo.designation,
            isPotentiallyHazardous: neo.is_potentially_hazardous_asteroid,
            closeApproachDate: closeApproach.close_approach_date,
            estimatedDiameter: {
                min: neo.estimated_diameter?.meters?.estimated_diameter_min,
                max: neo.estimated_diameter?.meters?.estimated_diameter_max,
                average: (neo.estimated_diameter?.meters?.estimated_diameter_min +
                         neo.estimated_diameter?.meters?.estimated_diameter_max) / 2
            },
            relativeVelocity: {
                kmPerSecond: parseFloat(closeApproach.relative_velocity?.kilometers_per_second),
                kmPerHour: parseFloat(closeApproach.relative_velocity?.kilometers_per_hour)
            },
            missDistance: {
                astronomical: parseFloat(closeApproach.miss_distance?.astronomical),
                lunar: parseFloat(closeApproach.miss_distance?.lunar),
                kilometers: parseFloat(closeApproach.miss_distance?.kilometers)
            },
            absoluteMagnitude: neo.absolute_magnitude_h
        };
    }

    /**
     * Get sample asteroids for testing/demo purposes
     * @returns {Array} Sample asteroid data
     */
    getSampleAsteroids() {
        return [
            {
                name: 'Bennu',
                diameter: 490,
                velocity: 11.6,
                description: 'Sample return target by OSIRIS-REx'
            },
            {
                name: 'Apophis',
                diameter: 370,
                velocity: 12.6,
                description: 'Will pass close to Earth in 2029'
            },
            {
                name: 'Didymos',
                diameter: 780,
                velocity: 5.9,
                description: 'Target of DART mission'
            },
            {
                name: 'Chicxulub Impactor',
                diameter: 10000,
                velocity: 20.0,
                description: 'Dinosaur extinction event (66 million years ago)'
            },
            {
                name: 'Tunguska Event',
                diameter: 60,
                velocity: 15.0,
                description: 'Airburst over Siberia (1908)'
            },
            {
                name: 'Chelyabinsk',
                diameter: 20,
                velocity: 19.0,
                description: 'Meteor event over Russia (2013)'
            }
        ];
    }
}

module.exports = NASANeoService;
