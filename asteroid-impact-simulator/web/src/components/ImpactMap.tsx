import { useEffect, useRef, useState } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';

export default function ImpactMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const { impactLocation, setImpactLocation } = useSimulationStore();
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    // This is a placeholder - actual Leaflet implementation would go here
    setMapReady(true);
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to lat/lon (simplified)
    const lon = (x / rect.width) * 360 - 180;
    const lat = 90 - (y / rect.height) * 180;

    setImpactLocation({ lat, lon });
  };

  return (
    <div className="relative">
      <div
        ref={mapRef}
        onClick={handleClick}
        className="w-full h-[500px] bg-gradient-to-br from-blue-900/30 to-green-900/30 rounded-lg border border-white/10 cursor-crosshair overflow-hidden"
        style={{
          backgroundImage: 'url(https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/-74.5,40,3/800x500?access_token=pk.YOUR_TOKEN_HERE)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {impactLocation && (
          <div
            className="absolute w-8 h-8 -ml-4 -mt-4 pointer-events-none"
            style={{
              left: `${((impactLocation.lon + 180) / 360) * 100}%`,
              top: `${((90 - impactLocation.lat) / 180) * 100}%`,
            }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
              <div className="absolute inset-0 bg-red-600 rounded-full" />
              <div className="absolute inset-0 flex items-center justify-center text-xl">
                💥
              </div>
            </div>
          </div>
        )}

        {!impactLocation && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-4xl mb-2">🎯</div>
              <p className="text-lg font-semibold">Click to select impact location</p>
              <p className="text-sm text-white/70 mt-1">Choose any point on Earth</p>
            </div>
          </div>
        )}
      </div>

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
        </div>
      )}

      <div className="mt-2 text-xs text-white/50 text-center">
        💡 Tip: Leaflet/Mapbox integration will provide detailed geographical data
      </div>
    </div>
  );
}
