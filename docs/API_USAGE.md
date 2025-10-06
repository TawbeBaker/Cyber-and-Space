# 🚀 API Usage Guide - Asteroid Impact Simulator

## NASA Space Apps Challenge 2025 - Public Educational API

Welcome to the Asteroid Impact Simulator API! This guide provides examples and best practices for using our educational API.

---

## Quick Start

**Base URL**: `https://ca-api-92nppgw4.kinddesert-44c62b55.canadacentral.azurecontainerapps.io`

**Authentication**: None required (educational use, rate-limited to 100 requests/15min per IP)

**Response Format**: JSON

**Interactive API Documentation**: [Swagger UI](https://ca-api-92nppgw4.kinddesert-44c62b55.canadacentral.azurecontainerapps.io/api-docs) *(to be deployed)*

---

## Table of Contents

1. [Health Check](#1-health-check)
2. [Simulate Impact](#2-simulate-impact)
3. [Simulate Deflection](#3-simulate-deflection)
4. [NASA NEO Data](#4-nasa-neo-data)
5. [USGS Data](#5-usgs-data)
6. [Code Examples](#6-code-examples)
7. [Rate Limits](#7-rate-limits)
8. [Error Handling](#8-error-handling)

---

## 1. Health Check

Check if the API is operational.

### Request

```bash
GET /api/health
```

### Example

```bash
curl https://ca-api-92nppgw4.kinddesert-44c62b55.canadacentral.azurecontainerapps.io/api/health
```

### Response

```json
{
  "status": "healthy",
  "timestamp": "2025-10-05T12:00:00.000Z",
  "services": {
    "physics": "operational",
    "nasa": "operational",
    "usgs": "operational"
  }
}
```

---

## 2. Simulate Impact

Simulate an asteroid impact with custom parameters.

### Request

```bash
POST /api/simulate/impact
Content-Type: application/json
```

### Parameters

| Parameter | Type | Required | Description | Range |
|-----------|------|----------|-------------|-------|
| `diameter` | number | Yes | Asteroid diameter (meters) | 1 - 100,000 |
| `velocity` | number | Yes | Impact velocity (km/s) | 11 - 72 |
| `angle` | number | No | Impact angle (degrees) | 0 - 90 (default: 45) |
| `density` | number | No | Asteroid density (kg/m³) | 1,000 - 8,000 (default: 3,000) |
| `impactLocation` | object | Yes | Latitude/longitude | |
| `impactLocation.lat` | number | Yes | Latitude | -90 to 90 |
| `impactLocation.lon` | number | Yes | Longitude | -180 to 180 |

### Example Request

**Scenario**: 100m asteroid hitting Paris at 20 km/s

```bash
curl -X POST https://ca-api-92nppgw4.kinddesert-44c62b55.canadacentral.azurecontainerapps.io/api/simulate/impact \
  -H "Content-Type: application/json" \
  -d '{
    "diameter": 100,
    "velocity": 20,
    "angle": 45,
    "density": 3000,
    "impactLocation": {
      "lat": 48.8566,
      "lon": 2.3522
    }
  }'
```

### Example Response

```json
{
  "simulation": {
    "impactEnergy": {
      "joules": 3.14e+17,
      "megatonsTNT": 75.1
    },
    "crater": {
      "diameter": 1820,
      "depth": 364,
      "volume": 387000000
    },
    "seismicMagnitude": 6.8,
    "blastZones": {
      "fireball": 3200,
      "thermal": 11200,
      "airBlast": 22400,
      "radiation": 6400
    },
    "casualties": {
      "estimated": 2847000,
      "affectedCities": [
        {
          "name": "Paris",
          "country": "France",
          "population": 2165423,
          "distance": 0,
          "zone": "fireball",
          "casualties": 2165423
        },
        {
          "name": "Brussels",
          "country": "Belgium",
          "population": 1198726,
          "distance": 264,
          "zone": "thermal",
          "casualties": 681577
        }
      ]
    }
  },
  "zoneAnalysis": {
    "impactPoint": {
      "elevation": 35,
      "isOcean": false,
      "waterDepth": 0
    }
  },
  "timestamp": "2025-10-05T12:30:00.000Z"
}
```

### Physics Formulas Used

- **Energy**: E = ½mv² (where m = ρ × (4/3)πr³)
- **Crater Diameter**: Collins et al. (2005) scaling laws
- **Seismic Magnitude**: M = 0.67 × log₁₀(E) - 5.87
- **Blast Zones**: Simplified from Hills & Goda (1993)

---

## 3. Simulate Deflection

Simulate planetary defense deflection strategies.

### Request

```bash
POST /api/simulate/deflection
Content-Type: application/json
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `asteroidDiameter` | number | Yes | Asteroid diameter (meters) |
| `asteroidDensity` | number | No | Density (kg/m³, default: 3000) |
| `warningTime` | number | Yes | Days before impact |
| `missDistance` | number | Yes | Required miss (km) |
| `method` | string | No | `kinetic`, `gravity`, or `nuclear` (default: kinetic) |

### Example Request

**Scenario**: Deflect 140m asteroid (like Apophis) with 10 years warning

```bash
curl -X POST https://ca-api-92nppgw4.kinddesert-44c62b55.canadacentral.azurecontainerapps.io/api/simulate/deflection \
  -H "Content-Type: application/json" \
  -d '{
    "asteroidDiameter": 140,
    "asteroidDensity": 3000,
    "warningTime": 3650,
    "missDistance": 6400,
    "method": "kinetic"
  }'
```

### Example Response

```json
{
  "deflection": {
    "method": "kinetic",
    "feasibility": "feasible",
    "requiredDeltaV": 0.035,
    "spacecraftMass": 500,
    "impactSpeed": 6000,
    "momentumTransfer": 3.0e+6,
    "missionCost": "$300M - $500M",
    "timeline": "5-7 years mission development",
    "successProbability": 0.85,
    "milestonesAchieved": {
      "DART": "Successful kinetic impactor demonstration (2022)"
    }
  },
  "asteroidMass": 1.35e+10,
  "timestamp": "2025-10-05T13:00:00.000Z"
}
```

### Methods Explained

**Kinetic Impactor** (like NASA DART):
- Spacecraft crashes into asteroid
- Momentum transfer: Δp = m_spacecraft × v × β (β ≈ 2-4 enhancement factor)
- Best for: Medium warning time (5-20 years), medium asteroids

**Gravity Tractor**:
- Spacecraft hovers near asteroid using gravitational pull
- Slow but precise deflection
- Best for: Long warning time (20+ years), smaller asteroids

**Nuclear**:
- High-energy last resort
- Standoff or subsurface detonation
- Best for: Short warning time (<5 years), large asteroids

---

## 4. NASA NEO Data

Access real NASA Near-Earth Object data.

### 4.1 Get NEO Feed

```bash
GET /api/neo/feed?start_date=2025-10-01&end_date=2025-10-07
```

**Example**:
```bash
curl "https://ca-api-92nppgw4.kinddesert-44c62b55.canadacentral.azurecontainerapps.io/api/neo/feed?start_date=2025-10-01&end_date=2025-10-07"
```

**Response**: NASA NEO API format (element_count, near_earth_objects)

### 4.2 Get Specific Asteroid

```bash
GET /api/neo/asteroid/{id}
```

**Example** (Apophis - asteroid 99942):
```bash
curl https://ca-api-92nppgw4.kinddesert-44c62b55.canadacentral.azurecontainerapps.io/api/neo/asteroid/99942
```

### 4.3 Get Close Approaches

```bash
GET /api/neo/close-approaches?date_min=2025-01-01&date_max=2025-12-31&dist_max=0.05
```

### 4.4 Get Potentially Hazardous Asteroids

```bash
GET /api/neo/potentially-hazardous
```

**Example**:
```bash
curl https://ca-api-92nppgw4.kinddesert-44c62b55.canadacentral.azurecontainerapps.io/api/neo/potentially-hazardous
```

### 4.5 Get Sample Asteroids

```bash
GET /api/neo/samples
```

Returns pre-loaded sample asteroids for demo purposes.

---

## 5. USGS Data

### 5.1 Get Elevation

```bash
GET /api/usgs/elevation?lat=48.8566&lon=2.3522
```

**Example**:
```bash
curl "https://ca-api-92nppgw4.kinddesert-44c62b55.canadacentral.azurecontainerapps.io/api/usgs/elevation?lat=48.8566&lon=2.3522"
```

**Response**:
```json
{
  "elevation": 35,
  "location": {
    "lat": 48.8566,
    "lon": 2.3522
  },
  "units": "meters"
}
```

### 5.2 Get Earthquake Data

```bash
GET /api/usgs/earthquakes?min_magnitude=6.0&lat=48.8566&lon=2.3522&radius=500
```

### 5.3 Analyze Impact Zone

```bash
POST /api/usgs/analyze-zone
Content-Type: application/json

{
  "lat": 48.8566,
  "lon": 2.3522,
  "radiusKm": 100
}
```

---

## 6. Code Examples

### 6.1 JavaScript/Node.js

```javascript
const axios = require('axios');

const API_BASE = 'https://ca-api-92nppgw4.kinddesert-44c62b55.canadacentral.azurecontainerapps.io';

async function simulateImpact() {
  try {
    const response = await axios.post(`${API_BASE}/api/simulate/impact`, {
      diameter: 100,
      velocity: 20,
      angle: 45,
      density: 3000,
      impactLocation: {
        lat: 40.7128,  // New York City
        lon: -74.0060
      }
    });

    console.log('Impact Results:');
    console.log(`Energy: ${response.data.simulation.impactEnergy.megatonsTNT} MT`);
    console.log(`Crater: ${response.data.simulation.crater.diameter}m diameter`);
    console.log(`Magnitude: ${response.data.simulation.seismicMagnitude}`);
    console.log(`Casualties: ${response.data.simulation.casualties.estimated}`);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

simulateImpact();
```

### 6.2 Python

```python
import requests

API_BASE = 'https://ca-api-92nppgw4.kinddesert-44c62b55.canadacentral.azurecontainerapps.io'

def simulate_impact():
    payload = {
        'diameter': 100,
        'velocity': 20,
        'angle': 45,
        'density': 3000,
        'impactLocation': {
            'lat': 35.6762,  # Tokyo
            'lon': 139.6503
        }
    }

    response = requests.post(f'{API_BASE}/api/simulate/impact', json=payload)

    if response.status_code == 200:
        data = response.json()
        print(f"Impact Energy: {data['simulation']['impactEnergy']['megatonsTNT']} MT")
        print(f"Crater Diameter: {data['simulation']['crater']['diameter']}m")
        print(f"Casualties: {data['simulation']['casualties']['estimated']}")
    else:
        print(f"Error: {response.status_code} - {response.text}")

if __name__ == '__main__':
    simulate_impact()
```

### 6.3 React/TypeScript

```typescript
import axios from 'axios';

const API_BASE = 'https://ca-api-92nppgw4.kinddesert-44c62b55.canadacentral.azurecontainerapps.io';

interface ImpactParams {
  diameter: number;
  velocity: number;
  angle?: number;
  density?: number;
  impactLocation: {
    lat: number;
    lon: number;
  };
}

interface ImpactResult {
  simulation: {
    impactEnergy: { joules: number; megatonsTNT: number };
    crater: { diameter: number; depth: number; volume: number };
    seismicMagnitude: number;
    blastZones: {
      fireball: number;
      thermal: number;
      airBlast: number;
      radiation: number;
    };
    casualties: {
      estimated: number;
      affectedCities: Array<{
        name: string;
        population: number;
        distance: number;
        casualties: number;
      }>;
    };
  };
  timestamp: string;
}

async function simulateImpact(params: ImpactParams): Promise<ImpactResult> {
  const response = await axios.post<ImpactResult>(
    `${API_BASE}/api/simulate/impact`,
    params
  );
  return response.data;
}

// Usage
const impact = await simulateImpact({
  diameter: 100,
  velocity: 20,
  impactLocation: { lat: 51.5074, lon: -0.1278 } // London
});

console.log(`Energy: ${impact.simulation.impactEnergy.megatonsTNT} MT`);
```

---

## 7. Rate Limits

**Current Limits**:
- **100 requests per 15 minutes** per IP address
- Applies to all `/api/*` endpoints
- Health check endpoint (`/api/health`) not rate-limited

**Headers Returned**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1696512000
```

**Rate Limit Exceeded Response**:
```json
{
  "error": "Too many requests from this IP, please try again later."
}
```

**Best Practices**:
- Cache responses when possible
- Implement exponential backoff on errors
- For high-volume use, contact us for API key (educational institutions only)

---

## 8. Error Handling

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | Success | Request completed successfully |
| 400 | Bad Request | Missing parameters, invalid values |
| 404 | Not Found | Invalid endpoint or asteroid ID not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Simulation error, service unavailable |

### Error Response Format

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

### Example Error Responses

**Missing Parameters**:
```json
{
  "error": "Missing required parameters: diameter, velocity, impactLocation"
}
```

**Invalid Values**:
```json
{
  "error": "Validation failed",
  "message": "Diameter must be between 1 and 100000 meters"
}
```

**Simulation Error**:
```json
{
  "error": "Simulation failed",
  "message": "Unable to calculate crater dimensions for ocean impact"
}
```

---

## 9. Educational Use Cases

### 9.1 Classroom Demonstration

Compare different asteroid sizes:

```bash
# Small asteroid (Chelyabinsk-size)
curl -X POST $API/api/simulate/impact -H "Content-Type: application/json" \
  -d '{"diameter": 18, "velocity": 19, "impactLocation": {"lat": 54.8, "lon": 61.1}}'

# Medium asteroid (Tunguska-size)
curl -X POST $API/api/simulate/impact -H "Content-Type: application/json" \
  -d '{"diameter": 50, "velocity": 15, "impactLocation": {"lat": 60.9, "lon": 101.9}}'

# Large asteroid (city-killer)
curl -X POST $API/api/simulate/impact -H "Content-Type: application/json" \
  -d '{"diameter": 140, "velocity": 20, "impactLocation": {"lat": 40.7, "lon": -74.0}}'
```

### 9.2 Research Project

Analyze deflection feasibility vs. warning time:

```python
import requests
import matplotlib.pyplot as plt

API = 'https://ca-api-92nppgw4.kinddesert-44c62b55.canadacentral.azurecontainerapps.io'

warning_times = [365, 730, 1825, 3650, 7300]  # 1, 2, 5, 10, 20 years
success_rates = []

for days in warning_times:
    response = requests.post(f'{API}/api/simulate/deflection', json={
        'asteroidDiameter': 140,
        'warningTime': days,
        'missDistance': 6400,
        'method': 'kinetic'
    })
    success_rates.append(response.json()['deflection']['successProbability'])

plt.plot([d/365 for d in warning_times], success_rates)
plt.xlabel('Warning Time (years)')
plt.ylabel('Success Probability')
plt.title('Deflection Success vs. Warning Time')
plt.show()
```

### 9.3 Public Outreach

Interactive web app for public education (see our live demo at https://meteormadness.earth)

---

## 10. Support and Contributing

### Documentation

- **Full API Spec**: [`swagger.yaml`](../asteroid-impact-simulator/api/swagger.yaml)
- **Scientific Details**: [`SCIENTIFIC_DOCUMENTATION.md`](./SCIENTIFIC_DOCUMENTATION.md)
- **Source Code**: https://github.com/TawbeBaker/Cyber-and-Space

### Reporting Issues

Found a bug or scientific inaccuracy? Please open an issue:
https://github.com/TawbeBaker/Cyber-and-Space/issues

### Educational Collaboration

For educational institutions interested in:
- Higher rate limits
- Custom scenarios
- Curriculum integration
- Research collaboration

Contact via GitHub or visit https://meteormadness.earth

---

## 11. Data Attribution

When using this API in publications, presentations, or projects, please cite:

```
Meteor Madness Team (2025). Asteroid Impact Simulator API.
NASA Space Apps Challenge 2025. https://meteormadness.earth

Data sources:
- NASA/JPL Near-Earth Object Program
- USGS Elevation and Earthquake Data
- Scientific models: Collins et al. (2005), Holsapple (1993)
```

---

## 12. License

This API is provided under the **MIT License (Educational Use)**.

See [LICENSE](../LICENSE) for full terms and scientific disclaimers.

**Key Points**:
- Free for educational and non-commercial use
- Attribution required
- No warranty for accuracy
- Not for operational planetary defense

---

**Happy Simulating! 🌠💥**

For live demonstrations, visit: **https://meteormadness.earth**

*Protecting Earth, one simulation at a time* 🌍🛡️

---

*NASA Space Apps Challenge 2025 - Meteor Madness*
*Educational API - Version 1.5.0*
