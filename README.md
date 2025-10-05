# 🌌 Asteroid Impact Simulator - Meteor Madness

**Version**: 1.4.1
**Production**: https://meteormadness.earth | https://www.meteormadness.earth
**NASA Space Apps Challenge 2025**

---

## 🚀 Quick Start

### Production (Live)
```bash
# Ouvrir le site
open https://www.meteormadness.earth
```

### Développement Local
```bash
# Terminal 1 - API Backend
cd asteroid-impact-simulator/api
npm start

# Terminal 2 - Frontend
cd asteroid-impact-simulator/web
npm run dev
# → http://localhost:3000
```

---

## ✨ Fonctionnalités

### 🎯 Mode Simulation d'Impact
- Calculs physiques réalistes (Newtonian)
- Visualisation 3D de la trajectoire
- Détection d'impact avec Earth
- Calcul énergie, cratère, zones de blast
- Estimation des victimes (45 villes)
- Stratégies de mitigation (NASA)

### 🌍 Mode Vue Orbitale (v1.4)
- **200 astéroïdes** les plus proches (NASA JPL)
- Sélecteur interactif (10-200 objets)
- Recherche et filtres (nom, dangereux)
- Mécanique orbitale haute précision (Kepler)
- Visualisation 3D orbites (Three.js)
- Position Earth temps réel

### 📊 Autres Fonctionnalités
- Intégration API NASA NEO
- Données NASA SBDB (8.6 MB)
- Jeu "Defend Earth" (6 niveaux)
- 16 modules éducatifs
- Dark theme spatial

---

## 🏗️ Architecture

```
asteroid-impact-simulator/
├── api/                    # Backend Node.js/Express
│   ├── src/
│   │   ├── index.js       # Server + CORS
│   │   ├── services/
│   │   │   ├── physicsEngine.js
│   │   │   ├── nasaNeoService.js
│   │   │   └── usgsService.js
│   └── Dockerfile
│
└── web/                    # Frontend React + TypeScript
    ├── src/
    │   ├── components/
    │   │   ├── Simulation3D.tsx          # Mode impact
    │   │   ├── OrbitalViewMode.tsx       # Mode orbital
    │   │   ├── AsteroidSelector.tsx      # Sélecteur 10-200
    │   │   └── OrbitalTrajectories3D.tsx # Rendu 3D
    │   ├── services/
    │   │   └── nasaDataLoader.ts         # Load 200 asteroids
    │   ├── utils/
    │   │   └── orbitalMechanics.ts       # Kepler solver
    │   └── physics/
    │       └── AsteroidSimulation3D.ts   # Physique impact
    └── public/data/
        └── asteroids.json                # 200 asteroids NASA
```

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Three.js, Tailwind
- **Backend**: Node.js, Express
- **3D**: @react-three/fiber, @react-three/drei
- **Maps**: Leaflet, OpenStreetMap
- **State**: Zustand
- **Hosting**: Azure Static Web Apps + Container Apps

---

## 🌐 Déploiement

### URLs Production
- **Frontend**: https://meteormadness.earth
- **Frontend (www)**: https://www.meteormadness.earth
- **Frontend (Azure)**: https://kind-plant-00c23d60f.1.azurestaticapps.net
- **API**: https://ca-api-92nppgw4.kinddesert-44c62b55.canadacentral.azurecontainerapps.io

### Infrastructure Azure
- **Region**: Canada Central
- **Static Web App**: swa-asteroid-impact-92nppgw4
- **Container App**: ca-api-92nppgw4
- **Container Registry**: acrasteroidimpact92nppgw4.azurecr.io
- **Image actuelle**: asteroid-impact-api:v1.4.1

### Déployer une Nouvelle Version

**Frontend:**
```bash
cd asteroid-impact-simulator/web
npm run build

# Get token
export TOKEN=$(az staticwebapp secrets list --name swa-asteroid-impact-92nppgw4 --query "properties.apiKey" -o tsv)

# Deploy
npx @azure/static-web-apps-cli deploy --app-location dist --deployment-token $TOKEN --env production
```

**Backend API:**
```bash
cd asteroid-impact-simulator/api

# Build
docker build --platform linux/amd64 -t acrasteroidimpact92nppgw4.azurecr.io/asteroid-impact-api:v1.5 .

# Push
az acr login --name acrasteroidimpact92nppgw4
docker push acrasteroidimpact92nppgw4.azurecr.io/asteroid-impact-api:v1.5

# Update
az containerapp update \
  --name ca-api-92nppgw4 \
  --resource-group rg-asteroid-impact-92nppgw4 \
  --image acrasteroidimpact92nppgw4.azurecr.io/asteroid-impact-api:v1.5
```

---

## 📊 Données & Physique

### Dataset NASA
- **Source**: NASA JPL SBDB + NEO API
- **Astéroïdes**: 200 plus proches (1975-2025)
- **Taille**: 8.6 MB (asteroids.json)
- **Données**: Éléments orbitaux, diamètre, magnitude, approches proches

### Calculs Physiques

**Impact Simulation:**
- Énergie: E = ½mv²
- Cratère: Scaling laws (Collins et al., 2005)
- Blast zones: Fireball, thermal, air blast, radiation
- Magnitude sismique: M = 0.67 × log₁₀(E) - 5.87

**Orbital Mechanics:**
- Kepler equation: Newton-Raphson (tolérance 1e-8)
- Earth position: Erreur < 15,000 km
- Transformations: 3 rotations Euler (Ω, i, ω)
- Échelle: 1 unit = 1 million km

---

## 🔧 Configuration

### Variables d'Environnement

**API** (`api/.env`):
```bash
PORT=7071
NASA_API_KEY=your_key  # Optional
USGS_API_URL=https://earthquake.usgs.gov/fdsnws/event/1/query
```

**CORS** (déjà configuré):
```javascript
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://kind-plant-00c23d60f.1.azurestaticapps.net',
    'https://meteormadness.earth',
    'https://www.meteormadness.earth'
];
```

---

## 📝 Versions Git

### Tags Disponibles
```bash
git tag -l
# v1.4.1-production  ← Actuel (custom domain)
# v1.4-production
# v1.4-dev
# v1.3-luis-integration
# v1.2.1-production
# ...
```

### Voir une Version
```bash
# Production actuelle
git show v1.4.1-production

# Dev actuelle
git checkout main
```

---

## 🎓 Crédits

### Code
- **Luis**: Visualisation orbitale avancée, mécanique Kepler, dataset 200 asteroids
- **Repo Luis**: https://github.com/TawbeBaker/Cyber-and-Space/tree/main/Hackathon

### APIs & Données
- **NASA JPL**: Small-Body Database (SBDB)
- **NASA NEO**: Near-Earth Object API
- **USGS**: Elevation API

### Technologies
- **Three.js**: Visualisation 3D
- **React Three Fiber**: React + Three.js
- **Leaflet**: Maps interactives
- **Azure**: Cloud hosting

---

## 📞 Support

### Vérifier Status
```bash
# Frontend
curl -I https://meteormadness.earth

# API Health
curl https://ca-api-92nppgw4.kinddesert-44c62b55.canadacentral.azurecontainerapps.io/api/health
```

### Logs Azure
```bash
az containerapp logs show \
  --name ca-api-92nppgw4 \
  --resource-group rg-asteroid-impact-92nppgw4 \
  --tail 50
```

### Issues
Pour bugs ou questions, voir les commits récents:
```bash
git log --oneline -10
```

---

## 📜 Licence

**NASA Space Apps Challenge 2025** - Projet éducatif

---

**Dernière mise à jour**: 5 octobre 2025
**Version**: 1.4.1
**Status**: ✅ Production Ready
**URL**: https://meteormadness.earth

🤖 *Built with Claude Code*
