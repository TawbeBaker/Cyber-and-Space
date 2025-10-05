export default function Globe3D() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-space-900 to-space-950 rounded-lg">
      <div className="text-center">
        <div className="text-8xl mb-4 animate-spin-slow">🌍</div>
        <h3 className="text-2xl font-bold mb-2">3D Globe Visualization</h3>
        <p className="text-white/70 mb-4">
          Interactive Earth visualization with Three.js
        </p>
        <p className="text-sm text-white/50">
          Select impact location on the map or use the parameter panel
        </p>
      </div>
    </div>
  );
}
