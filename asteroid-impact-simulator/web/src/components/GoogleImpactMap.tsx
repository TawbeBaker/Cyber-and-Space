import { useEffect, useState } from 'react';
import { APIProvider, Map, Marker, Circle } from '@vis.gl/react-google-maps';
import { useSimulationStore } from '../store/useSimulationStore';

// Clé API Google Maps - à remplacer par votre clé
// Obtenir une clé gratuite: https://console.cloud.google.com/google/maps-apis
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBVYoUBjSTMM9N8xOchjhB-_VaKVsO_wBk';

export default function GoogleImpactMap() {
  const { impactLocation, setImpactLocation, simulationResult } = useSimulationStore();
  const [mapCenter, setMapCenter] = useState({ lat: 20, lng: 0 });
  const [zoom, setZoom] = useState(2);

  useEffect(() => {
    if (impactLocation) {
      setMapCenter({ lat: impactLocation.lat, lng: impactLocation.lon });
      setZoom(8);
    }
  }, [impactLocation]);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setImpactLocation({
        lat: e.latLng.lat(),
        lon: e.latLng.lng(),
      });
    }
  };

  return (
    <div className="relative">
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <div className="w-full h-[500px] rounded-lg overflow-hidden border border-white/10">
          <Map
            center={mapCenter}
            zoom={zoom}
            mapId="asteroid-impact-map"
            onClick={handleMapClick}
            disableDefaultUI={false}
            gestureHandling="greedy"
            mapTypeId="hybrid" // Vue satellite avec routes
          >
            {/* Impact Marker */}
            {impactLocation && (
              <Marker
                position={{ lat: impactLocation.lat, lng: impactLocation.lon }}
                title={`Impact Point: ${impactLocation.lat.toFixed(4)}°, ${impactLocation.lon.toFixed(4)}°`}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 12,
                  fillColor: '#ef4444',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 3,
                }}
              />
            )}

            {/* Blast Zones */}
            {impactLocation && simulationResult && (
              <>
                {/* Radiation Zone (green) */}
                <Circle
                  center={{ lat: impactLocation.lat, lng: impactLocation.lon }}
                  radius={simulationResult.blast.radiationRadius}
                  options={{
                    fillColor: '#10b981',
                    fillOpacity: 0.15,
                    strokeColor: '#10b981',
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                  }}
                />

                {/* Air Blast Zone (yellow) */}
                <Circle
                  center={{ lat: impactLocation.lat, lng: impactLocation.lon }}
                  radius={simulationResult.blast.airblastRadius}
                  options={{
                    fillColor: '#fbbf24',
                    fillOpacity: 0.2,
                    strokeColor: '#fbbf24',
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                  }}
                />

                {/* Thermal Radiation Zone (orange) */}
                <Circle
                  center={{ lat: impactLocation.lat, lng: impactLocation.lon }}
                  radius={simulationResult.blast.thermalRadius}
                  options={{
                    fillColor: '#f97316',
                    fillOpacity: 0.3,
                    strokeColor: '#f97316',
                    strokeOpacity: 0.9,
                    strokeWeight: 2,
                  }}
                />

                {/* Fireball Zone (red) */}
                <Circle
                  center={{ lat: impactLocation.lat, lng: impactLocation.lon }}
                  radius={simulationResult.blast.fireball}
                  options={{
                    fillColor: '#ef4444',
                    fillOpacity: 0.5,
                    strokeColor: '#dc2626',
                    strokeOpacity: 1,
                    strokeWeight: 3,
                  }}
                />
              </>
            )}
          </Map>
        </div>
      </APIProvider>

      {/* Instructions Overlay */}
      {!impactLocation && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-lg pointer-events-none z-10">
          <div className="text-center text-white">
            <div className="text-4xl mb-2">🎯</div>
            <p className="text-lg font-semibold">Click anywhere on the map</p>
            <p className="text-sm text-white/70 mt-1">Select asteroid impact location</p>
          </div>
        </div>
      )}

      {/* Info Panel */}
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
        🌍 Google Maps - Satellite view with real geographical data
      </div>
    </div>
  );
}
