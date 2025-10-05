require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const appInsights = require('applicationinsights');

const PhysicsEngine = require('./services/physicsEngine');
const NASANeoService = require('./services/nasaNeoService');
const USGSService = require('./services/usgsService');

// Initialize Application Insights (Azure monitoring)
if (process.env.APPINSIGHTS_INSTRUMENTATIONKEY) {
    appInsights.setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY)
        .setAutoDependencyCorrelation(true)
        .setAutoCollectRequests(true)
        .setAutoCollectPerformance(true)
        .setAutoCollectExceptions(true)
        .start();
}

const app = express();
const port = process.env.PORT || 7071;

// Initialize services
const physicsEngine = new PhysicsEngine();
const nasaNeoService = new NASANeoService();
const usgsService = new USGSService();

// Middleware
app.use(express.json());

// CORS configuration - allow multiple origins
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://kind-plant-00c23d60f.1.azurestaticapps.net',
    'https://kind-plant-00c23d60f-preview.eastus2.1.azurestaticapps.net',
    'https://meteormadness.earth',
    'https://www.meteormadness.earth'
];

if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(null, false);
        }
    },
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            physics: 'operational',
            nasa: 'operational',
            usgs: 'operational'
        }
    });
});

// ===== SIMULATION ENDPOINTS =====

/**
 * POST /api/simulate/impact
 * Simulate asteroid impact with given parameters
 */
app.post('/api/simulate/impact', async (req, res) => {
    try {
        const {
            diameter,        // meters
            velocity,        // km/s
            angle = 45,      // degrees
            density = 3000,  // kg/m³
            impactLocation   // { lat, lon }
        } = req.body;

        // Validation
        if (!diameter || !velocity || !impactLocation) {
            return res.status(400).json({
                error: 'Missing required parameters: diameter, velocity, impactLocation'
            });
        }

        // Get impact zone data from USGS
        const zoneAnalysis = await usgsService.analyzeImpactZone(
            impactLocation.lat,
            impactLocation.lon,
            100 // 100km radius
        );

        // Run physics simulation
        const simulation = await physicsEngine.simulateImpact({
            diameter,
            velocity: velocity * 1000, // Convert km/s to m/s
            angle,
            density,
            impactLocation: {
                lat: impactLocation.lat,
                lon: impactLocation.lon,
                isOcean: zoneAnalysis.impactPoint.isOcean,
                depth: zoneAnalysis.impactPoint.waterDepth
            }
        });

        res.json({
            simulation,
            zoneAnalysis,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Simulation error:', error);
        res.status(500).json({
            error: 'Simulation failed',
            message: error.message
        });
    }
});

/**
 * POST /api/simulate/deflection
 * Simulate asteroid deflection strategy
 */
app.post('/api/simulate/deflection', async (req, res) => {
    try {
        const {
            asteroidDiameter,  // meters
            asteroidDensity = 3000,
            warningTime,       // days
            missDistance,      // km
            method = 'kinetic' // 'kinetic', 'gravity', 'nuclear'
        } = req.body;

        if (!asteroidDiameter || !warningTime || !missDistance) {
            return res.status(400).json({
                error: 'Missing required parameters: asteroidDiameter, warningTime, missDistance'
            });
        }

        const asteroidMass = physicsEngine.calculateMass(asteroidDiameter, asteroidDensity);

        const deflection = physicsEngine.calculateDeflection({
            asteroidMass,
            warningTime,
            missDistance,
            method
        });

        res.json({
            deflection,
            asteroidMass,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Deflection simulation error:', error);
        res.status(500).json({
            error: 'Deflection simulation failed',
            message: error.message
        });
    }
});

// ===== NASA NEO DATA ENDPOINTS =====

/**
 * GET /api/neo/feed
 * Get Near-Earth Objects feed
 */
app.get('/api/neo/feed', async (req, res) => {
    try {
        const today = new Date();
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 7);

        const startDate = req.query.start_date || today.toISOString().split('T')[0];
        const end = req.query.end_date || endDate.toISOString().split('T')[0];

        const feed = await nasaNeoService.getNEOFeed(startDate, end);

        res.json(feed);
    } catch (error) {
        console.error('NEO feed error:', error);
        res.status(500).json({
            error: 'Failed to fetch NEO data',
            message: error.message
        });
    }
});

/**
 * GET /api/neo/asteroid/:id
 * Get specific asteroid details
 */
app.get('/api/neo/asteroid/:id', async (req, res) => {
    try {
        const asteroid = await nasaNeoService.getAsteroidById(req.params.id);
        res.json(asteroid);
    } catch (error) {
        console.error('Asteroid fetch error:', error);
        res.status(404).json({
            error: 'Asteroid not found',
            message: error.message
        });
    }
});

/**
 * GET /api/neo/close-approaches
 * Get close approach events
 */
app.get('/api/neo/close-approaches', async (req, res) => {
    try {
        const filters = {
            dateMin: req.query.date_min,
            dateMax: req.query.date_max,
            distMax: parseFloat(req.query.dist_max) || 0.05
        };

        const approaches = await nasaNeoService.getCloseApproaches(filters);
        res.json({ count: approaches.length, data: approaches });
    } catch (error) {
        console.error('Close approaches error:', error);
        res.status(500).json({
            error: 'Failed to fetch close approaches',
            message: error.message
        });
    }
});

/**
 * GET /api/neo/potentially-hazardous
 * Get potentially hazardous asteroids
 */
app.get('/api/neo/potentially-hazardous', async (req, res) => {
    try {
        const phas = await nasaNeoService.getPotentiallyHazardousAsteroids();
        res.json({ count: phas.length, data: phas });
    } catch (error) {
        console.error('PHAs error:', error);
        res.status(500).json({
            error: 'Failed to fetch potentially hazardous asteroids',
            message: error.message
        });
    }
});

/**
 * GET /api/neo/impactor-2025
 * Get the fictional Impactor-2025 scenario
 */
app.get('/api/neo/impactor-2025', (req, res) => {
    const scenario = nasaNeoService.getImpactor2025Scenario();
    res.json(scenario);
});

/**
 * GET /api/neo/samples
 * Get sample asteroids for demo/testing
 */
app.get('/api/neo/samples', (req, res) => {
    const samples = nasaNeoService.getSampleAsteroids();
    res.json({ count: samples.length, data: samples });
});

// ===== USGS DATA ENDPOINTS =====

/**
 * GET /api/usgs/elevation
 * Get elevation at coordinates
 */
app.get('/api/usgs/elevation', async (req, res) => {
    try {
        const { lat, lon } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({
                error: 'Missing required parameters: lat, lon'
            });
        }

        const elevation = await usgsService.getElevation(
            parseFloat(lat),
            parseFloat(lon)
        );

        res.json(elevation);
    } catch (error) {
        console.error('Elevation error:', error);
        res.status(500).json({
            error: 'Failed to fetch elevation data',
            message: error.message
        });
    }
});

/**
 * GET /api/usgs/earthquakes
 * Get earthquake data
 */
app.get('/api/usgs/earthquakes', async (req, res) => {
    try {
        const params = {
            minMagnitude: parseFloat(req.query.min_magnitude) || 5.0,
            latitude: req.query.lat ? parseFloat(req.query.lat) : null,
            longitude: req.query.lon ? parseFloat(req.query.lon) : null,
            maxRadiusKm: parseFloat(req.query.radius) || 500,
            limit: parseInt(req.query.limit) || 100
        };

        const earthquakes = await usgsService.getEarthquakes(params);
        res.json(earthquakes);
    } catch (error) {
        console.error('Earthquake data error:', error);
        res.status(500).json({
            error: 'Failed to fetch earthquake data',
            message: error.message
        });
    }
});

/**
 * POST /api/usgs/analyze-zone
 * Analyze impact zone characteristics
 */
app.post('/api/usgs/analyze-zone', async (req, res) => {
    try {
        const { lat, lon, radiusKm = 100 } = req.body;

        if (!lat || !lon) {
            return res.status(400).json({
                error: 'Missing required parameters: lat, lon'
            });
        }

        const analysis = await usgsService.analyzeImpactZone(lat, lon, radiusKm);
        res.json(analysis);
    } catch (error) {
        console.error('Zone analysis error:', error);
        res.status(500).json({
            error: 'Failed to analyze impact zone',
            message: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Route ${req.method} ${req.path} not found`
    });
});

// Start server
app.listen(port, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║   Asteroid Impact Simulator API                   ║
║   NASA Space Apps Challenge 2025                  ║
╚═══════════════════════════════════════════════════╝

🚀 Server running on port ${port}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🔑 NASA API Key: ${process.env.NASA_API_KEY ? 'Configured' : 'DEMO_KEY (limited)'}

📡 Endpoints:
   POST /api/simulate/impact
   POST /api/simulate/deflection
   GET  /api/neo/feed
   GET  /api/neo/impactor-2025
   GET  /api/neo/samples
   GET  /api/usgs/elevation
   GET  /api/health

Ready to simulate asteroid impacts! 🌠💥
    `);
});

module.exports = app;
