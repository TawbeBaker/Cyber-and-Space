/**
 * KineticImpactor - Kinetic Impact Simulation Module
 * 
 * Simulates the effect of a kinetic impactor (spacecraft) colliding with an asteroid.
 * Calculates the change in the asteroid's velocity (Δv) and resulting orbital changes.
 * 
 * Based on:
 * - Conservation of momentum
 * - Keplerian orbital mechanics
 * - DART mission physics (NASA 2022)
 * 
 * @author GitHub Copilot + User Collaboration
 * @version 1.0
 * @date October 5, 2025
 */

class KineticImpactor {
    constructor() {
        /**
         * Asteroid density values by spectral type (kg/m³)
         * Based on scientific observations and meteorite samples
         * 
         * References:
         * - C-type: Carbonaceous, ~75% of asteroids, low density
         * - S-type: Silicaceous (stony), ~17% of asteroids, medium density
         * - M-type: Metallic (iron-nickel), rare, high density
         */
        this.densities = {
            'C': 1700,  // Carbonaceous (like Bennu, Ryugu)
            'S': 2500,  // Silicaceous/Stony (like Itokawa, Eros)
            'M': 5500,  // Metallic (iron-nickel)
            'X': 2000,  // Unknown/Mixed - conservative estimate
            'default': 2000  // Fallback for unknown types
        };

        /**
         * Gravitational parameter of the Sun (km³/s²)
         * μ = G × M_sun
         */
        this.MU_SUN = 1.32712440018e11; // km³/s²

        /**
         * Default momentum enhancement factor (β)
         * Accounts for ejecta momentum in addition to impactor momentum
         * DART mission measured β ≈ 3.6
         */
        this.DEFAULT_BETA = 3.0;
    }

    /**
     * Calculate asteroid mass from diameter and spectral type
     * 
     * Formula:
     *   Volume = (4/3) × π × r³
     *   Mass = density × volume
     * 
     * @param {number} diameter_km - Asteroid diameter in kilometers
     * @param {string} spectralType - Spectral type ('C', 'S', 'M', 'X', or null)
     * @returns {number} Mass in kilograms (kg)
     * 
     * @example
     * // 2020 VT4: 1.8 km diameter, S-type
     * const mass = calculateAsteroidMass(1.8, 'S');
     * // Returns: ~7.6 × 10^12 kg
     */
    calculateAsteroidMass(diameter_km, spectralType = null) {
        // Get density based on spectral type
        const type = spectralType ? spectralType.toUpperCase().charAt(0) : 'default';
        const density = this.densities[type] || this.densities['default'];

        // Convert diameter to radius in meters
        const radius_m = (diameter_km * 1000) / 2;

        // Calculate volume (sphere): V = (4/3) × π × r³
        const volume_m3 = (4 / 3) * Math.PI * Math.pow(radius_m, 3);

        // Calculate mass: M = ρ × V
        const mass_kg = density * volume_m3;

        console.log(`📊 Asteroid Mass Calculation:`);
        console.log(`   Diameter: ${diameter_km} km`);
        console.log(`   Spectral Type: ${type}`);
        console.log(`   Density: ${density} kg/m³`);
        console.log(`   Radius: ${radius_m.toExponential(2)} m`);
        console.log(`   Volume: ${volume_m3.toExponential(2)} m³`);
        console.log(`   Mass: ${mass_kg.toExponential(2)} kg`);

        return mass_kg;
    }

    /**
     * Calculate change in asteroid velocity (Δv) from kinetic impact
     * 
     * Formula (Conservation of Momentum):
     *   Δv = (m_impactor × v_impact × (1 + β)) / M_asteroid
     * 
     * Where:
     *   - m_impactor: Mass of spacecraft (kg)
     *   - v_impact: Impact velocity (m/s)
     *   - β: Momentum enhancement factor (accounts for ejecta)
     *   - M_asteroid: Mass of asteroid (kg)
     * 
     * @param {number} impactorMass_kg - Mass of impactor spacecraft in kg
     * @param {number} impactVelocity_kms - Impact velocity in km/s
     * @param {number} beta - Momentum enhancement factor (typically 1.0 - 5.0)
     * @param {number} asteroidMass_kg - Mass of asteroid in kg
     * @returns {number} Delta-V in m/s
     * 
     * @example
     * // DART-like impact: 570 kg @ 6.6 km/s, β=3.6, M=5e9 kg
     * const deltaV = calculateDeltaV(570, 6.6, 3.6, 5e9);
     * // Returns: ~0.027 m/s (27 mm/s)
     */
    calculateDeltaV(impactorMass_kg, impactVelocity_kms, beta, asteroidMass_kg) {
        // Convert impact velocity to m/s
        const impactVelocity_ms = impactVelocity_kms * 1000;

        // Calculate Δv using momentum equation
        // Δv = (m_imp × v_imp × (1 + β)) / M_ast
        const deltaV_ms = (impactorMass_kg * impactVelocity_ms * (1 + beta)) / asteroidMass_kg;

        console.log(`📊 Delta-V Calculation:`);
        console.log(`   Impactor Mass: ${impactorMass_kg} kg`);
        console.log(`   Impact Velocity: ${impactVelocity_kms} km/s (${impactVelocity_ms} m/s)`);
        console.log(`   Beta Factor: ${beta}`);
        console.log(`   Asteroid Mass: ${asteroidMass_kg.toExponential(2)} kg`);
        console.log(`   Momentum Transfer: ${(impactorMass_kg * impactVelocity_ms * (1 + beta)).toExponential(2)} kg⋅m/s`);
        console.log(`   Delta-V: ${deltaV_ms.toExponential(3)} m/s (${(deltaV_ms * 1000).toFixed(2)} mm/s)`);

        return deltaV_ms;
    }

    /**
     * Calculate change in semi-major axis from Δv
     * 
     * Simplified formula (tangential velocity change):
     *   Δa = (2 × a² × Δv) / h
     * 
     * Where:
     *   - a: Semi-major axis (km)
     *   - Δv: Change in velocity (km/s)
     *   - h: Specific angular momentum = √(μ × a × (1 - e²))
     *   - μ: Gravitational parameter of Sun
     *   - e: Eccentricity
     * 
     * NOTE: This assumes tangential impact. Real impacts are more complex.
     * DEMO MODE: Amplifies changes by 1000x for visual demonstration
     * 
     * @param {number} semiMajorAxis_km - Current semi-major axis in km
     * @param {number} eccentricity - Orbital eccentricity (0-1)
     * @param {number} deltaV_ms - Change in velocity in m/s
     * @param {boolean} demoMode - If true, amplify changes 1000x for visibility
     * @returns {object} Object with {deltaA_km, newA_km, deltaE, newE, oldPeriod_days, newPeriod_days, deltaPeriod_days}
     * 
     * @example
     * // Small asteroid: a=0.9 AU, e=0.2, Δv=10 mm/s
     * const result = calculateOrbitChange(0.9 * 149597870.7, 0.2, 0.010, true);
     * // Returns: {deltaA_km: ~500 (amplified), newA_km: ..., ...}
     */
    calculateOrbitChange(semiMajorAxis_km, eccentricity, deltaV_ms, demoMode = true) {
        // Convert Δv from m/s to km/s
        const deltaV_kms = deltaV_ms / 1000;

        // DEMO MODE: Amplify changes for visual demonstration
        const amplification = demoMode ? 1000 : 1;
        const amplifiedDeltaV_kms = deltaV_kms * amplification;

        // Calculate specific angular momentum: h = √(μ × a × (1 - e²))
        const h = Math.sqrt(this.MU_SUN * semiMajorAxis_km * (1 - Math.pow(eccentricity, 2)));

        // Calculate change in semi-major axis: Δa = (2 × a² × Δv) / h
        const deltaA_km = (2 * Math.pow(semiMajorAxis_km, 2) * amplifiedDeltaV_kms) / h;

        // Calculate new semi-major axis
        const newA_km = semiMajorAxis_km + deltaA_km;
        
        // Calculate change in eccentricity (simplified model)
        // Real impacts would change e, i, omega, etc. depending on impact direction
        // For DEMO: Make eccentricity change visible but not too dramatic
        // Moderate multiplier to show deflection without completely changing orbit shape
        const deltaE = amplifiedDeltaV_kms * 3.0; // Moderate change (0.01 km/s → Δe = 0.03)
        const newE = Math.min(0.9, Math.max(0.001, eccentricity + deltaE)); // Keep e in valid range [0.001, 0.9]

        // Calculate orbital periods using Kepler's Third Law: T = 2π × √(a³/μ)
        const oldPeriod_seconds = 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis_km, 3) / this.MU_SUN);
        const newPeriod_seconds = 2 * Math.PI * Math.sqrt(Math.pow(newA_km, 3) / this.MU_SUN);

        // Convert to days
        const oldPeriod_days = oldPeriod_seconds / 86400;
        const newPeriod_days = newPeriod_seconds / 86400;
        const deltaPeriod_days = newPeriod_days - oldPeriod_days;
        const deltaPeriod_seconds = deltaPeriod_days * 86400;

        console.log(`📊 Orbit Change Calculation:`);
        if (demoMode) {
            console.log(`   🎬 DEMO MODE: Changes amplified ${amplification}x for visibility`);
        }
        console.log(`   Original Semi-major Axis: ${semiMajorAxis_km.toFixed(1)} km (${(semiMajorAxis_km / 149597870.7).toFixed(3)} AU)`);
        console.log(`   Original Eccentricity: ${eccentricity.toFixed(4)}`);
        console.log(`   Delta-V (real): ${deltaV_ms.toExponential(2)} m/s (${(deltaV_ms * 1000).toFixed(2)} mm/s)`);
        if (demoMode) {
            console.log(`   Delta-V (amplified): ${(amplifiedDeltaV_kms * 1000).toExponential(2)} m/s`);
        }
        console.log(`   Specific Angular Momentum: ${h.toExponential(2)} km²/s`);
        console.log(`   Delta Semi-major Axis: ${deltaA_km.toFixed(3)} km`);
        console.log(`   New Semi-major Axis: ${newA_km.toFixed(1)} km (${(newA_km / 149597870.7).toFixed(6)} AU)`);
        console.log(`   Delta Eccentricity: ${deltaE.toFixed(6)}`);
        console.log(`   New Eccentricity: ${newE.toFixed(6)}`);
        console.log(`   Original Period: ${oldPeriod_days.toFixed(2)} days`);
        console.log(`   New Period: ${newPeriod_days.toFixed(2)} days`);
        console.log(`   Delta Period: ${deltaPeriod_seconds.toFixed(2)} seconds (${deltaPeriod_days.toFixed(6)} days)`);

        return {
            deltaA_km: deltaA_km,
            newA_km: newA_km,
            deltaE: deltaE,
            newE: newE,
            oldPeriod_days: oldPeriod_days,
            newPeriod_days: newPeriod_days,
            deltaPeriod_days: deltaPeriod_days,
            deltaPeriod_seconds: deltaPeriod_seconds,
            amplification: amplification
        };
    }

    /**
     * Simulate complete kinetic impact on an asteroid
     * 
     * This is the main method that orchestrates all calculations:
     * 1. Calculate asteroid mass from diameter and type
     * 2. Calculate Δv from momentum transfer
     * 3. Calculate orbital changes
     * 4. Return comprehensive results
     * 
     * @param {object} asteroid - Asteroid object with orbital elements
     * @param {number} asteroid.diameter - Diameter in km
     * @param {string} asteroid.spectralType - Spectral type ('C', 'S', 'M', etc.)
     * @param {number} asteroid.a - Semi-major axis in km
     * @param {number} asteroid.e - Eccentricity
     * @param {object} impactParams - Impact parameters
     * @param {number} impactParams.mass - Impactor mass in kg
     * @param {number} impactParams.velocity - Impact velocity in km/s
     * @param {number} impactParams.beta - Momentum enhancement factor
     * @returns {object} Complete simulation results
     * 
     * @example
     * const asteroid = {
     *   diameter: 0.16,  // 160 m
     *   spectralType: 'S',
     *   a: 0.92 * 149597870.7,  // 0.92 AU in km
     *   e: 0.15
     * };
     * const impact = {
     *   mass: 570,      // DART mass
     *   velocity: 6.6,  // km/s
     *   beta: 3.6       // measured by DART
     * };
     * const results = simulateImpact(asteroid, impact);
     */
    simulateImpact(asteroid, impactParams) {
        console.log(`\n🎯 ========================================`);
        console.log(`   KINETIC IMPACTOR SIMULATION`);
        console.log(`   ========================================\n`);

        // Step 1: Calculate asteroid mass
        const asteroidMass_kg = this.calculateAsteroidMass(
            asteroid.diameter,
            asteroid.spectralType
        );

        console.log(`\n`);

        // Step 2: Calculate Delta-V
        const deltaV_ms = this.calculateDeltaV(
            impactParams.mass,
            impactParams.velocity,
            impactParams.beta,
            asteroidMass_kg
        );

        console.log(`\n`);

        // Step 3: Calculate orbit changes
        const orbitChange = this.calculateOrbitChange(
            asteroid.a,
            asteroid.e,
            deltaV_ms
        );

        console.log(`\n🎯 ========================================`);
        console.log(`   SIMULATION COMPLETE`);
        console.log(`   ========================================\n`);

        // Return comprehensive results object
        return {
            // Input data
            asteroid: {
                name: asteroid.name || 'Unknown',
                diameter_km: asteroid.diameter,
                spectralType: asteroid.spectralType || 'Unknown',
                mass_kg: asteroidMass_kg,
                semiMajorAxis_km: asteroid.a,
                eccentricity: asteroid.e
            },
            impactor: {
                mass_kg: impactParams.mass,
                velocity_kms: impactParams.velocity,
                beta: impactParams.beta
            },
            // Calculated results
            results: {
                deltaV_ms: deltaV_ms,
                deltaV_mms: deltaV_ms * 1000,  // mm/s for readability
                deltaA_km: orbitChange.deltaA_km,
                newA_km: orbitChange.newA_km,
                deltaE: orbitChange.deltaE,
                newE: orbitChange.newE,
                oldPeriod_days: orbitChange.oldPeriod_days,
                newPeriod_days: orbitChange.newPeriod_days,
                deltaPeriod_days: orbitChange.deltaPeriod_days,
                deltaPeriod_seconds: orbitChange.deltaPeriod_seconds,
                amplification: orbitChange.amplification
            },
            // New orbital elements (for visualization)
            newOrbitalElements: {
                a: orbitChange.newA_km,
                e: orbitChange.newE,  // Use NEW eccentricity
                i: asteroid.i,  // Inclination unchanged
                Omega: asteroid.Omega,  // Longitude of ascending node (Ω) unchanged
                omega: asteroid.omega,  // Argument of perihelion (ω) unchanged
                M: asteroid.M   // Mean anomaly unchanged at impact time
            }
        };
    }

    /**
     * Format simulation results for display
     * Returns a human-readable summary of the impact simulation
     * 
     * @param {object} results - Results object from simulateImpact()
     * @returns {string} Formatted results string
     */
    formatResults(results) {
        const r = results.results;
        const ast = results.asteroid;
        const imp = results.impactor;

        return `
🎯 KINETIC IMPACT SIMULATION RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TARGET ASTEROID:
  Name: ${ast.name}
  Diameter: ${ast.diameter_km} km
  Type: ${ast.spectralType}
  Mass: ${ast.mass_kg.toExponential(2)} kg

IMPACTOR:
  Mass: ${imp.mass_kg} kg
  Velocity: ${imp.velocity_kms} km/s
  Beta Factor: ${imp.beta}

IMPACT RESULTS:
  Delta-V: ${r.deltaV_ms.toExponential(2)} m/s (${r.deltaV_mms.toFixed(2)} mm/s)
  
ORBITAL CHANGES:
  Semi-major Axis Change: ${r.deltaA_km > 0 ? '+' : ''}${r.deltaA_km.toFixed(3)} km
  Original Orbit: ${(ast.semiMajorAxis_km / 149597870.7).toFixed(6)} AU
  Modified Orbit: ${(r.newA_km / 149597870.7).toFixed(6)} AU
  
  Orbital Period Change: ${r.deltaPeriod_seconds > 0 ? '+' : ''}${r.deltaPeriod_seconds.toFixed(2)} seconds
  Original Period: ${r.oldPeriod_days.toFixed(2)} days
  Modified Period: ${r.newPeriod_days.toFixed(2)} days

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KineticImpactor;
}
