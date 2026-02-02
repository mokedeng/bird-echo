import React from 'react';
import { Icons } from './Icons';

interface NavBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const NavBar: React.FC<NavBarProps> = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'home', icon: Icons.Home, label: 'Home' },
    { id: 'explore', icon: Icons.Compass, label: 'Explore' },
    { id: 'ai', icon: Icons.Sparkles, label: 'AI ID' },
    { id: 'settings', icon: Icons.Settings, label: 'Settings' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 pb-safe pt-2 px-6 h-20 z-50">
      <div className="flex justify-between items-center h-full pb-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center gap-1 transition-colors ${
                isActive ? 'text-primary-dark' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-bold tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};