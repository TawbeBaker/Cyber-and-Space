import { useState, useEffect } from 'react';

interface CollisionCountdownProps {
  targetDate: Date;
  currentTime: Date;
  onImpact?: () => void;
}

/**
 * Dramatic collision countdown timer
 * From Luis's asteroid visualizer
 */
export default function CollisionCountdown({
  targetDate,
  currentTime,
  onImpact,
}: CollisionCountdownProps) {
  const [countdown, setCountdown] = useState('');
  const [hasImpacted, setHasImpacted] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const diff = targetDate.getTime() - currentTime.getTime();

      if (diff < 0 && !hasImpacted) {
        setCountdown('IMPACT OCCURRED');
        setHasImpacted(true);
        onImpact?.();
        return;
      }

      if (diff < 0) return;

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
  }, [targetDate, currentTime, hasImpacted, onImpact]);

  return (
    <div className="p-4 bg-red-900/20 border border-red-500/40 rounded-lg">
      <div className="text-xs text-gray-400 mb-1">⏱️ Time Until Impact:</div>
      <div
        className={`text-2xl font-bold font-mono ${
          hasImpacted ? 'text-red-500 animate-pulse' : 'text-red-400'
        }`}
      >
        {countdown}
      </div>
    </div>
  );
}
