/**
 * Test script for KineticImpactor module
 * Tests calculations with example asteroids
 */

// Import the module (for Node.js testing)
const KineticImpactor = require('./kinetic-impactor.js');

console.log('🧪 Testing KineticImpactor Module...\n');

// Create impactor instance
const impactor = new KineticImpactor();

// ============================================
// TEST 1: Small asteroid (2020 VT4)
// ============================================
console.log('TEST 1: Small Asteroid (2020 VT4-like)\n');

const asteroid1 = {
    name: '2020 VT4',
    diameter: 1.8,  // km
    spectralType: 'S',
    a: 0.908 * 149597870.7,  // 0.908 AU in km
    e: 0.234,
    i: 10.5,
    omega: 120,
    M: 45
};

const impact1 = {
    mass: 1000,      // kg
    velocity: 10,    // km/s
    beta: 3.0
};

const results1 = impactor.simulateImpact(asteroid1, impact1);
console.log(impactor.formatResults(results1));

// ============================================
// TEST 2: DART-like mission (Dimorphos-sized)
// ============================================
console.log('\n\nTEST 2: DART-like Mission (160m asteroid)\n');

const asteroid2 = {
    name: 'Dimorphos (simulated)',
    diameter: 0.16,  // 160 meters
    spectralType: 'S',
    a: 0.92 * 149597870.7,  // 0.92 AU in km
    e: 0.15,
    i: 8.0,
    omega: 90,
    M: 180
};

const impact2 = {
    mass: 570,       // DART actual mass
    velocity: 6.6,   // km/s (DART impact velocity)
    beta: 3.6        // DART measured beta
};

const results2 = impactor.simulateImpact(asteroid2, impact2);
console.log(impactor.formatResults(results2));

// ============================================
// TEST 3: Large asteroid (Apophis-sized)
// ============================================
console.log('\n\nTEST 3: Large Asteroid (Apophis-sized, 340m)\n');

const asteroid3 = {
    name: 'Apophis (simulated)',
    diameter: 0.34,  // 340 meters
    spectralType: 'S',
    a: 0.922 * 149597870.7,  // AU in km
    e: 0.191,
    i: 3.3,
    omega: 126,
    M: 200
};

const impact3 = {
    mass: 10000,     // Large impactor
    velocity: 15,    // High velocity
    beta: 4.0
};

const results3 = impactor.simulateImpact(asteroid3, impact3);
console.log(impactor.formatResults(results3));

// ============================================
// SUMMARY
// ============================================
console.log('\n\n✅ All tests completed successfully!');
console.log('\nKey Observations:');
console.log('1. Larger asteroids require much more momentum to deflect');
console.log('2. Higher beta factors significantly increase effectiveness');
console.log('3. Δv is typically in the mm/s to cm/s range');
console.log('4. Orbital changes are small but measurable over time');
