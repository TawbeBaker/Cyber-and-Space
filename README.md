# 🌌 Asteroid Impact Simulator - Meteor Madness

<div align="center">

![NASA Space Apps Challenge 2025](https://img.shields.io/badge/NASA%20Space%20Apps-2025-0B3D91?style=for-the-badge&logo=nasa)
![Version](https://img.shields.io/badge/version-1.5.1-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT%20Educational-green?style=for-the-badge)
![Status](https://img.shields.io/badge/status-Live-success?style=for-the-badge)

**🌍 Live Demo**: [meteormadness.earth](https://meteormadness.earth)
**🚀 Interactive API**: [Swagger UI](https://ca-api-92nppgw4.kinddesert-44c62b55.canadacentral.azurecontainerapps.io/api-docs/) ⭐ **NEW!**
**📚 API Guide**: [Usage Documentation](./docs/API_USAGE.md)
**🔬 Scientific Docs**: [Physics & Formulas](./docs/SCIENTIFIC_DOCUMENTATION.md)

</div>

---

## 📖 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [NASA Data Integration](#nasa-data-integration)
- [Scientific Basis](#scientific-basis)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Educational Use](#educational-use)
- [License](#license)

---

## 🎯 Overview

**Asteroid Impact Simulator** is an educational web application developed for the **NASA Space Apps Challenge 2025 - Meteor Madness** challenge. It provides:

- **Real-time asteroid impact simulations** with scientifically-based physics calculations
- **3D orbital trajectory visualizations** of 200+ Near-Earth Objects from NASA data
- **Planetary defense strategy simulations** (kinetic impactor, gravity tractor, nuclear)
- **Public educational API** for researchers, educators, and students
- **Interactive learning modules** covering impact physics, orbital mechanics, and planetary defense

### 🏆 Challenge Goals

This project demonstrates:
1. ✅ **Real NASA data integration** (NEO API, JPL SBDB, Horizons)
2. ✅ **Peer-reviewed physics models** (Collins et al. 2005, Holsapple 1993)
3. ✅ **Documented limitations** for scientific accuracy
4. ✅ **Public API** for educational reuse
5. ✅ **Open-source** with comprehensive documentation

---

## ✨ Features

### 🎯 Impact Simulation Mode

- **Customizable Parameters**:
  - Asteroid diameter: 1m - 100km
  - Impact velocity: 11 - 72 km/s (cosmic velocity range)
  - Impact angle: 0° - 90°
  - Asteroid density: 1,000 - 8,000 kg/m³ (C-type to M-type)
  - Impact location: Click anywhere on Earth

- **Calculated Results**:
  - Impact energy (Joules and megaton TNT equivalent)
  - Crater dimensions (diameter, depth, volume)
  - Seismic magnitude (Richter scale)
  - Blast zones (fireball, thermal, air blast, ground shock)
  - Population-based casualty estimates (45 major cities)

- **Real-World Comparisons**:
  - Tunguska (1908): 50m, 15 megatons
  - Chelyabinsk (2013): 18m, 500 kilotons
  - Chicxulub (66 Mya): 10km, 100 million megatons

### 🌌 3D Orbital Trajectory Mode

- **200 Real Asteroids** from NASA JPL SBDB (closest approaches 1975-2025)
- **Interactive Selector**: Choose 10-200 objects to visualize
- **Search & Filters**: Find by name, filter by hazard status
- **Keplerian Orbital Mechanics**: High-precision orbital calculations
- **Real-Time Earth Position**: See Earth's current location in orbit
- **Asteroid Details**: Orbital elements, diameter, magnitude, close approaches

### 🛡️ Planetary Defense

- **Deflection Methods**:
  - **Kinetic Impactor** (DART mission, 2022)
  - **Gravity Tractor** (slow, precise deflection)
  - **Nuclear** (last-resort option)

- **Simulates**:
  - Required delta-V for deflection
  - Mission cost and timeline
  - Success probability based on warning time
  - Momentum transfer calculations

### 📋 Pre-configured Scenarios

- Chelyabinsk (2013): 18m airburst over Russia
- Tunguska (1908): 50m forest devastation
- Apophis (future): 370m close approach
- Bennu (future): 500m potential impact
- Fictional large impactors (1-10km)

### 🎓 Educational Features

- **16 Learning Modules**: Impact physics, orbital mechanics, planetary defense
- **Defend Earth Game**: 6 progressive levels teaching deflection strategies
- **Interactive Tooltips**: Scientific explanations throughout
- **Mobile-Responsive**: Full functionality on iPhone/Android

---

## 🛰️ NASA Data Integration

### Data Sources (All Public & Attributed)

| Source | Data Used | Update Frequency | Attribution |
|--------|-----------|------------------|-------------|
| **NASA NEO API** | Real-time asteroid tracking, close approaches, PHAs | Daily | NASA/JPL-Caltech |
| **NASA JPL SBDB** | 200 closest asteroids, orbital elements, physical data | Static dataset (2025) | NASA/JPL |
| **NASA Horizons** | Orbital element reference | On-demand | NASA/JPL |
| **USGS Elevation API** | Terrain elevation at impact location | Real-time | USGS |
| **USGS Earthquakes** | Seismic magnitude comparison data | Real-time | USGS |

### API Endpoints Using NASA Data

```bash
# Get NASA NEO feed (next 7 days)
GET /api/neo/feed?start_date=2025-10-01&end_date=2025-10-07

# Get specific asteroid (e.g., Apophis)
GET /api/neo/asteroid/99942

# Get potentially hazardous asteroids
GET /api/neo/potentially-hazardous

# Get close approach events
GET /api/neo/close-approaches?dist_max=0.05
```

**Live API Base URL**: `https://ca-api-92nppgw4.kinddesert-44c62b55.canadacentral.azurecontainerapps.io`

See [API Usage Guide](./docs/API_USAGE.md) for full documentation.

---

## 🔬 Scientific Basis

### Physics Models (Peer-Reviewed)

#### Impact Energy
```
E = ½mv²
```
- **E**: Impact energy (Joules)
- **m**: Asteroid mass = ρ × (4/3)πr³
- **v**: Impact velocity (m/s)

#### Crater Formation (Collins et al., 2005)
```
D = 1.161 × ρ_a^0.33 × L^0.78 × v^0.44 × sin(θ)^0.33 / ρ_t^0.33
```
- **D**: Crater diameter (m)
- **L**: Impactor diameter (m)
- **ρ_a**: Asteroid density
- **ρ_t**: Target density
- **θ**: Impact angle

#### Seismic Magnitude (Schultz & Gault, 1975)
```
M = 0.67 × log₁₀(E) - 5.87
```

#### Orbital Mechanics (Keplerian Elements)
- **Newton-Raphson solver** for Kepler's equation
- **3 Euler rotations** for 3D position (Ω, i, ω)
- **Tolerance**: 1e-8 radians

### Limitations & Assumptions

**⚠️ Simplified Models** (See [Scientific Documentation](./docs/SCIENTIFIC_DOCUMENTATION.md) for full details):

- Assumes spherical, homogeneous asteroids
- Simplified atmospheric entry (no fragmentation modeling)
- Two-body orbital mechanics (no planetary perturbations)
- Statistical population casualties (not individual building/terrain)
- Idealized target properties (uniform rock or ocean)

**Accuracy**:
- ✅ Suitable for: Education, relative comparisons, concept demonstration
- ❌ NOT suitable for: Actual planetary defense, mission planning, policy decisions

### Validation

Compared against:
- **Imperial College London** "Impact Earth!" calculator
- **Purdue University** Impact Effects Program
- **Historical events**: Tunguska (1908), Chelyabinsk (2013)

**Agreement**: Within 20-30% for major parameters ✓

### Scientific References

1. Collins, G. S., Melosh, H. J., & Marcus, R. A. (2005). *Meteoritics & Planetary Science*, 40(6), 817-840.
2. Holsapple, K. A. (1993). *Annual Review of Earth and Planetary Sciences*, 21(1), 333-373.
3. Hills, J. G., & Goda, M. P. (1993). *The Astronomical Journal*, 105(3), 1114-1144.
4. Schultz, P. H., & Gault, D. E. (1975). *The Moon*, 12(2), 159-177.

**Full references**: [SCIENTIFIC_DOCUMENTATION.md](./docs/SCIENTIFIC_DOCUMENTATION.md)

---

## 🚀 Quick Start

### Production (Live)

Visit: **[https://meteormadness.earth](https://meteormadness.earth)**

### Local Development

**Prerequisites**:
- Node.js 16+
- npm 8+

**Backend API**:
```bash
cd asteroid-impact-simulator/api
npm install
npm start
# → http://localhost:7071
```

**Frontend**:
```bash
cd asteroid-impact-simulator/web
npm install
npm run dev
# → http://localhost:5173
```

**Environment Variables** (optional):

**API** (`api/.env`):
```bash
PORT=7071
NASA_API_KEY=your_key_here  # Optional (uses DEMO_KEY by default)
```

**Frontend** (`web/.env`):
```bash
VITE_API_URL=http://localhost:7071
```

---

## 📡 API Documentation

### Public Educational API

**🌐 Interactive Documentation**: [**Open Swagger UI**](https://ca-api-92nppgw4.kinddesert-44c62b55.canadacentral.azurecontainerapps.io/api-docs/) ⭐

**Base URL**: `https://ca-api-92nppgw4.kinddesert-44c62b55.canadacentral.azurecontainerapps.io`

**Rate Limit**: 100 requests / 15 minutes (per IP)

**No Authentication Required** (educational use)

**Quick Access**:
- 🏠 [API Landing Page](https://ca-api-92nppgw4.kinddesert-44c62b55.canadacentral.azurecontainerapps.io/) - Beautiful NASA-branded welcome page
- 📖 [Interactive Swagger UI](https://ca-api-92nppgw4.kinddesert-44c62b55.canadacentral.azurecontainerapps.io/api-docs/) - Try all endpoints live
- 💚 [Health Check](https://ca-api-92nppgw4.kinddesert-44c62b55.canadacentral.azurecontainerapps.io/api/health) - API status

### Quick Example

```bash
# Simulate 100m asteroid hitting Paris at 20 km/s
curl -X POST https://ca-api-92nppgw4.kinddesert-44c62b55.canadacentral.azurecontainerapps.io/api/simulate/impact \
  -H "Content-Type: application/json" \
  -d '{
    "diameter": 100,
    "velocity": 20,
    "impactLocation": {"lat": 48.8566, "lon": 2.3522}
  }'
```

### Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/simulate/impact` | POST | Simulate asteroid impact |
| `/api/simulate/deflection` | POST | Simulate planetary defense |
| `/api/neo/feed` | GET | NASA NEO feed |
| `/api/neo/asteroid/:id` | GET | Specific asteroid data |
| `/api/neo/potentially-hazardous` | GET | PHAs list |
| `/api/usgs/elevation` | GET | Terrain elevation |

### Documentation

- **🚀 Interactive Swagger UI**: [Live API Docs](https://ca-api-92nppgw4.kinddesert-44c62b55.canadacentral.azurecontainerapps.io/api-docs/) - **Try it now!**
- **📚 Full API Guide**: [docs/API_USAGE.md](./docs/API_USAGE.md) - Complete usage examples
- **📄 OpenAPI Spec**: [swagger.yaml](./asteroid-impact-simulator/api/swagger.yaml) - OpenAPI 3.0.3 specification
- **🔬 Scientific Details**: [docs/SCIENTIFIC_DOCUMENTATION.md](./docs/SCIENTIFIC_DOCUMENTATION.md) - Physics & formulas

### Code Examples

**JavaScript**:
```javascript
const axios = require('axios');

const result = await axios.post('https://ca-api-92nppgw4.kinddesert-44c62b55.canadacentral.azurecontainerapps.io/api/simulate/impact', {
  diameter: 140,
  velocity: 20,
  impactLocation: { lat: 40.7128, lon: -74.0060 } // NYC
});

console.log(`Energy: ${result.data.simulation.impactEnergy.megatonsTNT} MT`);
```

**Python**:
```python
import requests

response = requests.post('https://ca-api-92nppgw4.kinddesert-44c62b55.canadacentral.azurecontainerapps.io/api/simulate/impact', json={
    'diameter': 140,
    'velocity': 20,
    'impactLocation': {'lat': 35.6762, 'lon': 139.6503}  # Tokyo
})

print(f"Energy: {response.json()['simulation']['impactEnergy']['megatonsTNT']} MT")
```

---

## 🏗️ Architecture

```
asteroid-impact-simulator/
├── api/                          # Backend (Node.js/Express)
│   ├── src/
│   │   ├── index.js             # API server + CORS
│   │   ├── services/
│   │   │   ├── physicsEngine.js        # Impact physics calculations
│   │   │   ├── nasaNeoService.js       # NASA NEO API integration
│   │   │   ├── populationService.js    # Casualty estimation
│   │   │   └── usgsService.js          # USGS data integration
│   │   └── swagger.yaml         # OpenAPI documentation
│   ├── Dockerfile
│   └── package.json
│
├── web/                          # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Simulation3D.tsx           # 3D impact mode
│   │   │   ├── OrbitalViewMode.tsx        # 3D orbital view
│   │   │   ├── AsteroidSelector.tsx       # 10-200 selector
│   │   │   ├── ImpactMapLeaflet.tsx       # Leaflet map
│   │   │   ├── ParameterPanel.tsx         # Input controls
│   │   │   ├── ResultsDashboard.tsx       # Results display
│   │   │   ├── DefendEarthGame.tsx        # Game mode
│   │   │   └── Header.tsx                 # Nav (mobile menu)
│   │   ├── services/
│   │   │   ├── api.ts                     # API client
│   │   │   └── nasaDataLoader.ts          # Load 200 asteroids
│   │   ├── utils/
│   │   │   └── orbitalMechanics.ts        # Kepler solver
│   │   └── public/data/
│   │       └── asteroids.json             # 200 NEOs (8.6 MB)
│   ├── Dockerfile
│   └── package.json
│
├── terraform/                    # Infrastructure as Code
│   ├── main.tf                  # Azure resources
│   └── deploy.sh
│
├── docs/                         # Documentation
│   ├── API_USAGE.md             # Public API guide
│   ├── SCIENTIFIC_DOCUMENTATION.md  # Physics & formulas
│   └── DNS_CONFIGURATION_meteormadness.earth.md
│
└── LICENSE                       # MIT (Educational Use)
```

### Tech Stack

**Backend**:
- Node.js, Express
- Axios (NASA/USGS API calls)
- Application Insights (Azure monitoring)

**Frontend**:
- React 18, TypeScript, Vite
- Three.js, React Three Fiber (3D)
- Leaflet (maps)
- Tailwind CSS (styling)
- Zustand (state management)

**Hosting**:
- **Frontend**: Azure Static Web Apps
- **Backend API**: Azure Container Apps
- **Infrastructure**: Terraform
- **Custom Domain**: meteormadness.earth

---

## 🌐 Deployment

### Production URLs

- **Frontend**: https://meteormadness.earth
- **Frontend (www)**: https://www.meteormadness.earth
- **API**: https://ca-api-92nppgw4.kinddesert-44c62b55.canadacentral.azurecontainerapps.io

### Azure Resources

| Resource | Type | Region |
|----------|------|--------|
| `swa-asteroid-impact-92nppgw4` | Static Web App | Canada Central |
| `ca-api-92nppgw4` | Container App | Canada Central |
| `acrasteroidimpact92nppgw4` | Container Registry | Canada Central |

### Deploy Frontend

```bash
cd asteroid-impact-simulator/web
npm run build

# Get deployment token
export TOKEN=$(az staticwebapp secrets list --name swa-asteroid-impact-92nppgw4 --query "properties.apiKey" -o tsv)

# Deploy
npx @azure/static-web-apps-cli deploy dist --deployment-token "$TOKEN" --env default
```

### Deploy Backend API

```bash
cd asteroid-impact-simulator/api

# Build Docker image
docker build --platform linux/amd64 -t acrasteroidimpact92nppgw4.azurecr.io/asteroid-impact-api:v1.5.0 .

# Push to Azure Container Registry
az acr login --name acrasteroidimpact92nppgw4
docker push acrasteroidimpact92nppgw4.azurecr.io/asteroid-impact-api:v1.5.0

# Update Container App
az containerapp update \
  --name ca-api-92nppgw4 \
  --resource-group rg-asteroid-impact-92nppgw4 \
  --image acrasteroidimpact92nppgw4.azurecr.io/asteroid-impact-api:v1.5.0
```

---

## 🤝 Contributing

Contributions welcome! This is an educational open-source project.

### How to Contribute

1. **Report bugs/inaccuracies**: [GitHub Issues](https://github.com/TawbeBaker/Cyber-and-Space/issues)
2. **Improve physics models**: See [SCIENTIFIC_DOCUMENTATION.md](./docs/SCIENTIFIC_DOCUMENTATION.md)
3. **Add features**: Fork, develop, submit PR
4. **Educational use**: Adapt for your curriculum

### Development Workflow

```bash
# Fork the repo
git clone https://github.com/YOUR_USERNAME/Cyber-and-Space.git
cd Cyber-and-Space

# Create feature branch
git checkout -b feature/your-feature

# Make changes, commit
git add .
git commit -m "feat: your feature description"

# Push and create PR
git push origin feature/your-feature
```

### Code of Conduct

- Maintain scientific accuracy
- Document assumptions and limitations
- Provide references for models
- Write clear, educational code comments

---

## 🎓 Educational Use

### For Educators

**Recommended Use Cases**:
- Physics classes: Impact energy, momentum, scaling laws
- Astronomy classes: Orbital mechanics, NEOs, close approaches
- Programming classes: API integration, data visualization, React/TypeScript
- Public outreach: Planetarium shows, science fairs

**Curriculum Integration**:
- Compare asteroid sizes and energies
- Analyze deflection strategies
- Explore NASA datasets
- Understand planetary defense

### For Students

**Learning Outcomes**:
- Understand kinetic energy at cosmic scales
- Learn Keplerian orbital mechanics
- Explore real NASA data sources
- Practice API programming
- Visualize 3D orbital dynamics

### For Researchers

**Research Applications**:
- Benchmark simplified models vs. complex simulations
- Analyze deflection feasibility spaces
- Study orbital dynamics patterns
- Develop educational materials

**API Rate Limits**: Contact us for higher limits for research projects.

---

## 📄 License

**MIT License (Educational Use)**

Copyright (c) 2025 Meteor Madness Team - NASA Space Apps Challenge 2025

See [LICENSE](./LICENSE) for full terms.

### Key Points

✅ **Free for educational and non-commercial use**
✅ **Attribution required** (NASA data, scientific references)
✅ **Open source** - modify and share
❌ **No warranty** for accuracy
❌ **Not for operational use** (planetary defense missions)

### Data Attribution

**Required Citation**:
```
Asteroid Impact Simulator - Meteor Madness
NASA Space Apps Challenge 2025
Data sources: NASA/JPL-Caltech, USGS
https://meteormadness.earth
```

### Educational Disclaimer

This simulator uses **simplified physics models** for educational purposes. Results should NOT be used for:
- Actual planetary defense planning
- Published scientific research (without validation)
- Policy or risk assessment decisions

For real planetary defense:
- **NASA Planetary Defense Coordination Office**: https://www.nasa.gov/planetarydefense
- **ESA SSA Programme**: https://www.esa.int/Safety_Security/SSA_Programme

---

## 🙏 Acknowledgments

### Team

- **Development**: Meteor Madness Team
- **Orbital Mechanics Enhancement**: Luis (contributor)

### Data Providers

- **NASA/JPL**: NEO API, SBDB, Horizons System
- **USGS**: Elevation and Earthquake data

### Scientific Community

- Dr. Gareth Collins (Imperial College London) - Impact Earth calculator
- Dr. Keith Holsapple (University of Washington) - Scaling laws
- NASA DART Mission Team - Kinetic impactor validation

### Technologies

- React, Three.js, Leaflet
- Azure (hosting), Terraform (IaC)
- Claude Code (development assistance)

---

## 📞 Contact & Support

- **Live Demo**: https://meteormadness.earth
- **GitHub**: https://github.com/TawbeBaker/Cyber-and-Space
- **Issues**: https://github.com/TawbeBaker/Cyber-and-Space/issues
- **API Docs**: [docs/API_USAGE.md](./docs/API_USAGE.md)

### For Educational Institutions

Interested in collaboration, custom scenarios, or higher API limits?
Open an issue or visit our website.

---

## 🌟 Star Us!

If you find this project useful for education, please ⭐ star the repo!

---

<div align="center">

### 🌍 Protecting Earth, One Simulation at a Time 🛡️

**NASA Space Apps Challenge 2025 - Meteor Madness**

*Built with ❤️ for science education and planetary defense awareness*

[![NASA](https://img.shields.io/badge/Data-NASA%2FJPL-0B3D91?style=flat-square&logo=nasa)](https://api.nasa.gov/)
[![USGS](https://img.shields.io/badge/Data-USGS-006634?style=flat-square)](https://www.usgs.gov/)
[![Live](https://img.shields.io/badge/Demo-Live-success?style=flat-square)](https://meteormadness.earth)
[![License](https://img.shields.io/badge/License-MIT%20Educational-green?style=flat-square)](./LICENSE)

**Version 1.5.1** | October 2025

</div>
