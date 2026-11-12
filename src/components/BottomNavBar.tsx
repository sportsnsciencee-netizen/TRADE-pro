import React from 'react';
import { Home, LineChart, Layers, Eye } from 'lucide-react';

export type BottomNavDestination = 'home' | 'analyse' | 'positions' | 'watchlist';

interface BottomNavBarProps {
  activeDestination: BottomNavDestination;
  onNavigate: (destination: BottomNavDestination) => void;
  positionsBadge?: number;
  watchlistBadge?: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeDestination,
  onNavigate,
  positionsBadge,
  watchlistBadge
}) => {
  const navItems = [
    {
      id: 'home' as BottomNavDestination,
      label: 'Home',
      icon: Home
    },
    {
      id: 'analyse' as BottomNavDestination,
      label: 'Analyse',
      icon: LineChart
    },
    {
      id: 'positions' as BottomNavDestination,
      label: 'Positions',
      icon: Layers,
      badge: positionsBadge
    },
    {
      id: 'watchlist' as BottomNavDestination,
      label: 'Watchlist',
      icon: Eye,
      badge: watchlistBadge
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg">
      <div className="max-w-md md:max-w-xl mx-auto px-4">
        <div className="grid grid-cols-4 items-center h-16">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeDestination === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center justify-center min-h-[44px] py-1 px-2 transition-all cursor-pointer select-none ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <div className="relative">
                  <Icon
                    size={20}
                    className={`transition-transform ${isActive ? 'scale-110' : ''}`}
                    strokeWidth={isActive ? 2.3 : 1.8}
                  />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-bold font-mono flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[11px] tracking-tight mt-1 transition-all ${
                    isActive ? 'font-bold text-blue-600' : 'font-medium text-slate-500'
                  }`}
                >
                  {item.label}
                </span>
                {/* Active indicator dot */}
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-blue-600 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
