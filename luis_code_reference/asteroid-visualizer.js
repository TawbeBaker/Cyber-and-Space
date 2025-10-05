/**
 * AsteroidVisualizer - Visualizador 3D de trayectorias asteroidales
 * Usa Three.js para renderizado 3D del sistema solar y asteroides NEO
 * 
 * @version 2.0 - Código modularizado
 * @requires Three.js r158
 * @requires TrajectorySimulator
 */

class AsteroidVisualizer {
    constructor() {
        // Componentes Three.js
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.earth = null;
        this.gridHelper = null;
        
        // Simulador de trayectorias
        this.simulator = new TrajectorySimulator();
        
        // Datos de asteroides
        this.asteroids = [];
        this.orbitLines = new Map();
        this.asteroidMeshes = new Map();
        
        // Control de tiempo
        this.currentTime = new Date();
        this.timeSpeed = 1/24; // Velocidad inicial: 1 hora por frame
        this.isPaused = true;
        
        // Control Jog/Shuttle
        this.jogValue = 0; // -100 a 100
        this.isJogging = false;
        this.jogReturnInterval = null;
        
        // Visualización
        this.showOrbits = true;
        this.scale = 1 / 1000000; // Escala para visualización (km a unidades Three.js)
        
        // Sistema de cámara
        this.selectedAsteroid = null;
        this.cameraFollowMode = false;
        this.cameraOffset = new THREE.Vector3(50, 50, 50);
        this.cameraTarget = new THREE.Vector3(0, 0, 0);
        
        // Distancia Tierra-Asteroide
        this.currentDistance = 0; // en km
        
        // Impactor-2025 Mode state
        this.impactorMode = false;
        this.previousCameraPosition = null;
        this.previousCameraTarget = null;
        this.hiddenAsteroids = []; // Store references to hidden asteroids
        this.hiddenOrbits = []; // Store references to hidden orbits
        
        // Kinetic Impactor simulation
        this.kineticImpactor = new KineticImpactor();
        this.impactSimulation = null; // Store simulation results
        this.modifiedOrbitLine = null; // Store modified orbit visualization
        
        // Collision countdown
        this.collisionDate = null; // Date object for collision
        this.countdownInterval = null; // Interval ID for countdown updates
        
        // API de NASA
        this.NASA_API_KEY = 'FtlbR4MhcVSE1Z3DYcoGeBqQqQtfzKIOerjefTbl';
        this.NASA_LOOKUP_URL = 'https://api.nasa.gov/neo/rest/v1/neo/';
    }

    /**
     * Inicializa el visualizador
     */
    async init() {
        try {
            console.log('🔧 Inicializando Three.js...');
            this.initThreeJS();
            
            console.log('🌍 Creando sistema solar...');
            this.createSolarSystem();
            
            console.log('🎮 Configurando controles...');
            this.setupControls();
            
            console.log('🔌 Configurando event listeners...');
            this.setupEventListeners();
            
            console.log('📅 Actualizando date picker...');
            this.updateDatePicker();
            
            console.log('▶️ Iniciando animación...');
            this.animate();
            
            // Ocultar loading, mostrar controles
            console.log('👁️ Mostrando paneles de control...');
            const loading = document.getElementById('loading');
            const controlsPanel = document.getElementById('controls-panel');
            const infoPanel = document.getElementById('info-panel');
            
            if (loading) loading.style.display = 'none';
            if (controlsPanel) {
                controlsPanel.style.display = 'block';
                controlsPanel.style.visibility = 'visible';
                console.log('✅ Panel de controles visible');
            } else {
                console.error('❌ No se encontró el panel de controles');
            }
            
            if (infoPanel) {
                infoPanel.style.display = 'block';
                infoPanel.style.visibility = 'visible';
                console.log('✅ Panel de info visible');
            } else {
                console.error('❌ No se encontró el panel de info');
            }
            
            console.log('✅ Visualizador inicializado correctamente');
        } catch (error) {
            console.error('❌ Error durante la inicialización:', error);
            console.error('Stack:', error.stack);
        }
    }

    /**
     * Inicializa la escena Three.js
     */
    initThreeJS() {
        // Escena
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000511);

        // Cámara
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            10000
        );
        this.camera.position.set(300, 200, 300);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);

        // Luces
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);

        const sunLight = new THREE.PointLight(0xffffff, 2, 2000);
        sunLight.position.set(0, 0, 0);
        this.scene.add(sunLight);

        // Estrellas
        this.createStarField();

        // Resize handler
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    /**
     * Crea el campo de estrellas de fondo
     */
    createStarField() {
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 5000;
        const positions = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount * 3; i++) {
            positions[i] = (Math.random() - 0.5) * 5000;
        }

        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 2,
            sizeAttenuation: false
        });

        const stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(stars);
    }

    /**
     * Crea el sistema solar (Sol y Tierra)
     */
    createSolarSystem() {
        // Sol
        const sunGeometry = new THREE.SphereGeometry(10, 32, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00
        });
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);
        this.scene.add(sun);

        // Tierra
        const earthGeometry = new THREE.SphereGeometry(5, 32, 32);
        const earthMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x0077ff,  // Azul brillante para la Tierra
            emissive: 0x001133
        });
        this.earth = new THREE.Mesh(earthGeometry, earthMaterial);
        this.scene.add(this.earth);

        // Órbita de la Tierra
        this.createEarthOrbit();

        // Cuadrícula (invisible por defecto)
        const gridHelper = new THREE.GridHelper(500, 50, 0x444444, 0x222222);
        gridHelper.visible = false;
        this.gridHelper = gridHelper;
        this.scene.add(gridHelper);
    }

    /**
     * Crea la órbita visual de la Tierra
     */
    createEarthOrbit() {
        const points = [];
        const segments = 128;
        const radius = this.simulator.AU * this.scale;

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            points.push(new THREE.Vector3(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            ));
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: 0x00ff00,  // Verde para la órbita de la Tierra
            transparent: true,
            opacity: 0.7      // Opacidad visible
        });
        this.earthOrbit = new THREE.Line(geometry, material);
        this.scene.add(this.earthOrbit);
        
        console.log('🌍 Earth orbit created and stored in this.earthOrbit');
    }

    /**
     * Configura los controles de cámara (mouse)
     */
    setupControls() {
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };

        this.renderer.domElement.addEventListener('mousedown', (e) => {
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            // Desactivar seguimiento cuando se mueve la cámara manualmente
            if (this.cameraFollowMode) {
                this.cameraFollowMode = false;
                this.updateFollowButton();
            }

            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;

            // Calcular posición relativa al target actual
            const relativePos = new THREE.Vector3().subVectors(this.camera.position, this.cameraTarget);
            const spherical = new THREE.Spherical();
            spherical.setFromVector3(relativePos);

            spherical.theta -= deltaX * 0.01;
            spherical.phi += deltaY * 0.01;
            spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

            relativePos.setFromSpherical(spherical);
            this.camera.position.copy(this.cameraTarget).add(relativePos);
            this.camera.lookAt(this.cameraTarget);

            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        this.renderer.domElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            // Desactivar seguimiento cuando se hace zoom manualmente
            if (this.cameraFollowMode) {
                this.cameraFollowMode = false;
                this.updateFollowButton();
            }

            // Calcular dirección desde target a cámara
            const direction = new THREE.Vector3().subVectors(this.camera.position, this.cameraTarget);
            const distance = direction.length();
            const newDistance = Math.max(20, Math.min(1000, distance + e.deltaY * 0.5));
            
            // Mantener la dirección, solo cambiar distancia
            direction.normalize().multiplyScalar(newDistance);
            this.camera.position.copy(this.cameraTarget).add(direction);
            this.camera.lookAt(this.cameraTarget);
        });
    }

    /**
     * Configura los event listeners de la UI
     */
    setupEventListeners() {
        // Slider de filtrado por distancia
        const asteroidFilterSlider = document.getElementById('asteroid-filter-slider');
        const asteroidFilterValue = document.getElementById('asteroid-filter-value');
        
        if (asteroidFilterSlider) {
            asteroidFilterSlider.addEventListener('input', (e) => {
                const limit = parseInt(e.target.value);
                asteroidFilterValue.textContent = limit;
                this.filterAsteroidsByDistance(limit);
            });
        }
        
        // Control de tiempo
        const playPauseBtn = document.getElementById('play-pause-btn');
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => {
                this.togglePlayPause();
            });
        } else {
            console.warn('⚠️ Botón play-pause no encontrado');
        }

        const resetTimeBtn = document.getElementById('reset-time-btn');
        if (resetTimeBtn) {
            resetTimeBtn.addEventListener('click', () => {
                this.resetTime();
            });
        } else {
            console.warn('⚠️ Botón reset-time no encontrado');
        }

        // Saltar a fecha específica
        const jumpToDateBtn = document.getElementById('jump-to-date');
        if (jumpToDateBtn) {
            jumpToDateBtn.addEventListener('click', () => {
                const dateValue = document.getElementById('date-picker').value;
                if (dateValue) {
                    this.jumpToDate(new Date(dateValue));
                }
            });
        } else {
            console.warn('⚠️ Botón jump-to-date no encontrado');
        }

        // Enter en el date picker
        const datePicker = document.getElementById('date-picker');
        if (datePicker) {
            datePicker.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const dateValue = e.target.value;
                    if (dateValue) {
                        this.jumpToDate(new Date(dateValue));
                    }
                }
            });
        } else {
            console.warn('⚠️ Date picker no encontrado');
        }

        // Control JOG para avanzar/retroceder tiempo manualmente
        const jogControl = document.getElementById('jog-control');
        const jogStatus = document.getElementById('jog-status');
        
        if (jogControl && jogStatus) {
            jogControl.addEventListener('input', (e) => {
                this.jogValue = parseInt(e.target.value);
                this.isJogging = true;
                
                // Limpiar intervalo de retorno si existe
                if (this.jogReturnInterval) {
                    clearInterval(this.jogReturnInterval);
                    this.jogReturnInterval = null;
                }
                
                // Actualizar display
                if (this.jogValue === 0) {
                    jogStatus.textContent = 'Centro - Velocidad Normal';
                    jogStatus.style.color = '#4a90e2';
                } else if (this.jogValue < 0) {
                    const speed = Math.abs(this.jogValue);
                    jogStatus.textContent = `⏪ Retrocediendo ${speed}%`;
                    jogStatus.style.color = '#e74c3c';
                } else {
                    jogStatus.textContent = `⏩ Avanzando ${this.jogValue}%`;
                    jogStatus.style.color = '#2ecc71';
                }
            });
            
            // Al soltar el jog, volver al centro gradualmente
            jogControl.addEventListener('mouseup', () => {
                this.startJogReturn();
            });
            
            jogControl.addEventListener('touchend', () => {
                this.startJogReturn();
            });
            
            // También manejar cuando el mouse sale del control
            jogControl.addEventListener('mouseleave', (e) => {
                if (e.buttons === 1) {
                    this.startJogReturn();
                }
            });
        } else {
            console.warn('⚠️ Control Jog/Shuttle no encontrado');
        }

        const timeSpeedSlider = document.getElementById('time-speed-slider');
        const timeSpeedDisplay = document.getElementById('time-speed');
        if (timeSpeedSlider && timeSpeedDisplay) {
            timeSpeedSlider.addEventListener('input', (e) => {
                const sliderValue = parseFloat(e.target.value);
                
                // Mapear slider (0-120) a velocidad (0.5-10 horas/frame)
                // 0 -> 0.5 horas, 60 -> 3 horas, 120 -> 10 horas
                if (sliderValue <= 60) {
                    // De 0 a 60: mapea de 0.5 a 3 horas
                    this.timeSpeed = (0.5 + (sliderValue / 60) * 2.5) / 24; // Convertir a días
                } else {
                    // De 60 a 120: mapea de 3 a 10 horas
                    this.timeSpeed = (3 + ((sliderValue - 60) / 60) * 7) / 24; // Convertir a días
                }
                
                // Mostrar siempre en horas/frame para este rango
                const hoursPerFrame = this.timeSpeed * 24;
                timeSpeedDisplay.textContent = `${hoursPerFrame.toFixed(1)} horas/frame`;
            });
        } else {
            console.warn('⚠️ Time speed slider no encontrado');
        }

        // Controles de cámara
        const focusEarthBtn = document.getElementById('focus-earth-btn');
        if (focusEarthBtn) {
            focusEarthBtn.addEventListener('click', () => {
                this.focusOnEarth();
            });
        }

        const resetCameraBtn = document.getElementById('reset-camera-btn');
        if (resetCameraBtn) {
            resetCameraBtn.addEventListener('click', () => {
                this.resetCamera();
            });
        }

        // Toggle panels (arreglado)
        const toggleControlsBtn = document.getElementById('toggle-controls');
        if (toggleControlsBtn) {
            toggleControlsBtn.addEventListener('click', function() {
                const panel = document.getElementById('controls-panel');
                const btn = this;
                
                if (panel.classList.contains('hidden')) {
                    panel.classList.remove('hidden');
                    btn.textContent = '◀ Ocultar Controles';
                } else {
                    panel.classList.add('hidden');
                    btn.textContent = '▶ Mostrar Controles';
                }
            });
        }

        const toggleInfoBtn = document.getElementById('toggle-info');
        if (toggleInfoBtn) {
            toggleInfoBtn.addEventListener('click', function() {
                const panel = document.getElementById('info-panel');
                const btn = this;
                
                if (panel.classList.contains('hidden')) {
                    panel.classList.remove('hidden');
                    btn.textContent = 'Ocultar Info ▶';
                } else {
                    panel.classList.add('hidden');
                    btn.textContent = '◀ Mostrar Info';
                }
            });
        }
        
        // Impactor-2025 Mode button
        const impactorModeBtn = document.getElementById('impactor-mode-btn');
        if (impactorModeBtn) {
            impactorModeBtn.addEventListener('click', () => {
                this.toggleImpactorMode();
            });
        } else {
            console.warn('⚠️ Impactor Mode button not found');
        }
        
        // Kinetic Impactor simulation controls
        const betaSlider = document.getElementById('impactor-beta');
        const betaValue = document.getElementById('beta-value');
        if (betaSlider && betaValue) {
            betaSlider.addEventListener('input', (e) => {
                betaValue.textContent = parseFloat(e.target.value).toFixed(1);
            });
        }
        
        const simulateBtn = document.getElementById('simulate-impact-btn');
        if (simulateBtn) {
            simulateBtn.addEventListener('click', () => {
                this.simulateKineticImpact();
            });
        } else {
            console.warn('⚠️ Simulate Impact button not found');
        }
        
        const resetOrbitBtn = document.getElementById('reset-orbit-btn');
        if (resetOrbitBtn) {
            resetOrbitBtn.addEventListener('click', () => {
                this.resetOrbit();
            });
        } else {
            console.warn('⚠️ Reset Orbit button not found');
        }
        
        console.log('✅ Todos los event listeners configurados');
        
        // Filtros (DESHABILITADO - UI removida)
        /*
        document.getElementById('apply-filters').addEventListener('click', () => {
            this.applyFilters();
        });
        */
    }

    /**
     * Obtiene datos completos de un asteroide usando NASA Lookup API
     * @param {string} asteroidId - ID del asteroide
     * @returns {Promise<Object>} - Datos completos del asteroide
     */
    async fetchAsteroidData(asteroidId) {
        const url = `${this.NASA_LOOKUP_URL}${asteroidId}?api_key=${this.NASA_API_KEY}`;
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            let data = await response.json();
            
            return data;
            
        } catch (error) {
            console.error(`Error fetching asteroid ${asteroidId}:`, error);
            throw error;
        }
    }

    /**
     * [DESHABILITADO] Carga un archivo JSON de NASA
     * Ya no se usa - solo se cargan asteroides desde top200_closest_asteroids_FINAL.json
     */
    /*
    async loadNASAFile(file) {
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            this.showNotification('Loading...', 'Processing NASA data...');

            // Limpiar asteroides anteriores
            this.clearAsteroids();

            // Detectar formato de la API
            let neoList = [];
            const nearEarthObjects = data.near_earth_objects;
            
            if (Array.isArray(nearEarthObjects)) {
                // Formato Browse: { near_earth_objects: [...] }
                neoList = nearEarthObjects;
            } else if (typeof nearEarthObjects === 'object') {
                // Formato Feed: { near_earth_objects: { "2025-10-05": [...], "2025-10-04": [...] } }
                // Combinar todos los arrays de diferentes fechas
                neoList = Object.values(nearEarthObjects).flat();
            }

            let loadedCount = 0;
            let hazardousCount = 0;
            let skippedCount = 0;
            let fetchedCount = 0;

            // Limitar a 50 asteroides para rendimiento
            const limitedList = neoList.slice(0, 50);
            
            // Procesar asteroides (puede requerir llamadas a la API)
            for (let i = 0; i < limitedList.length; i++) {
                const neo = limitedList[i];
                
                try {
                    let asteroidData = neo;
                    
                    // ✨ NUEVO: Si no tiene orbital_data, solicitar con Lookup API
                    if (!neo.orbital_data) {
                        console.log(`🔄 Asteroide ${neo.name} (ID: ${neo.id}) sin orbital_data, solicitando a NASA...`);
                        
                        this.showNotification(
                            '🔄 Obteniendo datos', 
                            `Solicitando datos orbitales de ${neo.name} (${i + 1}/${limitedList.length})...`,
                            0
                        );
                        
                        try {
                            const fullData = await this.fetchAsteroidData(neo.id);
                            if (fullData && fullData.orbital_data) {
                                asteroidData = fullData;
                                fetchedCount++;
                                console.log(`✅ Datos orbitales obtenidos para ${neo.name}`);
                            } else {
                                console.warn(`❌ No se pudieron obtener datos orbitales para ${neo.name}`);
                                skippedCount++;
                                continue;
                            }
                        } catch (fetchError) {
                            console.error(`❌ Error al obtener datos de ${neo.name}:`, fetchError);
                            skippedCount++;
                            continue;
                        }
                    }
                    
                    const asteroid = this.simulator.loadNASAData(asteroidData);
                    this.asteroids.push(asteroid);
                    this.createAsteroidVisualization(asteroid);
                    
                    loadedCount++;
                    if (asteroid.isHazardous) hazardousCount++;
                    
                } catch (error) {
                    console.warn('Error procesando asteroide:', error);
                    skippedCount++;
                }
            }
            
            // Mensajes informativos
            if (fetchedCount > 0) {
                console.log(`✨ ${fetchedCount} asteroides enriquecidos con datos de NASA Lookup API`);
            }
            
            if (skippedCount > 0 && loadedCount === 0) {
                this.showNotification(
                    '⚠️ Error de red', 
                    `No se pudieron obtener datos orbitales de NASA. Verifique su conexión a internet.`,
                    8000
                );
            } else if (skippedCount > 0) {
                console.warn(`⚠️ ${skippedCount} asteroides omitidos`);
            }

            // Actualizar UI
            document.getElementById('total-asteroids').textContent = loadedCount;
            document.getElementById('hazardous-count').textContent = hazardousCount;
            this.updateAsteroidList();

            this.showNotification('Success!', `${loadedCount} asteroids loaded`, 2000);

        } catch (error) {
            console.error('Error cargando archivo:', error);
            this.showNotification('Error', 'Could not load JSON file', 3000);
        }
    }
    */

    /**
     * Crea la visualización 3D de un asteroide
     * @param {Object} asteroid - Datos del asteroide
     */
    createAsteroidVisualization(asteroid) {
        console.log(`🎨 Creando visualización para ${asteroid.name}...`);
        
        // Generar órbita completa basada en el período orbital
        const startDate = new Date();
        
        // Calcular período orbital en días
        const orbitalPeriodDays = asteroid.elements.period / 86400;
        console.log(`  Período orbital: ${orbitalPeriodDays.toFixed(1)} días`);
        
        // Generar la órbita completa (un período completo)
        const endDate = new Date(startDate.getTime() + orbitalPeriodDays * 24 * 60 * 60 * 1000);
        
        // Número de segmentos proporcional al período
        const segments = Math.min(Math.max(64, Math.floor(orbitalPeriodDays / 7)), 256);
        const timeStep = (orbitalPeriodDays * 86400) / segments;
        
        const trajectory = this.simulator.generateTrajectory(asteroid, startDate, endDate, timeStep);

        // Crear línea de órbita COMPLETA
        const points = trajectory.map(point => new THREE.Vector3(
            point.heliocentric.x * this.scale,
            point.heliocentric.z * this.scale,
            point.heliocentric.y * this.scale
        ));

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const color = 0x00aaff;  // AZUL BRILLANTE para órbitas de asteroides (original)
        const material = new THREE.LineBasicMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.6,  // Más visible que antes
            linewidth: 2
        });

        const orbitLine = new THREE.Line(geometry, material);
        orbitLine.visible = this.showOrbits;
        this.scene.add(orbitLine);
        this.orbitLines.set(asteroid.id, orbitLine);
        
        // Log detallado de coordenadas para diagnóstico
        if (points.length > 0) {
            const firstPoint = points[0];
            const midPoint = points[Math.floor(points.length / 2)];
            console.log(`  ✅ Órbita creada: ${points.length} puntos, visible=${orbitLine.visible}`);
            console.log(`     Primer punto: (${firstPoint.x.toFixed(2)}, ${firstPoint.y.toFixed(2)}, ${firstPoint.z.toFixed(2)})`);
            console.log(`     Punto medio: (${midPoint.x.toFixed(2)}, ${midPoint.y.toFixed(2)}, ${midPoint.z.toFixed(2)})`);
            console.log(`     Escala actual: ${this.scale}`);
        }

        // Crear mesh del asteroide
        const size = Math.max(0.5, asteroid.diameter.avg * 0.01);
        const asteroidGeometry = new THREE.SphereGeometry(size, 8, 8);
        const asteroidMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xff0000,  // Rojo para todos los asteroides
            emissive: asteroid.isHazardous ? 0x440000 : 0x220000
        });

        const asteroidMesh = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
        this.scene.add(asteroidMesh);
        this.asteroidMeshes.set(asteroid.id, {
            mesh: asteroidMesh,
            trajectory: trajectory,
            orbitalPeriod: orbitalPeriodDays
        });
    }

    /**
     * Actualiza la lista de asteroides en la UI
     */
    updateAsteroidList() {
        const listContainer = document.getElementById('asteroid-list');
        listContainer.innerHTML = '';

        this.asteroids.forEach(asteroid => {
            const item = document.createElement('div');
            item.className = 'asteroid-item' + (asteroid.isHazardous ? ' hazardous' : '');
            item.innerHTML = `
                <div class="asteroid-name">${asteroid.name}</div>
                <div class="asteroid-info">
                    Ø ${asteroid.diameter.avg.toFixed(1)} km
                    ${asteroid.isHazardous ? ' ⚠️' : ''}
                </div>
            `;
            
            item.addEventListener('click', () => {
                this.selectAsteroid(asteroid);
            });
            
            listContainer.appendChild(item);
        });
    }

    /**
     * Selecciona un asteroide para seguimiento
     * @param {Object} asteroid - Asteroide seleccionado
     */
    selectAsteroid(asteroid, event = null) {
        console.log(`🎯 Seleccionando asteroide: ${asteroid.name}`);
        
        this.selectedAsteroid = asteroid;
        this.cameraFollowMode = true;

        // 🚀 Show Kinetic Impactor panel
        this.showImpactPanel(asteroid);

        // 🚀 SALTAR AUTOMÁTICAMENTE A LA FECHA DE ACERCAMIENTO
        if (asteroid.closeApproaches && asteroid.closeApproaches.length > 0) {
            const approachDate = asteroid.closeApproaches[0].date;
            const approachJD = asteroid.closeApproaches[0].julianDate;
            
            // 📅 Ajustar a 2 semanas (14 días) ANTES del acercamiento
            const twoWeeksBefore = new Date(approachDate);
            twoWeeksBefore.setDate(twoWeeksBefore.getDate() - 30);
            
            console.log(`📅 Acercamiento de ${asteroid.name}:`);
            console.log(`   Fecha de acercamiento: ${approachDate.toLocaleString('es-ES')}`);
            console.log(`   Saltando a 2 semanas antes: ${twoWeeksBefore.toLocaleString('es-ES')}`);
            console.log(`   Distance at approach: ${(asteroid.closeApproaches[0].distance / 1e6).toFixed(2)} million km`);
            
            // ⚠️ DEBUG: Verificar conversión de fecha
            this.jumpToDate(twoWeeksBefore);
            
            // ✅ Calcular distancia EN LA FECHA ACTUAL (2 semanas antes)
            const actualJD = this.simulator.dateToJulian(this.currentTime);
            const position = this.simulator.calculatePositionAtTime(asteroid, actualJD);
            this.currentDistance = position.earthDistance;
            this.updateDistanceDisplay();
            
            console.log(`   ✅ Fecha después de salto: ${this.currentTime.toISOString()}`);
            console.log(`   ✅ JD después de salto: ${actualJD.toFixed(4)}`);
            console.log(`   ⚠️ Diferencia JD: ${(actualJD - approachJD).toFixed(4)} (debería ser ~0)`);
            console.log(`   📏 Calculated distance: ${(this.currentDistance / 1e6).toFixed(2)} million km`);
        }

        // Actualizar UI
        document.querySelectorAll('.asteroid-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        if (event && event.target) {
            const asteroidItem = event.target.closest('.asteroid-item');
            if (asteroidItem) {
                asteroidItem.classList.add('selected');
            }
        }

        // Mostrar detalles
        const detailsContainer = document.getElementById('asteroid-details');
        detailsContainer.innerHTML = `
            <div class="info-card">
                <h3 style="margin-top: 0;">${asteroid.name}</h3>
                <button id="follow-camera-btn" style="width: 100%; padding: 10px; margin-bottom: 10px; font-size: 14px; cursor: pointer; border: none; border-radius: 6px; color: white; background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); transition: all 0.3s ease;">
                    🎥 Stop Following
                </button>
                <div class="info-row">
                    <span class="info-label">ID:</span>
                    <span class="info-value">${asteroid.id}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Diameter:</span>
                    <span class="info-value">${asteroid.diameter.min.toFixed(2)} - ${asteroid.diameter.max.toFixed(2)} km</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Hazardous:</span>
                    <span class="info-value">${asteroid.isHazardous ? '⚠️ YES' : '✅ NO'}</span>
                </div>
            </div>
            
            <div class="info-card" style="background: rgba(74, 144, 226, 0.1); border-left: 3px solid #4a90e2;">
                <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #4a90e2;">📏 Distance to Earth</h3>
                <div style="text-align: center; padding: 10px;">
                    <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;" id="current-distance">
                        Calculating...
                    </div>
                    <div style="font-size: 11px; color: #888;">
                        (real-time update)
                    </div>
                </div>
                <div style="font-size: 11px; color: #888; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
                    💡 Reference: Earth-Moon distance = 384.4 thousand km
                </div>
            </div>
            
            <h3>🛰️ Orbital Elements</h3>
            <div class="info-card">
                <div class="info-row">
                    <span class="info-label">Semi-major Axis:</span>
                    <span class="info-value">${(asteroid.elements.a / this.simulator.AU).toFixed(3)} AU</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Eccentricity:</span>
                    <span class="info-value">${asteroid.elements.e.toFixed(4)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Inclination:</span>
                    <span class="info-value">${(asteroid.elements.i * 180 / Math.PI).toFixed(2)}°</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Orbital Period:</span>
                    <span class="info-value">${(asteroid.elements.period / 86400).toFixed(1)} days (${(asteroid.elements.period / 86400 / 365.25).toFixed(2)} years)</span>
                </div>
            </div>

            ${asteroid.closeApproaches.length > 0 ? `
                <h3>📅 Close Approaches</h3>
                ${asteroid.closeApproaches.slice(0, 5).map((approach, index) => `
                    <div class="info-card" style="position: relative;">
                        <div class="info-row">
                            <span class="info-label">Date:</span>
                            <span class="info-value">${approach.date.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                            })}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Distance:</span>
                            <span class="info-value">${this.formatDistance(approach.distance)} 
                                ${approach.distance < 384400 ? '⚠️' : ''}
                            </span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Velocity:</span>
                            <span class="info-value">${approach.velocity.toFixed(2)} km/s</span>
                        </div>
                        <button class="jump-to-approach" data-approach-index="${index}" 
                            style="width: 100%; margin-top: 8px; padding: 8px; font-size: 12px;">
                            🎯 View this Approach
                        </button>
                    </div>
                `).join('')}
            ` : ''}
        `;

        // Añadir event listeners
        setTimeout(() => {
            const followBtn = document.getElementById('follow-camera-btn');
            if (followBtn) {
                followBtn.addEventListener('click', () => {
                    this.toggleCameraFollow();
                });
            }

            document.querySelectorAll('.jump-to-approach').forEach(button => {
                button.addEventListener('click', (e) => {
                    const index = parseInt(e.target.dataset.approachIndex);
                    const approach = asteroid.closeApproaches[index];
                    if (approach) {
                        // Saltar a 1 día antes del acercamiento
                        const targetDate = new Date(approach.date.getTime() - 24 * 60 * 60 * 1000);
                        this.jumpToDate(targetDate);
                        
                        // ▶️ INICIAR SIMULACIÓN AUTOMÁTICAMENTE
                        this.isPaused = false;
                        document.getElementById('play-pause-btn').textContent = '⏸️ Pausa';
                        
                        // Configurar velocidad lenta para ver la aproximación (1 hora por frame)
                        this.setSpeed(1/24);
                        
                        // Activar seguimiento de cámara
                        this.cameraFollowMode = true;
                        this.updateFollowButton();
                        
                        console.log(`🚀 Reproduciendo acercamiento de ${asteroid.name} - ${approach.date.toLocaleDateString('es-ES')}`);
                    }
                });
            });
        }, 100);

        // Enfocar cámara
        const meshData = this.asteroidMeshes.get(asteroid.id);
        if (meshData) {
            const pos = meshData.mesh.position;
            const distance = 50;
            this.cameraTarget.copy(pos);
            this.camera.position.set(pos.x + distance, pos.y + distance, pos.z + distance);
            this.camera.lookAt(pos);
        }
    }

    togglePlayPause() {
        this.isPaused = !this.isPaused;
        const btn = document.getElementById('play-pause-btn');
        btn.textContent = this.isPaused ? '▶️ Play' : '⏸️ Pausa';
    }

    setSpeed(speed) {
        this.timeSpeed = speed;
        const sliderValue = Math.pow(speed * 50, 1 / 1.5);
        document.getElementById('time-speed-slider').value = sliderValue;
        
        if (this.timeSpeed < 0.1) {
            document.getElementById('time-speed').textContent = `${(this.timeSpeed * 24).toFixed(1)} horas/frame`;
        } else if (this.timeSpeed < 1) {
            document.getElementById('time-speed').textContent = `${this.timeSpeed.toFixed(2)} días/frame`;
        } else {
            document.getElementById('time-speed').textContent = `${this.timeSpeed.toFixed(1)} días/frame`;
        }
    }

    resetTime() {
        this.currentTime = new Date();
        this.updateTimeDisplay();
        this.updateDatePicker();
    }

    jumpToDate(date) {
        this.currentTime = new Date(date);
        this.updateTimeDisplay();
        this.updateDatePicker();
        this.showNotification('📅 Date changed', `Jumping to ${this.currentTime.toLocaleDateString('en-US')}`, 2000);
    }

    updateDatePicker() {
        try {
            const datePicker = document.getElementById('date-picker');
            if (datePicker) {
                const year = this.currentTime.getFullYear();
                const month = String(this.currentTime.getMonth() + 1).padStart(2, '0');
                const day = String(this.currentTime.getDate()).padStart(2, '0');
                datePicker.value = `${year}-${month}-${day}`;
            } else {
                console.warn('⚠️ Date picker no encontrado');
            }
        } catch (error) {
            console.error('❌ Error en updateDatePicker:', error);
        }
    }

    startJogReturn() {
        const jogControl = document.getElementById('jog-control');
        const jogStatus = document.getElementById('jog-status');
        
        this.jogReturnInterval = setInterval(() => {
            const currentValue = parseInt(jogControl.value);
            
            if (currentValue === 0) {
                clearInterval(this.jogReturnInterval);
                this.jogReturnInterval = null;
                this.isJogging = false;
                this.jogValue = 0;
                jogStatus.textContent = 'Centro - Velocidad Normal';
                jogStatus.style.color = '#4a90e2';
                return;
            }
            
            const step = Math.sign(currentValue) * Math.max(1, Math.abs(currentValue) / 10);
            const newValue = currentValue - step;
            
            if (Math.sign(newValue) !== Math.sign(currentValue)) {
                jogControl.value = 0;
                this.jogValue = 0;
            } else {
                jogControl.value = newValue;
                this.jogValue = newValue;
            }
            
            if (this.jogValue === 0) {
                jogStatus.textContent = 'Centro - Velocidad Normal';
                jogStatus.style.color = '#4a90e2';
            } else if (this.jogValue < 0) {
                jogStatus.textContent = `⏪ Retrocediendo ${Math.abs(this.jogValue)}%`;
                jogStatus.style.color = '#e74c3c';
            } else {
                jogStatus.textContent = `⏩ Avanzando ${this.jogValue}%`;
                jogStatus.style.color = '#2ecc71';
            }
        }, 50);
    }

    toggleCameraFollow() {
        this.cameraFollowMode = !this.cameraFollowMode;
        this.updateFollowButton();
        
        if (this.cameraFollowMode && this.selectedAsteroid) {
            this.showNotification('🎥 Tracking activated', `Following ${this.selectedAsteroid.name}`, 2000);
        } else {
            this.showNotification('🎥 Tracking deactivated', 'Free camera', 2000);
        }
    }

    updateFollowButton() {
        const btn = document.getElementById('follow-camera-btn');
        if (btn) {
            btn.textContent = this.cameraFollowMode ? '🎥 Stop Following' : '🎥 Follow Object';
            btn.style.background = this.cameraFollowMode ? 
                'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)' : 
                'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)';
        }
    }

    toggleOrbits() {
        this.showOrbits = !this.showOrbits;
        this.orbitLines.forEach(line => {
            line.visible = this.showOrbits;
        });
    }

    showAllAsteroids() {
        this.orbitLines.forEach((line, id) => {
            line.visible = this.showOrbits;
        });
        this.asteroidMeshes.forEach(data => {
            data.mesh.visible = true;
        });
    }

    showHazardousOnly() {
        this.asteroids.forEach(asteroid => {
            const line = this.orbitLines.get(asteroid.id);
            const meshData = this.asteroidMeshes.get(asteroid.id);
            
            if (line) line.visible = asteroid.isHazardous && this.showOrbits;
            if (meshData) meshData.mesh.visible = asteroid.isHazardous;
        });
    }

    /**
     * Enfocar la cámara en la Tierra
     */
    focusOnEarth() {
        if (!this.earth) return;

        // Deseleccionar asteroide para que la cámara no lo siga
        this.selectedAsteroid = null;
        this.cameraFollowMode = false;
        
        // Hide Kinetic Impactor panel
        this.hideImpactPanel();

        // Actualizar el target de la cámara para que apunte a la Tierra
        const earthPos = this.earth.position;
        this.cameraTarget.copy(earthPos);

        // Animar la cámara hacia la Tierra
        const targetPos = new THREE.Vector3(
            earthPos.x + 150,
            earthPos.y + 100,
            earthPos.z + 150
        );

        const startPos = this.camera.position.clone();
        const startTime = Date.now();
        const duration = 1000;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing suave (ease-in-out)
            const eased = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            this.camera.position.lerpVectors(startPos, targetPos, eased);
            this.camera.lookAt(this.cameraTarget);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
        
        console.log('🎯 Focusing on Earth (asteroid deselected)');
        this.showNotification('🌍 Camera', 'Focusing on Earth', 2000);
    }

    /**
     * Resetear la cámara a la vista inicial
     */
    resetCamera() {
        const initialPos = new THREE.Vector3(300, 200, 300);
        const targetPos = new THREE.Vector3(0, 0, 0);

        this.animateCamera(initialPos, targetPos);
        
        console.log('🔄 Resetting camera');
        this.showNotification('🎥 Camera', 'View reset', 2000);
    }

    /**
     * Animar la cámara hacia una posición y objetivo
     */
    animateCamera(targetPosition, lookAtPosition, duration = 1000) {
        const startPos = this.camera.position.clone();
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing suave (ease-in-out)
            const eased = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            this.camera.position.lerpVectors(startPos, targetPosition, eased);
            this.camera.lookAt(lookAtPosition);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    /**
     * Create a simulated Near-Earth Asteroid for impactor testing
     * Creates realistic NEA with guaranteed close approach to Earth
     */
    createSimulatedAsteroid() {
        console.log('🎯 Creating simulated NEA based on 2020 VT4 (real data)...');
        
        // Use REAL data from 2020 VT4 - the asteroid that came closest to Earth
        // This ensures accurate positioning at the close approach date
        
        const a_AU = 0.9080022936789371;  // Semi-major axis in AU
        const a_km = a_AU * this.simulator.AU;  // Convert to km
        const e = 0.2030325244720354;
        const i = 10.16997157631196 * Math.PI / 180;  // Convert to radians
        const omega = 231.3830999783527 * Math.PI / 180;  // Ω (ascending node)
        const w = 53.69144742969262 * Math.PI / 180;     // ω (perihelion)
        const M0 = 34.40062811756151 * Math.PI / 180;    // Mean anomaly at epoch
        const n_deg_per_day = 1.139130959953762;         // Mean motion in degrees/day
        const n = n_deg_per_day * (Math.PI / 180) / 86400;  // Convert to radians/second
        const period = (2 * Math.PI) / n;  // Orbital period in seconds
        
        // Use the REAL epoch from 2020 VT4 data (JD 2461000.5)
        const epoch_JD = 2461000.5;
        
        // Real close approach date: 2020-11-13T17:21:00.000Z
        const closeApproachDate = new Date('2020-11-13T17:21:00.000Z');
        
        // Create simulated asteroid with REAL 2020 VT4 data
        const simulatedAsteroid = {
            id: 'SIM-IMPACT-001',
            name: '🎯 2020 VT4 (Impact Scenario)',
            full_name: '2020 VT4 - Simulated Impact Mission',
            is_potentially_hazardous_asteroid: true,
            absolute_magnitude_h: 28.61,
            estimated_diameter: {
                kilometers: {
                    estimated_diameter_min: 0.0128,
                    estimated_diameter_max: 0.0238
                }
            },
            diameter: {
                min: 0.0128,
                max: 0.0238,
                avg: 0.0183
            },
            spectralType: 'S',
            isHazardous: true,
            elements: {
                // REAL orbital elements from 2020 VT4
                a: a_km,                        // Semi-major axis in km
                e: e,                           // Eccentricity
                i: i,                           // Inclination (radians)
                Omega: omega,                   // Longitude of ascending node (radians) - Ω
                omega: w,                       // Argument of perihelion (radians) - ω
                M0: M0,                         // Mean anomaly at epoch (radians)
                n: n,                           // Mean motion (rad/s)
                epoch: epoch_JD,                // REAL epoch from VT4 data
                period: period                  // Orbital period in seconds
            },
            closeApproaches: [
                {
                    date: closeApproachDate,
                    distance: 6746, // km - REAL closest approach distance
                    velocity: 13.4271195491719,
                    julianDate: this.simulator.dateToJulian(closeApproachDate)
                }
            ],
            close_approach_data: [
                {
                    close_approach_date: "2020-11-13",
                    close_approach_date_full: "2020-11-13T17:21:00.000Z",
                    relative_velocity: {
                        kilometers_per_second: "13.4271195491719",
                        kilometers_per_hour: "48338"
                    },
                    miss_distance: {
                        astronomical: "0.0000450910597356063",
                        kilometers: "6746",
                        lunar: "0.02"
                    },
                    orbiting_body: "Earth"
                }
            ]
        };
        
        console.log('   Using REAL 2020 VT4 data:');
        console.log('   Name:', simulatedAsteroid.name);
        console.log('   Diameter:', simulatedAsteroid.diameter.avg, 'km');
        console.log('   Semi-major axis:', a_AU.toFixed(4), 'AU');
        console.log('   Eccentricity:', e.toFixed(6));
        console.log('   Inclination:', (i * 180 / Math.PI).toFixed(2), '°');
        console.log('   Epoch (JD):', epoch_JD);
        console.log('   Close approach:', closeApproachDate.toISOString());
        console.log('   Miss distance: 6,746 km (WORLD RECORD)');
        
        // Add to asteroids array
        this.asteroids.push(simulatedAsteroid);
        
        // Create visualization for simulated asteroid
        this.createAsteroidVisualization(simulatedAsteroid);
        
        // Select it automatically
        this.selectedAsteroid = simulatedAsteroid;
        
        // Jump to 60 DAYS BEFORE the close approach date
        const daysBeforeImpact = 60;
        const startDate = new Date(closeApproachDate.getTime() - (daysBeforeImpact * 24 * 60 * 60 * 1000));
        console.log(`   Jumping to ${daysBeforeImpact} days before impact: ${startDate.toISOString()}`);
        console.log(`   Impact will occur on: ${closeApproachDate.toISOString()}`);
        this.jumpToDate(startDate);
        
        // Show impact panel
        this.showImpactPanel(simulatedAsteroid);
        
        console.log('✅ Simulated asteroid created and selected');
    }

    /**
     * Toggle Impactor-2025 Mode
     * Switches between normal view and mission-focused view
     */
    toggleImpactorMode() {
        if (this.impactorMode) {
            this.exitImpactorMode();
        } else {
            this.enterImpactorMode();
        }
    }

    /**
     * Enter Impactor-2025 Mode
     * - Hide all asteroids except selected
     * - Hide all orbit lines except selected
     * - Focus camera on Earth
     * - Update button UI
     */
    enterImpactorMode() {
        console.log('🎯 Entering Impactor-2025 Mode...');
        
        this.impactorMode = true;
        
        // Store current camera position before changing
        this.previousCameraPosition = this.camera.position.clone();
        this.previousCameraTarget = this.cameraTarget.clone();
        
        // ALWAYS CREATE SIMULATED ASTEROID for impactor mode
        // Deselect any previous asteroid first
        if (this.selectedAsteroid && this.selectedAsteroid.id !== 'SIM-IMPACT-001') {
            console.log('🔄 Deselecting previous asteroid:', this.selectedAsteroid.name);
            this.hideImpactPanel();
        }
        
        // Remove any existing simulated asteroid
        if (this.asteroids.find(a => a.id === 'SIM-IMPACT-001')) {
            console.log('🗑️ Removing previous simulated asteroid...');
            const meshData = this.asteroidMeshes.get('SIM-IMPACT-001');
            if (meshData) {
                this.scene.remove(meshData.mesh);
                this.asteroidMeshes.delete('SIM-IMPACT-001');
            }
            const orbitLine = this.orbitLines.get('SIM-IMPACT-001');
            if (orbitLine) {
                this.scene.remove(orbitLine);
                this.orbitLines.delete('SIM-IMPACT-001');
            }
            this.asteroids = this.asteroids.filter(a => a.id !== 'SIM-IMPACT-001');
        }
        
        // Create fresh simulated asteroid
        console.log('🎯 Creating NEW simulated Near-Earth Asteroid for impact scenario...');
        this.createSimulatedAsteroid();
        
        // Now we have a fresh simulated asteroid selected
        
        // Hide all asteroids except selected
        this.asteroidMeshes.forEach((meshData, asteroidId) => {
            if (this.selectedAsteroid && this.selectedAsteroid.id === asteroidId) {
                // Keep selected asteroid visible and HIGHLIGHT IN BRIGHT RED
                meshData.mesh.visible = true;
                meshData.mesh.material.color.setHex(0xff0000);  // BRIGHT RED
                meshData.mesh.material.emissive.setHex(0xff3300);  // GLOWING RED
                meshData.mesh.material.emissiveIntensity = 0.8;
                
                // MAKE IT BIGGER in impactor mode for visibility (5x)
                const currentScale = meshData.mesh.scale.x;
                meshData.mesh.scale.set(currentScale * 5, currentScale * 5, currentScale * 5);
                
                console.log(`🔴 Asteroid ${this.selectedAsteroid.name} highlighted:`);
                console.log(`   - Visible: ${meshData.mesh.visible}`);
                console.log(`   - Original Scale: ${currentScale}`);
                console.log(`   - New Scale: ${meshData.mesh.scale.x}`);
                console.log(`   - Position: (${meshData.mesh.position.x.toFixed(2)}, ${meshData.mesh.position.y.toFixed(2)}, ${meshData.mesh.position.z.toFixed(2)})`);
                console.log(`   - Color: 0x${meshData.mesh.material.color.getHexString()}`);
            } else {
                // Hide all other asteroids
                meshData.mesh.visible = false;
                this.hiddenAsteroids.push(asteroidId);
            }
        });
        
        // CLEANUP: Remove any orphaned orbit lines from scene that aren't in the Map
        console.log(`🔍 Checking for orphaned orbit lines in scene...`);
        const orphanedOrbits = [];
        this.scene.children.forEach((child, index) => {
            if (child.type === 'Line' && child !== this.earthOrbit && child !== this.modifiedOrbitLine) {
                // Check if this orbit line is in our tracking Map
                let isTracked = false;
                this.orbitLines.forEach((line) => {
                    if (line === child) {
                        isTracked = true;
                    }
                });
                
                if (!isTracked) {
                    orphanedOrbits.push(child);
                    console.log(`�️ Found orphaned orbit line at index ${index}`);
                }
            }
        });
        
        // Remove orphaned orbits
        if (orphanedOrbits.length > 0) {
            console.log(`🗑️ Removing ${orphanedOrbits.length} orphaned orbit lines...`);
            orphanedOrbits.forEach(orbit => {
                this.scene.remove(orbit);
                orbit.geometry.dispose();
                orbit.material.dispose();
            });
        }
        
        // KEEP EARTH'S ORBIT VISIBLE (green orbit should always be visible)
        if (this.earthOrbit) {
            this.earthOrbit.visible = true;
            console.log('🌍 Earth orbit kept visible');
        }
        
        // Hide all orbit lines except selected
        console.log(`🔍 Total orbit lines in Map: ${this.orbitLines.size}`);
        this.orbitLines.forEach((line, asteroidId) => {
            if (this.selectedAsteroid && this.selectedAsteroid.id === asteroidId) {
                // Keep selected orbit visible in BRIGHT BLUE
                line.visible = true;
                line.material.color.setHex(0x00aaff);  // BRIGHT BLUE
                line.material.opacity = 0.9;  // Very visible
                
                console.log(`🔵 Orbit for ${this.selectedAsteroid.name} (ID: ${asteroidId}):`);
                console.log(`   - Visible: ${line.visible}`);
                console.log(`   - Color: 0x${line.material.color.getHexString()}`);
                console.log(`   - Opacity: ${line.material.opacity}`);
            } else {
                // Hide all other orbits
                line.visible = false;
                this.hiddenOrbits.push(asteroidId);
                console.log(`👻 Hiding orbit for asteroid ID: ${asteroidId}`);
            }
        });
        
        // FOCUS CAMERA ON EARTH (with asteroid and Earth visible)
        if (this.earth) {
            console.log('📹 Focusing camera on Earth for impactor view...');
            
            // Get Earth position
            const earthPos = this.earth.position;
            
            // Set camera to view Earth from a good angle
            const distance = 200; // Distance from Earth
            this.camera.position.set(
                earthPos.x + distance,
                earthPos.y + distance * 0.7,
                earthPos.z + distance
            );
            
            // Look at Earth
            this.cameraTarget.copy(earthPos);
            this.camera.lookAt(earthPos);
            
            console.log('   Earth position:', earthPos.x, earthPos.y, earthPos.z);
            console.log('   Camera position:', this.camera.position.x, this.camera.position.y, this.camera.position.z);
        } else {
            console.warn('⚠️ Earth object not found!');
        }
        
        // Hide unnecessary panels during impactor mode
        const asteroidDetails = document.getElementById('asteroid-details');
        const asteroidList = document.getElementById('asteroid-list');
        const asteroidListTitle = asteroidList ? asteroidList.previousElementSibling : null;
        const infoCard = document.querySelector('.info-card');
        
        if (asteroidDetails) asteroidDetails.classList.add('hidden');
        if (asteroidList) asteroidList.classList.add('hidden');
        if (asteroidListTitle) asteroidListTitle.classList.add('hidden');
        if (infoCard) infoCard.classList.add('hidden');  // Hide asteroid counter
        
        // Update button appearance
        const btn = document.getElementById('impactor-mode-btn');
        if (btn) {
            btn.classList.add('active');
            btn.innerHTML = '🔴 Exit Impactor';
            btn.title = 'Return to normal view';
        }
        
        // Show notification
        const asteroidName = this.selectedAsteroid 
            ? this.selectedAsteroid.name 
            : 'none selected';
        this.showNotification(
            '🎯 Impactor Mode', 
            `Mission view activated | Target: ${asteroidName}`, 
            3000
        );
        
        // Start collision countdown
        this.startCollisionCountdown();
        
        console.log('✅ Impactor Mode: ACTIVE');
        console.log(`   - Hidden asteroids: ${this.hiddenAsteroids.length}`);
        console.log(`   - Hidden orbits: ${this.hiddenOrbits.length}`);
        console.log(`   - Selected asteroid: ${asteroidName}`);
    }

    /**
     * Exit Impactor-2025 Mode
     * - Restore all asteroids visibility
     * - Restore all orbit lines visibility
     * - Optionally restore camera position
     * - Update button UI
     */
    exitImpactorMode() {
        console.log('🔄 Exiting Impactor-2025 Mode...');
        
        this.impactorMode = false;
        
        // Remove simulated asteroid if it exists
        if (this.selectedAsteroid && this.selectedAsteroid.id === 'SIM-IMPACT-001') {
            console.log('🗑️ Removing simulated asteroid...');
            
            // Remove from scene
            const meshData = this.asteroidMeshes.get(this.selectedAsteroid.id);
            if (meshData) {
                this.scene.remove(meshData.mesh);
                this.asteroidMeshes.delete(this.selectedAsteroid.id);
            }
            
            const orbitLine = this.orbitLines.get(this.selectedAsteroid.id);
            if (orbitLine) {
                this.scene.remove(orbitLine);
                this.orbitLines.delete(this.selectedAsteroid.id);
            }
            
            // Remove from asteroids array
            this.asteroids = this.asteroids.filter(a => a.id !== 'SIM-IMPACT-001');
            
            // Clear selection
            this.selectedAsteroid = null;
            
            // Hide impact panel
            this.hideImpactPanel();
        }
        
        // Restore all asteroids visibility and RESET COLORS
        this.hiddenAsteroids.forEach(asteroidId => {
            const meshData = this.asteroidMeshes.get(asteroidId);
            if (meshData) {
                meshData.mesh.visible = true;
            }
        });
        
        // Restore selected asteroid to normal color and SIZE (if not simulated)
        if (this.selectedAsteroid) {
            const meshData = this.asteroidMeshes.get(this.selectedAsteroid.id);
            if (meshData) {
                meshData.mesh.material.color.setHex(0xff0000);  // Normal red
                meshData.mesh.material.emissive.setHex(
                    this.selectedAsteroid.isHazardous ? 0x440000 : 0x220000
                );
                meshData.mesh.material.emissiveIntensity = 1.0;
                
                // RESTORE ORIGINAL SIZE (divide by 5)
                const currentScale = meshData.mesh.scale.x;
                meshData.mesh.scale.set(currentScale / 5, currentScale / 5, currentScale / 5);
                
                console.log(`   - Restored scale: ${meshData.mesh.scale.x}`);
            }
        }
        
        // Restore all orbit lines visibility and RESET COLORS
        this.hiddenOrbits.forEach(asteroidId => {
            const line = this.orbitLines.get(asteroidId);
            if (line) {
                line.visible = this.showOrbits; // Respect global orbit visibility setting
                line.material.color.setHex(0x00aaff);  // Blue for all orbits
                line.material.opacity = 0.6;
            }
        });
        
        // RESTORE EARTH'S ORBIT VISIBILITY
        if (this.earthOrbit) {
            this.earthOrbit.visible = true;
            console.log('🌍 Earth orbit restored');
        }
        
        // Clear hidden arrays
        this.hiddenAsteroids = [];
        this.hiddenOrbits = [];
        
        // 🎯 APPLY DISTANCE FILTER - Respect the current filter setting
        const filterSlider = document.getElementById('asteroid-filter-slider');
        if (filterSlider) {
            const currentLimit = parseInt(filterSlider.value);
            console.log(`🎯 Reapplying distance filter: ${currentLimit} closest asteroids`);
            this.filterAsteroidsByDistance(currentLimit);
        }
        
        // Restore camera position (optional - smooth animation)
        if (this.previousCameraPosition && this.previousCameraTarget) {
            this.animateCamera(this.previousCameraPosition, this.previousCameraTarget, 1000);
        }
        
        // Restore panels
        const asteroidDetails = document.getElementById('asteroid-details');
        const asteroidList = document.getElementById('asteroid-list');
        const asteroidListTitle = asteroidList ? asteroidList.previousElementSibling : null;
        const infoCard = document.querySelector('.info-card');
        
        if (asteroidDetails) asteroidDetails.classList.remove('hidden');
        if (asteroidList) asteroidList.classList.remove('hidden');
        if (asteroidListTitle) asteroidListTitle.classList.remove('hidden');
        if (infoCard) infoCard.classList.remove('hidden');
        
        // Update button appearance
        const btn = document.getElementById('impactor-mode-btn');
        if (btn) {
            btn.classList.remove('active');
            btn.innerHTML = '🎯 Impactor Mode';
            btn.title = 'Enter mission-focused view mode';
        }
        
        // Stop collision countdown
        this.stopCollisionCountdown();
        
        // Show notification
        this.showNotification(
            '🌌 Normal View', 
            'All asteroids restored', 
            2000
        );
        
        console.log('✅ Impactor Mode: DEACTIVATED');
        console.log('   - All objects restored to visibility');
    }

    /**
     * Start collision countdown timer
     */
    startCollisionCountdown() {
        console.log('⏱️ startCollisionCountdown called');
        
        // Stop any existing countdown
        this.stopCollisionCountdown();
        
        if (!this.selectedAsteroid) {
            console.warn('⚠️ No asteroid selected for countdown');
            return;
        }
        
        console.log('   Selected asteroid:', this.selectedAsteroid.name);
        console.log('   Close approach data:', this.selectedAsteroid.close_approach_data);
        
        // Get collision date from close approach data
        const closeApproach = this.selectedAsteroid.close_approach_data?.[0];
        if (!closeApproach || !closeApproach.close_approach_date_full) {
            console.warn('⚠️ No close approach data available');
            return;
        }
        
        this.collisionDate = new Date(closeApproach.close_approach_date_full);
        console.log('   Collision date set to:', this.collisionDate.toISOString());
        
        // Show countdown section
        const countdownSection = document.getElementById('collision-countdown-section');
        console.log('   Countdown section element:', countdownSection);
        if (countdownSection) {
            countdownSection.classList.remove('hidden');
            console.log('   Countdown section shown');
        } else {
            console.error('❌ Countdown section element not found!');
        }
        
        // Update collision date display
        const collisionDateEl = document.getElementById('collision-date');
        console.log('   Collision date element:', collisionDateEl);
        if (collisionDateEl) {
            const formattedDate = this.collisionDate.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short'
            });
            collisionDateEl.textContent = formattedDate;
            console.log('   Collision date displayed:', formattedDate);
        } else {
            console.error('❌ Collision date element not found!');
        }
        
        // Update countdown immediately
        this.updateCollisionCountdown();
        
        // Start interval to update every second
        this.countdownInterval = setInterval(() => {
            this.updateCollisionCountdown();
        }, 1000);
        
        console.log('✅ Collision countdown started:', this.collisionDate.toISOString());
    }
    
    /**
     * Update collision countdown display
     */
    updateCollisionCountdown() {
        if (!this.collisionDate) {
            console.log('⏱️ updateCollisionCountdown: No collision date set');
            return;
        }
        
        const now = this.currentTime; // Use simulation time
        const timeUntilImpact = this.collisionDate - now;
        
        const countdownEl = document.getElementById('collision-countdown');
        if (!countdownEl) {
            console.error('❌ Countdown element not found!');
            return;
        }
        
        if (timeUntilImpact <= 0) {
            countdownEl.textContent = 'IMPACT!';
            countdownEl.style.color = '#ff3333';
            this.stopCollisionCountdown();
            return;
        }
        
        // Calculate time components
        const days = Math.floor(timeUntilImpact / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeUntilImpact % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeUntilImpact % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeUntilImpact % (1000 * 60)) / 1000);
        
        // Format countdown
        let countdownText = '';
        if (days > 0) {
            countdownText = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        } else if (hours > 0) {
            countdownText = `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            countdownText = `${minutes}m ${seconds}s`;
        } else {
            countdownText = `${seconds}s`;
        }
        
        countdownEl.textContent = countdownText;
        
        // Change color based on urgency
        if (days < 1) {
            countdownEl.style.color = '#ff6666'; // Red for less than 1 day
        } else if (days < 7) {
            countdownEl.style.color = '#ffaa66'; // Orange for less than 1 week
        } else {
            countdownEl.style.color = '#66ff66'; // Green for more than 1 week
        }
    }
    
    /**
     * Stop collision countdown timer
     */
    stopCollisionCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
            console.log('⏹️ Collision countdown stopped');
        }
        
        // Hide countdown section
        const countdownSection = document.getElementById('collision-countdown-section');
        if (countdownSection) {
            countdownSection.classList.add('hidden');
        }
        
        this.collisionDate = null;
    }

    /**
     * Show Kinetic Impactor panel when asteroid is selected
     * Populates target information
     */
    showImpactPanel(asteroid) {
        const panel = document.getElementById('kinetic-impactor-panel');
        if (!panel || !asteroid) return;
        
        // Show panel
        panel.classList.remove('hidden');
        
        // Populate target info
        document.getElementById('impactor-target-name').textContent = asteroid.name || 'Unknown';
        
        // Calculate average diameter from min/max object
        const avgDiameter = asteroid.diameter 
            ? (asteroid.diameter.min + asteroid.diameter.max) / 2 
            : 0;
        document.getElementById('impactor-target-diameter').textContent = 
            avgDiameter > 0 ? `${avgDiameter.toFixed(3)} km` : 'Unknown';
        
        document.getElementById('impactor-target-type').textContent = 
            asteroid.spectralType || 'Unknown';
        
        console.log(`🎯 Impact panel shown for: ${asteroid.name}`);
    }

    /**
     * Hide Kinetic Impactor panel
     */
    hideImpactPanel() {
        const panel = document.getElementById('kinetic-impactor-panel');
        if (panel) {
            panel.classList.add('hidden');
        }
        
        // Also hide results if visible
        const resultsDiv = document.getElementById('impactor-results');
        if (resultsDiv) {
            resultsDiv.classList.add('hidden');
        }
        
        console.log('🔒 Impact panel hidden');
    }

    /**
     * Simulate kinetic impact on selected asteroid
     * Reads parameters from UI, runs physics simulation, displays results
     */
    simulateKineticImpact() {
        if (!this.selectedAsteroid) {
            this.showNotification('⚠️ Error', 'No asteroid selected', 3000);
            return;
        }
        
        console.log('\n🎯 Starting kinetic impact simulation...');
        
        // Get parameters from UI
        const mass = parseFloat(document.getElementById('impactor-mass').value);
        const velocity = parseFloat(document.getElementById('impactor-velocity').value);
        const beta = parseFloat(document.getElementById('impactor-beta').value);
        
        // Validate inputs
        if (isNaN(mass) || isNaN(velocity) || isNaN(beta)) {
            this.showNotification('⚠️ Error', 'Invalid input parameters', 3000);
            return;
        }
        
        // Prepare asteroid data
        // Calculate average diameter from min/max object
        const diameter = this.selectedAsteroid.diameter
            ? (this.selectedAsteroid.diameter.min + this.selectedAsteroid.diameter.max) / 2
            : 1.0; // Default 1 km if unknown
        
        const asteroidData = {
            name: this.selectedAsteroid.name,
            diameter: diameter,
            spectralType: this.selectedAsteroid.spectralType || 'S', // Default S-type
            a: this.selectedAsteroid.elements.a,
            e: this.selectedAsteroid.elements.e,
            i: this.selectedAsteroid.elements.i,
            Omega: this.selectedAsteroid.elements.Omega,  // Longitude of ascending node (Ω)
            omega: this.selectedAsteroid.elements.omega,  // Argument of perihelion (ω)
            M: this.selectedAsteroid.elements.M0 || this.selectedAsteroid.elements.M
        };
        
        console.log('🎯 Asteroid data for simulation:', asteroidData);
        
        const impactParams = {
            mass: mass,
            velocity: velocity,
            beta: beta
        };
        
        // Run simulation
        try {
            this.impactSimulation = this.kineticImpactor.simulateImpact(asteroidData, impactParams);
            
            // Display results
            this.displayImpactResults(this.impactSimulation);
            
            // Create modified orbit visualization (will be implemented in Phase 4)
            this.createModifiedOrbit(this.impactSimulation.newOrbitalElements);
            
            // Stop collision countdown and hide collision info
            this.stopCollisionCountdown();
            
            // Show notification
            this.showNotification(
                '✅ Simulation Complete', 
                `Δv: ${(this.impactSimulation.results.deltaV_mms).toFixed(2)} mm/s`, 
                4000
            );
            
        } catch (error) {
            console.error('❌ Simulation error:', error);
            this.showNotification('❌ Error', 'Simulation failed', 3000);
        }
    }

    /**
     * Display impact simulation results in UI
     */
    displayImpactResults(results) {
        if (!results) return;
        
        const r = results.results;
        const ast = results.asteroid;
        
        // Populate result fields
        document.getElementById('result-mass').textContent = 
            `${ast.mass_kg.toExponential(2)} kg`;
        
        document.getElementById('result-deltav').textContent = 
            `${r.deltaV_mms.toFixed(2)} mm/s (${r.deltaV_ms.toExponential(2)} m/s)`;
        
        document.getElementById('result-delta-a').textContent = 
            `${r.deltaA_km > 0 ? '+' : ''}${r.deltaA_km.toFixed(3)} km`;
        
        document.getElementById('result-delta-period').textContent = 
            `${r.deltaPeriod_seconds > 0 ? '+' : ''}${r.deltaPeriod_seconds.toFixed(2)} seconds`;
        
        document.getElementById('result-delta-e').textContent = 
            `${r.deltaE > 0 ? '+' : ''}${r.deltaE.toFixed(6)} (${ast.eccentricity.toFixed(4)} → ${r.newE.toFixed(4)})`;
        
        document.getElementById('result-amplification').textContent = 
            `${r.amplification}x (for visual clarity)`;
        
        // Show results section
        const resultsDiv = document.getElementById('impactor-results');
        if (resultsDiv) {
            resultsDiv.classList.remove('hidden');
        }
        
        // Show reset button
        const resetBtn = document.getElementById('reset-orbit-btn');
        if (resetBtn) {
            resetBtn.classList.remove('hidden');
        }
        
        console.log('📊 Results displayed in UI');
    }

    /**
     * Create and display modified orbit visualization
     * Generates red orbit line from new orbital elements after impact
     * @param {Object} newElements - Modified orbital elements {a, e, i, omega, w, M}
     */
    createModifiedOrbit(newElements) {
        console.log('🔴 ========== CREATING MODIFIED ORBIT ==========');
        console.log('   New orbital elements received:', newElements);
        
        // 🎯 SIMPLIFIED APPROACH: Keep orbit shape identical, just scale it
        // Use ORIGINAL elements but with NEW semi-major axis
        // This ensures red orbit has same shape/orientation as blue, just bigger
        
        const originalElements = this.selectedAsteroid.elements;
        
        console.log('   📊 Comparison:');
        console.log('      Original a:', (originalElements.a / this.simulator.AU).toFixed(6), 'AU');
        console.log('      New a:     ', (newElements.a / this.simulator.AU).toFixed(6), 'AU');
        console.log('      Delta a:   ', ((newElements.a - originalElements.a) / 1000).toFixed(1), 'thousand km');
        console.log('   🎯 Using ORIGINAL e, i, Omega, omega for identical shape');
        
        // Remove any existing modified orbit
        if (this.modifiedOrbitLine) {
            console.log('   Removing existing modified orbit...');
            this.scene.remove(this.modifiedOrbitLine);
            this.modifiedOrbitLine = null;
        }
        
        // Validate elements
        if (!newElements || !newElements.a || !newElements.e) {
            console.error('❌ Invalid orbital elements:', newElements);
            return;
        }
        
        // Get current asteroid position (impact point)
        const currentJD = this.simulator.dateToJulian(this.currentTime);
        const currentPosition = this.simulator.calculatePositionAtTime(this.selectedAsteroid, currentJD);
        
        console.log('   📍 Current asteroid position (impact point):');
        console.log('      X:', currentPosition.heliocentric.x, 'km');
        console.log('      Y:', currentPosition.heliocentric.y, 'km');
        console.log('      Z:', currentPosition.heliocentric.z, 'km');
        
        // Calculate new mean motion using Kepler's third law: n = sqrt(μ/a³)
        // μ (mu) = GM_sun = 1.32712440018e11 km³/s²
        const MU_SUN = 1.32712440018e11;  // Gravitational parameter of Sun
        const newMeanMotion = Math.sqrt(MU_SUN / Math.pow(newElements.a, 3));
        
        console.log('   📐 Calculated new mean motion:');
        console.log('      n:', newMeanMotion, 'rad/s');
        console.log('      n:', (newMeanMotion * 180 / Math.PI * 86400).toFixed(6), '°/day');
        
        // Create temporary asteroid object with modified elements
        // Calculate M0 (mean anomaly at epoch) from current true anomaly
        // This ensures the modified orbit starts exactly at current position
        
        // First, calculate current true anomaly from current position
        const currentPos = currentPosition.heliocentric;
        const r = Math.sqrt(currentPos.x**2 + currentPos.y**2 + currentPos.z**2);
        
        // Calculate true anomaly from position (in orbital plane)
        // For now, use a simple approach: calculate M from current time offset
        const oldEpoch = this.selectedAsteroid.elements.epoch;
        const oldM0 = this.selectedAsteroid.elements.M0;
        const oldN = this.selectedAsteroid.elements.n;
        
        // Time elapsed since original epoch
        const deltaT = currentJD - oldEpoch;  // in days
        const deltaT_seconds = deltaT * 86400;  // convert to seconds
        
        // Current mean anomaly = M0 + n*Δt
        const currentMeanAnomaly = oldM0 + oldN * deltaT_seconds;
        
        // Use this as M0 for new epoch (which is current time)
        const newM0 = currentMeanAnomaly % (2 * Math.PI);  // Normalize to [0, 2π]
        
        console.log('   📐 Calculating M0 for impact point:');
        console.log('      Old epoch (JD):', oldEpoch.toFixed(4));
        console.log('      Current JD:', currentJD.toFixed(4));
        console.log('      Δt (days):', deltaT.toFixed(4));
        console.log('      Old M0 (rad):', oldM0.toFixed(6));
        console.log('      Old n (rad/s):', oldN.toFixed(10));
        console.log('      Current M (rad):', currentMeanAnomaly.toFixed(6));
        console.log('      New M0 (rad):', newM0.toFixed(6));
        console.log('      New M0 (deg):', (newM0 * 180 / Math.PI).toFixed(2));
        
        // 🎯 Calculate eccentricity to keep same width (semi-minor axis)
        // Original: b = a_old × √(1 - e_old²)
        // New: want same b, but larger a_new
        // So: b = a_new × √(1 - e_new²)
        // Therefore: e_new = √(1 - (b/a_new)²)
        
        const a_old = originalElements.a;
        const e_old = originalElements.e;
        const b_old = a_old * Math.sqrt(1 - e_old * e_old);  // Semi-minor axis (width)
        
        const a_new = newElements.a;
        const e_new = Math.sqrt(1 - (b_old / a_new) * (b_old / a_new));  // New e to keep same width
        
        console.log('   📐 Orbit shape calculation:');
        console.log('      Original a:', (a_old / this.simulator.AU).toFixed(6), 'AU');
        console.log('      Original e:', e_old.toFixed(4));
        console.log('      Original b (width):', (b_old / this.simulator.AU).toFixed(6), 'AU');
        console.log('      New a:', (a_new / this.simulator.AU).toFixed(6), 'AU');
        console.log('      New e:', e_new.toFixed(4), '(calculated to preserve width)');
        console.log('      New b (width):', (a_new * Math.sqrt(1 - e_new*e_new) / this.simulator.AU).toFixed(6), 'AU');
        
        const modifiedAsteroid = {
            name: this.selectedAsteroid.name + ' (Modified)',
            elements: {
                a: newElements.a,  // NEW semi-major axis (longer orbit)
                e: Math.min(0.9, e_new),  // CALCULATED to keep same width but make it longer/more oval
                i: originalElements.i,  // KEEP ORIGINAL inclination
                Omega: originalElements.Omega,  // KEEP ORIGINAL Ω
                omega: originalElements.omega,  // KEEP ORIGINAL ω
                M0: newM0,  // CALCULATED M0 to start at impact point
                n: newMeanMotion,  // NEW mean motion based on new semi-major axis
                epoch: currentJD,  // USE CURRENT TIME AS EPOCH (impact moment)
                // Calculate new period using Kepler's third law: T² = a³ (for a in AU, T in years)
                period: Math.sqrt(Math.pow(newElements.a / this.simulator.AU, 3)) * 365.25 * 86400 // Convert years to seconds
            }
        };
        
        console.log('   Modified asteroid object (LONGER, same width, more oval):');
        console.log('     a (km):', modifiedAsteroid.elements.a);
        console.log('     a (AU):', (modifiedAsteroid.elements.a / this.simulator.AU).toFixed(6));
        console.log('     e:', modifiedAsteroid.elements.e.toFixed(4), `(was ${originalElements.e.toFixed(4)})`);
        console.log('     i:', modifiedAsteroid.elements.i * 180 / Math.PI, '°');
        console.log('     Omega:', modifiedAsteroid.elements.Omega * 180 / Math.PI, '°');
        console.log('     omega:', modifiedAsteroid.elements.omega * 180 / Math.PI, '°');
        console.log('     M0:', modifiedAsteroid.elements.M0);
        console.log('     n (rad/s):', modifiedAsteroid.elements.n);
        console.log('     epoch (JD):', modifiedAsteroid.elements.epoch);
        console.log('     period (days):', (modifiedAsteroid.elements.period / 86400).toFixed(2));
        
        // 🎯 GENERATE COMPLETE ORBITAL ELLIPSE (not time-based trajectory)
        // Instead of propagating forward in time, we'll generate points around the entire orbit
        // by varying the mean anomaly from 0 to 2π
        
        const segments = 256;  // High resolution for smooth orbit
        const trajectory = [];
        
        console.log(`   Generating complete orbital ellipse with ${segments} points...`);
        console.log(`   Starting from current mean anomaly: ${newM0.toFixed(6)} rad`);
        
        // Generate points around the entire orbit starting from current position
        for (let i = 0; i <= segments; i++) {
            // Mean anomaly varies from current M0 to M0 + 2π (one complete orbit)
            const M = newM0 + (i / segments) * 2 * Math.PI;
            
            // Solve Kepler's equation to get eccentric anomaly
            const E = this.simulator.solveKeplerEquation(M, modifiedAsteroid.elements.e);
            
            // Calculate position in orbital plane
            const a = modifiedAsteroid.elements.a;
            const e = modifiedAsteroid.elements.e;
            const x_orb = a * (Math.cos(E) - e);
            const y_orb = a * Math.sqrt(1 - e*e) * Math.sin(E);
            
            // Transform to heliocentric coordinates
            const helioPos = this.simulator.orbitalToHeliocentric(
                { x: x_orb, y: y_orb, z: 0 },
                modifiedAsteroid.elements
            );
            
            trajectory.push({
                heliocentric: helioPos
            });
        }
        
        console.log(`   Generated ${trajectory.length} points for complete ellipse`);
        
        if (trajectory.length === 0) {
            console.error('❌ No trajectory points generated!');
            return;
        }
        
        // Create points for THREE.js line
        const points = trajectory.map(point => new THREE.Vector3(
            point.heliocentric.x * this.scale,
            point.heliocentric.z * this.scale,
            point.heliocentric.y * this.scale
        ));
        
        // Log trajectory info for debugging
        console.log(`   Generated trajectory: ${points.length} points`);
        if (points.length > 0) {
            // Verify first point is close to current asteroid position
            const currentAsteroidPos = new THREE.Vector3(
                currentPosition.heliocentric.x * this.scale,
                currentPosition.heliocentric.z * this.scale,
                currentPosition.heliocentric.y * this.scale
            );
            const distance = points[0].distanceTo(currentAsteroidPos);
            console.log(`   🎯 Distance from first point to current position: ${distance.toFixed(2)} units`);
            if (distance > 1000) {
                console.warn(`   ⚠️  WARNING: First point is far from current position!`);
            }
        }
        
        // Create red orbit line (more visible than original)
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: 0xff3300,  // BRIGHT RED for modified orbit
            transparent: true,
            opacity: 0.9,  // Very opaque for high visibility
            linewidth: 3
        });
        
        this.modifiedOrbitLine = new THREE.Line(geometry, material);
        this.modifiedOrbitLine.visible = true; // Ensure visibility
        this.scene.add(this.modifiedOrbitLine);
        
        // 🎯 Add visual marker at impact point for clarity
        // Use the first point of the modified trajectory as the impact point
        const impactMarkerGeometry = new THREE.SphereGeometry(800, 16, 16);  // Visible sphere
        const impactMarkerMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,  // YELLOW for impact point
            transparent: true,
            opacity: 0.8
        });
        const impactMarker = new THREE.Mesh(impactMarkerGeometry, impactMarkerMaterial);
        if (points.length > 0) {
            impactMarker.position.copy(points[0]);  // Place at first point of modified orbit
        }
        this.scene.add(impactMarker);
        
        // Store marker for cleanup
        this.impactMarker = impactMarker;
        
        console.log(`   ✅ Modified orbit added to scene`);
        console.log(`   🎯 Yellow impact marker added at transition point`);
        console.log(`   - Visible: ${this.modifiedOrbitLine.visible}`);
        console.log(`   - Color: 0x${this.modifiedOrbitLine.material.color.getHexString()}`);
        console.log(`   - Opacity: ${this.modifiedOrbitLine.material.opacity}`);
        console.log(`   - Points: ${points.length}`);
        
        // 🚀 UPDATE ASTEROID TO FOLLOW NEW ORBIT
        console.log('   🚀 Updating asteroid to follow new orbit...');
        
        // Store original elements for reset
        if (!this.originalAsteroidElements) {
            this.originalAsteroidElements = JSON.parse(JSON.stringify(this.selectedAsteroid.elements));
            console.log('   💾 Saved original orbital elements for reset');
        }
        
        // 🚀 UPDATE ASTEROID TO FOLLOW NEW ORBIT
        // Now that orbit shape is correct (same width, longer), asteroid can follow it
        this.selectedAsteroid.elements = modifiedAsteroid.elements;
        
        // Store modified elements for reference
        this.modifiedAsteroidElements = modifiedAsteroid.elements;
        
        console.log('   ✅ Asteroid elements UPDATED - will now follow RED orbit');
        console.log('   � Asteroid trajectory switched to modified path');
        
        // Hide the original blue orbit line and use only the red modified orbit
        const asteroidOrbitLine = this.orbitLines.get(this.selectedAsteroid.id);
        if (asteroidOrbitLine) {
            asteroidOrbitLine.material.opacity = 0.5;
            console.log('   � Hidden original blue orbit line');
        }
        
        console.log('   ✅ Asteroid will now follow the RED modified orbit!');
        console.log('   📍 Orbit starts from current asteroid position (impact point)');
        console.log('🔴 ========== MODIFIED ORBIT COMPLETE ==========');
        
        // Show reset button
        const resetBtn = document.getElementById('reset-orbit-btn');
        if (resetBtn) {
            resetBtn.classList.remove('hidden');
        }
    }

    /**
     * Reset orbit to original state
     * Removes modified orbit visualization and clears results
     */
    resetOrbit() {
        console.log('↩️ Resetting orbit...');
        
        // Remove modified orbit line from scene
        if (this.modifiedOrbitLine) {
            this.scene.remove(this.modifiedOrbitLine);
            this.modifiedOrbitLine = null;
        }
        
        // Remove impact marker
        if (this.impactMarker) {
            this.scene.remove(this.impactMarker);
            this.impactMarker = null;
            console.log('   🎯 Removed impact marker');
        }
        
        // Restore original orbital elements
        if (this.originalAsteroidElements && this.selectedAsteroid) {
            console.log('   ↩️ Restoring original orbital elements...');
            this.selectedAsteroid.elements = this.originalAsteroidElements;
            this.originalAsteroidElements = null;
            
            // Restore orbit line to original opacity
            const asteroidOrbitLine = this.orbitLines.get(this.selectedAsteroid.id);
            if (asteroidOrbitLine) {
                asteroidOrbitLine.material.color.setHex(0x00aaff);  // BLUE
                asteroidOrbitLine.material.opacity = 0.6;  // Original opacity
                console.log('   🔵 Restored orbit line to original blue with full opacity');
            }
            
            console.log('   ✅ Asteroid restored to original orbit');
        }
        
        // Clear simulation data
        this.impactSimulation = null;
        
        // Hide results
        const resultsDiv = document.getElementById('impactor-results');
        if (resultsDiv) {
            resultsDiv.classList.add('hidden');
        }
        
        // Hide reset button
        const resetBtn = document.getElementById('reset-orbit-btn');
        if (resetBtn) {
            resetBtn.classList.add('hidden');
        }
        
        // Show notification
        this.showNotification('↩️ Reset', 'Original orbit restored', 2000);
        
        console.log('✅ Orbit reset complete');
    }

    clearAsteroids() {
        this.orbitLines.forEach(line => this.scene.remove(line));
        this.asteroidMeshes.forEach(data => this.scene.remove(data.mesh));
        this.orbitLines.clear();
        this.asteroidMeshes.clear();
        this.asteroids = [];
    }

    updateTimeDisplay() {
        document.getElementById('current-date').textContent = 
            this.currentTime.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
    }

    showNotification(title, message, duration = 0) {
        const notification = document.getElementById('notification');
        document.getElementById('notification-title').textContent = title;
        document.getElementById('notification-message').textContent = message;
        notification.style.display = 'block';

        console.log(`📢 showNotification called: "${title}", duration=${duration}`);

        // Si duration es null o undefined, la notificación se mantiene visible
        // Si duration es 0, también se mantiene visible
        // Solo se oculta automáticamente si duration > 0
        if (duration !== null && duration !== undefined && duration > 0) {
            console.log(`⏱️ Auto-ocultando notificación en ${duration}ms`);
            setTimeout(() => {
                notification.style.display = 'none';
            }, duration);
        } else {
            console.log(`📌 Notificación PERSISTENTE - no se auto-ocultará`);
        }
    }
    
    /**
     * Muestra el botón de Play central
     */
    showPlayButton() {
        const playOverlay = document.getElementById('play-overlay');
        const startBtn = document.getElementById('start-simulation-btn');
        
        if (!playOverlay || !startBtn) {
            console.error('❌ Play button elements not found');
            return;
        }
        
        // Mostrar overlay
        playOverlay.classList.remove('hidden');
        
        // Configurar evento de click
        startBtn.onclick = () => {
            console.log('▶️ Starting simulation...');
            
            // Ocultar overlay
            playOverlay.classList.add('hidden');
            
            // AHORA SÍ aplicar configuración inicial
            console.log('🎯 Aplicando configuración inicial...');
            
            // Deseleccionar cualquier asteroide
            this.selectedAsteroid = null;
            this.cameraFollowMode = false;
            
            // Enfocar la Tierra
            console.log('🌍 Enfocando la Tierra...');
            this.focusOnEarth();
            
            // Filtrar para mostrar solo los 10 más cercanos
            console.log('🎯 Aplicando filtro: 10 asteroides más cercanos');
            this.filterAsteroidsByDistance(10);
            
            // Iniciar simulación
            this.isPaused = false;
            const playPauseBtn = document.getElementById('play-pause-btn');
            if (playPauseBtn) {
                playPauseBtn.textContent = '⏸️ Pause';
            }
            
            console.log('✅ Simulación iniciada con 10 asteroides visibles');
        };
    }

    /**
     * Formatea la distancia en unidades legibles (todo en km)
     * @param {number} distanceKm - Distancia en kilómetros
     * @returns {string} - Distancia formateada
     */
    formatDistance(distanceKm) {
        if (distanceKm < 1000) {
            // Less than 1,000 km
            return `${distanceKm.toFixed(0)} km`;
        } else if (distanceKm < 1000000) {
            // Between 1,000 and 1 million km
            return `${(distanceKm / 1000).toFixed(1)} thousand km`;
        } else if (distanceKm < 10000000) {
            // Between 1 million and 10 million km
            return `${(distanceKm / 1000000).toFixed(2)} million km`;
        } else {
            // More than 10 million km
            return `${(distanceKm / 1000000).toFixed(1)} million km`;
        }
    }

    /**
     * Actualiza la visualización de distancia en el panel de información
     */
    updateDistanceDisplay() {
        const distanceElement = document.getElementById('current-distance');
        if (distanceElement && this.selectedAsteroid && this.currentDistance > 0) {
            distanceElement.textContent = this.formatDistance(this.currentDistance);
            
            // Cambiar color según proximidad
            if (this.currentDistance < 384400) {
                // Menos de la distancia Tierra-Luna
                distanceElement.style.color = '#e74c3c'; // Rojo - muy cerca
            } else if (this.currentDistance < 3844000) {
                // Menos de 10 veces la distancia Tierra-Luna (3.8M km)
                distanceElement.style.color = '#f39c12'; // Naranja - cerca
            } else if (this.currentDistance < 38440000) {
                // Menos de 100 veces la distancia Tierra-Luna (38.4M km)
                distanceElement.style.color = '#3498db'; // Azul - distancia media
            } else {
                // Más de 38.4M km
                distanceElement.style.color = '#2ecc71'; // Verde - lejos
            }
        }
    }

    /**
     * Aplica filtros y ordenamiento a los asteroides
     * MÉTODO DESHABILITADO - UI de filtros removida
     */
    /*
    applyFilters() {
        const sortBy = document.getElementById('sort-filter').value;
        const filterPHA = document.getElementById('filter-pha').checked;
        const filterClose = document.getElementById('filter-close').checked;
        
        console.log(`🔍 Aplicando filtros: PHA=${filterPHA}, Close=${filterClose}, Sort=${sortBy}`);
        
        // Primero ocultar TODOS los asteroides en la escena
        this.asteroidMeshes.forEach((data, id) => {
            data.mesh.visible = false;
        });
        
        this.orbitLines.forEach((line, id) => {
            line.visible = false;
        });
        
        // Filtrar asteroides
        let filteredAsteroids = [...this.asteroids];
        
        if (filterPHA) {
            filteredAsteroids = filteredAsteroids.filter(a => a.isHazardous);
            console.log(`   PHA filter: ${filteredAsteroids.length} asteroides peligrosos`);
        }
        
        if (filterClose) {
            filteredAsteroids = filteredAsteroids.filter(a => {
                // Buscar MOID en close approaches
                if (a.closeApproaches && a.closeApproaches.length > 0) {
                    const moidKm = a.closeApproaches[0].distance;
                    const moidAU = moidKm / 149597870.7;
                    return moidAU < 0.05;
                }
                return false;
            });
            console.log(`   MOID filter: ${filteredAsteroids.length} asteroides cercanos`);
        }
        
        // Ordenar asteroides
        switch (sortBy) {
            case 'moid':
                filteredAsteroids.sort((a, b) => {
                    const moidA = a.closeApproaches?.[0]?.distance || Infinity;
                    const moidB = b.closeApproaches?.[0]?.distance || Infinity;
                    return moidA - moidB;
                });
                console.log(`   Ordenado por MOID`);
                break;
                
            case 'diameter':
                filteredAsteroids.sort((a, b) => {
                    return (b.diameter.avg || 0) - (a.diameter.avg || 0);
                });
                console.log(`   Ordenado por diámetro`);
                break;
                
            case 'name':
                filteredAsteroids.sort((a, b) => {
                    return a.name.localeCompare(b.name);
                });
                console.log(`   Ordenado alfabéticamente`);
                break;
        }
        
        // Mostrar solo los asteroides filtrados en la escena 3D
        filteredAsteroids.forEach(asteroid => {
            const meshData = this.asteroidMeshes.get(asteroid.id);
            if (meshData) {
                meshData.mesh.visible = true;
            }
            
            const orbitLine = this.orbitLines.get(asteroid.id);
            if (orbitLine) {
                orbitLine.visible = true;
            }
        });
        
        // Actualizar lista visual
        this.updateFilteredList(filteredAsteroids);
        
        // Actualizar contadores
        document.getElementById('total-asteroids').textContent = filteredAsteroids.length;
        const hazardousCount = filteredAsteroids.filter(a => a.isHazardous).length;
        document.getElementById('hazardous-count').textContent = hazardousCount;
        
        // Actualizar slider para que refleje la cantidad filtrada
        const slider = document.getElementById('asteroid-limit-slider');
        if (slider && filteredAsteroids.length > 0) {
            slider.max = filteredAsteroids.length;
            slider.value = filteredAsteroids.length;
            document.getElementById('asteroid-limit-value').textContent = filteredAsteroids.length;
        }
        
        // Show notification
        const msg = filterPHA || filterClose ? 
            `${filteredAsteroids.length} of ${this.asteroids.length} asteroids` : 
            `${filteredAsteroids.length} sorted asteroids`;
        this.showNotification('✅ Filters applied', msg, 2000);
        
        console.log(`✅ Resultado: ${filteredAsteroids.length} asteroides visibles`);
    }
    */
    
    /**
     * Actualiza la lista visual con asteroides filtrados
     */
    updateFilteredList(filteredAsteroids) {
        const listContainer = document.getElementById('asteroid-list');
        listContainer.innerHTML = '';

        if (filteredAsteroids.length === 0) {
            listContainer.innerHTML = '<p style="color: #888; padding: 10px;">No hay asteroides que coincidan con los filtros</p>';
            return;
        }

        filteredAsteroids.forEach(asteroid => {
            const item = document.createElement('div');
            item.className = 'asteroid-item' + (asteroid.isHazardous ? ' hazardous' : '');
            
            // Calcular MOID si está disponible
            let moidText = '';
            if (asteroid.closeApproaches && asteroid.closeApproaches.length > 0) {
                const moidKm = asteroid.closeApproaches[0].distance;
                const moidAU = (moidKm / 149597870.7).toFixed(4);
                moidText = ` • MOID: ${moidAU} AU`;
            }
            
            item.innerHTML = `
                <div class="asteroid-name">${asteroid.name}</div>
                <div class="asteroid-info">
                    Ø ${asteroid.diameter.avg.toFixed(1)} km${moidText}
                    ${asteroid.isHazardous ? ' ⚠️' : ''}
                </div>
            `;
            
            item.addEventListener('click', (e) => {
                this.selectAsteroid(asteroid, e);
            });
            
            listContainer.appendChild(item);
        });
    }

    /**
     * 🔍 Busca asteroides por nombre o número
     * @param {string} query - Texto de búsqueda
     */
    searchAsteroids(query) {
        const resultsContainer = document.getElementById('search-results');
        
        console.log('🔍 searchAsteroids llamado con:', query);
        console.log('🔍 Total asteroides disponibles:', this.asteroids ? this.asteroids.length : 0);
        
        if (!query || query.trim().length < 2) {
            resultsContainer.innerHTML = '<p style="color: #666; padding: 5px;">Escribe al menos 2 caracteres</p>';
            return;
        }
        
        const searchTerm = query.toLowerCase().trim();
        console.log('🔍 Término de búsqueda (limpio):', searchTerm);
        
        const results = this.asteroids.filter(asteroid => {
            const name = asteroid.name ? asteroid.name.trim().toLowerCase() : '';
            const id = asteroid.id ? asteroid.id.toString() : '';
            const match = name.includes(searchTerm) || id.includes(searchTerm);
            
            // DEBUG: Mostrar los primeros 5 nombres cuando se busca "ic"
            if (searchTerm === 'ic' && results.length < 5) {
                console.log('🔍 Ejemplo de nombre:', name, '| ID:', id);
            }
            
            if (match && searchTerm === 'icarus') {
                console.log('🎯 Icarus encontrado:', asteroid.name, 'ID:', asteroid.id);
            }
            return match;
        }).slice(0, 10); // Máximo 10 resultados
        
        console.log('🔍 Resultados encontrados:', results.length);
        
        if (results.length === 0) {
            resultsContainer.innerHTML = '<p style="color: #666; padding: 5px;">No se encontraron resultados</p>';
            return;
        }
        
        resultsContainer.innerHTML = results.map((asteroid, index) => {
            const elementId = `search-result-${index}`;
            const displayName = asteroid.name ? asteroid.name.trim() : `Asteroid ${asteroid.id}`;
            return `
                <div id="${elementId}" style="padding: 8px; margin: 4px 0; background: #1a1e3d; border-radius: 4px; cursor: pointer; border-left: 3px solid ${asteroid.isHazardous ? '#e74c3c' : '#3498db'};">
                    <div style="font-weight: bold; color: #00d4ff;">${displayName}</div>
                    <div style="font-size: 10px; color: #888;">
                        ID: ${asteroid.id} • Ø ${asteroid.diameter.avg.toFixed(1)} km
                        ${asteroid.isHazardous ? ' ⚠️ PHA' : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        // Agregar event listeners después de crear los elementos
        results.forEach((asteroid, index) => {
            const element = document.getElementById(`search-result-${index}`);
            if (element) {
                element.addEventListener('click', () => {
                    this.selectAsteroid(asteroid);
                    console.log(`✅ Seleccionado: ${asteroid.name ? asteroid.name.trim() : asteroid.id}`);
                });
            }
        });
        
        console.log(`🔍 Búsqueda "${query}": ${results.length} resultados`);
    }

    /**
     * [DESHABILITADO] Actualiza dinámicamente la cantidad de asteroides visibles
     * Ya no se usa - solo se cargan asteroides verificados
     * @param {number} limit - Número de asteroides a mostrar
     */
    updateAsteroidLimit(limit) {
        // Método deshabilitado
        console.warn('⚠️ Método updateAsteroidLimit() deshabilitado - ya no se usa');
        return;
    }

    /**
     * Filtra asteroides por distancia de acercamiento
     * Muestra solo los N asteroides que más se acercaron a la Tierra
     * @param {number} limit - Número de asteroides más cercanos a mostrar
     */
    filterAsteroidsByDistance(limit) {
        if (!this.asteroids || this.asteroids.length === 0) {
            return;
        }

        console.log(`🎯 Filtrando para mostrar los ${limit} asteroides más cercanos`);

        // Ordenar asteroides por distancia mínima de acercamiento
        const sortedAsteroids = [...this.asteroids].sort((a, b) => {
            const distA = a.close_approach_data?.[0]?.miss_distance?.kilometers || Infinity;
            const distB = b.close_approach_data?.[0]?.miss_distance?.kilometers || Infinity;
            return parseFloat(distA) - parseFloat(distB);
        });

        // Ocultar todos primero
        this.asteroidMeshes.forEach((data) => {
            data.mesh.visible = false;
        });
        this.orbitLines.forEach((line) => {
            line.visible = false;
        });

        // Mostrar solo los N más cercanos
        const asteroidsToShow = sortedAsteroids.slice(0, limit);
        
        asteroidsToShow.forEach(asteroid => {
            const meshData = this.asteroidMeshes.get(asteroid.id);
            if (meshData) {
                meshData.mesh.visible = true;
            }
            
            const orbitLine = this.orbitLines.get(asteroid.id);
            if (orbitLine) {
                orbitLine.visible = true;
            }
        });

        // Actualizar lista en el panel
        this.updateFilteredList(asteroidsToShow);

        console.log(`✅ Mostrando ${asteroidsToShow.length} asteroides más cercanos`);
    }

    /**
     * Loop de animación principal
     */
    animate() {
        requestAnimationFrame(() => this.animate());

        // Actualizar tiempo
        if (!this.isPaused) {
            let effectiveSpeed = this.timeSpeed;
            
            if (this.isJogging && this.jogValue !== 0) {
                const jogMultiplier = this.jogValue / 50;
                effectiveSpeed = this.timeSpeed * jogMultiplier;
            }
            
            this.currentTime = new Date(this.currentTime.getTime() + effectiveSpeed * 86400000);
            this.updateTimeDisplay();

            // Actualizar posiciones de asteroides
            const julianDate = this.simulator.dateToJulian(this.currentTime);

            this.asteroidMeshes.forEach((data, asteroidId) => {
                const asteroid = this.asteroids.find(a => a.id === asteroidId);
                if (asteroid) {
                    const position = this.simulator.calculatePositionAtTime(asteroid, julianDate);
                    data.mesh.position.set(
                        position.heliocentric.x * this.scale,
                        position.heliocentric.z * this.scale,
                        position.heliocentric.y * this.scale
                    );
                    
                    // Log detallado para el asteroide seleccionado
                    if (this.selectedAsteroid && asteroid.id === this.selectedAsteroid.id) {
                        console.log(`🪨 ${asteroid.name} en ${this.currentTime.toLocaleDateString('es-ES')}:`);
                        console.log(`   Posición heliocéntrica: (${position.heliocentric.x.toFixed(2)}, ${position.heliocentric.y.toFixed(2)}, ${position.heliocentric.z.toFixed(2)}) km`);
                        console.log(`   Distance to Earth: ${(position.earthDistance / 1e6).toFixed(2)} million km`);
                    }
                }
            });

            // Actualizar posición de la Tierra
            // Log reducido para no saturar la consola
            if (!this.earthLogCounter) this.earthLogCounter = 0;
            this.earthLogCounter++;
            if (this.earthLogCounter % 100 === 0) {
                console.log(`🌍 Calculando posición de la Tierra para fecha: ${this.currentTime.toLocaleString('es-ES')} (JD: ${julianDate.toFixed(2)})`);
            }
            const earthPos = this.simulator.getEarthPosition(julianDate);
            this.earth.position.set(
                earthPos.x * this.scale,
                0,
                earthPos.y * this.scale
            );
            
            // Actualizar cameraTarget si no hay asteroide seleccionado (seguir la Tierra)
            if (!this.selectedAsteroid) {
                this.cameraTarget.copy(this.earth.position);
            }
            
            // Calcular distancia Tierra-Asteroide si hay uno seleccionado
            if (this.selectedAsteroid) {
                const asteroidData = this.asteroidMeshes.get(this.selectedAsteroid.id);
                if (asteroidData) {
                    const asteroidPosition = this.simulator.calculatePositionAtTime(
                        this.selectedAsteroid, 
                        julianDate
                    );
                    
                    // Usar distancia calculada por el simulador (distancia actual en la simulación)
                    // NO usar la distancia de close approach (esa es la distancia MÍNIMA en esa fecha)
                    this.currentDistance = asteroidPosition.earthDistance;
                    
                    // Actualizar visualización
                    this.updateDistanceDisplay();
                }
            }
        }

        // Actualizar cameraTarget para que siempre apunte al objeto correcto
        if (this.selectedAsteroid) {
            // Si hay asteroide seleccionado, el target sigue al asteroide
            const meshData = this.asteroidMeshes.get(this.selectedAsteroid.id);
            if (meshData) {
                this.cameraTarget.copy(meshData.mesh.position);
                
                // Si además está en modo seguimiento, mover la cámara también
                if (this.cameraFollowMode) {
                    const targetCameraPos = new THREE.Vector3(
                        meshData.mesh.position.x + this.cameraOffset.x,
                        meshData.mesh.position.y + this.cameraOffset.y,
                        meshData.mesh.position.z + this.cameraOffset.z
                    );
                    this.camera.position.lerp(targetCameraPos, 0.05);
                }
            }
        }
        
        // Siempre mantener la cámara mirando al target (Tierra o asteroide)
        this.camera.lookAt(this.cameraTarget);

        this.renderer.render(this.scene, this.camera);
    }

    // ========================================
    // CARGA DESDE CSV COMPLETO (Sin JSON)
    // ========================================

    /**
     * [DESHABILITADO] Carga asteroides directamente desde CSV sin necesidad de JSON
     * Ya no se usa - solo se cargan asteroides verificados
     */
    async loadFromCSV(maxAsteroids = null) {
        // Método deshabilitado
        console.warn('⚠️ Método loadFromCSV() deshabilitado - ya no se usa');
        return;
    }

    /**
     * Carga asteroides con los acercamientos MÁS CERCANOS verificados (últimos 20 años)
     * Datos de NASA JPL Close Approach Data API - Distancias VERIFICADAS
     */
    async loadVerifiedAsteroids() {
        try {
            console.log('🎯 Cargando los 200 asteroides MÁS CERCANOS a la Tierra (1975-2025)...');
            console.log('   Fuente: NASA JPL CAD + SBDB API - ELEMENTOS ORBITALES REALES');
            console.log('   Precisión: MÁXIMA (10+ decimales) - Distancias VERIFICADAS');
            
            // Datos de los 200 asteroides MÁS CERCANOS a la Tierra (1975-2025)
            // Fuente: NASA JPL CAD + SBDB API
            // Precisión: MAXIMA - Elementos orbitales REALES de SBDB
            // Generado: 2025-10-05T06:15:40.784Z
            const data = {
                "metadata": {
          "source": "NASA JPL CAD + SBDB API",
          "description": "Los 200 asteroides MAS CERCANOS a la Tierra (1975-2025)",
          "precision": "MAXIMA - Elementos orbitales REALES de SBDB",
          "date_generated": "2025-10-05T06:15:40.784Z"
},
                "asteroids": [
          {
                    "id": "2020VT4",
                    "name": "2020 VT4",
                    "full_name": "(2020 VT4)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.61,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.2812,
                                        "estimated_diameter_max": 2.3794
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "5",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2030325244720354",
                              "semi_major_axis": ".9080022936789371",
                              "inclination": "10.16997157631196",
                              "ascending_node_longitude": "231.3830999783527",
                              "perihelion_argument": "53.69144742969262",
                              "mean_anomaly": "34.40062811756151",
                              "mean_motion": "1.139130959953762",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2020-11-13",
                                        "close_approach_date_full": "2020-11-13T17:21:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "13.4271195491719",
                                                  "kilometers_per_hour": "48338"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "4.50910597356063e-05",
                                                  "kilometers": "6746",
                                                  "lunar": "0.02"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2025TF",
                    "name": "2025 TF",
                    "full_name": "(2025 TF)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31.702,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.6287,
                                        "estimated_diameter_max": 1.1675
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".5819939399836613",
                              "semi_major_axis": "1.617646639233933",
                              "inclination": "9.119499722094405",
                              "ascending_node_longitude": "7.768635857171128",
                              "perihelion_argument": "276.7261129376283",
                              "mean_anomaly": "48.31551315089299",
                              "mean_motion": ".4790475067629172",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2025-10-01",
                                        "close_approach_date_full": "2025-10-01T00:49:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "20.8761143006887",
                                                  "kilometers_per_hour": "75154"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "4.5324634421986e-05",
                                                  "kilometers": "6780",
                                                  "lunar": "0.02"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024XA",
                    "name": "2024 XA",
                    "full_name": "(2024 XA)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31.64,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.6377,
                                        "estimated_diameter_max": 1.1843
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3531128587305238",
                              "semi_major_axis": "1.289251008786243",
                              "inclination": "1.421486010795533",
                              "ascending_node_longitude": "69.47623859089104",
                              "perihelion_argument": "65.67030568251776",
                              "mean_anomaly": "205.6152717772303",
                              "mean_motion": ".6732833180043047",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-12-01",
                                        "close_approach_date_full": "2024-12-01T09:46:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "13.5659763677388",
                                                  "kilometers_per_hour": "48838"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "5.16452821681997e-05",
                                                  "kilometers": "7726",
                                                  "lunar": "0.02"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024LH1",
                    "name": "2024 LH1",
                    "full_name": "(2024 LH1)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.79,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.7756,
                                        "estimated_diameter_max": 1.4404
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2887571506348984",
                              "semi_major_axis": "1.191059357035072",
                              "inclination": "22.41246619029903",
                              "ascending_node_longitude": "76.01481386274153",
                              "perihelion_argument": "254.7232875683519",
                              "mean_anomaly": "358.7599392489062",
                              "mean_motion": ".7582352416812048",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-06-06",
                                        "close_approach_date_full": "2024-06-06T14:02:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "17.4040731251933",
                                                  "kilometers_per_hour": "62655"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "5.41335085929206e-05",
                                                  "kilometers": "8098",
                                                  "lunar": "0.02"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024UG9",
                    "name": "2024 UG9",
                    "full_name": "(2024 UG9)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 32.61,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.5101,
                                        "estimated_diameter_max": 0.9473
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".8312063998518362",
                              "semi_major_axis": "4.664727061741428",
                              "inclination": "2.289989877249743",
                              "ascending_node_longitude": "217.2241265912332",
                              "perihelion_argument": "237.1194409978546",
                              "mean_anomaly": "34.36735490296503",
                              "mean_motion": ".09782834742423181",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-10-30",
                                        "close_approach_date_full": "2024-10-30T12:42:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "20.3046810076548",
                                                  "kilometers_per_hour": "73097"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "5.91577148660634e-05",
                                                  "kilometers": "8850",
                                                  "lunar": "0.02"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2020QG",
                    "name": "2020 QG",
                    "full_name": "(2020 QG)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.9,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.952,
                                        "estimated_diameter_max": 1.7679
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "4",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4814369467078902",
                              "semi_major_axis": "1.910026777837837",
                              "inclination": "4.737108009204363",
                              "ascending_node_longitude": "323.4134617843918",
                              "perihelion_argument": "339.0005336700235",
                              "mean_anomaly": "4.382246299969692",
                              "mean_motion": ".3733747028671484",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2020-08-16",
                                        "close_approach_date_full": "2020-08-16T04:09:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "12.3308673063873",
                                                  "kilometers_per_hour": "44391"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "6.22797984976286e-05",
                                                  "kilometers": "9317",
                                                  "lunar": "0.02"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2021UA1",
                    "name": "2021 UA1",
                    "full_name": "(2021 UA1)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31.84,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.609,
                                        "estimated_diameter_max": 1.131
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4047138569785789",
                              "semi_major_axis": "1.085575732625527",
                              "inclination": ".005998273763734822",
                              "ascending_node_longitude": "125.9473724087276",
                              "perihelion_argument": "163.2433577276429",
                              "mean_anomaly": "271.8125555576134",
                              "mean_motion": ".8713926337349522",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2021-10-25",
                                        "close_approach_date_full": "2021-10-25T03:07:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "15.8350068603359",
                                                  "kilometers_per_hour": "57006"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "6.30135027524984e-05",
                                                  "kilometers": "9427",
                                                  "lunar": "0.02"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2025BP6",
                    "name": "2025 BP6",
                    "full_name": "(2025 BP6)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31.82,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.6118,
                                        "estimated_diameter_max": 1.1362
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".652100317285377",
                              "semi_major_axis": "1.795339742540777",
                              "inclination": "4.02189661247731",
                              "ascending_node_longitude": "305.8795006151864",
                              "perihelion_argument": "94.29932518338538",
                              "mean_anomaly": "141.7162881881422",
                              "mean_motion": ".409717115728527",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2025-01-26",
                                        "close_approach_date_full": "2025-01-26T01:10:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "21.0469764561347",
                                                  "kilometers_per_hour": "75769"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "6.49203901827142e-05",
                                                  "kilometers": "9712",
                                                  "lunar": "0.03"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2023BU",
                    "name": "2023 BU",
                    "full_name": "(2023 BU)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.69,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.9991,
                                        "estimated_diameter_max": 1.8555
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "23",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".110337851512424",
                              "semi_major_axis": "1.106537746036985",
                              "inclination": "3.731926443495587",
                              "ascending_node_longitude": "125.1107514453783",
                              "perihelion_argument": "356.0854801237284",
                              "mean_anomaly": "155.5547988785253",
                              "mean_motion": ".8467490620531999",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2023-01-27",
                                        "close_approach_date_full": "2023-01-27T00:29:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "9.2672451513957",
                                                  "kilometers_per_hour": "33362"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "6.66251002445381e-05",
                                                  "kilometers": "9967",
                                                  "lunar": "0.03"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2023RS",
                    "name": "2023 RS",
                    "full_name": "(2023 RS)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 32.32,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.5453,
                                        "estimated_diameter_max": 1.0127
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3945739052163396",
                              "semi_major_axis": "1.465959146774003",
                              "inclination": "9.97640339315261",
                              "ascending_node_longitude": "164.3740984213159",
                              "perihelion_argument": "234.7175045610222",
                              "mean_anomaly": "63.35891503786168",
                              "mean_motion": ".5552918156247204",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2023-09-07",
                                        "close_approach_date_full": "2023-09-07T14:26:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "13.5881282225663",
                                                  "kilometers_per_hour": "48917"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "6.92592750346214e-05",
                                                  "kilometers": "10361",
                                                  "lunar": "0.03"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2025OS",
                    "name": "2025 OS",
                    "full_name": "(2025 OS)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.93,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.9454,
                                        "estimated_diameter_max": 1.7558
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".6349547908034489",
                              "semi_major_axis": "2.74010917006802",
                              "inclination": ".7685396481474426",
                              "ascending_node_longitude": "116.1600866636645",
                              "perihelion_argument": "163.854995228745",
                              "mean_anomaly": "29.98671180469112",
                              "mean_motion": ".2172962716163223",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2025-07-19",
                                        "close_approach_date_full": "2025-07-19T03:21:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "12.7033859465262",
                                                  "kilometers_per_hour": "45732"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "6.99029474260007e-05",
                                                  "kilometers": "10457",
                                                  "lunar": "0.03"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2011CQ1",
                    "name": "2011 CQ1",
                    "full_name": "(2011 CQ1)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 32.1,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.5736,
                                        "estimated_diameter_max": 1.0653
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "9",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2046371433376783",
                              "semi_major_axis": ".8372285671568579",
                              "inclination": "5.284651793898951",
                              "ascending_node_longitude": "314.9290116721716",
                              "perihelion_argument": "335.3209131273001",
                              "mean_anomaly": "336.124979331756",
                              "mean_motion": "1.286583614622308",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2011-02-04",
                                        "close_approach_date_full": "2011-02-04T19:39:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "9.69344051108715",
                                                  "kilometers_per_hour": "34896"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "7.92234674587619e-05",
                                                  "kilometers": "11852",
                                                  "lunar": "0.03"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2019UN13",
                    "name": "2019 UN13",
                    "full_name": "(2019 UN13)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 32,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.587,
                                        "estimated_diameter_max": 1.0901
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4215617960058853",
                              "semi_major_axis": "1.449723566617267",
                              "inclination": "1.504248108649415",
                              "ascending_node_longitude": "217.4259214881279",
                              "perihelion_argument": "241.9279410364243",
                              "mean_anomaly": "143.8995952224712",
                              "mean_motion": ".5646460256692611",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2019-10-31",
                                        "close_approach_date_full": "2019-10-31T14:45:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "12.8450933878234",
                                                  "kilometers_per_hour": "46242"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "8.43156436848206e-05",
                                                  "kilometers": "12613",
                                                  "lunar": "0.03"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2008TS26",
                    "name": "2008 TS26",
                    "full_name": "(2008 TS26)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 33.2,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.4453,
                                        "estimated_diameter_max": 0.8269
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "9",
                              "epoch_osculation": 2454748.5,
                              "eccentricity": ".5691346591940873",
                              "semi_major_axis": "1.922258544653655",
                              "inclination": ".818532556250409",
                              "ascending_node_longitude": "16.42550302157876",
                              "perihelion_argument": "301.6272906351544",
                              "mean_anomaly": "14.88481240331696",
                              "mean_motion": ".3698165764203089",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2008-10-09",
                                        "close_approach_date_full": "2008-10-09T03:30:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "15.7641714138192",
                                                  "kilometers_per_hour": "56751"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "8.44809011695201e-05",
                                                  "kilometers": "12638",
                                                  "lunar": "0.03"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2004FU162",
                    "name": "2004 FU162",
                    "full_name": "(2004 FU162)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.48,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.0486,
                                        "estimated_diameter_max": 1.9475
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "11",
                              "epoch_osculation": 2453100.5,
                              "eccentricity": ".3921717510663896",
                              "semi_major_axis": ".8268620088708117",
                              "inclination": "4.164655704774893",
                              "ascending_node_longitude": "191.2486013061138",
                              "perihelion_argument": "139.7841451391181",
                              "mean_anomaly": "262.6670209006733",
                              "mean_motion": "1.31085458231853",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2004-03-31",
                                        "close_approach_date_full": "2004-03-31T15:35:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "13.3906449624196",
                                                  "kilometers_per_hour": "48206"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "8.63189689546789e-05",
                                                  "kilometers": "12913",
                                                  "lunar": "0.03"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2020CD3",
                    "name": "2020 CD3",
                    "full_name": "(2020 CD3)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31.74,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.6232,
                                        "estimated_diameter_max": 1.1574
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "27",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".01237540960855443",
                              "semi_major_axis": "1.029031414224297",
                              "inclination": ".6339480770918524",
                              "ascending_node_longitude": "82.23960433765718",
                              "perihelion_argument": "49.97027547232736",
                              "mean_anomaly": "204.0687711210974",
                              "mean_motion": ".9441937563737366",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2019-04-04",
                                        "close_approach_date_full": "2019-04-04T09:33:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "7.77372560472569",
                                                  "kilometers_per_hour": "27985"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "8.75970336943964e-05",
                                                  "kilometers": "13104",
                                                  "lunar": "0.03"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2020JJ",
                    "name": "2020 JJ",
                    "full_name": "(2020 JJ)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.9,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.952,
                                        "estimated_diameter_max": 1.7679
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".42203508209197",
                              "semi_major_axis": "1.506099970805199",
                              "inclination": "11.18651631114178",
                              "ascending_node_longitude": "44.1268043029661",
                              "perihelion_argument": "237.4387832063682",
                              "mean_anomaly": "336.9633265528386",
                              "mean_motion": ".5332408029889961",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2020-05-04",
                                        "close_approach_date_full": "2020-05-04T12:05:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "14.3572480018827",
                                                  "kilometers_per_hour": "51686"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "8.95978759447433e-05",
                                                  "kilometers": "13404",
                                                  "lunar": "0.03"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2018UA",
                    "name": "2018 UA",
                    "full_name": "(2018 UA)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.2,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.8884,
                                        "estimated_diameter_max": 1.6499
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "5",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4475201564377419",
                              "semi_major_axis": "1.390269238397672",
                              "inclination": "2.643592546922633",
                              "ascending_node_longitude": "205.4593262667598",
                              "perihelion_argument": "255.4920110428318",
                              "mean_anomaly": "86.16418262734587",
                              "mean_motion": ".6012508503827602",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2018-10-19",
                                        "close_approach_date_full": "2018-10-19T14:46:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "14.1459743317095",
                                                  "kilometers_per_hour": "50926"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "9.13916748256049e-05",
                                                  "kilometers": "13672",
                                                  "lunar": "0.04"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2023UR10",
                    "name": "2023 UR10",
                    "full_name": "(2023 UR10)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.96,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.9389,
                                        "estimated_diameter_max": 1.7437
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2460238.5,
                              "eccentricity": ".3733537937058186",
                              "semi_major_axis": "1.474411138075032",
                              "inclination": "9.378811244060982",
                              "ascending_node_longitude": "206.197520025846",
                              "perihelion_argument": "137.2180616847611",
                              "mean_anomaly": "19.51439662343202",
                              "mean_motion": ".5505238893247147",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2023-10-20",
                                        "close_approach_date_full": "2023-10-20T04:24:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "12.2071635240662",
                                                  "kilometers_per_hour": "43946"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "9.32444676171562e-05",
                                                  "kilometers": "13949",
                                                  "lunar": "0.04"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2021SP",
                    "name": "2021 SP",
                    "full_name": "(2021 SP)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.26,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.1031,
                                        "estimated_diameter_max": 2.0487
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4615704215970783",
                              "semi_major_axis": "1.451523230180169",
                              "inclination": "4.78088557324801",
                              "ascending_node_longitude": "174.5359536519599",
                              "perihelion_argument": "252.7006004321938",
                              "mean_anomaly": "111.2461989930263",
                              "mean_motion": ".5635962410520485",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2021-09-17",
                                        "close_approach_date_full": "2021-09-17T11:50:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "14.3667108232274",
                                                  "kilometers_per_hour": "51720"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "9.42695366288059e-05",
                                                  "kilometers": "14103",
                                                  "lunar": "0.04"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2016DY30",
                    "name": "2016 DY30",
                    "full_name": "(2016 DY30)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.5,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.8291,
                                        "estimated_diameter_max": 1.5398
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "4",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".5107175137548224",
                              "semi_major_axis": "1.11760400468694",
                              "inclination": ".7672311676590853",
                              "ascending_node_longitude": "157.1667406102817",
                              "perihelion_argument": "250.2009753957401",
                              "mean_anomaly": "136.0483289947962",
                              "mean_motion": ".8342037733097818",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2016-02-25",
                                        "close_approach_date_full": "2016-02-25T19:59:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "17.342551325617",
                                                  "kilometers_per_hour": "62433"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "9.56261117948933e-05",
                                                  "kilometers": "14305",
                                                  "lunar": "0.04"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2022FD1",
                    "name": "2022 FD1",
                    "full_name": "(2022 FD1)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31.05,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.7305,
                                        "estimated_diameter_max": 1.3567
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".5743834765965621",
                              "semi_major_axis": "1.612160008694181",
                              "inclination": "4.490808358991342",
                              "ascending_node_longitude": "4.153823939157939",
                              "perihelion_argument": "261.9385429276517",
                              "mean_anomaly": "259.892132677743",
                              "mean_motion": ".4814950848483392",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2022-03-25",
                                        "close_approach_date_full": "2022-03-25T09:13:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "18.5120509220777",
                                                  "kilometers_per_hour": "66643"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "9.92295783505378e-05",
                                                  "kilometers": "14845",
                                                  "lunar": "0.04"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2022SK4",
                    "name": "2022 SK4",
                    "full_name": "(2022 SK4)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.35,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.8583,
                                        "estimated_diameter_max": 1.5939
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3086747414727242",
                              "semi_major_axis": ".8385028903205816",
                              "inclination": "15.17706467013225",
                              "ascending_node_longitude": "176.574972169322",
                              "perihelion_argument": "37.58884150220658",
                              "mean_anomaly": "162.7941313098724",
                              "mean_motion": "1.283651781751952",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2022-09-19",
                                        "close_approach_date_full": "2022-09-19T21:41:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "13.0062511826387",
                                                  "kilometers_per_hour": "46823"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "9.97462246626347e-05",
                                                  "kilometers": "14922",
                                                  "lunar": "0.04"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2019AS5",
                    "name": "2019 AS5",
                    "full_name": "(2019 AS5)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 32.3,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.5478,
                                        "estimated_diameter_max": 1.0173
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "4",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3924065182495804",
                              "semi_major_axis": "1.347955549305079",
                              "inclination": ".7014741108608106",
                              "ascending_node_longitude": "106.766395066565",
                              "perihelion_argument": "294.3430417587936",
                              "mean_anomaly": "170.211451539891",
                              "mean_motion": ".6297826868735337",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2019-01-08",
                                        "close_approach_date_full": "2019-01-08T00:37:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "12.5187728738837",
                                                  "kilometers_per_hour": "45068"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000100705233003908",
                                                  "kilometers": "15065",
                                                  "lunar": "0.04"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2023AV",
                    "name": "2023 AV",
                    "full_name": "(2023 AV)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.66,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.7991,
                                        "estimated_diameter_max": 1.4841
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3971668008130729",
                              "semi_major_axis": "1.13288961929457",
                              "inclination": "10.64923235697116",
                              "ascending_node_longitude": "112.0112525178998",
                              "perihelion_argument": "265.7000281179031",
                              "mean_anomaly": "181.7687925998891",
                              "mean_motion": ".8173774984322318",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2023-01-12",
                                        "close_approach_date_full": "2023-01-12T20:09:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "15.0495382129104",
                                                  "kilometers_per_hour": "54178"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000103954327700867",
                                                  "kilometers": "15551",
                                                  "lunar": "0.04"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024HA",
                    "name": "2024 HA",
                    "full_name": "(2024 HA)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31.77,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.6189,
                                        "estimated_diameter_max": 1.1494
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".562534770336341",
                              "semi_major_axis": "1.047654545035759",
                              "inclination": ".5151820097344993",
                              "ascending_node_longitude": "27.20250907438377",
                              "perihelion_argument": "300.2736748416581",
                              "mean_anomaly": "122.5149553421058",
                              "mean_motion": ".9191299581733209",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-04-16",
                                        "close_approach_date_full": "2024-04-16T17:42:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "19.4617759141819",
                                                  "kilometers_per_hour": "70062"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000103979587200082",
                                                  "kilometers": "15555",
                                                  "lunar": "0.04"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2020CW",
                    "name": "2020 CW",
                    "full_name": "(2020 CW)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 32.56,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.516,
                                        "estimated_diameter_max": 0.9582
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".6079856836882127",
                              "semi_major_axis": "1.0822210128906",
                              "inclination": "5.934615372731588",
                              "ascending_node_longitude": "131.7869288962026",
                              "perihelion_argument": "120.4548714273839",
                              "mean_anomaly": "8.015552159348799",
                              "mean_motion": ".8754475480595145",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2020-02-01",
                                        "close_approach_date_full": "2020-02-01T12:50:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "21.2837453781035",
                                                  "kilometers_per_hour": "76621"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000104963863939523",
                                                  "kilometers": "15702",
                                                  "lunar": "0.04"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2017GM",
                    "name": "2017 GM",
                    "full_name": "(2017 GM)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.9,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.952,
                                        "estimated_diameter_max": 1.7679
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "6",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".7490827405296586",
                              "semi_major_axis": "3.297172464268707",
                              "inclination": ".2348368401570096",
                              "ascending_node_longitude": "195.4460069779718",
                              "perihelion_argument": "55.75878562464331",
                              "mean_anomaly": "156.012856666917",
                              "mean_motion": ".1646234039787323",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2017-04-04",
                                        "close_approach_date_full": "2017-04-04T10:32:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "18.4953860458686",
                                                  "kilometers_per_hour": "66583"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000108736938810741",
                                                  "kilometers": "16267",
                                                  "lunar": "0.04"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2022UR4",
                    "name": "2022 UR4",
                    "full_name": "(2022 UR4)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.93,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.1902,
                                        "estimated_diameter_max": 2.2104
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".5296694888346672",
                              "semi_major_axis": "1.765412198360485",
                              "inclination": "11.29153377423301",
                              "ascending_node_longitude": "207.1720307120893",
                              "perihelion_argument": "238.6090269178867",
                              "mean_anomaly": "96.13217965328579",
                              "mean_motion": ".420179528387634",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2022-10-20",
                                        "close_approach_date_full": "2022-10-20T22:45:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "15.2224074733387",
                                                  "kilometers_per_hour": "54801"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000113937766110231",
                                                  "kilometers": "17045",
                                                  "lunar": "0.04"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2022KP6",
                    "name": "2022 KP6",
                    "full_name": "(2022 KP6)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.41,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.0657,
                                        "estimated_diameter_max": 1.9791
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3674312522498748",
                              "semi_major_axis": "1.577105131347699",
                              "inclination": "7.2054928401701",
                              "ascending_node_longitude": "64.03338782487752",
                              "perihelion_argument": "199.1544908177308",
                              "mean_anomaly": "265.9450416400325",
                              "mean_motion": ".4976375081203577",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2022-05-25",
                                        "close_approach_date_full": "2022-05-25T15:05:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "9.882333671434",
                                                  "kilometers_per_hour": "35576"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000116488880683735",
                                                  "kilometers": "17426",
                                                  "lunar": "0.05"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024UZ6",
                    "name": "2024 UZ6",
                    "full_name": "(2024 UZ6)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31.16,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.7122,
                                        "estimated_diameter_max": 1.3227
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "5",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".1635411546718448",
                              "semi_major_axis": ".9041759500031792",
                              "inclination": ".451704451019296",
                              "ascending_node_longitude": "33.38001910760486",
                              "perihelion_argument": "225.7436143724011",
                              "mean_anomaly": "207.1843911437912",
                              "mean_motion": "1.146369564320488",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-10-27",
                                        "close_approach_date_full": "2024-10-27T07:24:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "8.13799991322131",
                                                  "kilometers_per_hour": "29297"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000117148172761056",
                                                  "kilometers": "17525",
                                                  "lunar": "0.05"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2017UJ2",
                    "name": "2017 UJ2",
                    "full_name": "(2017 UJ2)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.9,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.7562,
                                        "estimated_diameter_max": 1.4043
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".182005501824242",
                              "semi_major_axis": "1.11586019859679",
                              "inclination": ".482374105312985",
                              "ascending_node_longitude": "22.32258084813748",
                              "perihelion_argument": "304.7493678151021",
                              "mean_anomaly": "338.874664694959",
                              "mean_motion": ".8361600100343559",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2017-10-20",
                                        "close_approach_date_full": "2017-10-20T14:07:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "8.48313222171268",
                                                  "kilometers_per_hour": "30539"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000119633034150659",
                                                  "kilometers": "17897",
                                                  "lunar": "0.05"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2011MD",
                    "name": "2011 MD",
                    "full_name": "(2011 MD)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 27.98,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.4812,
                                        "estimated_diameter_max": 2.7509
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "47",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".03770594028727569",
                              "semi_major_axis": "1.057067671381492",
                              "inclination": "2.442735080844225",
                              "ascending_node_longitude": "271.3867261801815",
                              "perihelion_argument": "5.634899092999296",
                              "mean_anomaly": "94.40375929061173",
                              "mean_motion": ".9068801323027694",
                              "orbit_class": {
                                        "orbit_class_type": "AMO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2011-06-27",
                                        "close_approach_date_full": "2011-06-27T17:01:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "6.70253343356",
                                                  "kilometers_per_hour": "24129"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000124676982156498",
                                                  "kilometers": "18651",
                                                  "lunar": "0.05"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024GJ2",
                    "name": "2024 GJ2",
                    "full_name": "(2024 GJ2)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.37,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.8543,
                                        "estimated_diameter_max": 1.5866
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "12",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4023855924081403",
                              "semi_major_axis": "1.066551954513259",
                              "inclination": "1.022061563089987",
                              "ascending_node_longitude": "201.9078473652518",
                              "perihelion_argument": "105.6936701764278",
                              "mean_anomaly": "107.7857457924914",
                              "mean_motion": ".8948104555371453",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-04-11",
                                        "close_approach_date_full": "2024-04-11T18:30:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "14.3791945143696",
                                                  "kilometers_per_hour": "51765"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.00012482612234936",
                                                  "kilometers": "18674",
                                                  "lunar": "0.05"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2022GQ5",
                    "name": "2022 GQ5",
                    "full_name": "(2022 GQ5)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31.71,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.6275,
                                        "estimated_diameter_max": 1.1654
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3399349013176731",
                              "semi_major_axis": "1.274381435781917",
                              "inclination": "15.50971497710029",
                              "ascending_node_longitude": "18.50625128108918",
                              "perihelion_argument": "248.2231720581235",
                              "mean_anomaly": "150.1331488245095",
                              "mean_motion": ".6851015015066091",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2022-04-08",
                                        "close_approach_date_full": "2022-04-08T16:20:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "14.1816914380301",
                                                  "kilometers_per_hour": "51054"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000126681377828634",
                                                  "kilometers": "18951",
                                                  "lunar": "0.05"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2014LY21",
                    "name": "2014 LY21",
                    "full_name": "(2014 LY21)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.1,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.1445,
                                        "estimated_diameter_max": 2.1255
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "11",
                              "epoch_osculation": 2456810.5,
                              "eccentricity": ".6059403049423049",
                              "semi_major_axis": ".6457587238629692",
                              "inclination": "1.242700855458696",
                              "ascending_node_longitude": "73.34798924476198",
                              "perihelion_argument": "349.7529056756081",
                              "mean_anomaly": "207.9180756496964",
                              "mean_motion": "1.899322228263947",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2014-06-03",
                                        "close_approach_date_full": "2014-06-03T17:38:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "13.3097858377442",
                                                  "kilometers_per_hour": "47915"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000133975955231724",
                                                  "kilometers": "20043",
                                                  "lunar": "0.05"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2009VA",
                    "name": "2009 VA",
                    "full_name": "(2009 VA)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.58,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.2901,
                                        "estimated_diameter_max": 2.3959
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "7",
                              "epoch_osculation": 2455141.5,
                              "eccentricity": ".3574007605683017",
                              "semi_major_axis": "1.428055108089426",
                              "inclination": "7.542104613313825",
                              "ascending_node_longitude": "224.5419648340493",
                              "perihelion_argument": "223.9911168199338",
                              "mean_anomaly": "338.9489925626127",
                              "mean_motion": ".5775460572235662",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2009-11-06",
                                        "close_approach_date_full": "2009-11-06T21:32:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "10.3037625310907",
                                                  "kilometers_per_hour": "37094"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.0001366995607886",
                                                  "kilometers": "20450",
                                                  "lunar": "0.05"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2020XK1",
                    "name": "2020 XK1",
                    "full_name": "(2020 XK1)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.6,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.8103,
                                        "estimated_diameter_max": 1.5048
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "4",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3989391980330339",
                              "semi_major_axis": "1.633063710455321",
                              "inclination": "3.385882481107474",
                              "ascending_node_longitude": "75.7413171106471",
                              "perihelion_argument": "351.2908689495256",
                              "mean_anomaly": "138.0465720016382",
                              "mean_motion": ".4722798120157566",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2020-12-07",
                                        "close_approach_date_full": "2020-12-07T16:15:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "8.49214903453907",
                                                  "kilometers_per_hour": "30572"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000139076938214119",
                                                  "kilometers": "20806",
                                                  "lunar": "0.05"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2012KT42",
                    "name": "2012 KT42",
                    "full_name": "(2012 KT42)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.1712,
                                        "estimated_diameter_max": 2.175
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "19",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".5548459916609161",
                              "semi_major_axis": "1.597544762535491",
                              "inclination": "2.192712802615032",
                              "ascending_node_longitude": "69.45848153365857",
                              "perihelion_argument": "259.1224635548384",
                              "mean_anomaly": "218.2742441853244",
                              "mean_motion": ".4881176595972679",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2012-05-29",
                                        "close_approach_date_full": "2012-05-29T07:07:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "17.0376019609099",
                                                  "kilometers_per_hour": "61335"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000139124777593185",
                                                  "kilometers": "20813",
                                                  "lunar": "0.05"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2017EA",
                    "name": "2017 EA",
                    "full_name": "(2017 EA)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.8,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.7738,
                                        "estimated_diameter_max": 1.437
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "4",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".5995368338090977",
                              "semi_major_axis": "1.707049166030926",
                              "inclination": "1.372350779618042",
                              "ascending_node_longitude": "161.7028160484747",
                              "perihelion_argument": "80.58536289349495",
                              "mean_anomaly": "307.0829543015934",
                              "mean_motion": ".441911220983306",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2017-03-02",
                                        "close_approach_date_full": "2017-03-02T14:05:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "18.4208169080238",
                                                  "kilometers_per_hour": "66315"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000139688516976705",
                                                  "kilometers": "20897",
                                                  "lunar": "0.05"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024RC42",
                    "name": "2024 RC42",
                    "full_name": "(2024 RC42)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 32.38,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.5378,
                                        "estimated_diameter_max": 0.9988
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3293616725669561",
                              "semi_major_axis": ".8233137123651939",
                              "inclination": "1.196352936933944",
                              "ascending_node_longitude": "350.0885490388316",
                              "perihelion_argument": "145.2485293822905",
                              "mean_anomaly": "94.43051218894472",
                              "mean_motion": "1.319337937901977",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-09-12",
                                        "close_approach_date_full": "2024-09-12T19:32:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "9.586046079277",
                                                  "kilometers_per_hour": "34510"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000144686935168409",
                                                  "kilometers": "21645",
                                                  "lunar": "0.06"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2021RS2",
                    "name": "2021 RS2",
                    "full_name": "(2021 RS2)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.35,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.8583,
                                        "estimated_diameter_max": 1.5939
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "4",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".504693726446069",
                              "semi_major_axis": "1.306701862272994",
                              "inclination": "14.56662592608114",
                              "ascending_node_longitude": "165.5764473300189",
                              "perihelion_argument": "273.7530630983117",
                              "mean_anomaly": "254.9640814035159",
                              "mean_motion": ".6598410172918602",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2021-09-08",
                                        "close_approach_date_full": "2021-09-08T07:28:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "17.6021434912378",
                                                  "kilometers_per_hour": "63368"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000145089442397883",
                                                  "kilometers": "21705",
                                                  "lunar": "0.06"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2025FY6",
                    "name": "2025 FY6",
                    "full_name": "(2025 FY6)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.91,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.7544,
                                        "estimated_diameter_max": 1.4011
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2460757.5,
                              "eccentricity": ".7466894183440345",
                              "semi_major_axis": "2.281557176878614",
                              "inclination": "1.447200202577001",
                              "ascending_node_longitude": "182.8362269656517",
                              "perihelion_argument": "89.26473494831701",
                              "mean_anomaly": "346.8113888900431",
                              "mean_motion": ".2859940768086337",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2025-03-23",
                                        "close_approach_date_full": "2025-03-23T19:29:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "23.4265928771164",
                                                  "kilometers_per_hour": "84336"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000146688306210922",
                                                  "kilometers": "21944",
                                                  "lunar": "0.06"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2025PF2",
                    "name": "2025 PF2",
                    "full_name": "(2025 PF2)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.13,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.9029,
                                        "estimated_diameter_max": 1.6768
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3674745511327916",
                              "semi_major_axis": ".9916036763483568",
                              "inclination": "5.784861296711113",
                              "ascending_node_longitude": "322.1381757189303",
                              "perihelion_argument": "245.2986780207563",
                              "mean_anomaly": "170.1515733569973",
                              "mean_motion": ".9981524602187499",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2025-08-15",
                                        "close_approach_date_full": "2025-08-15T00:13:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "13.058265463064",
                                                  "kilometers_per_hour": "47010"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000149476314618675",
                                                  "kilometers": "22361",
                                                  "lunar": "0.06"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2025SU4",
                    "name": "2025 SU4",
                    "full_name": "(2025 SU4)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31.821,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.6117,
                                        "estimated_diameter_max": 1.136
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "5",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2509567436486103",
                              "semi_major_axis": ".9704939942148405",
                              "inclination": "1.640423047539106",
                              "ascending_node_longitude": "1.433456997244806",
                              "perihelion_argument": "111.5758055584704",
                              "mean_anomaly": "336.04412586185",
                              "mean_motion": "1.030895860312879",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2025-09-24",
                                        "close_approach_date_full": "2025-09-24T08:34:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "9.18083756265878",
                                                  "kilometers_per_hour": "33051"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000149606886283349",
                                                  "kilometers": "22381",
                                                  "lunar": "0.06"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2021CZ3",
                    "name": "2021 CZ3",
                    "full_name": "(2021 CZ3)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.739,
                                        "estimated_diameter_max": 1.3724
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "5",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3144017158965001",
                              "semi_major_axis": "1.10460440342055",
                              "inclination": "4.543317406074651",
                              "ascending_node_longitude": "140.0658580244528",
                              "perihelion_argument": "271.7965669968039",
                              "mean_anomaly": "95.39484279878046",
                              "mean_motion": ".8489730783853606",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2021-02-09",
                                        "close_approach_date_full": "2021-02-09T01:50:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "11.0887501173184",
                                                  "kilometers_per_hour": "39920"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.00015247592080515",
                                                  "kilometers": "22810",
                                                  "lunar": "0.06"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2019EH1",
                    "name": "2019 EH1",
                    "full_name": "(2019 EH1)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.12,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.9049,
                                        "estimated_diameter_max": 1.6806
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4873013073736726",
                              "semi_major_axis": "1.382129284684489",
                              "inclination": ".598978068333386",
                              "ascending_node_longitude": "339.9009960092429",
                              "perihelion_argument": "263.2278712696028",
                              "mean_anomaly": "18.10752449730274",
                              "mean_motion": ".6065702004248119",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2019-03-01",
                                        "close_approach_date_full": "2019-03-01T17:38:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "15.6099934539764",
                                                  "kilometers_per_hour": "56196"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000156761063087617",
                                                  "kilometers": "23451",
                                                  "lunar": "0.06"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2016RN41",
                    "name": "2016 RN41",
                    "full_name": "(2016 RN41)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31.02,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.7356,
                                        "estimated_diameter_max": 1.3661
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "5",
                              "epoch_osculation": 2457642.5,
                              "eccentricity": ".3161720911001572",
                              "semi_major_axis": "1.013703620867797",
                              "inclination": "9.57588281954761",
                              "ascending_node_longitude": "169.028989896227",
                              "perihelion_argument": "287.2676112274473",
                              "mean_anomaly": "288.7793702593395",
                              "mean_motion": ".9656896510546792",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2016-09-11",
                                        "close_approach_date_full": "2016-09-11T14:56:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "11.7217270570775",
                                                  "kilometers_per_hour": "42198"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000158549253564343",
                                                  "kilometers": "23719",
                                                  "lunar": "0.06"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2021BO",
                    "name": "2021 BO",
                    "full_name": "(2021 BO)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 32.95,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.4717,
                                        "estimated_diameter_max": 0.8759
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "4",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".1433965048069376",
                              "semi_major_axis": ".9468687141278249",
                              "inclination": "5.294909605631288",
                              "ascending_node_longitude": "118.0928725497784",
                              "perihelion_argument": "113.420912075148",
                              "mean_anomaly": "352.8471531436273",
                              "mean_motion": "1.069718294544576",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2021-01-18",
                                        "close_approach_date_full": "2021-01-18T08:09:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "7.72378836573796",
                                                  "kilometers_per_hour": "27806"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000160402626150236",
                                                  "kilometers": "23996",
                                                  "lunar": "0.06"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024JN16",
                    "name": "2024 JN16",
                    "full_name": "(2024 JN16)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.59,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.0224,
                                        "estimated_diameter_max": 1.8988
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "6",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2402327591271851",
                              "semi_major_axis": ".9317541357637295",
                              "inclination": "3.879865214173267",
                              "ascending_node_longitude": "53.38286322990091",
                              "perihelion_argument": "303.0769044229411",
                              "mean_anomaly": "150.3349871314425",
                              "mean_motion": "1.095852443148054",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-05-14",
                                        "close_approach_date_full": "2024-05-14T09:49:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "9.26326852948483",
                                                  "kilometers_per_hour": "33348"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000166961984280547",
                                                  "kilometers": "24977",
                                                  "lunar": "0.06"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2020CD3",
                    "name": "2020 CD3",
                    "full_name": "(2020 CD3)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31.74,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.6232,
                                        "estimated_diameter_max": 1.1574
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "27",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".01237540960855443",
                              "semi_major_axis": "1.029031414224297",
                              "inclination": ".6339480770918524",
                              "ascending_node_longitude": "82.23960433765718",
                              "perihelion_argument": "49.97027547232736",
                              "mean_anomaly": "204.0687711210974",
                              "mean_motion": ".9441937563737366",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2018-05-09",
                                        "close_approach_date_full": "2018-05-09T13:48:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "5.53053276465864",
                                                  "kilometers_per_hour": "19910"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000172116227488965",
                                                  "kilometers": "25748",
                                                  "lunar": "0.07"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024JT3",
                    "name": "2024 JT3",
                    "full_name": "(2024 JT3)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.13,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.1366,
                                        "estimated_diameter_max": 2.1109
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "4",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".5518384104713383",
                              "semi_major_axis": "2.173584566007566",
                              "inclination": "2.280767017326904",
                              "ascending_node_longitude": "49.21676299571013",
                              "perihelion_argument": "206.0591391122738",
                              "mean_anomaly": "166.0150518558662",
                              "mean_motion": ".307566663530752",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-05-09",
                                        "close_approach_date_full": "2024-05-09T09:36:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "10.8776047679118",
                                                  "kilometers_per_hour": "39159"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000172146723681254",
                                                  "kilometers": "25753",
                                                  "lunar": "0.07"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2021GW4",
                    "name": "2021 GW4",
                    "full_name": "(2021 GW4)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.47,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.051,
                                        "estimated_diameter_max": 1.9519
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "6",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3036880388932298",
                              "semi_major_axis": "1.402900356941754",
                              "inclination": "5.069599729667348",
                              "ascending_node_longitude": "22.56413712712513",
                              "perihelion_argument": "206.962767157975",
                              "mean_anomaly": "264.6160361238685",
                              "mean_motion": ".5931490447452643",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2021-04-12",
                                        "close_approach_date_full": "2021-04-12T13:01:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "8.36024941650424",
                                                  "kilometers_per_hour": "30097"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000175131371899942",
                                                  "kilometers": "26199",
                                                  "lunar": "0.07"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024EJ4",
                    "name": "2024 EJ4",
                    "full_name": "(2024 EJ4)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.38,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.0731,
                                        "estimated_diameter_max": 1.9928
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3339074214610254",
                              "semi_major_axis": "1.427325133687505",
                              "inclination": "1.707435065101628",
                              "ascending_node_longitude": "353.4470172640044",
                              "perihelion_argument": "214.2482341366898",
                              "mean_anomaly": "340.1308612140834",
                              "mean_motion": ".5779891739236869",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-03-13",
                                        "close_approach_date_full": "2024-03-13T17:22:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "8.68493760631129",
                                                  "kilometers_per_hour": "31266"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000175441570597385",
                                                  "kilometers": "26246",
                                                  "lunar": "0.07"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2015SK7",
                    "name": "2015 SK7",
                    "full_name": "(2015 SK7)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.9,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.1985,
                                        "estimated_diameter_max": 2.2257
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "10",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".6198110057477534",
                              "semi_major_axis": "2.371751663176913",
                              "inclination": "2.377864888000617",
                              "ascending_node_longitude": "359.5232794429187",
                              "perihelion_argument": "317.091155622804",
                              "mean_anomaly": "289.636416574112",
                              "mean_motion": ".2698362254594051",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2015-09-22",
                                        "close_approach_date_full": "2015-09-22T21:44:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "13.7086304562072",
                                                  "kilometers_per_hour": "49351"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000177901160375831",
                                                  "kilometers": "26614",
                                                  "lunar": "0.07"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2016AH164",
                    "name": "2016 AH164",
                    "full_name": "(2016 AH164)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.7,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.9968,
                                        "estimated_diameter_max": 1.8513
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "7",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2489104756662358",
                              "semi_major_axis": "1.150577875075248",
                              "inclination": "1.722689142008001",
                              "ascending_node_longitude": "290.5020801954852",
                              "perihelion_argument": "113.164412688016",
                              "mean_anomaly": "40.50021619191985",
                              "mean_motion": ".7986013611473693",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2016-01-12",
                                        "close_approach_date_full": "2016-01-12T03:35:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "8.62623036922339",
                                                  "kilometers_per_hour": "31054"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000178175636611497",
                                                  "kilometers": "26655",
                                                  "lunar": "0.07"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2023VA",
                    "name": "2023 VA",
                    "full_name": "(2023 VA)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.59,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.2871,
                                        "estimated_diameter_max": 2.3904
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "4",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4193038867748241",
                              "semi_major_axis": "1.45588931450456",
                              "inclination": "1.448250850384069",
                              "ascending_node_longitude": "219.516585962221",
                              "perihelion_argument": "239.7256369254891",
                              "mean_anomaly": "35.77035858541587",
                              "mean_motion": ".5610628792401395",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2023-11-02",
                                        "close_approach_date_full": "2023-11-02T05:37:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "11.3026412337504",
                                                  "kilometers_per_hour": "40690"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000178877808924569",
                                                  "kilometers": "26760",
                                                  "lunar": "0.07"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2021TE13",
                    "name": "2021 TE13",
                    "full_name": "(2021 TE13)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.35,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.0805,
                                        "estimated_diameter_max": 2.0066
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4747943943749047",
                              "semi_major_axis": "1.777138170041099",
                              "inclination": "2.128169192724939",
                              "ascending_node_longitude": "19.17193893862733",
                              "perihelion_argument": "322.7637409732812",
                              "mean_anomaly": "276.3805594664959",
                              "mean_motion": ".4160277322766358",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2021-10-12",
                                        "close_approach_date_full": "2021-10-12T09:59:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "10.8678010731219",
                                                  "kilometers_per_hour": "39124"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000179939521045232",
                                                  "kilometers": "26919",
                                                  "lunar": "0.07"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2013YB",
                    "name": "2013 YB",
                    "full_name": "(2013 YB)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31.44,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.6678,
                                        "estimated_diameter_max": 1.2401
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "5",
                              "epoch_osculation": 2456649.5,
                              "eccentricity": ".4272650602411475",
                              "semi_major_axis": "1.550690510835703",
                              "inclination": ".1920304349625336",
                              "ascending_node_longitude": "269.0324976861667",
                              "perihelion_argument": "230.1490153782113",
                              "mean_anomaly": "341.2339141797997",
                              "mean_motion": ".5104067156189741",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2013-12-23",
                                        "close_approach_date_full": "2013-12-23T12:51:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "10.4976870227733",
                                                  "kilometers_per_hour": "37792"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.00018141429723766",
                                                  "kilometers": "27139",
                                                  "lunar": "0.07"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2023WA",
                    "name": "2023 WA",
                    "full_name": "(2023 WA)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.49,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.3171,
                                        "estimated_diameter_max": 2.4461
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".6317543091477635",
                              "semi_major_axis": "1.863517091237103",
                              "inclination": "2.322598311367574",
                              "ascending_node_longitude": "54.07261205402454",
                              "perihelion_argument": "77.92927979584121",
                              "mean_anomaly": "266.8528139353447",
                              "mean_motion": ".3874395963200128",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2023-11-17",
                                        "close_approach_date_full": "2023-11-17T03:41:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "17.9468199890186",
                                                  "kilometers_per_hour": "64609"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000183015593232769",
                                                  "kilometers": "27379",
                                                  "lunar": "0.07"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2022YO1",
                    "name": "2022 YO1",
                    "full_name": "(2022 YO1)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.01,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.9282,
                                        "estimated_diameter_max": 1.7237
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4983998127939045",
                              "semi_major_axis": "1.600244941233636",
                              "inclination": "13.5852723553237",
                              "ascending_node_longitude": "85.47702116180439",
                              "perihelion_argument": "63.47721296246785",
                              "mean_anomaly": "143.497446680624",
                              "mean_motion": ".4868827404315603",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2022-12-17",
                                        "close_approach_date_full": "2022-12-17T18:40:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "15.4006285059744",
                                                  "kilometers_per_hour": "55442"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000184673984633353",
                                                  "kilometers": "27627",
                                                  "lunar": "0.07"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2025HH",
                    "name": "2025 HH",
                    "full_name": "(2025 HH)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.77,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.7792,
                                        "estimated_diameter_max": 1.447
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2551870694287376",
                              "semi_major_axis": ".9112816522242624",
                              "inclination": "7.645489582282885",
                              "ascending_node_longitude": "207.6843326036141",
                              "perihelion_argument": "233.6987896552828",
                              "mean_anomaly": "346.0457888499636",
                              "mean_motion": "1.132987541972314",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2025-04-17",
                                        "close_approach_date_full": "2025-04-17T23:24:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "9.26743091907224",
                                                  "kilometers_per_hour": "33363"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000186202256480681",
                                                  "kilometers": "27855",
                                                  "lunar": "0.07"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2021CW7",
                    "name": "2021 CW7",
                    "full_name": "(2021 CW7)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31.22,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.7025,
                                        "estimated_diameter_max": 1.3046
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2695484378317313",
                              "semi_major_axis": "1.203928548242144",
                              "inclination": "6.235698464346444",
                              "ascending_node_longitude": "325.89956868",
                              "perihelion_argument": "240.9360069500616",
                              "mean_anomaly": "181.3925192306454",
                              "mean_motion": ".7461102471525279",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2021-02-14",
                                        "close_approach_date_full": "2021-02-14T16:14:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "9.5618121038675",
                                                  "kilometers_per_hour": "34423"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000187375622634351",
                                                  "kilometers": "28031",
                                                  "lunar": "0.07"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2020SW",
                    "name": "2020 SW",
                    "full_name": "(2020 SW)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.06,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.1551,
                                        "estimated_diameter_max": 2.1452
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "10",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2111380524292804",
                              "semi_major_axis": ".9413643518737325",
                              "inclination": "2.324489317502066",
                              "ascending_node_longitude": "1.79648492416997",
                              "perihelion_argument": "118.9561193125361",
                              "mean_anomaly": "136.2679701074397",
                              "mean_motion": "1.079114309855099",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2020-09-24",
                                        "close_approach_date_full": "2020-09-24T11:13:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "7.75000194332936",
                                                  "kilometers_per_hour": "27900"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000187683591201262",
                                                  "kilometers": "28077",
                                                  "lunar": "0.07"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024YW8",
                    "name": "2024 YW8",
                    "full_name": "(2024 YW8)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 32.15,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.5671,
                                        "estimated_diameter_max": 1.0531
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".274927993227042",
                              "semi_major_axis": "1.208509778257931",
                              "inclination": "2.619160136238924",
                              "ascending_node_longitude": "99.5967617392657",
                              "perihelion_argument": "59.95949052554878",
                              "mean_anomaly": "205.505880708845",
                              "mean_motion": ".7418717279521038",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-12-30",
                                        "close_approach_date_full": "2024-12-30T21:26:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "8.83327856505311",
                                                  "kilometers_per_hour": "31800"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.0001893249936347",
                                                  "kilometers": "28323",
                                                  "lunar": "0.07"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2021GW16",
                    "name": "2021 GW16",
                    "full_name": "(2021 GW16)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.1,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.9091,
                                        "estimated_diameter_max": 1.6884
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4609299467072228",
                              "semi_major_axis": "1.531991617533728",
                              "inclination": "6.332447313159978",
                              "ascending_node_longitude": "24.86457915636842",
                              "perihelion_argument": "115.9987391919203",
                              "mean_anomaly": "177.6320903302475",
                              "mean_motion": ".5197799109510497",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2021-04-14",
                                        "close_approach_date_full": "2021-04-14T21:54:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "12.7916471944782",
                                                  "kilometers_per_hour": "46050"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000195309855138654",
                                                  "kilometers": "29218",
                                                  "lunar": "0.08"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024VR4",
                    "name": "2024 VR4",
                    "full_name": "(2024 VR4)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.75,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.9854,
                                        "estimated_diameter_max": 1.8301
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "4",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".1669522931871631",
                              "semi_major_axis": "1.184252887732059",
                              "inclination": ".5151424667835609",
                              "ascending_node_longitude": "46.67059377214671",
                              "perihelion_argument": "15.54091251630771",
                              "mean_anomaly": "277.3657409809907",
                              "mean_motion": ".7647815377610515",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-11-11",
                                        "close_approach_date_full": "2024-11-11T08:53:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "5.71276898355273",
                                                  "kilometers_per_hour": "20566"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000195527492274097",
                                                  "kilometers": "29250",
                                                  "lunar": "0.08"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2025PU1",
                    "name": "2025 PU1",
                    "full_name": "(2025 PU1)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31.39,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.6755,
                                        "estimated_diameter_max": 1.2545
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2966475109337421",
                              "semi_major_axis": "1.230812686295857",
                              "inclination": "3.733767789782699",
                              "ascending_node_longitude": "320.7078415789052",
                              "perihelion_argument": "291.5861374321754",
                              "mean_anomaly": "111.3487636198232",
                              "mean_motion": ".7217987538314186",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2025-08-13",
                                        "close_approach_date_full": "2025-08-13T19:44:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "9.95862331592959",
                                                  "kilometers_per_hour": "35851"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000195678800756468",
                                                  "kilometers": "29273",
                                                  "lunar": "0.08"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2021VH",
                    "name": "2021 VH",
                    "full_name": "(2021 VH)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.64,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.0107,
                                        "estimated_diameter_max": 1.877
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "7",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".1733660560475437",
                              "semi_major_axis": ".9937133132507562",
                              "inclination": ".612108027148269",
                              "ascending_node_longitude": "217.3590398196582",
                              "perihelion_argument": "81.32746012475812",
                              "mean_anomaly": "110.002218471636",
                              "mean_motion": ".9949755561337191",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2021-11-01",
                                        "close_approach_date_full": "2021-11-01T10:33:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "7.69818414388595",
                                                  "kilometers_per_hour": "27713"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000195963877883082",
                                                  "kilometers": "29316",
                                                  "lunar": "0.08"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024XA6",
                    "name": "2024 XA6",
                    "full_name": "(2024 XA6)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 26.49,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 2.0875,
                                        "estimated_diameter_max": 3.8768
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2091526438198833",
                              "semi_major_axis": ".8967696870696976",
                              "inclination": "28.45059443782545",
                              "ascending_node_longitude": "254.9264162767278",
                              "perihelion_argument": "308.2291635194974",
                              "mean_anomaly": "297.681508942641",
                              "mean_motion": "1.16060034255058",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-12-06",
                                        "close_approach_date_full": "2024-12-06T21:49:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "16.1883829059776",
                                                  "kilometers_per_hour": "58278"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000196096722405629",
                                                  "kilometers": "29336",
                                                  "lunar": "0.08"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024TH11",
                    "name": "2024 TH11",
                    "full_name": "(2024 TH11)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 27.27,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.7443,
                                        "estimated_diameter_max": 3.2394
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".701136317851329",
                              "semi_major_axis": "3.092682896989656",
                              "inclination": "3.853744553546587",
                              "ascending_node_longitude": "17.17160832461952",
                              "perihelion_argument": "325.5861860641336",
                              "mean_anomaly": "78.20116803820773",
                              "mean_motion": ".1812178547520334",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-10-10",
                                        "close_approach_date_full": "2024-10-10T09:16:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "13.6975110840477",
                                                  "kilometers_per_hour": "49311"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.0001996747164395",
                                                  "kilometers": "29871",
                                                  "lunar": "0.08"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2017WE30",
                    "name": "2017 WE30",
                    "full_name": "(2017 WE30)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31.814,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.6127,
                                        "estimated_diameter_max": 1.1378
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2458083.5,
                              "eccentricity": ".6728212778908728",
                              "semi_major_axis": "2.122841496635244",
                              "inclination": "1.018462654705858",
                              "ascending_node_longitude": "65.19921785546953",
                              "perihelion_argument": "73.95123212865632",
                              "mean_anomaly": "345.8174193949818",
                              "mean_motion": ".318660124264349",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2017-11-26",
                                        "close_approach_date_full": "2017-11-26T17:55:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "18.4928494553872",
                                                  "kilometers_per_hour": "66574"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000201268826018294",
                                                  "kilometers": "30109",
                                                  "lunar": "0.08"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024XQ3",
                    "name": "2024 XQ3",
                    "full_name": "(2024 XQ3)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 32.06,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.5789,
                                        "estimated_diameter_max": 1.0751
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2602642541181763",
                              "semi_major_axis": "1.16227900038829",
                              "inclination": "2.634662978390672",
                              "ascending_node_longitude": "252.5945151692917",
                              "perihelion_argument": "247.4861007531106",
                              "mean_anomaly": "234.2814411484115",
                              "mean_motion": ".7865720082127843",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-12-04",
                                        "close_approach_date_full": "2024-12-04T15:35:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "8.58698484390945",
                                                  "kilometers_per_hour": "30913"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000202899656870914",
                                                  "kilometers": "30353",
                                                  "lunar": "0.08"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2018WG",
                    "name": "2018 WG",
                    "full_name": "(2018 WG)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.3,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.093,
                                        "estimated_diameter_max": 2.0299
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "5",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3358016973614518",
                              "semi_major_axis": "1.012004315760249",
                              "inclination": "1.72671054104564",
                              "ascending_node_longitude": "233.6432822503919",
                              "perihelion_argument": "74.84906046055671",
                              "mean_anomaly": "22.06412594871882",
                              "mean_motion": ".9681229757068952",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2018-11-16",
                                        "close_approach_date_full": "2018-11-16T19:14:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "11.84682953883",
                                                  "kilometers_per_hour": "42649"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000206243167457976",
                                                  "kilometers": "30854",
                                                  "lunar": "0.08"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2016EF195",
                    "name": "2016 EF195",
                    "full_name": "(2016 EF195)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 25.5,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 2.6219,
                                        "estimated_diameter_max": 4.8693
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "10",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".6006242023959147",
                              "semi_major_axis": "2.506345824444503",
                              "inclination": "1.16406980926087",
                              "ascending_node_longitude": "168.9296518575734",
                              "perihelion_argument": "342.6804437768218",
                              "mean_anomaly": "166.2850724501148",
                              "mean_motion": ".2483948470025596",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2016-03-11",
                                        "close_approach_date_full": "2016-03-11T04:57:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "10.0884010245823",
                                                  "kilometers_per_hour": "36318"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000211421403230229",
                                                  "kilometers": "31628",
                                                  "lunar": "0.08"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2022CJ5",
                    "name": "2022 CJ5",
                    "full_name": "(2022 CJ5)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.3,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.8682,
                                        "estimated_diameter_max": 1.6124
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4041371844554827",
                              "semi_major_axis": "1.473160438950155",
                              "inclination": "8.203052189289616",
                              "ascending_node_longitude": "141.3614271596255",
                              "perihelion_argument": "52.10437527126717",
                              "mean_anomaly": "18.43825240314344",
                              "mean_motion": ".5512251223832154",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2022-02-10",
                                        "close_approach_date_full": "2022-02-10T10:52:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "11.6329520175608",
                                                  "kilometers_per_hour": "41879"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000212898647346858",
                                                  "kilometers": "31849",
                                                  "lunar": "0.08"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024FQ5",
                    "name": "2024 FQ5",
                    "full_name": "(2024 FQ5)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.98,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.7424,
                                        "estimated_diameter_max": 1.3787
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2460400.5,
                              "eccentricity": ".1413012512469184",
                              "semi_major_axis": "1.002433977179368",
                              "inclination": "10.34781754903145",
                              "ascending_node_longitude": "11.09342437127068",
                              "perihelion_argument": "276.8142988547073",
                              "mean_anomaly": "278.7715751132374",
                              "mean_motion": ".9820201658252463",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-03-31",
                                        "close_approach_date_full": "2024-03-31T15:32:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "8.58035950176025",
                                                  "kilometers_per_hour": "30889"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000218031885507783",
                                                  "kilometers": "32617",
                                                  "lunar": "0.08"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2023VB2",
                    "name": "2023 VB2",
                    "full_name": "(2023 VB2)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.24,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.3952,
                                        "estimated_diameter_max": 2.591
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".6732310989161804",
                              "semi_major_axis": "2.230530188523472",
                              "inclination": "6.830667389054208",
                              "ascending_node_longitude": "44.34662219955338",
                              "perihelion_argument": "69.84901093898706",
                              "mean_anomaly": "207.68422570062",
                              "mean_motion": ".2958638577594978",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2023-11-07",
                                        "close_approach_date_full": "2023-11-07T07:00:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "18.0235155714025",
                                                  "kilometers_per_hour": "64885"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000219055400872794",
                                                  "kilometers": "32770",
                                                  "lunar": "0.09"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2008US",
                    "name": "2008 US",
                    "full_name": "(2008 US)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31.4,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.6739,
                                        "estimated_diameter_max": 1.2516
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "9",
                              "epoch_osculation": 2454760.5,
                              "eccentricity": ".6138063320045678",
                              "semi_major_axis": "1.612116868933229",
                              "inclination": "5.965536058614463",
                              "ascending_node_longitude": "207.9248556752075",
                              "perihelion_argument": "90.76970145129141",
                              "mean_anomaly": "23.95759605586085",
                              "mean_motion": ".4815144119735994",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2008-10-20",
                                        "close_approach_date_full": "2008-10-20T23:30:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "19.1527656703201",
                                                  "kilometers_per_hour": "68950"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000219880276696273",
                                                  "kilometers": "32894",
                                                  "lunar": "0.09"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2022RT1",
                    "name": "2022 RT1",
                    "full_name": "(2022 RT1)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31.46,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.6647,
                                        "estimated_diameter_max": 1.2344
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".5249131292478372",
                              "semi_major_axis": "1.451429715587822",
                              "inclination": "13.02618312150388",
                              "ascending_node_longitude": "158.25296015",
                              "perihelion_argument": "94.66852583286091",
                              "mean_anomaly": "333.3180142872139",
                              "mean_motion": ".5636507100915231",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2022-09-01",
                                        "close_approach_date_full": "2022-09-01T01:18:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "17.7314466390266",
                                                  "kilometers_per_hour": "63833"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000220597852443844",
                                                  "kilometers": "33001",
                                                  "lunar": "0.09"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2018WV1",
                    "name": "2018 WV1",
                    "full_name": "(2018 WV1)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.3,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.8682,
                                        "estimated_diameter_max": 1.6124
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "17",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".06027648889311606",
                              "semi_major_axis": "1.039593513159002",
                              "inclination": "1.65257258823152",
                              "ascending_node_longitude": "246.3764941549807",
                              "perihelion_argument": "145.881292527008",
                              "mean_anomaly": "240.5830553637102",
                              "mean_motion": ".9298410870074502",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2018-12-02",
                                        "close_approach_date_full": "2018-12-02T03:11:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "5.17410290209107",
                                                  "kilometers_per_hour": "18627"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000220816418037431",
                                                  "kilometers": "33034",
                                                  "lunar": "0.09"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2018PD20",
                    "name": "2018 PD20",
                    "full_name": "(2018 PD20)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 27.4,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.6929,
                                        "estimated_diameter_max": 3.1439
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3202336956665953",
                              "semi_major_axis": "1.069847506042138",
                              "inclination": "9.514679705234384",
                              "ascending_node_longitude": "317.5744398215465",
                              "perihelion_argument": "260.5795960585635",
                              "mean_anomaly": "271.8322618678391",
                              "mean_motion": ".8906790884371951",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2018-08-10",
                                        "close_approach_date_full": "2018-08-10T14:34:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "12.0395004874175",
                                                  "kilometers_per_hour": "43342"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000223886253158388",
                                                  "kilometers": "33493",
                                                  "lunar": "0.09"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2004YD5",
                    "name": "2004 YD5",
                    "full_name": "(2004 YD5)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.3,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.093,
                                        "estimated_diameter_max": 2.0299
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "7",
                              "epoch_osculation": 2453360.5,
                              "eccentricity": ".7826044297048294",
                              "semi_major_axis": "2.272022380413376",
                              "inclination": "3.60964688544111",
                              "ascending_node_longitude": "88.45890208980722",
                              "perihelion_argument": "262.0629356618292",
                              "mean_anomaly": "12.99505420865654",
                              "mean_motion": ".2877962735671993",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2004-12-19",
                                        "close_approach_date_full": "2004-12-19T20:38:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "25.3540893932745",
                                                  "kilometers_per_hour": "91275"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000226525127435088",
                                                  "kilometers": "33888",
                                                  "lunar": "0.09"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "367943",
                    "name": "367943",
                    "full_name": "367943 Duende (2012 DA14)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 24.19,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 3.5451,
                                        "estimated_diameter_max": 6.5837
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "81",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".08947539606616506",
                              "semi_major_axis": ".9102540178723524",
                              "inclination": "11.61009665394114",
                              "ascending_node_longitude": "146.9081694746748",
                              "perihelion_argument": "195.6368528333992",
                              "mean_anomaly": "51.74437004131092",
                              "mean_motion": "1.134906718558708",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2013-02-15",
                                        "close_approach_date_full": "2013-02-15T19:26:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "7.81997011462146",
                                                  "kilometers_per_hour": "28152"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000227628642473883",
                                                  "kilometers": "34053",
                                                  "lunar": "0.09"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2023VE1",
                    "name": "2023 VE1",
                    "full_name": "(2023 VE1)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.22,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.8843,
                                        "estimated_diameter_max": 1.6424
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "5",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2054635074307538",
                              "semi_major_axis": "1.23295809128914",
                              "inclination": "4.167779248630099",
                              "ascending_node_longitude": "220.8887947957616",
                              "perihelion_argument": "157.4681298233994",
                              "mean_anomaly": "193.2030380291357",
                              "mean_motion": ".7199156280037707",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2023-11-04",
                                        "close_approach_date_full": "2023-11-04T00:36:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "6.45532925589124",
                                                  "kilometers_per_hour": "23239"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000230570329897711",
                                                  "kilometers": "34493",
                                                  "lunar": "0.09"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2015VY105",
                    "name": "2015 VY105",
                    "full_name": "(2015 VY105)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.1712,
                                        "estimated_diameter_max": 2.175
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "8",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".7086379694116282",
                              "semi_major_axis": "2.703238754939716",
                              "inclination": "8.729599462144559",
                              "ascending_node_longitude": "52.09342727682213",
                              "perihelion_argument": "59.44100804183042",
                              "mean_anomaly": "83.82324647369356",
                              "mean_motion": ".2217570656645412",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2015-11-15",
                                        "close_approach_date_full": "2015-11-15T02:40:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "17.4224053826316",
                                                  "kilometers_per_hour": "62721"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.00023131916645831",
                                                  "kilometers": "34605",
                                                  "lunar": "0.09"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2021UL",
                    "name": "2021 UL",
                    "full_name": "(2021 UL)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.3,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.8682,
                                        "estimated_diameter_max": 1.6124
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".313441608829451",
                              "semi_major_axis": "1.172299408176499",
                              "inclination": "5.770722808651048",
                              "ascending_node_longitude": "202.9572988780656",
                              "perihelion_argument": "258.8857305430514",
                              "mean_anomaly": "36.57555900073468",
                              "mean_motion": ".7765085737073297",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2021-10-16",
                                        "close_approach_date_full": "2021-10-16T12:13:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "10.131849262192",
                                                  "kilometers_per_hour": "36475"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000241485087748178",
                                                  "kilometers": "36126",
                                                  "lunar": "0.09"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024EL3",
                    "name": "2024 EL3",
                    "full_name": "(2024 EL3)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.77,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.2349,
                                        "estimated_diameter_max": 2.2933
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".539095265390276",
                              "semi_major_axis": "1.765004487554263",
                              "inclination": "4.810225592630518",
                              "ascending_node_longitude": "350.9206199165554",
                              "perihelion_argument": "119.0390755877506",
                              "mean_anomaly": "278.0759896263345",
                              "mean_motion": ".4203251271338947",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-03-11",
                                        "close_approach_date_full": "2024-03-11T10:31:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "13.7108784350412",
                                                  "kilometers_per_hour": "49359"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000241782667127883",
                                                  "kilometers": "36170",
                                                  "lunar": "0.09"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2016AN164",
                    "name": "2016 AN164",
                    "full_name": "(2016 AN164)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.4,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.8484,
                                        "estimated_diameter_max": 1.5757
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "4",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4610037718844543",
                              "semi_major_axis": "1.565095002386926",
                              "inclination": "10.17150239738173",
                              "ascending_node_longitude": "293.55429806011",
                              "perihelion_argument": "236.8827834597778",
                              "mean_anomaly": "350.7755678327026",
                              "mean_motion": ".5033765928784212",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2016-01-14",
                                        "close_approach_date_full": "2016-01-14T14:55:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "13.179837275601",
                                                  "kilometers_per_hour": "47447"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000247595434716971",
                                                  "kilometers": "37040",
                                                  "lunar": "0.10"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024HO2",
                    "name": "2024 HO2",
                    "full_name": "(2024 HO2)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.47,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.051,
                                        "estimated_diameter_max": 1.9519
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "4",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4087563072496569",
                              "semi_major_axis": ".735878473673732",
                              "inclination": "5.633770876712715",
                              "ascending_node_longitude": "39.30990127373558",
                              "perihelion_argument": "16.89688563046668",
                              "mean_anomaly": "314.7648226287257",
                              "mean_motion": "1.561330794773368",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-04-29",
                                        "close_approach_date_full": "2024-04-29T15:18:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "9.23724330734462",
                                                  "kilometers_per_hour": "33254"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000250060799795385",
                                                  "kilometers": "37409",
                                                  "lunar": "0.10"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2019RP1",
                    "name": "2019 RP1",
                    "full_name": "(2019 RP1)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 27.9,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.5088,
                                        "estimated_diameter_max": 2.802
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "4",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".7123689442515645",
                              "semi_major_axis": "1.180029925046586",
                              "inclination": "19.72341987751907",
                              "ascending_node_longitude": "342.6637637810665",
                              "perihelion_argument": "233.6221930477823",
                              "mean_anomaly": "342.2064137562817",
                              "mean_motion": ".7688905839572239",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2019-09-05",
                                        "close_approach_date_full": "2019-09-05T22:04:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "25.8774971844554",
                                                  "kilometers_per_hour": "93159"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000253153373362749",
                                                  "kilometers": "37871",
                                                  "lunar": "0.10"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2025GS1",
                    "name": "2025 GS1",
                    "full_name": "(2025 GS1)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.45,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.0559,
                                        "estimated_diameter_max": 1.961
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2058921591918846",
                              "semi_major_axis": "1.131084183280421",
                              "inclination": "13.86819606817187",
                              "ascending_node_longitude": "25.76356439570259",
                              "perihelion_argument": "247.3410008801907",
                              "mean_anomaly": "132.6407226718218",
                              "mean_motion": ".8193353255220288",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2025-04-15",
                                        "close_approach_date_full": "2025-04-15T21:36:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "10.5425639495929",
                                                  "kilometers_per_hour": "37953"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000253946908876939",
                                                  "kilometers": "37990",
                                                  "lunar": "0.10"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2022UW16",
                    "name": "2022 UW16",
                    "full_name": "(2022 UW16)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.9,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.1985,
                                        "estimated_diameter_max": 2.2257
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3768739681664408",
                              "semi_major_axis": "1.246639555308195",
                              "inclination": "4.865941268879667",
                              "ascending_node_longitude": "35.49901348974521",
                              "perihelion_argument": "281.8909064046287",
                              "mean_anomaly": "111.5637059296807",
                              "mean_motion": ".7080969435404911",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2022-10-29",
                                        "close_approach_date_full": "2022-10-29T10:15:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "12.3178922709936",
                                                  "kilometers_per_hour": "44344"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000257561669652857",
                                                  "kilometers": "38531",
                                                  "lunar": "0.10"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2010WA",
                    "name": "2010 WA",
                    "full_name": "(2010 WA)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.9303,
                                        "estimated_diameter_max": 1.7277
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "9",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".5045292422341914",
                              "semi_major_axis": "1.69798716108174",
                              "inclination": "8.218752719589569",
                              "ascending_node_longitude": "234.3690677899617",
                              "perihelion_argument": "236.4204362635654",
                              "mean_anomaly": "264.6399485031926",
                              "mean_motion": ".4454535975721856",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2010-11-17",
                                        "close_approach_date_full": "2010-11-17T03:45:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "13.0676445791682",
                                                  "kilometers_per_hour": "47044"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000259712663835881",
                                                  "kilometers": "38852",
                                                  "lunar": "0.10"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2018BD",
                    "name": "2018 BD",
                    "full_name": "(2018 BD)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.1,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.9091,
                                        "estimated_diameter_max": 1.6884
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2871654752032222",
                              "semi_major_axis": "1.055384373047602",
                              "inclination": "2.375134458698815",
                              "ascending_node_longitude": "297.8280749141379",
                              "perihelion_argument": "274.3244921016441",
                              "mean_anomaly": "24.58058044751301",
                              "mean_motion": ".9090506566971041",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2018-01-18",
                                        "close_approach_date_full": "2018-01-18T15:43:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "9.99938743524334",
                                                  "kilometers_per_hour": "35998"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000261599727019643",
                                                  "kilometers": "39135",
                                                  "lunar": "0.10"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2015DD1",
                    "name": "2015 DD1",
                    "full_name": "(2015 DD1)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.4,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.8484,
                                        "estimated_diameter_max": 1.5757
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "7",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3244963317810571",
                              "semi_major_axis": "1.356074637929922",
                              "inclination": "3.00929688223132",
                              "ascending_node_longitude": "327.8020103734086",
                              "perihelion_argument": "134.8321307232749",
                              "mean_anomaly": "315.5032608762999",
                              "mean_motion": ".6241352098207874",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2015-02-17",
                                        "close_approach_date_full": "2015-02-17T07:38:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "8.19696123621364",
                                                  "kilometers_per_hour": "29509"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000262395032203013",
                                                  "kilometers": "39254",
                                                  "lunar": "0.10"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2014RC",
                    "name": "2014 RC",
                    "full_name": "(2014 RC)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 26.85,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.9214,
                                        "estimated_diameter_max": 3.5684
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "25",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3751195453718015",
                              "semi_major_axis": "1.313983543870689",
                              "inclination": "4.567441972433686",
                              "ascending_node_longitude": "344.8749665715445",
                              "perihelion_argument": "71.08954144756602",
                              "mean_anomaly": "125.1432303843933",
                              "mean_motion": ".6543636776594287",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2014-09-07",
                                        "close_approach_date_full": "2014-09-07T18:02:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "10.9512704461988",
                                                  "kilometers_per_hour": "39425"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000266768513570973",
                                                  "kilometers": "39908",
                                                  "lunar": "0.10"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2011CF22",
                    "name": "2011 CF22",
                    "full_name": "(2011 CF22)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.876,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.7604,
                                        "estimated_diameter_max": 1.4121
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "7",
                              "epoch_osculation": 2455599.5,
                              "eccentricity": ".6752343347354882",
                              "semi_major_axis": "1.956287774204553",
                              "inclination": "1.069400960624183",
                              "ascending_node_longitude": "138.0894759880192",
                              "perihelion_argument": "275.8290495644374",
                              "mean_anomaly": "16.6688375860753",
                              "mean_motion": ".3602093342442031",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2011-02-06",
                                        "close_approach_date_full": "2011-02-06T11:40:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "19.6078974818422",
                                                  "kilometers_per_hour": "70588"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000268632877916303",
                                                  "kilometers": "40187",
                                                  "lunar": "0.10"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2016RB1",
                    "name": "2016 RB1",
                    "full_name": "(2016 RB1)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.3,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.376,
                                        "estimated_diameter_max": 2.5555
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "21",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2805220686161499",
                              "semi_major_axis": ".8726961368846566",
                              "inclination": "1.792297962497643",
                              "ascending_node_longitude": "344.8824739473283",
                              "perihelion_argument": "136.2898219210486",
                              "mean_anomaly": "352.1156985107867",
                              "mean_motion": "1.208953212539314",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2016-09-07",
                                        "close_approach_date_full": "2016-09-07T17:20:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "8.1278521503798",
                                                  "kilometers_per_hour": "29260"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000270610963101434",
                                                  "kilometers": "40483",
                                                  "lunar": "0.11"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2022KQ5",
                    "name": "2022 KQ5",
                    "full_name": "(2022 KQ5)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.1,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.1445,
                                        "estimated_diameter_max": 2.1255
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2619514390417293",
                              "semi_major_axis": "1.313993114908357",
                              "inclination": "3.210803523780925",
                              "ascending_node_longitude": "68.8198698987932",
                              "perihelion_argument": "217.5199843369041",
                              "mean_anomaly": "90.70086961657",
                              "mean_motion": ".6543565281607764",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2022-05-30",
                                        "close_approach_date_full": "2022-05-30T17:40:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "7.31268329234997",
                                                  "kilometers_per_hour": "26326"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000270738672093186",
                                                  "kilometers": "40502",
                                                  "lunar": "0.11"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024RL3",
                    "name": "2024 RL3",
                    "full_name": "(2024 RL3)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.09,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.1472,
                                        "estimated_diameter_max": 2.1304
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "5",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4130984900475536",
                              "semi_major_axis": "1.690215364164339",
                              "inclination": "2.568674003669285",
                              "ascending_node_longitude": "342.3736926850149",
                              "perihelion_argument": "341.0798433345547",
                              "mean_anomaly": "205.5292678415618",
                              "mean_motion": ".4485294938997647",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-09-04",
                                        "close_approach_date_full": "2024-09-04T17:15:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "8.08145031630203",
                                                  "kilometers_per_hour": "29093"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000273023346225425",
                                                  "kilometers": "40844",
                                                  "lunar": "0.11"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2020OY4",
                    "name": "2020 OY4",
                    "full_name": "(2020 OY4)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.35,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.8583,
                                        "estimated_diameter_max": 1.5939
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "5",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3872480445748209",
                              "semi_major_axis": "1.019688864999954",
                              "inclination": "3.594406024567822",
                              "ascending_node_longitude": "305.3618880896605",
                              "perihelion_argument": "112.1463970630611",
                              "mean_anomaly": "351.7910718651721",
                              "mean_motion": ".9571997106193308",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2020-07-28",
                                        "close_approach_date_full": "2020-07-28T05:30:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "12.3913711418914",
                                                  "kilometers_per_hour": "44609"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000277396177822458",
                                                  "kilometers": "41498",
                                                  "lunar": "0.11"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2021TX",
                    "name": "2021 TX",
                    "full_name": "(2021 TX)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31.18,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.709,
                                        "estimated_diameter_max": 1.3166
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".6284265844710472",
                              "semi_major_axis": "1.96203125363669",
                              "inclination": "3.588758317356909",
                              "ascending_node_longitude": "188.5273020142852",
                              "perihelion_argument": "107.4782004010572",
                              "mean_anomaly": "198.0132833310338",
                              "mean_motion": ".3586288241626869",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2021-10-01",
                                        "close_approach_date_full": "2021-10-01T21:29:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "17.7179466310342",
                                                  "kilometers_per_hour": "63785"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000283330371294498",
                                                  "kilometers": "42386",
                                                  "lunar": "0.11"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2018SM",
                    "name": "2018 SM",
                    "full_name": "(2018 SM)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.4,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.0681,
                                        "estimated_diameter_max": 1.9837
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4677703561910092",
                              "semi_major_axis": "1.785563183354591",
                              "inclination": "8.971605597595078",
                              "ascending_node_longitude": "172.8084362687291",
                              "perihelion_argument": "145.912858594009",
                              "mean_anomaly": "14.85141879782559",
                              "mean_motion": ".4130867262608058",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2018-09-15",
                                        "close_approach_date_full": "2018-09-15T22:29:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "11.0830544260136",
                                                  "kilometers_per_hour": "39899"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000284932470253341",
                                                  "kilometers": "42625",
                                                  "lunar": "0.11"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2020HS7",
                    "name": "2020 HS7",
                    "full_name": "(2020 HS7)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.1,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.1445,
                                        "estimated_diameter_max": 2.1255
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "4",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".5717745641105513",
                              "semi_major_axis": "1.848769429955674",
                              "inclination": "4.730678073588335",
                              "ascending_node_longitude": "38.50445238419722",
                              "perihelion_argument": "245.665625248894",
                              "mean_anomaly": "59.61861205800579",
                              "mean_motion": ".3920847464066886",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2020-04-28",
                                        "close_approach_date_full": "2020-04-28T18:51:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "15.5592933448316",
                                                  "kilometers_per_hour": "56013"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000285719874699874",
                                                  "kilometers": "42743",
                                                  "lunar": "0.11"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2020UF3",
                    "name": "2020 UF3",
                    "full_name": "(2020 UF3)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.38,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.3509,
                                        "estimated_diameter_max": 2.5088
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "4",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".574139130283383",
                              "semi_major_axis": ".9670376833718765",
                              "inclination": "27.48594101763962",
                              "ascending_node_longitude": "29.64628695084608",
                              "perihelion_argument": "127.4465040647802",
                              "mean_anomaly": "62.6978449684814",
                              "mean_motion": "1.036427617414362",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2020-10-22",
                                        "close_approach_date_full": "2020-10-22T22:17:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "22.0054904217724",
                                                  "kilometers_per_hour": "79220"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000288832358977026",
                                                  "kilometers": "43209",
                                                  "lunar": "0.11"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2020UA",
                    "name": "2020 UA",
                    "full_name": "(2020 UA)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.44,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.3324,
                                        "estimated_diameter_max": 2.4744
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "8",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2728695846835911",
                              "semi_major_axis": ".858914700482285",
                              "inclination": "1.938450618486883",
                              "ascending_node_longitude": "27.68190468410357",
                              "perihelion_argument": "137.6746798980162",
                              "mean_anomaly": "26.15794193203615",
                              "mean_motion": "1.238166416292252",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2020-10-21",
                                        "close_approach_date_full": "2020-10-21T02:00:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "7.83689336160807",
                                                  "kilometers_per_hour": "28213"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000297450207871812",
                                                  "kilometers": "44498",
                                                  "lunar": "0.12"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2023MJ20",
                    "name": "2023 MJ20",
                    "full_name": "(2023 MJ20)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.78,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.7774,
                                        "estimated_diameter_max": 1.4437
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".192014669340722",
                              "semi_major_axis": "1.113767592591474",
                              "inclination": "12.61463541605013",
                              "ascending_node_longitude": "87.03647086997164",
                              "perihelion_argument": "253.055350005692",
                              "mean_anomaly": "330.0892192429309",
                              "mean_motion": ".8385176496740058",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2023-06-18",
                                        "close_approach_date_full": "2023-06-18T20:59:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "9.56258323327664",
                                                  "kilometers_per_hour": "34425"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000298079230161174",
                                                  "kilometers": "44592",
                                                  "lunar": "0.12"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2008VM",
                    "name": "2008 VM",
                    "full_name": "(2008 VM)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.2,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.8884,
                                        "estimated_diameter_max": 1.6499
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "7",
                              "epoch_osculation": 2454773.5,
                              "eccentricity": ".3927265388987401",
                              "semi_major_axis": "1.334333905967932",
                              "inclination": "4.088181682384307",
                              "ascending_node_longitude": "42.01154104889842",
                              "perihelion_argument": "69.17021511021561",
                              "mean_anomaly": "327.2579417265785",
                              "mean_motion": ".6394510300063372",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2008-11-03",
                                        "close_approach_date_full": "2008-11-03T22:31:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "11.0406319444018",
                                                  "kilometers_per_hour": "39746"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000308979979579532",
                                                  "kilometers": "46223",
                                                  "lunar": "0.12"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024UT",
                    "name": "2024 UT",
                    "full_name": "(2024 UT)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.3,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.8682,
                                        "estimated_diameter_max": 1.6124
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".5346299325074398",
                              "semi_major_axis": "1.921343553483647",
                              "inclination": "4.947300249354354",
                              "ascending_node_longitude": "210.6185181849906",
                              "perihelion_argument": "224.6612872485901",
                              "mean_anomaly": "133.1995911950015",
                              "mean_motion": ".3700807815254175",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-10-23",
                                        "close_approach_date_full": "2024-10-23T17:23:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "11.607098967078",
                                                  "kilometers_per_hour": "41786"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000309929560659589",
                                                  "kilometers": "46365",
                                                  "lunar": "0.12"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2020CD3",
                    "name": "2020 CD3",
                    "full_name": "(2020 CD3)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31.74,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.6232,
                                        "estimated_diameter_max": 1.1574
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "27",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".01237540960855443",
                              "semi_major_axis": "1.029031414224297",
                              "inclination": ".6339480770918524",
                              "ascending_node_longitude": "82.23960433765718",
                              "perihelion_argument": "49.97027547232736",
                              "mean_anomaly": "204.0687711210974",
                              "mean_motion": ".9441937563737366",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2020-02-13",
                                        "close_approach_date_full": "2020-02-13T16:20:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "4.073913522604",
                                                  "kilometers_per_hour": "14666"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000314583689849721",
                                                  "kilometers": "47061",
                                                  "lunar": "0.12"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2019BZ3",
                    "name": "2019 BZ3",
                    "full_name": "(2019 BZ3)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.78,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.232,
                                        "estimated_diameter_max": 2.2881
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "5",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".5781187118091802",
                              "semi_major_axis": "2.296004976660687",
                              "inclination": "10.65450955817749",
                              "ascending_node_longitude": "127.2742155503291",
                              "perihelion_argument": "338.6680921299642",
                              "mean_anomaly": "349.058172872763",
                              "mean_motion": ".2832988661131528",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2019-01-27",
                                        "close_approach_date_full": "2019-01-27T23:29:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "11.3722360582479",
                                                  "kilometers_per_hour": "40940"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000321713813473466",
                                                  "kilometers": "48128",
                                                  "lunar": "0.13"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024XS16",
                    "name": "2024 XS16",
                    "full_name": "(2024 XS16)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.44,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.8407,
                                        "estimated_diameter_max": 1.5612
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".661309808130396",
                              "semi_major_axis": "2.008297518046902",
                              "inclination": "4.753400676026044",
                              "ascending_node_longitude": "259.8030129234166",
                              "perihelion_argument": "257.3190863974635",
                              "mean_anomaly": "103.7141341898473",
                              "mean_motion": ".3463075792611444",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-12-11",
                                        "close_approach_date_full": "2024-12-11T22:16:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "18.5976455682976",
                                                  "kilometers_per_hour": "66952"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000322990500408567",
                                                  "kilometers": "48319",
                                                  "lunar": "0.13"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2022WN9",
                    "name": "2022 WN9",
                    "full_name": "(2022 WN9)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.55,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.0319,
                                        "estimated_diameter_max": 1.9163
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".6589664725415593",
                              "semi_major_axis": "2.257903412072466",
                              "inclination": "2.31824473773609",
                              "ascending_node_longitude": "245.7102164656908",
                              "perihelion_argument": "115.9189454742131",
                              "mean_anomaly": "328.2002456213631",
                              "mean_motion": ".2904999313525526",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2022-11-27",
                                        "close_approach_date_full": "2022-11-27T22:32:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "16.9286324414617",
                                                  "kilometers_per_hour": "60943"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000323428725178557",
                                                  "kilometers": "48384",
                                                  "lunar": "0.13"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2020XG2",
                    "name": "2020 XG2",
                    "full_name": "(2020 XG2)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 27.9,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.5088,
                                        "estimated_diameter_max": 2.802
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3204220988782167",
                              "semi_major_axis": "1.305361686440996",
                              "inclination": "16.62611076677694",
                              "ascending_node_longitude": "255.8158965818328",
                              "perihelion_argument": "126.2707144609752",
                              "mean_anomaly": "143.4730408342411",
                              "mean_motion": ".6608574366412578",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2020-12-07",
                                        "close_approach_date_full": "2020-12-07T19:15:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "12.6007087611749",
                                                  "kilometers_per_hour": "45363"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000327294507974497",
                                                  "kilometers": "48963",
                                                  "lunar": "0.13"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2004FH",
                    "name": "2004 FH",
                    "full_name": "(2004 FH)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 26.41,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 2.1263,
                                        "estimated_diameter_max": 3.9488
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "28",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2888540160606516",
                              "semi_major_axis": ".8192518681193424",
                              "inclination": ".05488804714897456",
                              "ascending_node_longitude": "258.2033679938054",
                              "perihelion_argument": "69.17964886671464",
                              "mean_anomaly": "333.7367734254372",
                              "mean_motion": "1.329161990205333",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2004-03-18",
                                        "close_approach_date_full": "2004-03-18T22:09:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "8.00293365023199",
                                                  "kilometers_per_hour": "28811"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000328210504429864",
                                                  "kilometers": "49100",
                                                  "lunar": "0.13"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024SV2",
                    "name": "2024 SV2",
                    "full_name": "(2024 SV2)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.69,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.2578,
                                        "estimated_diameter_max": 2.336
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "4",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4202473280993173",
                              "semi_major_axis": "1.531161377060146",
                              "inclination": "10.65821996262507",
                              "ascending_node_longitude": "185.594805380756",
                              "perihelion_argument": "232.244143743522",
                              "mean_anomaly": "196.6226677295454",
                              "mean_motion": ".5202027280551021",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-09-28",
                                        "close_approach_date_full": "2024-09-28T17:01:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "11.5267118899792",
                                                  "kilometers_per_hour": "41496"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000329294708445186",
                                                  "kilometers": "49262",
                                                  "lunar": "0.13"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2019QH2",
                    "name": "2019 QH2",
                    "full_name": "(2019 QH2)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.4,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.8484,
                                        "estimated_diameter_max": 1.5757
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2458717.5,
                              "eccentricity": ".5044399141334933",
                              "semi_major_axis": "1.598203702720382",
                              "inclination": ".6146758555260102",
                              "ascending_node_longitude": "326.6083375109785",
                              "perihelion_argument": "291.1431759959627",
                              "mean_anomaly": "24.11547769333579",
                              "mean_motion": ".4878158139843213",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2019-08-20",
                                        "close_approach_date_full": "2019-08-20T18:12:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "14.0749534245247",
                                                  "kilometers_per_hour": "50670"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000329878679634724",
                                                  "kilometers": "49349",
                                                  "lunar": "0.13"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2018RZ5",
                    "name": "2018 RZ5",
                    "full_name": "(2018 RZ5)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.71,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.9945,
                                        "estimated_diameter_max": 1.847
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".7392544541110188",
                              "semi_major_axis": "2.877630522604317",
                              "inclination": "13.97027623033255",
                              "ascending_node_longitude": "165.8526720902354",
                              "perihelion_argument": "118.5248035714878",
                              "mean_anomaly": "177.3822213584677",
                              "mean_motion": ".201907070178723",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2018-09-12",
                                        "close_approach_date_full": "2018-09-12T20:08:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "20.2297776885954",
                                                  "kilometers_per_hour": "72827"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000331387039343228",
                                                  "kilometers": "49575",
                                                  "lunar": "0.13"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2016UD",
                    "name": "2016 UD",
                    "full_name": "(2016 UD)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 26.6,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 2.0353,
                                        "estimated_diameter_max": 3.7798
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2457681.5,
                              "eccentricity": ".6652563186076559",
                              "semi_major_axis": "1.536266023039783",
                              "inclination": "10.25730622636725",
                              "ascending_node_longitude": "24.92716255681642",
                              "perihelion_argument": "257.6862252587613",
                              "mean_anomaly": "26.79408534823969",
                              "mean_motion": ".5176121184446105",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2014-10-18",
                                        "close_approach_date_full": "2014-10-18T13:27:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "22.4928552187974",
                                                  "kilometers_per_hour": "80974"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000332172815969906",
                                                  "kilometers": "49692",
                                                  "lunar": "0.13"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2021AH",
                    "name": "2021 AH",
                    "full_name": "(2021 AH)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.49,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.3171,
                                        "estimated_diameter_max": 2.4461
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".6937716029614069",
                              "semi_major_axis": "1.801860196430873",
                              "inclination": ".5694898230663027",
                              "ascending_node_longitude": "105.3694953735481",
                              "perihelion_argument": "92.01146453243389",
                              "mean_anomaly": "347.0124608792738",
                              "mean_motion": ".4074951426753015",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2021-01-03",
                                        "close_approach_date_full": "2021-01-03T23:37:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "21.6667797319628",
                                                  "kilometers_per_hour": "78000"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000332785268490389",
                                                  "kilometers": "49784",
                                                  "lunar": "0.13"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2012TC4",
                    "name": "2012 TC4",
                    "full_name": "(2012 TC4)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 26.71,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.9844,
                                        "estimated_diameter_max": 3.6853
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "65",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4037625551321508",
                              "semi_major_axis": "1.620448576133997",
                              "inclination": ".5342551354434516",
                              "ascending_node_longitude": "19.6950368175561",
                              "perihelion_argument": "26.57603642282792",
                              "mean_anomaly": "324.4410206811817",
                              "mean_motion": ".4778055539092075",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2017-10-12",
                                        "close_approach_date_full": "2017-10-12T05:42:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "7.64657017617174",
                                                  "kilometers_per_hour": "27528"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000335239481285253",
                                                  "kilometers": "50151",
                                                  "lunar": "0.13"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2022CG7",
                    "name": "2022 CG7",
                    "full_name": "(2022 CG7)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.63,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.2753,
                                        "estimated_diameter_max": 2.3685
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".6563242298938321",
                              "semi_major_axis": "2.473305615652543",
                              "inclination": "11.5971889220365",
                              "ascending_node_longitude": "143.6221077648664",
                              "perihelion_argument": "310.8777413941327",
                              "mean_anomaly": "357.2579091505522",
                              "mean_motion": ".2533887905272162",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2022-02-12",
                                        "close_approach_date_full": "2022-02-12T15:29:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "15.4453088867014",
                                                  "kilometers_per_hour": "55603"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000340845183282837",
                                                  "kilometers": "50990",
                                                  "lunar": "0.13"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2010TD54",
                    "name": "2010 TD54",
                    "full_name": "(2010 TD54)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.9,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.1985,
                                        "estimated_diameter_max": 2.2257
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "12",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".6422058342792722",
                              "semi_major_axis": "1.971200362528543",
                              "inclination": "4.294487554092972",
                              "ascending_node_longitude": "18.12250555206724",
                              "perihelion_argument": "76.641489301",
                              "mean_anomaly": "147.923527765184",
                              "mean_motion": ".3561294740858158",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2010-10-12",
                                        "close_approach_date_full": "2010-10-12T10:50:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "17.5357697471139",
                                                  "kilometers_per_hour": "63129"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000346192340317724",
                                                  "kilometers": "51790",
                                                  "lunar": "0.13"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2017BH30",
                    "name": "2017 BH30",
                    "full_name": "(2017 BH30)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.8,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.2264,
                                        "estimated_diameter_max": 2.2776
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "7",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".6561120287646228",
                              "semi_major_axis": "2.314908754943609",
                              "inclination": "1.879904549688331",
                              "ascending_node_longitude": "129.3127088516767",
                              "perihelion_argument": "57.50063069099019",
                              "mean_anomaly": "163.5209541048164",
                              "mean_motion": ".2798357895712185",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2017-01-30",
                                        "close_approach_date_full": "2017-01-30T04:51:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "15.4607435988695",
                                                  "kilometers_per_hour": "55659"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000346572337317051",
                                                  "kilometers": "51846",
                                                  "lunar": "0.13"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2023SL5",
                    "name": "2023 SL5",
                    "full_name": "(2023 SL5)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.79,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.2292,
                                        "estimated_diameter_max": 2.2828
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4222267887100107",
                              "semi_major_axis": ".9818149155832354",
                              "inclination": "3.322361246177455",
                              "ascending_node_longitude": "356.394083752807",
                              "perihelion_argument": "242.6200458102774",
                              "mean_anomaly": "151.8535076368735",
                              "mean_motion": "1.013117076371244",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2023-09-20",
                                        "close_approach_date_full": "2023-09-20T07:53:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "13.8929576163844",
                                                  "kilometers_per_hour": "50015"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000346727320553988",
                                                  "kilometers": "51870",
                                                  "lunar": "0.13"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2010XB",
                    "name": "2010 XB",
                    "full_name": "(2010 XB)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.6,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.0201,
                                        "estimated_diameter_max": 1.8944
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "8",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".6530237979966254",
                              "semi_major_axis": "1.775395885878243",
                              "inclination": "1.486358949605576",
                              "ascending_node_longitude": "248.4190856740921",
                              "perihelion_argument": "92.65492670746835",
                              "mean_anomaly": "138.0090608455356",
                              "mean_motion": ".4166402855127552",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2010-11-30",
                                        "close_approach_date_full": "2010-11-30T18:05:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "19.9479197383282",
                                                  "kilometers_per_hour": "71813"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000352217483348592",
                                                  "kilometers": "52691",
                                                  "lunar": "0.14"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2022GC",
                    "name": "2022 GC",
                    "full_name": "(2022 GC)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.01,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.1685,
                                        "estimated_diameter_max": 2.17
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".6152768015007973",
                              "semi_major_axis": "2.017924819462166",
                              "inclination": "5.456831732292442",
                              "ascending_node_longitude": "191.1622977329371",
                              "perihelion_argument": "294.4214221270909",
                              "mean_anomaly": "111.9386679476365",
                              "mean_motion": ".3438322434353324",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2022-04-01",
                                        "close_approach_date_full": "2022-04-01T01:48:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "15.6004769202501",
                                                  "kilometers_per_hour": "56162"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000353614778238914",
                                                  "kilometers": "52900",
                                                  "lunar": "0.14"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2021AH8",
                    "name": "2021 AH8",
                    "full_name": "(2021 AH8)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.59,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.0224,
                                        "estimated_diameter_max": 1.8988
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2459220.5,
                              "eccentricity": ".7911026305898735",
                              "semi_major_axis": "2.202565286837163",
                              "inclination": "5.611925475180835",
                              "ascending_node_longitude": "284.2127036537186",
                              "perihelion_argument": "78.34121620330441",
                              "mean_anomaly": "13.57079787928771",
                              "mean_motion": ".3015163647831966",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2021-01-04",
                                        "close_approach_date_full": "2021-01-04T19:22:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "25.9867329026744",
                                                  "kilometers_per_hour": "93552"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000354000189372321",
                                                  "kilometers": "52958",
                                                  "lunar": "0.14"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2025PU",
                    "name": "2025 PU",
                    "full_name": "(2025 PU)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.46,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.8368,
                                        "estimated_diameter_max": 1.5541
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4314141299548916",
                              "semi_major_axis": "1.627559046567541",
                              "inclination": "5.553732177715622",
                              "ascending_node_longitude": "310.5673652763866",
                              "perihelion_argument": "314.9054401711139",
                              "mean_anomaly": "69.44445779287909",
                              "mean_motion": ".4746778250824406",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2025-08-02",
                                        "close_approach_date_full": "2025-08-02T21:42:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "10.4980602925216",
                                                  "kilometers_per_hour": "37793"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000354197604292482",
                                                  "kilometers": "52987",
                                                  "lunar": "0.14"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2021TT13",
                    "name": "2021 TT13",
                    "full_name": "(2021 TT13)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.7,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.9968,
                                        "estimated_diameter_max": 1.8513
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2459499.5,
                              "eccentricity": ".5347161278176028",
                              "semi_major_axis": "1.905658619359242",
                              "inclination": "10.26543305073527",
                              "ascending_node_longitude": "197.7248536555107",
                              "perihelion_argument": "132.7134631101151",
                              "mean_anomaly": "13.4676197737836",
                              "mean_motion": ".3746592147874097",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2021-10-11",
                                        "close_approach_date_full": "2021-10-11T03:17:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "13.5327673710791",
                                                  "kilometers_per_hour": "48718"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000357862550037189",
                                                  "kilometers": "53535",
                                                  "lunar": "0.14"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2023SH7",
                    "name": "2023 SH7",
                    "full_name": "(2023 SH7)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31.61,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.6421,
                                        "estimated_diameter_max": 1.1925
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2522788131777034",
                              "semi_major_axis": "1.131307531502901",
                              "inclination": "1.694862894248546",
                              "ascending_node_longitude": "1.406922692019455",
                              "perihelion_argument": "283.5802058260711",
                              "mean_anomaly": "335.0933885687816",
                              "mean_motion": ".8190927017643844",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2023-09-25",
                                        "close_approach_date_full": "2023-09-25T16:50:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "8.61670899249858",
                                                  "kilometers_per_hour": "31020"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000359510424203001",
                                                  "kilometers": "53782",
                                                  "lunar": "0.14"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2013HT25",
                    "name": "2013 HT25",
                    "full_name": "(2013 HT25)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.86,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.2095,
                                        "estimated_diameter_max": 2.2463
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "7",
                              "epoch_osculation": 2456401.5,
                              "eccentricity": ".8579309289523906",
                              "semi_major_axis": "2.23504372474395",
                              "inclination": "4.069270667790454",
                              "ascending_node_longitude": "28.48101163423505",
                              "perihelion_argument": "61.26470531834459",
                              "mean_anomaly": "12.49884027513844",
                              "mean_motion": ".2949680915093885",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2013-04-18",
                                        "close_approach_date_full": "2013-04-18T13:48:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "29.8198407959177",
                                                  "kilometers_per_hour": "107351"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000360172149723719",
                                                  "kilometers": "53881",
                                                  "lunar": "0.14"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2023TO17",
                    "name": "2023 TO17",
                    "full_name": "(2023 TO17)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.67,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.0037,
                                        "estimated_diameter_max": 1.8641
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4602669907963604",
                              "semi_major_axis": "1.186722123998963",
                              "inclination": "3.625197162233797",
                              "ascending_node_longitude": "200.6622294670797",
                              "perihelion_argument": "82.27323864241687",
                              "mean_anomaly": "270.7584373127813",
                              "mean_motion": ".7623958356552024",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2023-10-14",
                                        "close_approach_date_full": "2023-10-14T14:35:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "15.1628576935437",
                                                  "kilometers_per_hour": "54586"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000363279208730267",
                                                  "kilometers": "54346",
                                                  "lunar": "0.14"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2022GQ",
                    "name": "2022 GQ",
                    "full_name": "(2022 GQ)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.4,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.8484,
                                        "estimated_diameter_max": 1.5757
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "5",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2437361749037577",
                              "semi_major_axis": "1.18917022087753",
                              "inclination": "1.596705235494168",
                              "ascending_node_longitude": "190.8939720573306",
                              "perihelion_argument": "299.9923899271606",
                              "mean_anomaly": "328.8598065513317",
                              "mean_motion": ".7600427772924581",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2022-04-01",
                                        "close_approach_date_full": "2022-04-01T16:59:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "6.94955582185598",
                                                  "kilometers_per_hour": "25018"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000364779844902851",
                                                  "kilometers": "54570",
                                                  "lunar": "0.14"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024TM3",
                    "name": "2024 TM3",
                    "full_name": "(2024 TM3)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31.31,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.6881,
                                        "estimated_diameter_max": 1.2778
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".5764802844327747",
                              "semi_major_axis": "1.572760943453221",
                              "inclination": "2.432892298474132",
                              "ascending_node_longitude": "12.03643316605734",
                              "perihelion_argument": "85.42072210480792",
                              "mean_anomaly": "180.3980305352028",
                              "mean_motion": ".4997007488642609",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-10-05",
                                        "close_approach_date_full": "2024-10-05T12:18:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "16.7072870346365",
                                                  "kilometers_per_hour": "60146"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000365804018262665",
                                                  "kilometers": "54724",
                                                  "lunar": "0.14"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2022SX55",
                    "name": "2022 SX55",
                    "full_name": "(2022 SX55)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.19,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.8905,
                                        "estimated_diameter_max": 1.6537
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3982807959079528",
                              "semi_major_axis": ".8362632575480686",
                              "inclination": "10.91447957400199",
                              "ascending_node_longitude": "354.394717869352",
                              "perihelion_argument": "221.0302913076962",
                              "mean_anomaly": "156.4999305663355",
                              "mean_motion": "1.28881193778333",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2022-09-17",
                                        "close_approach_date_full": "2022-09-17T13:34:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "12.6065722828022",
                                                  "kilometers_per_hour": "45384"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000371922206644186",
                                                  "kilometers": "55639",
                                                  "lunar": "0.14"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2017JB2",
                    "name": "2017 JB2",
                    "full_name": "(2017 JB2)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.2,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.1185,
                                        "estimated_diameter_max": 2.0772
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "6",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".05118978797212855",
                              "semi_major_axis": "1.02054034722868",
                              "inclination": "5.232409585785055",
                              "ascending_node_longitude": "222.8268654592129",
                              "perihelion_argument": "279.5665284385925",
                              "mean_anomaly": "181.4751053132915",
                              "mean_motion": ".956002009055008",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2017-05-04",
                                        "close_approach_date_full": "2017-05-04T03:18:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "4.77746070126857",
                                                  "kilometers_per_hour": "17199"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000371975759861839",
                                                  "kilometers": "55647",
                                                  "lunar": "0.14"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2023VD2",
                    "name": "2023 VD2",
                    "full_name": "(2023 VD2)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.08,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.9133,
                                        "estimated_diameter_max": 1.6962
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4364292676405468",
                              "semi_major_axis": "1.70014132658256",
                              "inclination": "3.004693697227909",
                              "ascending_node_longitude": "224.7622250952254",
                              "perihelion_argument": "206.8919127733851",
                              "mean_anomaly": "321.1387249427283",
                              "mean_motion": ".4446072472716415",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2023-11-07",
                                        "close_approach_date_full": "2023-11-07T12:53:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "8.11007450611646",
                                                  "kilometers_per_hour": "29196"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000375481540284335",
                                                  "kilometers": "56171",
                                                  "lunar": "0.15"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2014RA",
                    "name": "2014 RA",
                    "full_name": "(2014 RA)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.9,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.1985,
                                        "estimated_diameter_max": 2.2257
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "8",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4565045664658431",
                              "semi_major_axis": "1.461251308630493",
                              "inclination": "3.132977125855458",
                              "ascending_node_longitude": "157.8584103136962",
                              "perihelion_argument": "109.1255369135113",
                              "mean_anomaly": "154.9152226488337",
                              "mean_motion": ".5579775225214292",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2014-08-31",
                                        "close_approach_date_full": "2014-08-31T23:48:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "13.2545734407626",
                                                  "kilometers_per_hour": "47716"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000379116255004663",
                                                  "kilometers": "56715",
                                                  "lunar": "0.15"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2020TE5",
                    "name": "2020 TE5",
                    "full_name": "(2020 TE5)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.02,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.1658,
                                        "estimated_diameter_max": 2.1651
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3120770994061929",
                              "semi_major_axis": "1.319820790133196",
                              "inclination": "15.77460977207012",
                              "ascending_node_longitude": "16.52930701886993",
                              "perihelion_argument": "308.271198870637",
                              "mean_anomaly": "162.2742848185849",
                              "mean_motion": ".6500273441273189",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2020-10-09",
                                        "close_approach_date_full": "2020-10-09T18:18:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "12.096741999904",
                                                  "kilometers_per_hour": "43548"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000380328421135285",
                                                  "kilometers": "56896",
                                                  "lunar": "0.15"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2020XX3",
                    "name": "2020 XX3",
                    "full_name": "(2020 XX3)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.48,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.3201,
                                        "estimated_diameter_max": 2.4517
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "11",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2953870553653541",
                              "semi_major_axis": "1.372693803488032",
                              "inclination": ".7004455053340514",
                              "ascending_node_longitude": "87.28172832124189",
                              "perihelion_argument": "21.1468380863252",
                              "mean_anomaly": "10.84167264538419",
                              "mean_motion": ".61283500488484",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2020-12-18",
                                        "close_approach_date_full": "2020-12-18T06:41:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "5.92473308313006",
                                                  "kilometers_per_hour": "21329"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000381465150722029",
                                                  "kilometers": "57066",
                                                  "lunar": "0.15"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2025SY1",
                    "name": "2025 SY1",
                    "full_name": "(2025 SY1)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31.665,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.634,
                                        "estimated_diameter_max": 1.1775
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2463435909521017",
                              "semi_major_axis": ".9437529325365509",
                              "inclination": "3.946345641057226",
                              "ascending_node_longitude": "176.657684599422",
                              "perihelion_argument": "298.1336104485165",
                              "mean_anomaly": "335.8344380287626",
                              "mean_motion": "1.075020145127352",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2025-09-19",
                                        "close_approach_date_full": "2025-09-19T10:24:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "7.85178119469932",
                                                  "kilometers_per_hour": "28266"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000382430908364518",
                                                  "kilometers": "57211",
                                                  "lunar": "0.15"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2016GN134",
                    "name": "2016 GN134",
                    "full_name": "(2016 GN134)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.32,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.8642,
                                        "estimated_diameter_max": 1.605
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "5",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".5265683386550523",
                              "semi_major_axis": "1.643473320381707",
                              "inclination": "3.815947629355898",
                              "ascending_node_longitude": "194.5434815880798",
                              "perihelion_argument": "291.2657417199924",
                              "mean_anomaly": "227.4002936580264",
                              "mean_motion": ".4677998589006488",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2016-04-04",
                                        "close_approach_date_full": "2016-04-04T13:52:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "13.9039537443243",
                                                  "kilometers_per_hour": "50054"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000382446679397897",
                                                  "kilometers": "57213",
                                                  "lunar": "0.15"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2012KP24",
                    "name": "2012 KP24",
                    "full_name": "(2012 KP24)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 26.45,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 2.1068,
                                        "estimated_diameter_max": 3.9126
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "10",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3702548389567724",
                              "semi_major_axis": "1.500242428377108",
                              "inclination": "18.45657331475986",
                              "ascending_node_longitude": "67.42145809116835",
                              "perihelion_argument": "221.409584939923",
                              "mean_anomaly": "106.883183606241",
                              "mean_motion": ".5363668252387885",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2012-05-28",
                                        "close_approach_date_full": "2012-05-28T15:21:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "13.2674687385078",
                                                  "kilometers_per_hour": "47763"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000382930861828159",
                                                  "kilometers": "57286",
                                                  "lunar": "0.15"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024EF",
                    "name": "2024 EF",
                    "full_name": "(2024 EF)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.15,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.1314,
                                        "estimated_diameter_max": 2.1012
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "5",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2167900687979626",
                              "semi_major_axis": "1.145598749993287",
                              "inclination": "9.103113840732783",
                              "ascending_node_longitude": "343.7759152449223",
                              "perihelion_argument": "242.3371454464274",
                              "mean_anomaly": "101.8083871994768",
                              "mean_motion": ".803813465566775",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-03-04",
                                        "close_approach_date_full": "2024-03-04T07:00:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "8.63740936578414",
                                                  "kilometers_per_hour": "31095"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000385083249679448",
                                                  "kilometers": "57608",
                                                  "lunar": "0.15"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2021VP11",
                    "name": "2021 VP11",
                    "full_name": "(2021 VP11)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31.81,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.6132,
                                        "estimated_diameter_max": 1.1389
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2459527.5,
                              "eccentricity": ".3541980485939104",
                              "semi_major_axis": "1.278260238510903",
                              "inclination": "1.295173790979839",
                              "ascending_node_longitude": "47.65011020093191",
                              "perihelion_argument": "68.27255273830491",
                              "mean_anomaly": "324.6632975371233",
                              "mean_motion": ".6819855202353032",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2021-11-09",
                                        "close_approach_date_full": "2021-11-09T16:12:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "9.73521042853329",
                                                  "kilometers_per_hour": "35047"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000385418500285826",
                                                  "kilometers": "57658",
                                                  "lunar": "0.15"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2020PA",
                    "name": "2020 PA",
                    "full_name": "(2020 PA)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.84,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.2151,
                                        "estimated_diameter_max": 2.2567
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".5828125203894583",
                              "semi_major_axis": "2.426379504981191",
                              "inclination": "3.043846664255364",
                              "ascending_node_longitude": "308.4356557800214",
                              "perihelion_argument": "352.2953975118717",
                              "mean_anomaly": "147.7236344759982",
                              "mean_motion": ".2607750158574353",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2020-08-01",
                                        "close_approach_date_full": "2020-08-01T01:56:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "9.07444368922627",
                                                  "kilometers_per_hour": "32668"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.00038674734450983",
                                                  "kilometers": "57857",
                                                  "lunar": "0.15"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2023UB",
                    "name": "2023 UB",
                    "full_name": "(2023 UB)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.06,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.9175,
                                        "estimated_diameter_max": 1.704
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4673282372530682",
                              "semi_major_axis": "1.126733418863151",
                              "inclination": "4.307306951530725",
                              "ascending_node_longitude": "21.69621657376526",
                              "perihelion_argument": "255.7143079481531",
                              "mean_anomaly": "322.1332352678324",
                              "mean_motion": ".8240855715731177",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2023-10-15",
                                        "close_approach_date_full": "2023-10-15T19:08:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "15.5516540633478",
                                                  "kilometers_per_hour": "55986"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000391971105529864",
                                                  "kilometers": "58638",
                                                  "lunar": "0.15"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2015HD1",
                    "name": "2015 HD1",
                    "full_name": "(2015 HD1)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 27.4,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.6929,
                                        "estimated_diameter_max": 3.1439
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "10",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".6474195280736635",
                              "semi_major_axis": "2.305901056671842",
                              "inclination": "5.339249592166192",
                              "ascending_node_longitude": "210.7791082632436",
                              "perihelion_argument": "57.82858052273341",
                              "mean_anomaly": "355.5579317470166",
                              "mean_motion": ".2814771022521261",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2015-04-21",
                                        "close_approach_date_full": "2015-04-21T08:17:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "15.9663298966191",
                                                  "kilometers_per_hour": "57479"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000395118212783946",
                                                  "kilometers": "59109",
                                                  "lunar": "0.15"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2018YL2",
                    "name": "2018 YL2",
                    "full_name": "(2018 YL2)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.4,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.0681,
                                        "estimated_diameter_max": 1.9837
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".5790869682348216",
                              "semi_major_axis": "2.134603935932109",
                              "inclination": "4.251981011332952",
                              "ascending_node_longitude": "275.6801299358806",
                              "perihelion_argument": "139.5689194191462",
                              "mean_anomaly": "85.68595978911293",
                              "mean_motion": ".3160298573268679",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2018-12-27",
                                        "close_approach_date_full": "2018-12-27T17:33:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "11.9120249841768",
                                                  "kilometers_per_hour": "42883"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.00039799174858835",
                                                  "kilometers": "59539",
                                                  "lunar": "0.15"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2017UL6",
                    "name": "2017 UL6",
                    "full_name": "(2017 UL6)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 32,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.587,
                                        "estimated_diameter_max": 1.0901
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2544211734086619",
                              "semi_major_axis": "1.100636703211477",
                              "inclination": "3.152052038763719",
                              "ascending_node_longitude": "214.6788733336865",
                              "perihelion_argument": "262.1318907605325",
                              "mean_anomaly": "300.147230547807",
                              "mean_motion": ".8535679250646108",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2017-10-28",
                                        "close_approach_date_full": "2017-10-28T11:24:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "8.02530649298332",
                                                  "kilometers_per_hour": "28891"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000398300564066876",
                                                  "kilometers": "59585",
                                                  "lunar": "0.16"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2022KG1",
                    "name": "2022 KG1",
                    "full_name": "(2022 KG1)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.87,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.2068,
                                        "estimated_diameter_max": 2.2411
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "4",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2396773763166643",
                              "semi_major_axis": ".9121195370090902",
                              "inclination": "11.72078810401089",
                              "ascending_node_longitude": "240.9983704213258",
                              "perihelion_argument": "230.854605559918",
                              "mean_anomaly": "112.2293924577685",
                              "mean_motion": "1.131426735074557",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2022-05-22",
                                        "close_approach_date_full": "2022-05-22T11:11:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "9.11453807978754",
                                                  "kilometers_per_hour": "32812"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000402733898149735",
                                                  "kilometers": "60248",
                                                  "lunar": "0.16"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2021UP120",
                    "name": "2021 UP120",
                    "full_name": "(2021 UP120)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 32.52,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.5207,
                                        "estimated_diameter_max": 0.9671
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2459516.5,
                              "eccentricity": ".4588460374137833",
                              "semi_major_axis": "1.323493583227971",
                              "inclination": "4.768523983137015",
                              "ascending_node_longitude": "36.47331668436449",
                              "perihelion_argument": "83.36387302729823",
                              "mean_anomaly": "324.46752469752",
                              "mean_motion": ".647323410889436",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2021-10-29",
                                        "close_approach_date_full": "2021-10-29T20:09:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "13.576122123999",
                                                  "kilometers_per_hour": "48874"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000404253977832596",
                                                  "kilometers": "60476",
                                                  "lunar": "0.16"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2019DP",
                    "name": "2019 DP",
                    "full_name": "(2019 DP)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 25.05,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 2.9082,
                                        "estimated_diameter_max": 5.4009
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "27",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2486688406734349",
                              "semi_major_axis": "1.07270986409257",
                              "inclination": "10.36540112615282",
                              "ascending_node_longitude": "336.399310000867",
                              "perihelion_argument": "91.09569388412999",
                              "mean_anomaly": "83.12397853527901",
                              "mean_motion": ".8871165114201376",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2017-08-29",
                                        "close_approach_date_full": "2017-08-29T20:36:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "9.50210336004115",
                                                  "kilometers_per_hour": "34208"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000409429853709546",
                                                  "kilometers": "61250",
                                                  "lunar": "0.16"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024UB11",
                    "name": "2024 UB11",
                    "full_name": "(2024 UB11)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.97,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.9367,
                                        "estimated_diameter_max": 1.7397
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "4",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4716852462269723",
                              "semi_major_axis": "1.312497421550787",
                              "inclination": "2.243163732882003",
                              "ascending_node_longitude": "36.49484265175483",
                              "perihelion_argument": "273.997591803313",
                              "mean_anomaly": "289.1736313438875",
                              "mean_motion": ".6554753823482393",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-10-30",
                                        "close_approach_date_full": "2024-10-30T08:29:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "14.8173170410033",
                                                  "kilometers_per_hour": "53342"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000409525351332431",
                                                  "kilometers": "61264",
                                                  "lunar": "0.16"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2009EJ1",
                    "name": "2009 EJ1",
                    "full_name": "(2009 EJ1)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.4,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.3447,
                                        "estimated_diameter_max": 2.4973
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "7",
                              "epoch_osculation": 2454893.5,
                              "eccentricity": ".4749339961845835",
                              "semi_major_axis": "1.59928638534347",
                              "inclination": ".02531047084077909",
                              "ascending_node_longitude": "312.6980142116992",
                              "perihelion_argument": "148.3841070493263",
                              "mean_anomaly": "21.99780108375743",
                              "mean_motion": ".4873205365468554",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2009-02-27",
                                        "close_approach_date_full": "2009-02-27T19:54:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "11.4866658627334",
                                                  "kilometers_per_hour": "41352"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000411454901887197",
                                                  "kilometers": "61553",
                                                  "lunar": "0.16"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2014EC",
                    "name": "2014 EC",
                    "full_name": "(2014 EC)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.2,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.4081,
                                        "estimated_diameter_max": 2.615
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "12",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".5258815888230149",
                              "semi_major_axis": "1.458948251394187",
                              "inclination": "1.400921402040199",
                              "ascending_node_longitude": "344.8010083915618",
                              "perihelion_argument": "264.2563969044063",
                              "mean_anomaly": "203.6762785582241",
                              "mean_motion": ".559299256696566",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2014-03-06",
                                        "close_approach_date_full": "2014-03-06T21:18:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "16.012387813752",
                                                  "kilometers_per_hour": "57645"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000411624492893169",
                                                  "kilometers": "61578",
                                                  "lunar": "0.16"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2025AH4",
                    "name": "2025 AH4",
                    "full_name": "(2025 AH4)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.75,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.9854,
                                        "estimated_diameter_max": 1.8301
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2460677.5,
                              "eccentricity": ".551201329434484",
                              "semi_major_axis": "1.655241582047289",
                              "inclination": "1.259600184714062",
                              "ascending_node_longitude": "100.2285904376635",
                              "perihelion_argument": "288.0915015078019",
                              "mean_anomaly": "21.82424729875483",
                              "mean_motion": ".4628198657770757",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-12-31",
                                        "close_approach_date_full": "2024-12-31T15:53:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "15.1447645204101",
                                                  "kilometers_per_hour": "54521"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000413999626472799",
                                                  "kilometers": "61933",
                                                  "lunar": "0.16"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024RC42",
                    "name": "2024 RC42",
                    "full_name": "(2024 RC42)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 32.38,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.5378,
                                        "estimated_diameter_max": 0.9988
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3293616725669561",
                              "semi_major_axis": ".8233137123651939",
                              "inclination": "1.196352936933944",
                              "ascending_node_longitude": "350.0885490388316",
                              "perihelion_argument": "145.2485293822905",
                              "mean_anomaly": "94.43051218894472",
                              "mean_motion": "1.319337937901977",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "1992-09-12",
                                        "close_approach_date_full": "1992-09-12T01:26:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "8.24528490209296",
                                                  "kilometers_per_hour": "29683"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000418163044463117",
                                                  "kilometers": "62556",
                                                  "lunar": "0.16"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2017QP1",
                    "name": "2017 QP1",
                    "full_name": "(2017 QP1)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 24.27,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 3.4804,
                                        "estimated_diameter_max": 6.4635
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2457983.5,
                              "eccentricity": ".7051733937561961",
                              "semi_major_axis": "1.367916939139449",
                              "inclination": "8.141263758097931",
                              "ascending_node_longitude": "141.8845220087478",
                              "perihelion_argument": "63.06904683565467",
                              "mean_anomaly": "32.74975309356181",
                              "mean_motion": ".6160479016081917",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2017-08-14",
                                        "close_approach_date_full": "2017-08-14T21:23:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "23.9644729753233",
                                                  "kilometers_per_hour": "86272"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000418709946740721",
                                                  "kilometers": "62638",
                                                  "lunar": "0.16"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2017FN1",
                    "name": "2017 FN1",
                    "full_name": "(2017 FN1)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.6,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.8103,
                                        "estimated_diameter_max": 1.5048
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "4",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".577596566359201",
                              "semi_major_axis": "1.466378209517353",
                              "inclination": "2.248146813854932",
                              "ascending_node_longitude": ".3010125131910046",
                              "perihelion_argument": "271.7635963017207",
                              "mean_anomaly": "289.0966203201286",
                              "mean_motion": ".5550537950200797",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2017-03-20",
                                        "close_approach_date_full": "2017-03-20T21:02:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "18.2592014503741",
                                                  "kilometers_per_hour": "65733"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000422724431645111",
                                                  "kilometers": "63239",
                                                  "lunar": "0.16"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2012FS35",
                    "name": "2012 FS35",
                    "full_name": "(2012 FS35)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.2,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.8884,
                                        "estimated_diameter_max": 1.6499
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "8",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".1185107686931414",
                              "semi_major_axis": "1.099192010681592",
                              "inclination": "2.338268817497231",
                              "ascending_node_longitude": "186.4862071960455",
                              "perihelion_argument": "42.34653412645417",
                              "mean_anomaly": "272.6300264267068",
                              "mean_motion": ".8552512728663785",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2012-03-26",
                                        "close_approach_date_full": "2012-03-26T17:09:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "4.83028719690186",
                                                  "kilometers_per_hour": "17389"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000430548994665396",
                                                  "kilometers": "64409",
                                                  "lunar": "0.17"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2020CQ1",
                    "name": "2020 CQ1",
                    "full_name": "(2020 CQ1)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.86,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.2095,
                                        "estimated_diameter_max": 2.2463
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "10",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3215185939506697",
                              "semi_major_axis": "1.437366469379248",
                              "inclination": "2.804957376618441",
                              "ascending_node_longitude": "134.3225994168189",
                              "perihelion_argument": "342.8219461657556",
                              "mean_anomaly": "139.243336116463",
                              "mean_motion": ".5719430798216606",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2020-02-04",
                                        "close_approach_date_full": "2020-02-04T11:16:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "6.06539717781806",
                                                  "kilometers_per_hour": "21835"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000431274742583351",
                                                  "kilometers": "64518",
                                                  "lunar": "0.17"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2022UG3",
                    "name": "2022 UG3",
                    "full_name": "(2022 UG3)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.32,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.088,
                                        "estimated_diameter_max": 2.0205
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".5637040355497797",
                              "semi_major_axis": "1.645037709322509",
                              "inclination": "2.132505114675103",
                              "ascending_node_longitude": "23.15251308719545",
                              "perihelion_argument": "77.11849761743854",
                              "mean_anomaly": "145.733169482414",
                              "mean_motion": ".467132718954606",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2022-10-16",
                                        "close_approach_date_full": "2022-10-16T22:27:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "15.5221931755304",
                                                  "kilometers_per_hour": "55880"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000432119774445624",
                                                  "kilometers": "64644",
                                                  "lunar": "0.17"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2019YS",
                    "name": "2019 YS",
                    "full_name": "(2019 YS)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31.5,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.6586,
                                        "estimated_diameter_max": 1.2231
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2234355975534617",
                              "semi_major_axis": "1.116526506759273",
                              "inclination": ".2153376475077783",
                              "ascending_node_longitude": "272.7790132697098",
                              "perihelion_argument": "103.8814623889613",
                              "mean_anomaly": "53.97124194287384",
                              "mean_motion": ".8354116304295579",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2019-12-18",
                                        "close_approach_date_full": "2019-12-18T15:12:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "7.16803240195601",
                                                  "kilometers_per_hour": "25805"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000436306275372994",
                                                  "kilometers": "65270",
                                                  "lunar": "0.17"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2021NA",
                    "name": "2021 NA",
                    "full_name": "(2021 NA)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.55,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.299,
                                        "estimated_diameter_max": 2.4125
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2459396.5,
                              "eccentricity": ".6017847806735812",
                              "semi_major_axis": "2.378975119051193",
                              "inclination": "2.275117874811588",
                              "ascending_node_longitude": "101.5747105053853",
                              "perihelion_argument": "214.6300359349878",
                              "mean_anomaly": "352.114534031161",
                              "mean_motion": ".2686081736935769",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2021-07-03",
                                        "close_approach_date_full": "2021-07-03T04:57:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "11.390842090442",
                                                  "kilometers_per_hour": "41007"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000436449543216786",
                                                  "kilometers": "65292",
                                                  "lunar": "0.17"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2012BX34",
                    "name": "2012 BX34",
                    "full_name": "(2012 BX34)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 27.6,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.6167,
                                        "estimated_diameter_max": 3.0024
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "18",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3582060343743524",
                              "semi_major_axis": ".7603865065858538",
                              "inclination": "10.52472998386732",
                              "ascending_node_longitude": "306.6661635379372",
                              "perihelion_argument": "335.9686129522756",
                              "mean_anomaly": "161.1214353900204",
                              "mean_motion": "1.486457414567349",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2012-01-27",
                                        "close_approach_date_full": "2012-01-27T15:25:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "9.99252677102681",
                                                  "kilometers_per_hour": "35973"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000437150859612701",
                                                  "kilometers": "65397",
                                                  "lunar": "0.17"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2025RN4",
                    "name": "2025 RN4",
                    "full_name": "(2025 RN4)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.5,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.3141,
                                        "estimated_diameter_max": 2.4404
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".1542126887211484",
                              "semi_major_axis": "1.164245021895265",
                              "inclination": "3.747356215544884",
                              "ascending_node_longitude": "170.3039340320856",
                              "perihelion_argument": "147.0875022970435",
                              "mean_anomaly": "78.13570499190941",
                              "mean_motion": ".7845804629287071",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2025-09-13",
                                        "close_approach_date_full": "2025-09-13T15:23:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "5.27488714255475",
                                                  "kilometers_per_hour": "18990"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.00043916154841915",
                                                  "kilometers": "65698",
                                                  "lunar": "0.17"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2008EF32",
                    "name": "2008 EF32",
                    "full_name": "(2008 EF32)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.4,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.0681,
                                        "estimated_diameter_max": 1.9837
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "7",
                              "epoch_osculation": 2454536.5,
                              "eccentricity": ".5225755492144663",
                              "semi_major_axis": "1.628748972613518",
                              "inclination": "1.737047252058623",
                              "ascending_node_longitude": "349.1759149186282",
                              "perihelion_argument": "112.2686285351199",
                              "mean_anomaly": "22.15233439153786",
                              "mean_motion": ".474157737266596",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2008-03-10",
                                        "close_approach_date_full": "2008-03-10T05:23:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "13.5793919843923",
                                                  "kilometers_per_hour": "48886"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000441691971063593",
                                                  "kilometers": "66076",
                                                  "lunar": "0.17"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2021JU6",
                    "name": "2021 JU6",
                    "full_name": "(2021 JU6)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 27.1,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.8139,
                                        "estimated_diameter_max": 3.3687
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".5564530983541343",
                              "semi_major_axis": "2.143741838026583",
                              "inclination": "7.496317216356668",
                              "ascending_node_longitude": "53.53372166341995",
                              "perihelion_argument": "214.2609717176989",
                              "mean_anomaly": "150.7707734881208",
                              "mean_motion": ".3140113514921473",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2021-05-14",
                                        "close_approach_date_full": "2021-05-14T15:01:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "11.6019583212314",
                                                  "kilometers_per_hour": "41767"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000442176755596696",
                                                  "kilometers": "66149",
                                                  "lunar": "0.17"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2025FC",
                    "name": "2025 FC",
                    "full_name": "(2025 FC)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.75,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.2406,
                                        "estimated_diameter_max": 2.3039
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".5473660046143235",
                              "semi_major_axis": "1.163438402870272",
                              "inclination": "1.915771690588674",
                              "ascending_node_longitude": "178.1861985555523",
                              "perihelion_argument": "250.4103782942195",
                              "mean_anomaly": "238.7235225268731",
                              "mean_motion": ".7853965360505978",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2025-03-18",
                                        "close_approach_date_full": "2025-03-18T15:42:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "17.1753164080837",
                                                  "kilometers_per_hour": "61831"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000442342185953072",
                                                  "kilometers": "66173",
                                                  "lunar": "0.17"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2020QY2",
                    "name": "2020 QY2",
                    "full_name": "(2020 QY2)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31.2,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.7057,
                                        "estimated_diameter_max": 1.3106
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".6003040197429438",
                              "semi_major_axis": "1.663603193455326",
                              "inclination": "14.7961163435049",
                              "ascending_node_longitude": "148.0416943902747",
                              "perihelion_argument": "265.0908487256451",
                              "mean_anomaly": "137.7785162391841",
                              "mean_motion": ".4593349124085782",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2020-08-20",
                                        "close_approach_date_full": "2020-08-20T23:50:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "18.919756529016",
                                                  "kilometers_per_hour": "68111"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000444683681783228",
                                                  "kilometers": "66524",
                                                  "lunar": "0.17"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2021PA17",
                    "name": "2021 PA17",
                    "full_name": "(2021 PA17)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 27.82,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.5368,
                                        "estimated_diameter_max": 2.8541
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2459442.5,
                              "eccentricity": ".6247114084965928",
                              "semi_major_axis": "1.956892419347778",
                              "inclination": "5.166745532321283",
                              "ascending_node_longitude": "141.4860459899345",
                              "perihelion_argument": "106.8011790519562",
                              "mean_anomaly": "17.21156479836155",
                              "mean_motion": ".3600423996717051",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2021-08-14",
                                        "close_approach_date_full": "2021-08-14T14:11:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "17.4267070762077",
                                                  "kilometers_per_hour": "62736"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000446573212890478",
                                                  "kilometers": "66806",
                                                  "lunar": "0.17"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2023QY",
                    "name": "2023 QY",
                    "full_name": "(2023 QY)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.61,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.2812,
                                        "estimated_diameter_max": 2.3794
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2460176.5,
                              "eccentricity": ".6115848759030882",
                              "semi_major_axis": "2.328430857318035",
                              "inclination": "5.373575813624373",
                              "ascending_node_longitude": "324.8444951384595",
                              "perihelion_argument": "316.2751469329289",
                              "mean_anomaly": "9.43801764838901",
                              "mean_motion": ".2774016594506193",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2023-08-18",
                                        "close_approach_date_full": "2023-08-18T15:49:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "13.2243257424822",
                                                  "kilometers_per_hour": "47608"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000447269346513161",
                                                  "kilometers": "66911",
                                                  "lunar": "0.17"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2021JQ2",
                    "name": "2021 JQ2",
                    "full_name": "(2021 JQ2)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.01,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.9282,
                                        "estimated_diameter_max": 1.7237
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2030338980898676",
                              "semi_major_axis": ".9652408237096689",
                              "inclination": "9.756132753930535",
                              "ascending_node_longitude": "47.79990602874553",
                              "perihelion_argument": "294.0430073849723",
                              "mean_anomaly": "191.1532649080015",
                              "mean_motion": "1.039323031755041",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2021-05-08",
                                        "close_approach_date_full": "2021-05-08T10:47:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "8.66556833603291",
                                                  "kilometers_per_hour": "31196"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000449071768548899",
                                                  "kilometers": "67180",
                                                  "lunar": "0.17"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024GZ5",
                    "name": "2024 GZ5",
                    "full_name": "(2024 GZ5)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.3,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.8682,
                                        "estimated_diameter_max": 1.6124
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".1122351085825653",
                              "semi_major_axis": "1.047790167787784",
                              "inclination": ".8095515599824554",
                              "ascending_node_longitude": "25.18237367153135",
                              "perihelion_argument": "254.5444044014036",
                              "mean_anomaly": "115.5622526849947",
                              "mean_motion": ".9189515098955995",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-04-15",
                                        "close_approach_date_full": "2024-04-15T16:47:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "5.03753332558076",
                                                  "kilometers_per_hour": "18135"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000458619133144734",
                                                  "kilometers": "68608",
                                                  "lunar": "0.18"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2019BO",
                    "name": "2019 BO",
                    "full_name": "(2019 BO)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.1,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.4409,
                                        "estimated_diameter_max": 2.6759
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "5",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4215358364225703",
                              "semi_major_axis": "1.635579682361228",
                              "inclination": "2.789510191908701",
                              "ascending_node_longitude": "295.5831581314014",
                              "perihelion_argument": "150.0989392692666",
                              "mean_anomaly": "109.4396404150765",
                              "mean_motion": ".4711904866164345",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2019-01-16",
                                        "close_approach_date_full": "2019-01-16T01:13:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "8.07797630889786",
                                                  "kilometers_per_hour": "29081"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000459436842546235",
                                                  "kilometers": "68731",
                                                  "lunar": "0.18"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024UO4",
                    "name": "2024 UO4",
                    "full_name": "(2024 UO4)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.22,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.8843,
                                        "estimated_diameter_max": 1.6424
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "2",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3350059260456003",
                              "semi_major_axis": "1.329232391366721",
                              "inclination": "1.28686409932585",
                              "ascending_node_longitude": "213.6074503445302",
                              "perihelion_argument": "237.321760060919",
                              "mean_anomaly": "221.5277613290287",
                              "mean_motion": ".6431358222095034",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-10-28",
                                        "close_approach_date_full": "2024-10-28T07:57:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "8.36488110224885",
                                                  "kilometers_per_hour": "30114"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000459858980208543",
                                                  "kilometers": "68794",
                                                  "lunar": "0.18"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2020GO1",
                    "name": "2020 GO1",
                    "full_name": "(2020 GO1)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 27.6,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.6167,
                                        "estimated_diameter_max": 3.0024
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3599877988851691",
                              "semi_major_axis": "1.555684152580446",
                              "inclination": "8.347061534304878",
                              "ascending_node_longitude": "192.1550745151817",
                              "perihelion_argument": "349.6917770380598",
                              "mean_anomaly": "330.4486165823488",
                              "mean_motion": ".5079511318583568",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2020-04-01",
                                        "close_approach_date_full": "2020-04-01T19:09:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "7.64624046411379",
                                                  "kilometers_per_hour": "27526"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000461409911167156",
                                                  "kilometers": "69026",
                                                  "lunar": "0.18"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2009TB",
                    "name": "2009 TB",
                    "full_name": "(2009 TB)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.2,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.1185,
                                        "estimated_diameter_max": 2.0772
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "8",
                              "epoch_osculation": 2455106.5,
                              "eccentricity": ".6602912824486068",
                              "semi_major_axis": "2.564323415810549",
                              "inclination": "8.19891332992262",
                              "ascending_node_longitude": "7.989891243896407",
                              "perihelion_argument": "312.2711442638189",
                              "mean_anomaly": "8.26775446144519",
                              "mean_motion": ".2400185881381729",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2009-10-01",
                                        "close_approach_date_full": "2009-10-01T04:10:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "15.0973261670451",
                                                  "kilometers_per_hour": "54350"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000464199773646738",
                                                  "kilometers": "69443",
                                                  "lunar": "0.18"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2022JO1",
                    "name": "2022 JO1",
                    "full_name": "(2022 JO1)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 27.24,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.7564,
                                        "estimated_diameter_max": 3.2619
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "4",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".6503790017318974",
                              "semi_major_axis": "2.573700175162714",
                              "inclination": "8.788009845216957",
                              "ascending_node_longitude": "49.33711830630219",
                              "perihelion_argument": "220.4743568625299",
                              "mean_anomaly": "299.7720504873122",
                              "mean_motion": ".2387080943489676",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2022-05-10",
                                        "close_approach_date_full": "2022-05-10T12:47:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "13.8733988548815",
                                                  "kilometers_per_hour": "49944"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000464971235001508",
                                                  "kilometers": "69559",
                                                  "lunar": "0.18"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2007UN12",
                    "name": "2007 UN12",
                    "full_name": "(2007 UN12)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.7,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.2549,
                                        "estimated_diameter_max": 2.3306
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "22",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".05866509298248523",
                              "semi_major_axis": "1.049476097167488",
                              "inclination": ".2346112833986516",
                              "ascending_node_longitude": "214.2901822139623",
                              "perihelion_argument": "137.8844227079304",
                              "mean_anomaly": "301.0535167883188",
                              "mean_motion": ".9167380269388211",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2007-10-17",
                                        "close_approach_date_full": "2007-10-17T15:26:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "3.73292392926056",
                                                  "kilometers_per_hour": "13439"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000465729828152258",
                                                  "kilometers": "69672",
                                                  "lunar": "0.18"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2018CB",
                    "name": "2018 CB",
                    "full_name": "(2018 CB)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 25.9,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 2.3912,
                                        "estimated_diameter_max": 4.4409
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "36",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3200494625421943",
                              "semi_major_axis": "1.409012622236177",
                              "inclination": "5.287253961652552",
                              "ascending_node_longitude": "320.5534649936044",
                              "perihelion_argument": "208.2468882767614",
                              "mean_anomaly": "221.1746832970878",
                              "mean_motion": ".5892936325240056",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2018-02-09",
                                        "close_approach_date_full": "2018-02-09T22:29:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "7.27105702402805",
                                                  "kilometers_per_hour": "26176"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000466129439746244",
                                                  "kilometers": "69732",
                                                  "lunar": "0.18"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2018CN2",
                    "name": "2018 CN2",
                    "full_name": "(2018 CN2)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 27.8,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.5439,
                                        "estimated_diameter_max": 2.8673
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4736266510015824",
                              "semi_major_axis": "1.203759632697102",
                              "inclination": "25.7426407579241",
                              "ascending_node_longitude": "320.1424965664406",
                              "perihelion_argument": "276.6144067742335",
                              "mean_anomaly": "278.1845229604825",
                              "mean_motion": ".7462672976592355",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2018-02-09",
                                        "close_approach_date_full": "2018-02-09T07:26:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "20.1618392830501",
                                                  "kilometers_per_hour": "72583"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000466959185900703",
                                                  "kilometers": "69856",
                                                  "lunar": "0.18"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2016VF18",
                    "name": "2016 VF18",
                    "full_name": "(2016 VF18)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.88,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.9564,
                                        "estimated_diameter_max": 1.7761
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2457703.5,
                              "eccentricity": ".6809159989798652",
                              "semi_major_axis": "2.777747887618161",
                              "inclination": ".7653556173287611",
                              "ascending_node_longitude": "229.7232474489761",
                              "perihelion_argument": "136.34294457",
                              "mean_anomaly": "6.438811115126046",
                              "mean_motion": ".2128946926750905",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2016-11-10",
                                        "close_approach_date_full": "2016-11-10T11:36:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "13.7323127133089",
                                                  "kilometers_per_hour": "49436"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000467365905368173",
                                                  "kilometers": "69917",
                                                  "lunar": "0.18"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2025MJ91",
                    "name": "2025 MJ91",
                    "full_name": "(2025 MJ91)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 27.51,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.6505,
                                        "estimated_diameter_max": 3.0653
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4687011201836701",
                              "semi_major_axis": "1.910839052998035",
                              "inclination": "2.616562314311366",
                              "ascending_node_longitude": "277.7350747166117",
                              "perihelion_argument": "355.6625639878534",
                              "mean_anomaly": "55.28295567681514",
                              "mean_motion": ".3731366523913753",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2025-06-29",
                                        "close_approach_date_full": "2025-06-29T13:11:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "7.50563133620977",
                                                  "kilometers_per_hour": "27020"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.00046838724767779",
                                                  "kilometers": "70070",
                                                  "lunar": "0.18"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2020BH6",
                    "name": "2020 BH6",
                    "full_name": "(2020 BH6)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.6,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.2842,
                                        "estimated_diameter_max": 2.3849
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4647116812809414",
                              "semi_major_axis": "1.699995115574324",
                              "inclination": "5.008166372696173",
                              "ascending_node_longitude": "304.5626353443317",
                              "perihelion_argument": "220.050042909069",
                              "mean_anomaly": "211.856920432609",
                              "mean_motion": ".444664607323172",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2020-01-25",
                                        "close_approach_date_full": "2020-01-25T05:11:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "10.2000524662641",
                                                  "kilometers_per_hour": "36720"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.00046940963798959",
                                                  "kilometers": "70223",
                                                  "lunar": "0.18"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2021EN4",
                    "name": "2021 EN4",
                    "full_name": "(2021 EN4)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.68,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.0014,
                                        "estimated_diameter_max": 1.8598
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".7579765888296395",
                              "semi_major_axis": "3.259079251055296",
                              "inclination": "5.665588474755972",
                              "ascending_node_longitude": "174.5484609172989",
                              "perihelion_argument": "301.8477930247003",
                              "mean_anomaly": "292.6561298189608",
                              "mean_motion": ".1675180819955557",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2021-03-15",
                                        "close_approach_date_full": "2021-03-15T03:59:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "17.2863644222522",
                                                  "kilometers_per_hour": "62231"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000472859021653359",
                                                  "kilometers": "70739",
                                                  "lunar": "0.18"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2015YJ",
                    "name": "2015 YJ",
                    "full_name": "(2015 YJ)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 28.2,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.4081,
                                        "estimated_diameter_max": 2.615
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "8",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".5228590859619558",
                              "semi_major_axis": "1.263676748813813",
                              "inclination": ".1204925466776856",
                              "ascending_node_longitude": "264.3293357136635",
                              "perihelion_argument": "79.53036051647916",
                              "mean_anomaly": "37.14083050127531",
                              "mean_motion": ".6938252196531627",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2015-12-13",
                                        "close_approach_date_full": "2015-12-13T21:18:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "16.7180432909174",
                                                  "kilometers_per_hour": "60185"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000476134122915086",
                                                  "kilometers": "71229",
                                                  "lunar": "0.19"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2019OK",
                    "name": "2019 OK",
                    "full_name": "(2019 OK)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 23.3,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 4.3513,
                                        "estimated_diameter_max": 8.0811
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "7",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".7572439597002728",
                              "semi_major_axis": "1.867053332920553",
                              "inclination": "2.090586145533652",
                              "ascending_node_longitude": "301.9361823111157",
                              "perihelion_argument": "106.2126753340526",
                              "mean_anomaly": "154.5308467828627",
                              "mean_motion": ".3863393885108567",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2019-07-25",
                                        "close_approach_date_full": "2019-07-25T01:22:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "24.5347211337972",
                                                  "kilometers_per_hour": "88325"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.00047697856030704",
                                                  "kilometers": "71355",
                                                  "lunar": "0.19"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2019JH7",
                    "name": "2019 JH7",
                    "full_name": "(2019 JH7)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.6,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.0201,
                                        "estimated_diameter_max": 1.8944
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "5",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2912471799208805",
                              "semi_major_axis": ".988518835073518",
                              "inclination": ".8556935451409947",
                              "ascending_node_longitude": "58.73495151014131",
                              "perihelion_argument": "286.7812836814044",
                              "mean_anomaly": "145.0014553101638",
                              "mean_motion": "1.002828460509013",
                              "orbit_class": {
                                        "orbit_class_type": "ATE"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2019-05-16",
                                        "close_approach_date_full": "2019-05-16T00:06:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "9.64181807562254",
                                                  "kilometers_per_hour": "34711"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000478243960378741",
                                                  "kilometers": "71544",
                                                  "lunar": "0.19"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2024GX3",
                    "name": "2024 GX3",
                    "full_name": "(2024 GX3)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.71,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.9945,
                                        "estimated_diameter_max": 1.847
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "4",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2967268616483899",
                              "semi_major_axis": "1.109135088375148",
                              "inclination": "9.255521764698088",
                              "ascending_node_longitude": "200.5001043153151",
                              "perihelion_argument": "271.950250381919",
                              "mean_anomaly": "192.4352258559246",
                              "mean_motion": ".8437764632077028",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2024-04-10",
                                        "close_approach_date_full": "2024-04-10T08:27:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "10.1653433323412",
                                                  "kilometers_per_hour": "36595"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000478308808926095",
                                                  "kilometers": "71554",
                                                  "lunar": "0.19"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2016LP10",
                    "name": "2016 LP10",
                    "full_name": "(2016 LP10)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.3,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.093,
                                        "estimated_diameter_max": 2.0299
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "4",
                              "epoch_osculation": 2457548.5,
                              "eccentricity": ".622228404087478",
                              "semi_major_axis": "2.083278623027174",
                              "inclination": ".6694925940730656",
                              "ascending_node_longitude": "79.30212768104998",
                              "perihelion_argument": "245.3235309075902",
                              "mean_anomaly": "345.433057315906",
                              "mean_motion": ".3277804428551236",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2016-06-09",
                                        "close_approach_date_full": "2016-06-09T18:32:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "15.9151273003925",
                                                  "kilometers_per_hour": "57294"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000479018633036904",
                                                  "kilometers": "71660",
                                                  "lunar": "0.19"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2021UH1",
                    "name": "2021 UH1",
                    "full_name": "(2021 UH1)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 31.66,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.6348,
                                        "estimated_diameter_max": 1.1789
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".261204740011805",
                              "semi_major_axis": "1.274216382150656",
                              "inclination": "1.835933132740098",
                              "ascending_node_longitude": "212.6263717055935",
                              "perihelion_argument": "222.8799261530132",
                              "mean_anomaly": "273.5792990979064",
                              "mean_motion": ".6852346211485775",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2021-10-27",
                                        "close_approach_date_full": "2021-10-27T07:14:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "6.16197343114142",
                                                  "kilometers_per_hour": "22183"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000480353778115454",
                                                  "kilometers": "71860",
                                                  "lunar": "0.19"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2025SU7",
                    "name": "2025 SU7",
                    "full_name": "(2025 SU7)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.874,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.7607,
                                        "estimated_diameter_max": 1.4128
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "1",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".3344255220496362",
                              "semi_major_axis": "1.345096294588736",
                              "inclination": "4.412289396066699",
                              "ascending_node_longitude": "181.2011830028092",
                              "perihelion_argument": "124.3863707978387",
                              "mean_anomaly": "64.75696399536172",
                              "mean_motion": ".6317918356488328",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2025-09-24",
                                        "close_approach_date_full": "2025-09-24T01:00:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "9.38393394435317",
                                                  "kilometers_per_hour": "33782"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000481119996119254",
                                                  "kilometers": "71975",
                                                  "lunar": "0.19"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2019SU2",
                    "name": "2019 SU2",
                    "full_name": "(2019 SU2)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 30.1,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 0.9091,
                                        "estimated_diameter_max": 1.6884
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "3",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".6071605376179929",
                              "semi_major_axis": "2.358618633563077",
                              "inclination": ".933510998256215",
                              "ascending_node_longitude": "179.1620272162015",
                              "perihelion_argument": "141.4262768509417",
                              "mean_anomaly": "260.1296191880211",
                              "mean_motion": ".2720930733037514",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2019-09-21",
                                        "close_approach_date_full": "2019-09-21T02:48:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "11.9240510298152",
                                                  "kilometers_per_hour": "42927"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000481457027518685",
                                                  "kilometers": "72025",
                                                  "lunar": "0.19"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2010RK53",
                    "name": "2010 RK53",
                    "full_name": "(2010 RK53)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 27.9,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.5088,
                                        "estimated_diameter_max": 2.802
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "8",
                              "epoch_osculation": 2455453.5,
                              "eccentricity": ".314067815444709",
                              "semi_major_axis": "1.347552120279728",
                              "inclination": "6.10081474634943",
                              "ascending_node_longitude": "346.1538766569814",
                              "perihelion_argument": "310.8912044978092",
                              "mean_anomaly": "28.94353617063138",
                              "mean_motion": ".6300655237614673",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2010-09-08",
                                        "close_approach_date_full": "2010-09-08T23:58:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "8.81030700579568",
                                                  "kilometers_per_hour": "31717"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000482437034771847",
                                                  "kilometers": "72172",
                                                  "lunar": "0.19"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2009DD45",
                    "name": "2009 DD45",
                    "full_name": "(2009 DD45)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 25.8,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 2.4469,
                                        "estimated_diameter_max": 4.5443
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "24",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".2048415935929692",
                              "semi_major_axis": "1.24093938101665",
                              "inclination": "13.7437444686827",
                              "ascending_node_longitude": "161.8931483696446",
                              "perihelion_argument": "13.97155890491062",
                              "mean_anomaly": "25.65325827869083",
                              "mean_motion": ".7129814378264534",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2009-03-02",
                                        "close_approach_date_full": "2009-03-02T13:45:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "8.82119280113659",
                                                  "kilometers_per_hour": "31756"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000482811418744495",
                                                  "kilometers": "72228",
                                                  "lunar": "0.19"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          },
          {
                    "id": "2013XS21",
                    "name": "2013 XS21",
                    "full_name": "(2013 XS21)",
                    "is_potentially_hazardous_asteroid": false,
                    "absolute_magnitude_h": 29.4,
                    "estimated_diameter": {
                              "kilometers": {
                                        "estimated_diameter_min": 1.0681,
                                        "estimated_diameter_max": 1.9837
                              }
                    },
                    "orbital_data": {
                              "orbit_id": "5",
                              "epoch_osculation": 2461000.5,
                              "eccentricity": ".4942735089756558",
                              "semi_major_axis": "1.913801759070164",
                              "inclination": "3.079390740299337",
                              "ascending_node_longitude": "80.37574665513719",
                              "perihelion_argument": "341.191450516146",
                              "mean_anomaly": "188.7368556940457",
                              "mean_motion": ".3722705232872536",
                              "orbit_class": {
                                        "orbit_class_type": "APO"
                              }
                    },
                    "close_approach_data": [
                              {
                                        "close_approach_date": "2013-12-11",
                                        "close_approach_date_full": "2013-12-11T23:26:00.000Z",
                                        "relative_velocity": {
                                                  "kilometers_per_second": "8.26368062231149",
                                                  "kilometers_per_hour": "29749"
                                        },
                                        "miss_distance": {
                                                  "astronomical": "0.000484677112885269",
                                                  "kilometers": "72507",
                                                  "lunar": "0.19"
                                        },
                                        "orbiting_body": "Earth"
                              }
                    ]
          }
]
            };
            
            console.log('📦 Datos cargados:', data);
            
            console.log('📦 Datos cargados:', data);
            
            if (!data.asteroids || data.asteroids.length === 0) {
                throw new Error('No se encontraron asteroides en los datos');
            }
            
            // Limpiar asteroides existentes
            this.clearAsteroids();
            
            let loaded = 0;
            
            for (const asteroidData of data.asteroids) {
                try {
                    console.log(`🔍 Intentando crear asteroide: ${asteroidData.name}`, asteroidData);
                    
                    // Usar el simulador para crear el asteroide (mismo patrón que loadFromCSV)
                    const asteroidFormatted = this.simulator.loadNASAData(asteroidData);
                    console.log(`📦 Resultado loadNASAData:`, asteroidFormatted);
                    
                    if (asteroidFormatted) {
                        // Añadir a la lista de asteroides
                        this.asteroids.push(asteroidFormatted);
                        
                        // Crear la visualización 3D (mesh)
                        this.createAsteroidVisualization(asteroidFormatted);
                        
                        loaded++;
                        
                        console.log(`✅ ${asteroidData.name}: Acercamiento ${asteroidData.close_approach_data[0]?.close_approach_date} a ${(asteroidData.close_approach_data[0]?.miss_distance.kilometers / 1000000).toFixed(2)}M km`);
                    } else {
                        console.warn(`⚠️ ${asteroidData.name}: loadNASAData devolvió null`);
                    }
                } catch (err) {
                    console.error(`❌ Error cargando ${asteroidData.name}:`, err);
                }
            }
            
            // Actualizar contadores UI
            const totalElement = document.getElementById('total-asteroids');
            const hazardousElement = document.getElementById('hazardous-count');
            
            if (totalElement) {
                totalElement.textContent = loaded;
            }
            
            if (hazardousElement) {
                // Contar asteroides potencialmente peligrosos
                const hazardousCount = this.asteroids.filter(a => a.isPotentiallyHazardous).length;
                hazardousElement.textContent = hazardousCount;
            }
            
            // ¡IMPORTANTE! Actualizar lista de asteroides en el sidebar
            this.updateAsteroidList();
            
            // Activar controles
            const asteroidControl = document.getElementById('asteroid-limit-control');
            const searchControl = document.getElementById('asteroid-search-control');
            const slider = document.getElementById('asteroid-limit-slider');
            const searchInput = document.getElementById('asteroid-search-input');
            const limitValue = document.getElementById('asteroid-limit-value');
            const sliderMax = document.getElementById('slider-max');
            
            if (slider) {
                slider.max = loaded;
                slider.value = loaded;
                slider.disabled = false;
            }
            
            if (limitValue) {
                limitValue.textContent = loaded;
            }
            
            if (sliderMax) {
                sliderMax.textContent = loaded;
            }
            
            if (asteroidControl) {
                asteroidControl.style.opacity = '1';
                asteroidControl.style.pointerEvents = 'auto';
            }
            
            if (searchControl) {
                searchControl.style.opacity = '1';
                searchControl.style.pointerEvents = 'auto';
            }
            
            if (searchInput) {
                searchInput.disabled = false;
            }
            
            // Seleccionar el primer asteroide (2025 SY10 con acercamiento HOY)
            if (this.asteroids.length > 0) {
                // Asegurarse de que las órbitas sean visibles
                this.showOrbits = true;
                this.orbitLines.forEach(orbitLine => {
                    orbitLine.visible = true;
                });
                
                console.log(`🎨 Órbitas visibles: ${this.orbitLines.size} órbitas creadas`);
                console.log(`📷 Posición cámara antes: (${this.camera.position.x}, ${this.camera.position.y}, ${this.camera.position.z})`);
                console.log(`🌍 Escala de visualización: ${this.scale}`);
                console.log(`   (1 AU = ${149597870.7 * this.scale} unidades THREE.js)`);
                
                // Ajustar cámara para ver todo el sistema solar interior
                // Con escala 0.000001, 1 AU ≈ 150 unidades
                // Necesitamos ver órbitas de ~1-2 AU, así que cámara a ~400-500 unidades
                this.camera.position.set(600, 400, 600);
                this.camera.lookAt(0, 0, 0);
                
                console.log(`📷 Posición cámara después: (${this.camera.position.x}, ${this.camera.position.y}, ${this.camera.position.z})`);
                
                // Seleccionar el primer asteroide para mostrar detalles
                // Pero mantener la cámara alejada para ver el sistema completo
                const firstAsteroidLoaded = this.asteroids[0];
                if (firstAsteroidLoaded) {
                    this.selectedAsteroid = firstAsteroidLoaded;
                    this.cameraFollowMode = false; // NO seguir con la cámara
                    
                    // Mostrar detalles del asteroide seleccionado
                    this.selectAsteroid(firstAsteroidLoaded);
                    
                    // RESTAURAR posición de cámara (selectAsteroid la mueve)
                    this.camera.position.set(600, 400, 600);
                    this.camera.lookAt(0, 0, 0);
                    this.cameraFollowMode = false; // Asegurar que esté en false
                }
                
                // Saltar a la fecha de acercamiento del primer asteroide
                const firstAsteroid = data.asteroids[0];
                if (firstAsteroid.close_approach_data && firstAsteroid.close_approach_data[0]) {
                    const approachDate = new Date(firstAsteroid.close_approach_data[0].close_approach_date_full);
                    console.log(`🗓️ Saltando a fecha de acercamiento: ${approachDate.toLocaleString()}`);
                    this.jumpToDate(approachDate);
                }
            }
            
            
            // 🎯 MOSTRAR BOTÓN DE PLAY con información de asteroides cargados
            setTimeout(() => {
                console.log('▶️ Mostrando botón de Play con info de 200 asteroides...');
                this.showPlayButton();
                console.log('✅ 200 asteroides cargados, esperando que usuario presione Play');
            }, 300);
            
        } catch (error) {
            console.error('❌ Error cargando asteroides verificados:', error);
            alert(`Error al cargar asteroides verificados: ${error.message}`);
        }
    }

    /**
     * Convierte datos CSV en objeto de asteroide compatible
     */
    createAsteroidFromCSV(csvData) {
        // Convertir a números primero
        const e = parseFloat(csvData.e);
        const a = parseFloat(csvData.a);
        const i = parseFloat(csvData.i);
        const om = parseFloat(csvData.om);
        const w = parseFloat(csvData.w);
        const ma = parseFloat(csvData.ma);
        
        // Validar elementos orbitales requeridos (deben ser números válidos)
        if (isNaN(e) || isNaN(a) || isNaN(i) || isNaN(om) || isNaN(w) || isNaN(ma)) {
            console.warn(`⚠️ ${csvData.full_name}: Elementos orbitales incompletos`, {
                e: csvData.e, a: csvData.a, i: csvData.i, 
                om: csvData.om, w: csvData.w, ma: csvData.ma
            });
            return null;
        }

        // Convertir epoch de Julian Date a formato ISO
        const epoch = csvData.epoch ? this.julianToDate(parseFloat(csvData.epoch)) : new Date().toISOString().split('T')[0];

        return {
            id: csvData.spkid,
            neo_reference_id: csvData.spkid,
            name: csvData.full_name ? csvData.full_name.trim() : `Asteroid ${csvData.spkid}`,
            
            // Datos de clasificación
            is_potentially_hazardous_asteroid: csvData.pha === 'Y',
            is_sentry_object: false,
            
            // Magnitud absoluta
            absolute_magnitude_h: parseFloat(csvData.H) || 20,
            
            // Diámetro estimado
            estimated_diameter: {
                kilometers: {
                    estimated_diameter_min: parseFloat(csvData.diameter) || 0.5,
                    estimated_diameter_max: parseFloat(csvData.diameter) * 1.2 || 0.6
                }
            },
            
            // Elementos orbitales (completos desde CSV)
            orbital_data: {
                orbit_id: csvData.orbit_id || '0',
                orbit_determination_date: epoch,
                
                // Los 6 elementos keplerianos (usar las variables parseadas)
                eccentricity: e,
                semi_major_axis: a, // Ya está en AU
                inclination: i,
                ascending_node_longitude: om,
                perihelion_argument: w,
                mean_anomaly: ma,
                
                // Datos adicionales
                mean_motion: parseFloat(csvData.n) || null,
                perihelion_distance: parseFloat(csvData.q) || null,
                aphelion_distance: parseFloat(csvData.ad) || null,
                orbital_period: parseFloat(csvData.per_y) * 365.25 || null, // Convertir años a días
                
                perihelion_time: csvData.tp ? parseFloat(csvData.tp) : null,
                
                // ✅ CORRECCIÓN: Usar epoch en JD, no epoch_mjd sin convertir
                // El simulador espera Julian Date, no Modified Julian Date
                epoch_osculation: parseFloat(csvData.epoch), // Ya está en JD
                
                // Clase orbital (requerido por TrajectorySimulator)
                orbit_class: {
                    orbit_class_type: csvData.class || 'Unknown'
                }
            },
            
            // Close approach (usar MOID como referencia)
            close_approach_data: csvData.moid ? [{
                close_approach_date: epoch,
                close_approach_date_full: epoch + 'T00:00:00.000Z',
                orbiting_body: 'Earth',
                miss_distance: {
                    astronomical: parseFloat(csvData.moid),
                    kilometers: parseFloat(csvData.moid) * 149597870.7
                },
                relative_velocity: {
                    kilometers_per_second: "0"
                }
            }] : [],
            
            // Datos físicos adicionales del CSV
            physical_data: {
                albedo: parseFloat(csvData.albedo) || null,
                diameter_km: parseFloat(csvData.diameter) || null,
                spectral_type: csvData.spec_B || csvData.spec_T || null,
                rotation_period: parseFloat(csvData.rot_per) || null,
                extent: csvData.extent || null
            },
            
            // Datos de observación
            observation_data: {
                condition_code: parseInt(csvData.condition_code) || null,
                data_arc_days: parseInt(csvData.data_arc) || null,
                first_observation: csvData.first_obs || null,
                last_observation: csvData.last_obs || null,
                observations_used: parseInt(csvData.n_obs_used) || null
            }
        };
    }

    /**
     * Convierte Julian Date a fecha ISO
     */
    julianToDate(jd) {
        const unixTime = (jd - 2440587.5) * 86400000;
        const date = new Date(unixTime);
        return date.toISOString().split('T')[0];
    }

    /**
     * Limpia todos los asteroides de la escena
     */
    clearAllAsteroids() {
        // Remover meshes de la escena
        this.asteroidMeshes.forEach(data => {
            this.scene.remove(data.mesh);
        });
        
        // Remover órbitas
        this.orbitLines.forEach(line => {
            this.scene.remove(line);
        });
        
        // Limpiar colecciones
        this.asteroids = [];
        this.asteroidMeshes.clear();
        this.orbitLines.clear();
        this.selectedAsteroid = null;
    }
}

// Exportar para uso como módulo ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AsteroidVisualizer;
}
