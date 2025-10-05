import React, { useState } from 'react';

interface TooltipData {
  id: string;
  title: string;
  content: string;
  category: 'physics' | 'impact' | 'mitigation' | 'astronomy';
}

const EDUCATIONAL_CONTENT: TooltipData[] = [
  {
    id: 'kinetic-energy',
    title: 'Kinetic Energy',
    content: 'Impact energy equals ½mv², where mass depends on asteroid size and density. A 100m stony asteroid at 20 km/s releases energy equivalent to a 50 megaton nuclear weapon.',
    category: 'physics'
  },
  {
    id: 'crater-formation',
    title: 'Crater Formation',
    content: 'Impact craters form in milliseconds. The transient crater expands to 10-20x the asteroid diameter, then partially collapses. Final diameter depends on impact energy, angle, and target material.',
    category: 'impact'
  },
  {
    id: 'fireball',
    title: 'Fireball Zone',
    content: 'The fireball is a sphere of superheated air and vaporized material reaching 10,000°C. Everything within this zone is instantly vaporized. Radius: ~60 × (megatons)^0.4 meters.',
    category: 'impact'
  },
  {
    id: 'thermal-radiation',
    title: 'Thermal Radiation',
    content: 'Intense heat flash causes third-degree burns and ignites flammable materials. This is often the most lethal effect for airbursts. The 2013 Chelyabinsk meteor injured 1,500 people primarily from thermal radiation.',
    category: 'impact'
  },
  {
    id: 'air-blast',
    title: 'Air Blast (Overpressure)',
    content: 'Shock wave traveling at supersonic speed. 20 psi overpressure destroys reinforced concrete buildings. 5 psi breaks windows and causes injuries. Most historical damage comes from air blast.',
    category: 'impact'
  },
  {
    id: 'seismic-effects',
    title: 'Seismic Effects',
    content: 'Large impacts generate earthquakes. Energy converts to seismic waves propagating through Earth\'s crust. A 1 km asteroid creates magnitude 7+ earthquake, felt globally.',
    category: 'impact'
  },
  {
    id: 'tunguska',
    title: 'Tunguska Event (1908)',
    content: 'A ~50m asteroid airburst over Siberia flattened 2,000 km² of forest. No crater formed because the asteroid exploded 5-10 km above ground. Equivalent to 10-15 megatons TNT.',
    category: 'astronomy'
  },
  {
    id: 'chelyabinsk',
    title: 'Chelyabinsk Meteor (2013)',
    content: 'A 20m asteroid entered at 19 km/s over Russia. Airburst at 30 km altitude released 500 kilotons energy. Shockwave broke windows across 6 cities, injuring ~1,500 people.',
    category: 'astronomy'
  },
  {
    id: 'chicxulub',
    title: 'Chicxulub Impact (66 million years ago)',
    content: 'A 10-15 km asteroid struck Mexico\'s Yucatan Peninsula, creating a 180 km crater. Released energy equivalent to 100 million megatons. Caused mass extinction ending the dinosaur era.',
    category: 'astronomy'
  },
  {
    id: 'kinetic-impactor',
    title: 'Kinetic Impactor',
    content: 'Deflection by high-speed collision. NASA\'s DART mission (2022) successfully altered asteroid Dimorphos\' orbit by 33 minutes using a 570 kg spacecraft at 6 km/s.',
    category: 'mitigation'
  },
  {
    id: 'gravity-tractor',
    title: 'Gravity Tractor',
    content: 'A spacecraft hovers near the asteroid for months/years. Mutual gravitational attraction slowly changes the asteroid\'s trajectory. Non-destructive but requires decades of warning time.',
    category: 'mitigation'
  },
  {
    id: 'nuclear-deflection',
    title: 'Nuclear Deflection',
    content: 'Nuclear device detonates near (not on) the asteroid. X-ray burst vaporizes surface material, creating thrust. Last resort for large asteroids with short warning time. Most powerful option but risky.',
    category: 'mitigation'
  },
  {
    id: 'impact-angle',
    title: 'Impact Angle Effects',
    content: 'Vertical impacts (90°) maximize crater depth. Oblique impacts (30-45°) are most common and create elliptical craters. Very shallow angles (<20°) may result in ricochet or airburst.',
    category: 'physics'
  },
  {
    id: 'composition',
    title: 'Asteroid Composition',
    content: 'Stony (92%): silicate rocks, density ~3.3 g/cm³. Iron (5%): nickel-iron, density ~7.8 g/cm³. Carbonaceous (3%): carbon-rich, density ~2.2 g/cm³. Composition affects impact energy and crater size.',
    category: 'astronomy'
  },
  {
    id: 'neo-detection',
    title: 'NEO Detection',
    content: 'NASA tracks ~95% of Near-Earth Objects >1 km. Current surveys find ~30 new NEOs daily. No known asteroids >140m pose impact threat for next 100 years. Smaller objects harder to detect.',
    category: 'astronomy'
  },
  {
    id: 'warning-time',
    title: 'Warning Time Requirements',
    content: 'Deflection success depends on warning time: 50+ years = gravity tractor possible. 10-50 years = kinetic impactor effective. <10 years = nuclear option may be necessary. <1 year = evacuation only.',
    category: 'mitigation'
  }
];

interface EducationalTooltipsProps {
  topic?: string;
  className?: string;
}

export default function EducationalTooltips({ topic, className = '' }: EducationalTooltipsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'All Topics', icon: '📚' },
    { id: 'physics', label: 'Physics', icon: '⚛️' },
    { id: 'impact', label: 'Impact Effects', icon: '💥' },
    { id: 'astronomy', label: 'Astronomy', icon: '🌌' },
    { id: 'mitigation', label: 'Mitigation', icon: '🛡️' }
  ];

  const filteredContent = selectedCategory === 'all'
    ? EDUCATIONAL_CONTENT
    : EDUCATIONAL_CONTENT.filter(item => item.category === selectedCategory);

  return (
    <div className={`card ${className}`}>
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-2">📖 Educational Guide</h3>
        <p className="text-white/70">
          Learn about asteroid impacts, physics, and planetary defense
        </p>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedCategory === cat.id
                ? 'bg-blue-500 text-white'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            <span className="mr-2">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Content grid */}
      <div className="space-y-3">
        {filteredContent.map((item) => (
          <div
            key={item.id}
            className="bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-all"
          >
            <button
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              className="w-full px-4 py-3 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">
                  {item.category === 'physics' && '⚛️'}
                  {item.category === 'impact' && '💥'}
                  {item.category === 'astronomy' && '🌌'}
                  {item.category === 'mitigation' && '🛡️'}
                </span>
                <span className="font-semibold">{item.title}</span>
              </div>
              <span className="text-white/50 text-xl">
                {expandedId === item.id ? '−' : '+'}
              </span>
            </button>

            {expandedId === item.id && (
              <div className="px-4 pb-4 pt-0">
                <p className="text-white/80 text-sm leading-relaxed">
                  {item.content}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick stats */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <h4 className="font-semibold mb-2 text-blue-300">Did you know?</h4>
        <ul className="space-y-1 text-sm text-white/80">
          <li>• Earth is hit by ~100 tons of space debris daily (mostly dust)</li>
          <li>• ~500,000 NEOs exist, only ~30,000 discovered so far</li>
          <li>• Tunguska-size impacts occur every ~100-300 years</li>
          <li>• Dinosaur-killer impacts happen every ~100 million years</li>
        </ul>
      </div>
    </div>
  );
}

// Inline tooltip component for use within other components
export function InlineTooltip({ topic }: { topic: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipData = EDUCATIONAL_CONTENT.find(item => item.id === topic);

  if (!tooltipData) return null;

  return (
    <div className="inline-block relative">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-xs hover:bg-blue-500/30 transition-colors ml-1"
      >
        ?
      </button>

      {isVisible && (
        <div className="absolute z-50 w-72 p-3 bg-gray-900 border border-white/20 rounded-lg shadow-xl left-0 top-full mt-2">
          <h4 className="font-semibold mb-1 text-sm">{tooltipData.title}</h4>
          <p className="text-xs text-white/80 leading-relaxed">
            {tooltipData.content}
          </p>
        </div>
      )}
    </div>
  );
}
