import { useSimulationStore } from '../store/useSimulationStore';

export default function ErrorBanner({ message }: { message: string }) {
  const { setError } = useSimulationStore();

  return (
    <div className="container mx-auto px-4 py-4">
      <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-semibold text-red-300">Error</h3>
            <p className="text-sm text-white/80">{message}</p>
          </div>
        </div>
        <button
          onClick={() => setError(null)}
          className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded transition-all"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
