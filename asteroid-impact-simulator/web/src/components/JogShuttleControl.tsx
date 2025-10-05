import { useState, useEffect, useRef } from 'react';

interface JogShuttleControlProps {
  onSpeedChange: (speed: number, direction: number) => void;
  normalSpeed?: number;
}

/**
 * Professional jog/shuttle time control component
 * Inspired by video editing shuttle controls
 * From Luis's asteroid visualizer
 */
export default function JogShuttleControl({
  onSpeedChange,
  normalSpeed = 1,
}: JogShuttleControlProps) {
  const [jogValue, setJogValue] = useState(0);
  const [status, setStatus] = useState('Center - Normal Speed');
  const [statusColor, setStatusColor] = useState('#4a90e2');
  const returnIntervalRef = useRef<number | null>(null);

  // Handle slider change
  const handleJogChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setJogValue(value);

    // Clear auto-return interval
    if (returnIntervalRef.current) {
      clearInterval(returnIntervalRef.current);
      returnIntervalRef.current = null;
    }

    // Update status and speed
    if (value === 0) {
      setStatus('Center - Normal Speed');
      setStatusColor('#4a90e2');
      onSpeedChange(normalSpeed, 1);
    } else if (value < 0) {
      const speed = Math.abs(value);
      setStatus(`⏪ Rewinding ${speed}%`);
      setStatusColor('#e74c3c');
      onSpeedChange(normalSpeed * (1 + speed / 10), -1);
    } else {
      setStatus(`⏩ Fast Forward ${value}%`);
      setStatusColor('#2ecc71');
      onSpeedChange(normalSpeed * (1 + value / 10), 1);
    }
  };

  // Auto-return to center when released
  const startAutoReturn = () => {
    returnIntervalRef.current = setInterval(() => {
      setJogValue((current) => {
        if (current === 0) {
          if (returnIntervalRef.current) {
            clearInterval(returnIntervalRef.current);
            returnIntervalRef.current = null;
          }
          return 0;
        }

        // Gradually return to center
        const step = Math.sign(current) * -5;
        let newValue = current + step;

        // Prevent overshooting
        if (Math.sign(newValue) !== Math.sign(current)) {
          newValue = 0;
        }

        return newValue;
      });
    }, 50);
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (returnIntervalRef.current) {
        clearInterval(returnIntervalRef.current);
      }
    };
  }, []);

  // Update parent when jogValue changes
  useEffect(() => {
    if (jogValue === 0) {
      setStatus('Center - Normal Speed');
      setStatusColor('#4a90e2');
      onSpeedChange(normalSpeed, 1);
    } else if (jogValue < 0) {
      const speed = Math.abs(jogValue);
      setStatus(`⏪ Rewinding ${speed}%`);
      setStatusColor('#e74c3c');
      onSpeedChange(normalSpeed * (1 + speed / 10), -1);
    } else {
      setStatus(`⏩ Fast Forward ${jogValue}%`);
      setStatusColor('#2ecc71');
      onSpeedChange(normalSpeed * (1 + jogValue / 10), 1);
    }
  }, [jogValue, normalSpeed, onSpeedChange]);

  return (
    <div className="mb-4 p-4 bg-gray-800/50 border border-cyan-500/30 rounded-lg">
      <h3 className="text-sm font-bold text-cyan-300 mb-2">🎮 Jog/Shuttle Time Control</h3>
      <input
        type="range"
        min="-100"
        max="100"
        value={jogValue}
        step="1"
        onChange={handleJogChange}
        onMouseUp={startAutoReturn}
        onTouchEnd={startAutoReturn}
        className="w-full cursor-pointer"
        style={{
          background: `linear-gradient(to right, #e74c3c 0%, #4a90e2 50%, #2ecc71 100%)`,
        }}
      />
      <div
        className="text-center text-sm font-bold mt-2"
        style={{ color: statusColor }}
      >
        {status}
      </div>
    </div>
  );
}
