import { useState, useEffect } from 'react';
import { ProcessedAsteroid } from '../services/nasaDataLoader';

interface AsteroidSelectorProps {
  asteroids: ProcessedAsteroid[];
  selectedAsteroid: ProcessedAsteroid | null;
  onSelectAsteroid: (asteroid: ProcessedAsteroid | null) => void;
  displayLimit: number;
  onDisplayLimitChange: (limit: number) => void;
}

/**
 * Asteroid selection panel with filtering controls
 * From Luis's visualizer - shows 10-200 closest asteroids
 */
export default function AsteroidSelector({
  asteroids,
  selectedAsteroid,
  onSelectAsteroid,
  displayLimit,
  onDisplayLimitChange,
}: AsteroidSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showHazardousOnly, setShowHazardousOnly] = useState(false);
  const [filteredAsteroids, setFilteredAsteroids] = useState<ProcessedAsteroid[]>([]);

  // Apply filters
  useEffect(() => {
    let filtered = asteroids.slice(0, displayLimit);

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.id.toLowerCase().includes(query) ||
          a.fullName.toLowerCase().includes(query)
      );
    }

    // Hazardous filter
    if (showHazardousOnly) {
      filtered = filtered.filter((a) => a.isHazardous);
    }

    setFilteredAsteroids(filtered);
  }, [asteroids, displayLimit, searchQuery, showHazardousOnly]);

  const formatDistance = (km: number) => {
    if (km < 1000) return `${km.toFixed(0)} km`;
    if (km < 1000000) return `${(km / 1000).toFixed(1)}k km`;
    const AU = 149597870.7;
    return `${(km / AU).toFixed(4)} AU`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-cyan-300">
          🌌 200 Closest Asteroids (NASA Data)
        </h3>
        {selectedAsteroid && (
          <button
            onClick={() => onSelectAsteroid(null)}
            className="text-xs px-3 py-1 bg-red-500/20 border border-red-500/40 rounded text-red-300 hover:bg-red-500/30"
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Display Limit Slider */}
      <div className="p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
        <label className="block text-sm font-medium text-purple-300 mb-2">
          Display {displayLimit} closest asteroids
        </label>
        <input
          type="range"
          min="10"
          max="200"
          step="10"
          value={displayLimit}
          onChange={(e) => onDisplayLimitChange(parseInt(e.target.value))}
          className="w-full cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>10</span>
          <span>50</span>
          <span>100</span>
          <span>150</span>
          <span>200</span>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-cyan-500/30 rounded text-white text-sm"
          />
        </div>
        <div>
          <label className="flex items-center gap-2 px-3 py-2 bg-orange-900/20 border border-orange-500/30 rounded cursor-pointer hover:bg-orange-900/30">
            <input
              type="checkbox"
              checked={showHazardousOnly}
              onChange={(e) => setShowHazardousOnly(e.target.checked)}
              className="cursor-pointer"
            />
            <span className="text-sm text-orange-300">⚠️ Hazardous only</span>
          </label>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="p-2 bg-blue-900/20 border border-blue-500/30 rounded">
          <div className="text-gray-400">Showing</div>
          <div className="text-blue-300 font-bold">{filteredAsteroids.length}</div>
        </div>
        <div className="p-2 bg-orange-900/20 border border-orange-500/30 rounded">
          <div className="text-gray-400">Hazardous</div>
          <div className="text-orange-300 font-bold">
            {filteredAsteroids.filter((a) => a.isHazardous).length}
          </div>
        </div>
        <div className="p-2 bg-green-900/20 border border-green-500/30 rounded">
          <div className="text-gray-400">Selected</div>
          <div className="text-green-300 font-bold">{selectedAsteroid ? '1' : '0'}</div>
        </div>
      </div>

      {/* Asteroid List */}
      <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
        {filteredAsteroids.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No asteroids match your filters
          </div>
        ) : (
          filteredAsteroids.map((asteroid) => (
            <button
              key={asteroid.id}
              onClick={() => onSelectAsteroid(asteroid)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                selectedAsteroid?.id === asteroid.id
                  ? 'bg-cyan-500/20 border-cyan-500/50 shadow-lg shadow-cyan-500/20'
                  : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/50 hover:border-cyan-500/30'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white truncate">{asteroid.name}</span>
                    {asteroid.isHazardous && (
                      <span className="text-xs px-1.5 py-0.5 bg-orange-500/20 border border-orange-500/40 rounded text-orange-300">
                        ⚠️
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Closest: {formatDistance(asteroid.closestDistance)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {asteroid.closeApproaches[0] && formatDate(asteroid.closeApproaches[0].date)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-purple-300">{asteroid.orbitClass}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    ⌀ {asteroid.diameter.avg.toFixed(2)} km
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Selected Asteroid Details */}
      {selectedAsteroid && (
        <div className="p-4 bg-cyan-900/20 border border-cyan-500/40 rounded-lg">
          <h4 className="font-bold text-cyan-300 mb-3">📊 {selectedAsteroid.name} Details</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-400">Orbit Class:</span>
              <div className="text-white font-semibold">{selectedAsteroid.orbitClass}</div>
            </div>
            <div>
              <span className="text-gray-400">Diameter:</span>
              <div className="text-white font-semibold">
                {selectedAsteroid.diameter.min.toFixed(2)}-{selectedAsteroid.diameter.max.toFixed(2)} km
              </div>
            </div>
            <div>
              <span className="text-gray-400">Eccentricity:</span>
              <div className="text-white font-semibold">{selectedAsteroid.elements.e.toFixed(4)}</div>
            </div>
            <div>
              <span className="text-gray-400">Semi-major axis:</span>
              <div className="text-white font-semibold">
                {(selectedAsteroid.elements.a / 149597870.7).toFixed(3)} AU
              </div>
            </div>
            <div>
              <span className="text-gray-400">Inclination:</span>
              <div className="text-white font-semibold">
                {((selectedAsteroid.elements.i * 180) / Math.PI).toFixed(2)}°
              </div>
            </div>
            <div>
              <span className="text-gray-400">Close Approaches:</span>
              <div className="text-white font-semibold">
                {selectedAsteroid.closeApproaches.length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
