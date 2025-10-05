/**
 * Physics Engine for Asteroid Impact Simulation
 * Implements Keplerian orbital mechanics and impact physics calculations
 */

const populationService = require('./populationService');

class PhysicsEngine {
    constructor() {
        // Constants
        this.G = 6.67430e-11; // Gravitational constant (m³/kg·s²)
        this.EARTH_MASS = 5.972e24; // kg
        this.EARTH_RADIUS = 6371000; // meters
        this.EARTH_SURFACE_GRAVITY = 9.81; // m/s²
        this.DEFAULT_ASTEROID_DENSITY = 3000; // kg/m³ (typical rocky asteroid)
        this.AU = 149597870700; // Astronomical Unit in meters
    }

    /**
     * Calculate orbital position from Keplerian elements
     * @param {Object} elements - Keplerian orbital elements
     * @returns {Object} Position {x, y, z} in meters
     */
    calculateOrbitalPosition(elements) {
        const {
            semiMajorAxis,
            eccentricity,
            inclination,
            longitudeOfAscendingNode,
            argumentOfPeriapsis,
            trueAnomaly
        } = elements;

        // Convert to radians
        const i = inclination * Math.PI / 180;
        const omega = longitudeOfAscendingNode * Math.PI / 180;
        const w = argumentOfPeriapsis * Math.PI / 180;
        const nu = trueAnomaly * Math.PI / 180;

        // Calculate distance from focus
        const r = (semiMajorAxis * (1 - eccentricity * eccentricity)) /
                  (1 + eccentricity * Math.cos(nu));

        // Position in orbital plane
        const x_orb = r * Math.cos(nu);
        const y_orb = r * Math.sin(nu);

        // Rotation matrices to convert to 3D coordinates
        const x = (Math.cos(omega) * Math.cos(w) - Math.sin(omega) * Math.sin(w) * Math.cos(i)) * x_orb +
                  (-Math.cos(omega) * Math.sin(w) - Math.sin(omega) * Math.cos(w) * Math.cos(i)) * y_orb;

        const y = (Math.sin(omega) * Math.cos(w) + Math.cos(omega) * Math.sin(w) * Math.cos(i)) * x_orb +
                  (-Math.sin(omega) * Math.sin(w) + Math.cos(omega) * Math.cos(w) * Math.cos(i)) * y_orb;

        const z = (Math.sin(w) * Math.sin(i)) * x_orb + (Math.cos(w) * Math.sin(i)) * y_orb;

        return { x, y, z, distance: r };
    }

    /**
     * Calculate asteroid mass from diameter
     * @param {number} diameter - Asteroid diameter in meters
     * @param {number} density - Asteroid density in kg/m³ (default: 3000)
     * @returns {number} Mass in kg
     */
    calculateMass(diameter, density = this.DEFAULT_ASTEROID_DENSITY) {
        const radius = diameter / 2;
        const volume = (4/3) * Math.PI * Math.pow(radius, 3);
        return volume * density;
    }

    /**
     * Calculate impact velocity accounting for Earth's gravity
     * @param {number} initialVelocity - Initial velocity in m/s
     * @param {number} angle - Impact angle in degrees (0 = horizontal, 90 = vertical)
     * @returns {number} Final impact velocity in m/s
     */
    calculateImpactVelocity(initialVelocity, angle = 45) {
        // Earth's escape velocity
        const escapeVelocity = Math.sqrt(2 * this.G * this.EARTH_MASS / this.EARTH_RADIUS);

        // Combine initial velocity with Earth's gravitational acceleration
        const angleRad = angle * Math.PI / 180;
        const verticalComponent = initialVelocity * Math.sin(angleRad);
        const horizontalComponent = initialVelocity * Math.cos(angleRad);

        // Approximate final velocity (simplified model)
        const finalVertical = Math.sqrt(verticalComponent * verticalComponent + escapeVelocity * escapeVelocity);
        const finalVelocity = Math.sqrt(finalVertical * finalVertical + horizontalComponent * horizontalComponent);

        return finalVelocity;
    }

    /**
     * Calculate kinetic energy of impact
     * @param {number} mass - Asteroid mass in kg
     * @param {number} velocity - Impact velocity in m/s
     * @returns {Object} Energy in Joules and TNT equivalent in megatons
     */
    calculateImpactEnergy(mass, velocity) {
        const energyJoules = 0.5 * mass * velocity * velocity;

        // Convert to TNT equivalent (1 ton TNT = 4.184e9 J)
        const tntTons = energyJoules / 4.184e9;
        const tntMegatons = tntTons / 1e6;

        return {
            joules: energyJoules,
            tntTons: tntTons,
            megatons: tntMegatons
        };
    }

    /**
     * Calculate crater dimensions using scaling laws
     * Based on Collins et al. (2005) crater scaling
     * @param {number} energy - Impact energy in Joules
     * @param {number} angle - Impact angle in degrees
     * @param {number} targetDensity - Target rock density in kg/m³ (default: 2500)
     * @returns {Object} Crater dimensions {diameter, depth} in meters
     */
    calculateCraterSize(energy, angle = 45, targetDensity = 2500) {
        const angleRad = angle * Math.PI / 180;

        // Simplified crater scaling law
        // D ∝ E^0.25 (approximate)
        const baseDiameter = 1.8 * Math.pow(energy / 1e15, 0.25);

        // Adjust for angle (vertical impacts create larger craters)
        const angleFactor = Math.pow(Math.sin(angleRad), 1/3);
        const diameter = baseDiameter * angleFactor;

        // Depth is typically 1/5 to 1/3 of diameter
        const depth = diameter / 5;

        return {
            diameter: diameter,
            depth: depth,
            volume: Math.PI * Math.pow(diameter/2, 2) * depth / 3 // Approximate cone volume
        };
    }

    /**
     * Estimate seismic magnitude from impact energy
     * Based on empirical relationships
     * @param {number} energy - Impact energy in Joules
     * @returns {Object} Seismic information {magnitude, description}
     */
    calculateSeismicEffects(energy) {
        // Richter magnitude from energy: M = (2/3) * log10(E) - 4.8
        const magnitude = (2/3) * Math.log10(energy) - 4.8;

        let description = '';
        if (magnitude < 4) {
            description = 'Minor - Often felt, but rarely causes damage';
        } else if (magnitude < 5) {
            description = 'Light - Noticeable shaking, minor damage';
        } else if (magnitude < 6) {
            description = 'Moderate - Can cause damage to buildings';
        } else if (magnitude < 7) {
            description = 'Strong - Major damage in populated areas';
        } else if (magnitude < 8) {
            description = 'Major - Serious damage over large areas';
        } else {
            description = 'Great - Catastrophic destruction';
        }

        return {
            magnitude: Math.max(0, magnitude),
            description: description,
            radiusKm: Math.pow(10, magnitude - 1) // Approximate felt radius in km
        };
    }

    /**
     * Calculate blast radius and overpressure zones
     * Based on NASA/Imperial College asteroid impact models
     * @param {number} energy - Impact energy in Joules
     * @returns {Object} Blast zones with radii in meters
     */
    calculateBlastRadius(energy) {
        const megatons = energy / (4.184e15);

        // Asteroid impact scaling laws (different from nuclear explosions)
        // Based on Collins et al. (2005) and NASA NEO impact studies

        // Fireball radius - initial vaporization zone
        const fireball = 40 * Math.pow(megatons, 0.33); // meters (cube root scaling)

        // Thermal radiation - 3rd degree burns
        // Air burst is more efficient at thermal radiation than ground burst
        const thermalRadiation = 500 * Math.pow(megatons, 0.41); // meters

        // Air blast overpressure (20 psi - building collapse)
        const airblast = 350 * Math.pow(megatons, 0.33); // meters

        // Ionizing radiation zone (less important for asteroids vs nuclear)
        const radiation = 200 * Math.pow(megatons, 0.41); // meters

        return {
            fireball: fireball,
            radiationRadius: radiation,
            airblastRadius: airblast,
            thermalRadius: thermalRadiation
        };
    }

    /**
     * Estimate tsunami potential for ocean impacts
     * @param {number} energy - Impact energy in Joules
     * @param {number} waterDepth - Ocean depth at impact point in meters
     * @returns {Object} Tsunami characteristics
     */
    calculateTsunamiEffects(energy, waterDepth = 4000) {
        const megatons = energy / (4.184e15);

        // Simplified tsunami wave height estimation
        const waveHeight = Math.sqrt(megatons) * 10; // meters
        const wavelength = waterDepth * 50; // meters
        const speed = Math.sqrt(this.EARTH_SURFACE_GRAVITY * waterDepth); // m/s

        return {
            initialWaveHeight: waveHeight,
            wavelength: wavelength,
            propagationSpeed: speed,
            speedKmh: speed * 3.6,
            affectedRadiusKm: megatons * 100 // Rough estimate
        };
    }

    /**
     * Simulate complete impact scenario
     * @param {Object} params - Impact parameters
     * @returns {Object} Complete impact analysis
     */
    async simulateImpact(params) {
        const {
            diameter, // meters
            velocity, // m/s
            angle = 45, // degrees
            density = this.DEFAULT_ASTEROID_DENSITY,
            impactLocation = { lat: 0, lon: 0, isOcean: false, depth: 0 }
        } = params;

        // Calculate mass
        const mass = this.calculateMass(diameter, density);

        // Calculate final impact velocity
        const finalVelocity = this.calculateImpactVelocity(velocity, angle);

        // Calculate impact energy
        const energy = this.calculateImpactEnergy(mass, finalVelocity);

        // Calculate crater (if land impact)
        const crater = !impactLocation.isOcean ?
            this.calculateCraterSize(energy.joules, angle) :
            null;

        // Calculate seismic effects
        const seismic = this.calculateSeismicEffects(energy.joules);

        // Calculate blast effects
        const blast = this.calculateBlastRadius(energy.joules);

        // Calculate tsunami (if ocean impact)
        const tsunami = impactLocation.isOcean ?
            this.calculateTsunamiEffects(energy.joules, impactLocation.depth) :
            null;

        // Calculate casualties
        const casualties = await this.calculateCasualties(
            blast,
            impactLocation,
            crater
        );

        return {
            asteroidProperties: {
                diameter,
                mass,
                velocity: finalVelocity,
                density,
                angle
            },
            energy,
            crater,
            seismic,
            blast,
            tsunami,
            casualties,
            impactLocation
        };
    }

    /**
     * Calculate potential human casualties
     * @param {Object} blast - Blast zones
     * @param {Object} impactLocation - Impact coordinates
     * @param {Object} crater - Crater data
     * @returns {Object} Casualties estimation
     */
    async calculateCasualties(blast, impactLocation, crater) {
        // Zones de destruction avec taux de mortalité
        const zones = {
            fireball: {
                radius: blast.fireball / 1000, // km
                mortalityRate: 1.0, // 100% dans la boule de feu
                description: 'Total vaporization'
            },
            thermal: {
                radius: blast.thermalRadius / 1000, // km
                mortalityRate: 0.9, // 90% brûlures 3ème degré
                description: 'Severe burns, fires'
            },
            airblast: {
                radius: blast.airblastRadius / 1000, // km
                mortalityRate: 0.7, // 70% surpression létale
                description: 'Building collapse, flying debris'
            },
            radiation: {
                radius: blast.radiationRadius / 1000, // km
                mortalityRate: 0.3, // 30% radiation + effets secondaires
                description: 'Radiation sickness, structural damage'
            }
        };

        // Calcul des victimes par zone avec VRAIE POPULATION
        let totalCasualties = 0;
        let totalInjured = 0;
        const detailedZones = {};
        let largestZoneCities = [];
        let maxRadius = 0;

        for (const [zoneName, zone] of Object.entries(zones)) {
            // Obtenir la VRAIE population dans ce rayon
            const popData = await populationService.getPopulationInRadius(
                impactLocation.lat,
                impactLocation.lon,
                zone.radius
            );

            const casualties = Math.round(popData.totalPopulation * zone.mortalityRate);
            const injured = Math.round(popData.totalPopulation * (1 - zone.mortalityRate) * 0.8);

            detailedZones[zoneName] = {
                radius: zone.radius,
                area: Math.PI * zone.radius * zone.radius,
                populationAffected: popData.totalPopulation,
                casualties: casualties,
                injured: injured,
                mortalityRate: zone.mortalityRate,
                description: zone.description,
                affectedCities: popData.affectedCities
            };

            // Garder les villes de la plus grande zone (contient toutes les autres)
            if (zone.radius > maxRadius) {
                maxRadius = zone.radius;
                largestZoneCities = popData.affectedCities || [];
            }

            totalCasualties += casualties;
            totalInjured += injured;
        }

        const severity = this.getCasualtySeverity(totalCasualties);

        return {
            estimatedCasualties: totalCasualties,
            estimatedInjured: totalInjured,
            totalAffected: totalCasualties + totalInjured,
            zones: detailedZones,
            affectedCities: largestZoneCities,
            severity: severity,
            note: impactLocation.isOcean ?
                'Ocean impact - tsunami and coastal effects primary concern' :
                `Direct land impact - ${largestZoneCities.length} major cities affected`
        };
    }

    /**
     * Estimate population density based on coordinates
     * @private
     */
    estimatePopulationDensity(lat, lon, isOcean) {
        if (isOcean) return 0;

        // Zones métropolitaines majeures (densité très élevée)
        const majorCities = [
            { lat: 40.7, lon: -74.0, density: 11000, name: 'New York' },
            { lat: 34.0, lon: -118.2, density: 3200, name: 'Los Angeles' },
            { lat: 51.5, lon: -0.1, density: 5700, name: 'London' },
            { lat: 48.8, lon: 2.3, density: 21000, name: 'Paris' },
            { lat: 35.7, lon: 139.7, density: 6400, name: 'Tokyo' },
            { lat: 31.2, lon: 121.5, density: 3800, name: 'Shanghai' },
            { lat: 19.4, lon: -99.1, density: 6000, name: 'Mexico City' },
            { lat: 28.6, lon: 77.2, density: 11000, name: 'Delhi' },
            { lat: -23.5, lon: -46.6, density: 7900, name: 'São Paulo' },
            { lat: 55.7, lon: 37.6, density: 4900, name: 'Moscow' },
            { lat: -33.9, lon: 151.2, density: 2100, name: 'Sydney' },
        ];

        // Chercher la ville la plus proche
        let closestCity = null;
        let minDistance = Infinity;

        for (const city of majorCities) {
            const distance = Math.sqrt(
                Math.pow(lat - city.lat, 2) + Math.pow(lon - city.lon, 2)
            );
            if (distance < minDistance) {
                minDistance = distance;
                closestCity = city;
            }
        }

        // Si très proche d'une grande ville (< 2°)
        if (minDistance < 2) {
            return closestCity.density;
        }

        // Si proche (< 5°)
        if (minDistance < 5) {
            return closestCity.density * 0.3; // Banlieue
        }

        // Estimation par latitude (zones habitables)
        const absLat = Math.abs(lat);

        if (absLat > 70) return 0.1; // Zones polaires
        if (absLat > 60) return 2; // Zones subpolaires
        if (absLat > 50) return 30; // Zones tempérées nord
        if (absLat > 30) return 50; // Zones tempérées
        if (absLat > 20) return 40; // Zones subtropicales
        return 35; // Zones tropicales
    }

    /**
     * Get urban density factor
     * @private
     */
    getUrbanFactor(lat, lon) {
        // Facteur multiplicateur selon la proximité urbaine
        const majorCities = [
            { lat: 40.7, lon: -74.0, factor: 2.5 },
            { lat: 35.7, lon: 139.7, factor: 3.0 },
            { lat: 28.6, lon: 77.2, factor: 2.8 },
            { lat: 31.2, lon: 121.5, factor: 2.7 },
        ];

        for (const city of majorCities) {
            const distance = Math.sqrt(
                Math.pow(lat - city.lat, 2) + Math.pow(lon - city.lon, 2)
            );
            if (distance < 1) return city.factor;
        }

        return 1.0; // Facteur normal
    }

    /**
     * Classify casualty severity
     * @private
     */
    getCasualtySeverity(casualties) {
        if (casualties < 100) return 'Minor';
        if (casualties < 1000) return 'Moderate';
        if (casualties < 10000) return 'Serious';
        if (casualties < 100000) return 'Severe';
        if (casualties < 1000000) return 'Catastrophic';
        if (casualties < 10000000) return 'Mass Casualty Event';
        return 'Extinction-Level Event';
    }

    /**
     * Calculate deflection delta-v required
     * @param {Object} params - Deflection parameters
     * @returns {Object} Deflection analysis
     */
    calculateDeflection(params) {
        const {
            asteroidMass,
            warningTime, // days
            missDistance, // desired miss distance in km
            method = 'kinetic' // 'kinetic', 'gravity', 'nuclear'
        } = params;

        const warningTimeSeconds = warningTime * 24 * 3600;
        const requiredDeltaV = (missDistance * 1000) / warningTimeSeconds; // m/s

        let efficiency = 1;
        let description = '';

        switch(method) {
            case 'kinetic':
                efficiency = 0.5; // Momentum transfer efficiency
                description = 'Kinetic Impactor: High-speed spacecraft collision';
                break;
            case 'gravity':
                efficiency = 0.01; // Very gradual but precise
                description = 'Gravity Tractor: Spacecraft gravitational pull';
                break;
            case 'nuclear':
                efficiency = 10; // High energy release
                description = 'Nuclear Deflection: Standoff nuclear detonation';
                break;
        }

        const impactorMass = (asteroidMass * requiredDeltaV) / (efficiency * 1000);

        return {
            method,
            description,
            requiredDeltaV,
            impactorMass,
            feasible: warningTime > 30 && impactorMass < 50000,
            warningTimeNeeded: Math.ceil((missDistance * 1000 * asteroidMass) / (efficiency * 1000 * 100)),
            successProbability: warningTime > 365 ? 0.9 : warningTime > 180 ? 0.7 : warningTime > 90 ? 0.5 : 0.2
        };
    }
}

module.exports = PhysicsEngine;
