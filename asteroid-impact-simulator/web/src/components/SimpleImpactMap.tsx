import { useRef, useEffect, useState } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';

export default function SimpleImpactMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { impactLocation, setImpactLocation, simulationResult } = useSimulationStore();

  // World map image (Blue Marble de la NASA)
  const mapImageUrl = 'https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = 500;
    }

    // Load and draw world map
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setImageLoaded(true);
      drawImpactPoint();
    };
    img.onerror = () => {
      // Fallback: draw simple world outline
      drawSimpleMap(ctx, canvas.width, canvas.height);
      setImageLoaded(true);
      drawImpactPoint();
    };
    img.src = mapImageUrl;
  }, []);

  useEffect(() => {
    if (imageLoaded) {
      drawImpactPoint();
    }
  }, [impactLocation, simulationResult, imageLoaded]);

  const drawSimpleMap = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Draw ocean
    ctx.fillStyle = '#1a3a52';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#2a4a62';
    ctx.lineWidth = 1;

    // Latitude lines
    for (let i = 0; i <= 180; i += 30) {
      const y = (i / 180) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Longitude lines
    for (let i = 0; i <= 360; i += 30) {
      const x = (i / 360) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw continents (simplified)
    ctx.fillStyle = '#2d5016';
    ctx.strokeStyle = '#3d6026';
    ctx.lineWidth = 2;

    // North America
    drawContinent(ctx, width, height, [
      [-130, 60], [-120, 70], [-100, 70], [-80, 60], [-75, 50], [-80, 40], [-100, 30], [-110, 20], [-120, 30], [-130, 40]
    ]);

    // South America
    drawContinent(ctx, width, height, [
      [-80, 10], [-70, 0], [-50, -10], [-40, -30], [-50, -50], [-70, -40], [-80, -20]
    ]);

    // Europe
    drawContinent(ctx, width, height, [
      [-10, 60], [0, 70], [20, 70], [30, 60], [40, 50], [20, 40], [0, 50], [-10, 55]
    ]);

    // Africa
    drawContinent(ctx, width, height, [
      [-15, 35], [0, 30], [20, 20], [40, 10], [50, -10], [40, -30], [20, -35], [10, -30], [0, -10], [-10, 10]
    ]);

    // Asia
    drawContinent(ctx, width, height, [
      [40, 60], [60, 70], [100, 70], [140, 60], [150, 40], [140, 20], [100, 10], [80, 20], [60, 30], [40, 40]
    ]);

    // Australia
    drawContinent(ctx, width, height, [
      [115, -10], [140, -12], [150, -25], [145, -40], [135, -35], [115, -30]
    ]);
  };

  const drawContinent = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    coords: number[][]
  ) => {
    ctx.beginPath();
    coords.forEach(([lon, lat], i) => {
      const x = ((lon + 180) / 360) * width;
      const y = ((90 - lat) / 180) * height;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  const drawImpactPoint = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Redraw map first
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      drawMarkersAndZones(ctx);
    };
    img.onerror = () => {
      drawSimpleMap(ctx, canvas.width, canvas.height);
      drawMarkersAndZones(ctx);
    };
    img.src = mapImageUrl;
  };

  const drawMarkersAndZones = (ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas || !impactLocation) return;

    const x = ((impactLocation.lon + 180) / 360) * canvas.width;
    const y = ((90 - impactLocation.lat) / 180) * canvas.height;

    // Draw blast zones if simulation exists
    if (simulationResult) {
      const zones = [
        { radius: simulationResult.blast.radiationRadius, color: 'rgba(0, 255, 0, 0.15)' },
        { radius: simulationResult.blast.airblastRadius, color: 'rgba(255, 204, 0, 0.2)' },
        { radius: simulationResult.blast.thermalRadius, color: 'rgba(255, 102, 0, 0.3)' },
        { radius: simulationResult.blast.fireball, color: 'rgba(255, 0, 0, 0.5)' },
      ];

      // Convert meters to pixels (approximate)
      const metersPerPixel = (40075000 / canvas.width); // Earth circumference / canvas width

      zones.forEach(zone => {
        const pixelRadius = zone.radius / metersPerPixel;
        ctx.fillStyle = zone.color;
        ctx.strokeStyle = zone.color.replace(/[\d.]+\)$/, '0.8)');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, pixelRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }

    // Draw impact marker
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;

    // Crosshair
    ctx.beginPath();
    ctx.moveTo(x - 15, y);
    ctx.lineTo(x + 15, y);
    ctx.moveTo(x, y - 15);
    ctx.lineTo(x, y + 15);
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pulsing ring
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.stroke();
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to lat/lon
    const lon = (x / canvas.width) * 360 - 180;
    const lat = 90 - (y / canvas.height) * 180;

    setImpactLocation({ lat, lon });
  };

  return (
    <div className="relative" ref={containerRef}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full rounded-lg border border-white/10 cursor-crosshair bg-gradient-to-br from-blue-900/30 to-green-900/30"
        style={{ height: '500px' }}
      />

      {!impactLocation && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-lg pointer-events-none">
          <div className="text-center text-white">
            <div className="text-4xl mb-2">🎯</div>
            <p className="text-lg font-semibold">Click anywhere on the map</p>
            <p className="text-sm text-white/70 mt-1">Select asteroid impact location</p>
          </div>
        </div>
      )}

      {impactLocation && (
        <div className="mt-4 p-4 bg-white/5 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-white/60">Latitude:</span>
              <span className="ml-2 font-semibold">{impactLocation.lat.toFixed(4)}°</span>
            </div>
            <div>
              <span className="text-white/60">Longitude:</span>
              <span className="ml-2 font-semibold">{impactLocation.lon.toFixed(4)}°</span>
            </div>
          </div>

          {simulationResult && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="text-xs text-white/70 mb-2">Blast Zones:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>Fireball: {(simulationResult.blast.fireball / 1000).toFixed(1)} km</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span>Thermal: {(simulationResult.blast.thermalRadius / 1000).toFixed(1)} km</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span>Air Blast: {(simulationResult.blast.airblastRadius / 1000).toFixed(1)} km</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>Radiation: {(simulationResult.blast.radiationRadius / 1000).toFixed(1)} km</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-2 text-xs text-white/50 text-center">
        🌍 Click anywhere on Earth to select impact point
      </div>
    </div>
  );
}
