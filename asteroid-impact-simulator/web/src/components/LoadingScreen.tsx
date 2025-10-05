export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="card text-center">
        <div className="text-6xl animate-spin-slow mb-4">☄️</div>
        <h2 className="text-2xl font-bold mb-2">Calculating Impact...</h2>
        <p className="text-white/70">Running physics simulations</p>
        <div className="mt-4 flex gap-2 justify-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
